import { DEFAULT_USD_TO_LBP } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { generateNextProductId } from '../domain/idGenerator.mjs';
import { validateSavedProduct } from '../domain/productModel.mjs';
import { convertQuantity, getCompatibleUnits } from '../domain/unitConversionEngine.mjs';
import { isPositiveNumber } from '../domain/validators.mjs';
import { getAppFilePaths } from '../storage/appFiles.mjs';
import { backupJsonFile, readJsonFile, writeJsonFile } from '../storage/jsonStorage.mjs';
import { loadRawMaterials } from './rawMaterialService.mjs';

const defaultStorage = Object.freeze({
  backupJsonFile,
  readJsonFile,
  writeJsonFile
});

export function cleanupProductInput(input) {
  const ingredients = Array.isArray(input?.ingredients) ? [...input.ingredients] : [];

  while (ingredients.length > 0 && isFullyEmptyIngredientRow(ingredients[ingredients.length - 1])) {
    ingredients.pop();
  }

  return {
    ...input,
    name: typeof input?.name === 'string' ? input.name.trim() : '',
    ingredients: ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: normalizeQuantityValue(ingredient?.quantity)
    }))
  };
}

export function getAvailableIngredientUnits(material) {
  return getCompatibleUnits(material.baseUnit, material.customConversions);
}

export function calculateIngredientPortion(material, ingredient, exchangeRate = DEFAULT_USD_TO_LBP) {
  const converted = convertQuantity(
    ingredient.quantity,
    ingredient.unit,
    material.baseUnit,
    material
  );

  if (!converted.ok) {
    return converted;
  }

  const portionCostUSD = roundCalculation(converted.data.quantity * material.costPerBaseUnitUSD);

  return success({
    rawMaterialId: material.id,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    convertedQuantity: converted.data.quantity,
    convertedUnit: converted.data.unit,
    portionCostUSD,
    portionCostLBP: roundCalculation(portionCostUSD * exchangeRate)
  });
}

