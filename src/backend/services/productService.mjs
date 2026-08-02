import { DEFAULT_USD_TO_LBP } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { generateNextProductId } from '../domain/idGenerator.mjs';
import { validateSavedProduct } from '../domain/productModel.mjs';
import { DEFAULT_TOTAL_COST_MULTIPLIER } from '../domain/settingsModel.mjs';
import { convertQuantity, getCompatibleUnits } from '../domain/unitConversionEngine.mjs';
import { isPositiveNumber } from '../domain/validators.mjs';
import { getAppFilePaths } from '../storage/appFiles.mjs';
import { backupJsonFile, readJsonFile, writeJsonFile } from '../storage/jsonStorage.mjs';
import { listRawMaterials } from './rawMaterialService.mjs';
import { loadSettings } from './settingsService.mjs';

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
    category: normalizeProductCategory(input?.category),
    servingCount: normalizeOptionalPositiveNumber(input?.servingCount),
    finalWeight: normalizeOptionalWeight(input?.finalWeight),
    visions: normalizeVisions(input?.visions),
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
  const totalCostMultiplier = resolveTotalCostMultiplier(options);
  const cleaned = cleanupProductInput(input);

  if (!cleaned.name) {
    return failureFromCode(ErrorCodes.PRODUCT_NAME_REQUIRED);
  }

  if (!cleaned.category) {
    return failureFromCode(ErrorCodes.PRODUCT_CATEGORY_REQUIRED);
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

  const ingredientCostUSD = roundCalculation(calculatedIngredients.reduce((sum, ingredient) => sum + ingredient.portionCostUSD, 0));
  const ingredientCostLBP = roundCalculation(calculatedIngredients.reduce((sum, ingredient) => sum + ingredient.portionCostLBP, 0));
  const totalCostUSD = roundCalculation(ingredientCostUSD * totalCostMultiplier);
  const totalCostLBP = roundCalculation(ingredientCostLBP * totalCostMultiplier);
  const ingredientWeightGrams = calculateIngredientWeightGrams(calculatedIngredients);

  return success({
    name: cleaned.name,
    category: cleaned.category,
    servingCount: cleaned.servingCount,
    finalWeight: cleaned.finalWeight,
    ingredients: calculatedIngredients,
    ingredientWeightGrams,
    ingredientCostUSD,
    ingredientCostLBP,
    totalCostUSD,
    totalCostLBP,
    visions: calculateVisions(cleaned.visions, {
      ingredients: calculatedIngredients,
      servingCount: cleaned.servingCount,
      ingredientWeightGrams,
      ingredientCostUSD,
      ingredientCostLBP,
      totalCostMultiplier
    })
  });
}

export async function createProduct(input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [productsResult, materialsResult, settingsResult] = await Promise.all([
    loadProducts(context.data),
    listRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!productsResult.ok) return productsResult;
  if (!materialsResult.ok) return materialsResult;
  if (!settingsResult.ok) return settingsResult;

  const draft = calculateProductDraft(input, materialsResult.data, calculationOptionsFromSettings(settingsResult.data));
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

  const [productsResult, materialsResult, settingsResult] = await Promise.all([
    loadProducts(context.data),
    listRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!productsResult.ok) return productsResult;
  if (!materialsResult.ok) return materialsResult;
  if (!settingsResult.ok) return settingsResult;

  const existing = productsResult.data.find((product) => product.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.PRODUCT_NOT_FOUND);
  }

  const draft = calculateProductDraft(input, materialsResult.data, calculationOptionsFromSettings(settingsResult.data));
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

  const [products, materials, settings] = await Promise.all([
    loadProducts(context.data),
    listRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!products.ok) return products;
  if (!materials.ok) return materials;
  if (!settings.ok) return settings;

  return success(sortProducts(products.data).map((product) => ({
    ...productForRead(product, materials.data, settings.data),
    ingredientCount: product.ingredients.length
  })));
}

export async function getProductById(id, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [productsResult, materialsResult, settingsResult] = await Promise.all([
    loadProducts(context.data),
    listRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!productsResult.ok) return productsResult;
  if (!materialsResult.ok) return materialsResult;
  if (!settingsResult.ok) return settingsResult;

  const product = productsResult.data.find((item) => item.id === id);
  if (!product) {
    return failureFromCode(ErrorCodes.PRODUCT_NOT_FOUND);
  }

  return success(resolveProductDetail(productForRead(product, materialsResult.data, settingsResult.data), materialsResult.data));
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

function productForRead(product, rawMaterials, settings) {
  const recalculated = calculateProductDraft(savedProductToDraftInput(product), rawMaterials, calculationOptionsFromSettings(settings));
  if (recalculated.ok) {
    return {
      ...product,
      ...recalculated.data
    };
  }

  return applyProductFormula({
    ...product,
    category: normalizeProductCategory(product.category),
    servingCount: normalizeOptionalPositiveNumber(product.servingCount),
    finalWeight: normalizeOptionalWeight(product.finalWeight),
    ingredientWeightGrams: Number(product.ingredientWeightGrams ?? 0),
    visions: Array.isArray(product.visions) ? product.visions : []
  }, settings.formulas.totalCostMultiplier);
}

function savedProductToDraftInput(product) {
  return {
    name: product.name,
    category: product.category,
    servingCount: product.servingCount,
    finalWeight: product.finalWeight,
    visions: product.visions,
    ingredients: (product.ingredients ?? []).map((ingredient) => ({
      rawMaterialId: ingredient.rawMaterialId,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    }))
  };
}

function applyProductFormula(product, totalCostMultiplier = DEFAULT_TOTAL_COST_MULTIPLIER) {
  const ingredientCostUSD = roundCalculation((product.ingredients ?? []).reduce((sum, ingredient) => sum + Number(ingredient.portionCostUSD ?? 0), 0));
  const ingredientCostLBP = roundCalculation((product.ingredients ?? []).reduce((sum, ingredient) => sum + Number(ingredient.portionCostLBP ?? 0), 0));

  return {
    ...product,
    ingredientWeightGrams: product.ingredientWeightGrams ?? calculateIngredientWeightGrams(product.ingredients ?? []),
    ingredientCostUSD,
    ingredientCostLBP,
    totalCostUSD: roundCalculation(ingredientCostUSD * resolveTotalCostMultiplier({ totalCostMultiplier })),
    totalCostLBP: roundCalculation(ingredientCostLBP * resolveTotalCostMultiplier({ totalCostMultiplier }))
  };
}

function calculationOptionsFromSettings(settings) {
  return {
    exchangeRate: settings.currency.usdToLbp,
    totalCostMultiplier: settings.formulas.totalCostMultiplier
  };
}

function resolveTotalCostMultiplier(options = {}) {
  const value = Number(options.totalCostMultiplier ?? options.formulas?.totalCostMultiplier ?? DEFAULT_TOTAL_COST_MULTIPLIER);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TOTAL_COST_MULTIPLIER;
}

function normalizeProductCategory(value) {
  return ['piece', 'cake', 'box'].includes(value) ? value : 'cake';
}

function normalizeOptionalPositiveNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeOptionalWeight(weight) {
  const quantity = normalizeOptionalPositiveNumber(weight?.quantity);
  const unit = ['kg', 'g'].includes(weight?.unit) ? weight.unit : 'g';
  return quantity ? { quantity, unit } : null;
}

function normalizeVisions(visions) {
  if (!Array.isArray(visions)) return [];
  return visions
    .map((vision) => ({ servingCount: normalizeOptionalPositiveNumber(vision?.servingCount) }))
    .filter((vision) => vision.servingCount);
}

function calculateIngredientWeightGrams(ingredients) {
  return roundCalculation(ingredients.reduce((sum, ingredient) => {
    if (ingredient.convertedUnit === 'kg') return sum + Number(ingredient.convertedQuantity ?? 0) * 1000;
    if (ingredient.convertedUnit === 'g') return sum + Number(ingredient.convertedQuantity ?? 0);
    return sum;
  }, 0));
}

function calculateVisions(visions, product) {
  if (!Array.isArray(visions) || visions.length === 0 || !product.servingCount) return [];

  return visions.map((vision) => {
    const scale = vision.servingCount / product.servingCount;
    const ingredientCostUSD = roundCalculation(product.ingredientCostUSD * scale);
    const ingredientCostLBP = roundCalculation(product.ingredientCostLBP * scale);
    return {
      servingCount: vision.servingCount,
      scale: roundCalculation(scale),
      ingredientWeightGrams: roundCalculation(product.ingredientWeightGrams * scale),
      ingredientCostUSD,
      ingredientCostLBP,
      totalCostUSD: roundCalculation(ingredientCostUSD * product.totalCostMultiplier),
      totalCostLBP: roundCalculation(ingredientCostLBP * product.totalCostMultiplier),
      ingredients: product.ingredients.map((ingredient) => ({
        ...ingredient,
        quantity: roundCalculation(Number(ingredient.quantity) * scale),
        convertedQuantity: roundCalculation(Number(ingredient.convertedQuantity) * scale),
        portionCostUSD: roundCalculation(Number(ingredient.portionCostUSD) * scale),
        portionCostLBP: roundCalculation(Number(ingredient.portionCostLBP) * scale)
      }))
    };
  });
}

function getNow(context) {
  return typeof context.now === 'function' ? context.now() : new Date().toISOString();
}

function roundCalculation(value) {
  return Number(Number(value).toFixed(12));
}