export function calculateProductDraft(input, rawMaterials, options = {}) {
  const exchangeRate = options.exchangeRate ?? DEFAULT_USD_TO_LBP;
  const cleaned = cleanupProductInput(input);

  if (!cleaned.name) {
    return failureFromCode(ErrorCodes.PRODUCT_NAME_REQUIRED);
  }

  if (cleaned.ingredients.length === 0) {
    return failureFromCode(ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
  }

  const seen = new Set();
  const calculatedIngredients = [];

  for (let index = 0; index < cleaned.ingredients.length; index += 1) {
    const ingredient = cleaned.ingredients[index];

    if (!ingredient.rawMaterialId && hasQuantityValue(ingredient.quantity)) {
      return failureFromCode(ErrorCodes.INGREDIENT_MATERIAL_REQUIRED, { row: index });
    }

    if (ingredient.rawMaterialId && !hasQuantityValue(ingredient.quantity)) {
      return failureFromCode(ErrorCodes.INGREDIENT_QUANTITY_REQUIRED, { row: index });
    }

    if (!isPositiveNumber(ingredient.quantity)) {
      return failureFromCode(ErrorCodes.INGREDIENT_QUANTITY_INVALID, { row: index });
    }

    if (!ingredient.unit) {
      return failureFromCode(ErrorCodes.INGREDIENT_UNIT_REQUIRED, { row: index });
    }

    if (seen.has(ingredient.rawMaterialId)) {
      return failureFromCode(ErrorCodes.INGREDIENT_DUPLICATE_RAW_MATERIAL, { row: index });
    }
    seen.add(ingredient.rawMaterialId);

    const material = rawMaterials.find((item) => item.id === ingredient.rawMaterialId);
    if (!material) {
      return failureFromCode(ErrorCodes.MISSING_RAW_MATERIAL, { row: index });
    }

    const calculated = calculateIngredientPortion(material, ingredient, exchangeRate);
    if (!calculated.ok) {
      return failureFromCode(calculated.error.code, { row: index });
    }

    calculatedIngredients.push(calculated.data);
  }

  const totalCostUSD = roundCalculation(calculatedIngredients.reduce((sum, ingredient) => sum + ingredient.portionCostUSD, 0));
  const totalCostLBP = roundCalculation(calculatedIngredients.reduce((sum, ingredient) => sum + ingredient.portionCostLBP, 0));

  return success({
    name: cleaned.name,
    ingredients: calculatedIngredients,
    totalCostUSD,
    totalCostLBP
  });
}

export async function createProduct(input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [productsResult, materialsResult] = await Promise.all([
    loadProducts(context.data),
    loadRawMaterials(context.data)
  ]);
  if (!productsResult.ok) return productsResult;
  if (!materialsResult.ok) return materialsResult;

  const draft = calculateProductDraft(input, materialsResult.data, context.data);
  if (!draft.ok) return draft;

  const now = getNow(context.data);
  const product = {
    id: generateNextProductId(productsResult.data),
    ...draft.data,
    createdAt: now,
    updatedAt: now
  };

  const validation = validateSavedProduct(product);
  if (!validation.ok) return validation;

  const saveResult = await saveProducts([...productsResult.data, validation.data], context.data);
  if (!saveResult.ok) return saveResult;

  return success(validation.data);
}

export async function updateProduct(id, input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [productsResult, materialsResult] = await Promise.all([
    loadProducts(context.data),
    loadRawMaterials(context.data)
  ]);
  if (!productsResult.ok) return productsResult;
  if (!materialsResult.ok) return materialsResult;

  const existing = productsResult.data.find((product) => product.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const draft = calculateProductDraft(input, materialsResult.data, context.data);
  if (!draft.ok) return draft;

  const updated = {
    id: existing.id,
    ...draft.data,
    createdAt: existing.createdAt,
    updatedAt: getNow(context.data)
  };

  const validation = validateSavedProduct(updated);
  if (!validation.ok) return validation;

  const saveResult = await saveProducts(
    productsResult.data.map((product) => product.id === id ? validation.data : product),
    context.data,
    { backup: true }
  );
  if (!saveResult.ok) return saveResult;

  return success(validation.data);
}

export async function listProducts(options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const products = await loadProducts(context.data);
  if (!products.ok) return products;

  return success(sortProducts(products.data).map((product) => ({
    ...product,
    ingredientCount: product.ingredients.length
  })));
}

export async function getProductById(id, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [productsResult, materialsResult] = await Promise.all([
    loadProducts(context.data),
    loadRawMaterials(context.data)
  ]);
  if (!productsResult.ok) return productsResult;
  if (!materialsResult.ok) return materialsResult;

  const product = productsResult.data.find((item) => item.id === id);
  if (!product) {
    return failureFromCode(ErrorCodes.PRODUCT_NOT_FOUND);
  }

  return success(resolveProductDetail(product, materialsResult.data));
}

export async function searchProducts(query, options) {
  const products = await listProducts(options);
  if (!products.ok) return products;

  const needle = String(query ?? '').toLowerCase();
  return success(products.data.filter((item) => item.name.toLowerCase().includes(needle)));
}

export async function deleteProduct(id, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const productsResult = await loadProducts(context.data);
  if (!productsResult.ok) return productsResult;

  const existing = productsResult.data.find((product) => product.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const saveResult = await saveProducts(
    productsResult.data.filter((product) => product.id !== id),
    context.data,
    { backup: true }
  );
  if (!saveResult.ok) return saveResult;

  return success({ deletedId: id });
}

export function resolveProductDetail(product, rawMaterials) {
  const warnings = [];
  const resolvedIngredients = product.ingredients.map((ingredient) => {
    const material = rawMaterials.find((item) => item.id === ingredient.rawMaterialId);

    if (!material) {
      warnings.push({
        code: ErrorCodes.MISSING_RAW_MATERIAL,
        rawMaterialId: ingredient.rawMaterialId
      });

      return {
        ...ingredient,
        rawMaterialName: null,
        missingRawMaterial: true
      };
    }

    return {
      ...ingredient,
      rawMaterialName: material.name,
      missingRawMaterial: false
    };
  });

  return {
    ...product,
    ingredients: resolvedIngredients,
    warnings
  };
}

export function removeIngredientByRawMaterialId(productInput, rawMaterialId) {
  return {
    ...productInput,
    ingredients: productInput.ingredients.filter((ingredient) => ingredient.rawMaterialId !== rawMaterialId)
  };
}

export function replaceIngredientRawMaterial(productInput, oldRawMaterialId, replacement) {
  return {
    ...productInput,
    ingredients: productInput.ingredients.map((ingredient) =>
      ingredient.rawMaterialId === oldRawMaterialId
        ? { ...ingredient, rawMaterialId: replacement.rawMaterialId, unit: replacement.unit }
        : ingredient
    )
  };
}

export async function loadProducts(context) {
  const result = await context.storage.readJsonFile(getAppFilePaths(context.dataFolder).products);
  if (!result.ok) return result;
  return Array.isArray(result.data) ? success(result.data) : failureFromCode(ErrorCodes.FILE_INVALID_JSON);
}

export async function saveProducts(products, context, options = {}) {
  const filePath = getAppFilePaths(context.dataFolder).products;

  if (options.backup) {
    const backup = await context.storage.backupJsonFile(filePath, getAppFilePaths(context.dataFolder).backups);
    if (!backup.ok && backup.error.code !== ErrorCodes.FILE_MISSING) {
      return backup;
    }
  }

  return context.storage.writeJsonFile(filePath, products);
}

function requireDataFolder(options = {}) {
  if (!options?.dataFolder) {
    return failureFromCode(ErrorCodes.FILE_MISSING, { path: 'dataFolder' });
  }

  return success({
    dataFolder: options.dataFolder,
    storage: options.storage ?? defaultStorage,
    exchangeRate: options.exchangeRate ?? DEFAULT_USD_TO_LBP,
    now: options.now
  });
}

function isFullyEmptyIngredientRow(ingredient) {
  return !ingredient?.rawMaterialId && !hasQuantityValue(ingredient?.quantity) && !ingredient?.unit;
}

function hasQuantityValue(value) {
  return value !== '' && value !== null && value !== undefined;
}

function normalizeQuantityValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return value;
}

function sortProducts(products) {
  return [...products].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function getNow(context) {
  return typeof context.now === 'function' ? context.now() : new Date().toISOString();
}

function roundCalculation(value) {
  return Number(Number(value).toFixed(12));
}
