import { DEFAULT_USD_TO_LBP, SUPPORTED_BASE_UNITS, SUPPORTED_CUSTOM_UNITS } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { normalizeMoneyByCurrency } from '../domain/currencyEngine.mjs';
import { generateNextRawMaterialId } from '../domain/idGenerator.mjs';
import { validateSavedRawMaterial } from '../domain/rawMaterialModel.mjs';
import { isPositiveNumber } from '../domain/validators.mjs';
import { convertQuantity, isSupportedUnit } from '../domain/unitConversionEngine.mjs';
import { getAppFilePaths } from '../storage/appFiles.mjs';
import { backupJsonFile, readJsonFile, writeJsonFile } from '../storage/jsonStorage.mjs';
import { loadSettings } from './settingsService.mjs';

const defaultStorage = Object.freeze({
  backupJsonFile,
  readJsonFile,
  writeJsonFile
});

export function validateRawMaterialInput(input, options = {}) {
  const exchangeRate = options.exchangeRate ?? DEFAULT_USD_TO_LBP;
  const sourceType = input?.sourceType === 'production' ? 'production' : 'supplier';
  const supplier = typeof input?.supplier === 'string' ? input.supplier.trim() : '';
  const brand = typeof input?.brand === 'string' ? input.brand.trim() : '';
  const materialName = typeof input?.materialName === 'string' ? input.materialName.trim() : '';
  const legacyName = typeof input?.name === 'string' ? input.name.trim() : '';
  const usesStructuredSupplierName = Boolean(supplier || brand || materialName || !legacyName);
  const name = sourceType === 'supplier'
    ? usesStructuredSupplierName ? [supplier, brand, materialName].filter(Boolean).join(' ').trim() : legacyName
    : legacyName;

  if (!name) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
  }

  if (sourceType === 'supplier' && usesStructuredSupplierName) {
    if (!supplier) return failureFromCode(ErrorCodes.RAW_MATERIAL_SUPPLIER_REQUIRED);
    if (!brand) return failureFromCode(ErrorCodes.RAW_MATERIAL_BRAND_REQUIRED);
    if (!materialName) return failureFromCode(ErrorCodes.RAW_MATERIAL_MATERIAL_REQUIRED);
  }

  if (!SUPPORTED_BASE_UNITS.includes(input.baseUnit)) {
    return failureFromCode(ErrorCodes.BASE_UNIT_UNSUPPORTED);
  }

  const purchaseQuantity = toNumber(input.purchaseQuantity);
  if (!isPositiveNumber(purchaseQuantity)) {
    return failureFromCode(ErrorCodes.PURCHASE_QUANTITY_INVALID);
  }

  if (!isSupportedUnit(input.purchaseUnit)) {
    return failureFromCode(ErrorCodes.PURCHASE_UNIT_UNSUPPORTED);
  }

  if (input.purchasePrice === '' || input.purchasePrice === null || input.purchasePrice === undefined) {
    return failureFromCode(ErrorCodes.PURCHASE_PRICE_REQUIRED);
  }

  const purchasePrice = toNumber(input.purchasePrice);
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return failureFromCode(ErrorCodes.PURCHASE_PRICE_INVALID);
  }

  const purchaseCurrency = input.purchaseCurrency ?? 'USD';
  const money = normalizeMoneyByCurrency(purchasePrice, purchaseCurrency, exchangeRate);
  if (!money.ok) {
    return money;
  }

  const customConversions = normalizeCustomConversions(input.customConversions);
  if (!customConversions.ok) {
    return customConversions;
  }

  const convertedPurchaseQuantity = convertQuantity(
    purchaseQuantity,
    input.purchaseUnit,
    input.baseUnit,
    { customConversions: customConversions.data }
  );

  if (!convertedPurchaseQuantity.ok) {
    return convertedPurchaseQuantity;
  }

  const costPerBaseUnitUSD = money.data.usd / convertedPurchaseQuantity.data.quantity;
  const costPerBaseUnitLBP = money.data.lbp / convertedPurchaseQuantity.data.quantity;

  return success({
    name,
    sourceType,
    supplier: sourceType === 'supplier' ? supplier : '',
    brand: sourceType === 'supplier' ? brand : '',
    materialName: sourceType === 'supplier' ? (materialName || legacyName) : name,
    baseUnit: input.baseUnit,
    purchaseQuantity,
    purchaseUnit: input.purchaseUnit,
    purchaseCurrency,
    purchasePriceUSD: money.data.usd,
    purchasePriceLBP: money.data.lbp,
    costPerBaseUnitUSD,
    costPerBaseUnitLBP,
    customConversions: customConversions.data,
    notes: typeof input.notes === 'string' ? input.notes : ''
  });
}

export function calculateRawMaterialDraft(input, options = {}) {
  return validateRawMaterialInput(input, options);
}

export function calculateProductionRawMaterialDraft(input, rawMaterials, options = {}) {
  const exchangeRate = options.exchangeRate ?? DEFAULT_USD_TO_LBP;
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name) return failureFromCode(ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
  if (!['kg', 'g'].includes(input?.baseUnit)) return failureFromCode(ErrorCodes.BASE_UNIT_UNSUPPORTED);

  const ingredients = calculateRecipeIngredients(input?.ingredients, rawMaterials, exchangeRate, input?.id);
  if (!ingredients.ok) return ingredients;

  const finalWeight = normalizeWeight(input?.finalWeight);
  const costingWeight = finalWeight ?? { quantity: ingredients.data.ingredientWeightGrams, unit: 'g' };
  const convertedCostingWeight = convertQuantity(costingWeight.quantity, costingWeight.unit, input.baseUnit, {});
  if (!convertedCostingWeight.ok) return convertedCostingWeight;

  const purchasePriceUSD = roundCalculation(ingredients.data.ingredientCostUSD);
  const purchasePriceLBP = roundCalculation(ingredients.data.ingredientCostLBP);
  const costPerBaseUnitUSD = roundCalculation(purchasePriceUSD / convertedCostingWeight.data.quantity);
  const costPerBaseUnitLBP = roundCalculation(purchasePriceLBP / convertedCostingWeight.data.quantity);

  return success({
    name,
    sourceType: 'production',
    supplier: '',
    brand: '',
    materialName: name,
    baseUnit: input.baseUnit,
    purchaseQuantity: costingWeight.quantity,
    purchaseUnit: costingWeight.unit,
    purchaseCurrency: 'USD',
    purchasePriceUSD,
    purchasePriceLBP,
    costPerBaseUnitUSD,
    costPerBaseUnitLBP,
    customConversions: {},
    ingredients: ingredients.data.ingredients,
    ingredientWeightGrams: ingredients.data.ingredientWeightGrams,
    finalWeight,
    notes: typeof input.notes === 'string' ? input.notes : ''
  });
}

export async function createRawMaterial(input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [materialsResult, settingsResult] = await Promise.all([
    loadRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!materialsResult.ok) return materialsResult;
  if (!settingsResult.ok) return settingsResult;

  const calculationOptions = { ...context.data, exchangeRate: settingsResult.data.currency.usdToLbp };
  const normalized = input?.sourceType === 'production'
    ? calculateProductionRawMaterialDraft(input, materialsResult.data, calculationOptions)
    : validateRawMaterialInput(input, calculationOptions);
  if (!normalized.ok) return normalized;

  const duplicate = findDuplicateName(materialsResult.data, normalized.data.name);
  if (duplicate) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_DUPLICATE_NAME);
  }

  const now = getNow(context.data);
  const material = {
    id: generateNextRawMaterialId(materialsResult.data),
    ...normalized.data,
    createdAt: now,
    updatedAt: now
  };

  const validation = validateSavedRawMaterial(material);
  if (!validation.ok) return validation;

  const saveResult = await saveRawMaterials([...materialsResult.data, validation.data], context.data);
  if (!saveResult.ok) return saveResult;

  return success(validation.data);
}

export async function updateRawMaterial(id, input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [materialsResult, settingsResult] = await Promise.all([
    loadRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!materialsResult.ok) return materialsResult;
  if (!settingsResult.ok) return settingsResult;

  const existing = materialsResult.data.find((material) => material.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_NOT_FOUND);
  }

  const calculationOptions = { ...context.data, exchangeRate: settingsResult.data.currency.usdToLbp };
  const normalized = input?.sourceType === 'production'
    ? calculateProductionRawMaterialDraft({ ...input, id }, materialsResult.data, calculationOptions)
    : validateRawMaterialInput(input, calculationOptions);
  if (!normalized.ok) return normalized;

  const duplicate = findDuplicateName(materialsResult.data, normalized.data.name, id);
  if (duplicate) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_DUPLICATE_NAME);
  }

  const updated = {
    ...normalized.data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: getNow(context.data)
  };

  const validation = validateSavedRawMaterial(updated);
  if (!validation.ok) return validation;

  const saveResult = await saveRawMaterials(
    materialsResult.data.map((material) => material.id === id ? validation.data : material),
    context.data,
    { backup: true }
  );
  if (!saveResult.ok) return saveResult;

  return success(validation.data);
}

export async function listRawMaterials(options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [materials, settings] = await Promise.all([
    loadRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!materials.ok) return materials;
  if (!settings.ok) return settings;

  return success(sortRawMaterials(recalculateProductionMaterials(materials.data, settings.data.currency.usdToLbp)));
}

export async function getRawMaterialById(id, options) {
  const materials = await listRawMaterials(options);
  if (!materials.ok) return materials;

  const material = materials.data.find((item) => item.id === id);
  return material ? success(material) : failureFromCode(ErrorCodes.RAW_MATERIAL_NOT_FOUND);
}

export async function searchRawMaterials(query, options) {
  const materials = await listRawMaterials(options);
  if (!materials.ok) return materials;

  const needle = String(query ?? '').toLowerCase();
  return success(materials.data.filter((item) => item.name.toLowerCase().includes(needle)));
}

export async function deleteRawMaterial(id, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const materialsResult = await loadRawMaterials(context.data);
  if (!materialsResult.ok) return materialsResult;

  const existing = materialsResult.data.find((material) => material.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_NOT_FOUND);
  }

  const productsResult = await context.data.storage.readJsonFile(getAppFilePaths(context.data.dataFolder).products);
  if (productsResult.ok) {
    const batchesResult = await context.data.storage.readJsonFile(getAppFilePaths(context.data.dataFolder).batches);
    const inUse = productsResult.data.some((product) =>
      product.ingredients?.some((ingredient) => ingredient.rawMaterialId === id)
    ) || materialsResult.data.some((material) =>
      material.id !== id && material.ingredients?.some((ingredient) => ingredient.rawMaterialId === id)
    ) || (batchesResult.ok && batchesResult.data.some((batch) =>
      batch.ingredients?.some((ingredient) => ingredient.rawMaterialId === id)
    ));

    if (inUse && context.data.deletePolicy !== 'allow-missing-references') {
      return failureFromCode(ErrorCodes.RAW_MATERIAL_IN_USE);
    }
  }

  const saveResult = await saveRawMaterials(
    materialsResult.data.filter((material) => material.id !== id),
    context.data,
    { backup: true }
  );
  if (!saveResult.ok) return saveResult;

  return success({ deletedId: id });
}

export async function loadRawMaterials(context) {
  const result = await context.storage.readJsonFile(getAppFilePaths(context.dataFolder).rawMaterials);
  if (!result.ok) return result;
  return Array.isArray(result.data) ? success(result.data) : failureFromCode(ErrorCodes.FILE_INVALID_JSON);
}

export async function saveRawMaterials(materials, context, options = {}) {
  const filePath = getAppFilePaths(context.dataFolder).rawMaterials;

  if (options.backup) {
    const backup = await context.storage.backupJsonFile(filePath, getAppFilePaths(context.dataFolder).backups);
    if (!backup.ok && backup.error.code !== ErrorCodes.FILE_MISSING) {
      return backup;
    }
  }

  return context.storage.writeJsonFile(filePath, materials);
}

function requireDataFolder(options = {}) {
  if (!options?.dataFolder) {
    return failureFromCode(ErrorCodes.FILE_MISSING, { path: 'dataFolder' });
  }

  return success({
    dataFolder: options.dataFolder,
    storage: options.storage ?? defaultStorage,
    exchangeRate: options.exchangeRate ?? DEFAULT_USD_TO_LBP,
    now: options.now,
    deletePolicy: options.deletePolicy
  });
}

function findDuplicateName(materials, name, ignoredId = undefined) {
  const target = normalizeName(name);
  return materials.find((material) =>
    material.id !== ignoredId &&
    normalizeName(material.name) === target
  );
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function sortRawMaterials(materials) {
  return [...materials].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function recalculateProductionMaterials(materials, exchangeRate) {
  let current = materials;
  for (let pass = 0; pass < 3; pass += 1) {
    current = current.map((material) => {
      if (material.sourceType !== 'production') return material;
      const recalculated = calculateProductionRawMaterialDraft(material, current.filter((item) => item.id !== material.id), { exchangeRate });
      return recalculated.ok ? {
        ...material,
        ...recalculated.data,
        id: material.id,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt
      } : material;
    });
  }
  return current;
}

function calculateRecipeIngredients(inputIngredients, rawMaterials, exchangeRate, selfId = undefined) {
  const ingredients = Array.isArray(inputIngredients) ? inputIngredients.filter((ingredient) =>
    ingredient?.rawMaterialId || ingredient?.quantity || ingredient?.unit
  ) : [];

  if (ingredients.length === 0) return failureFromCode(ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);

  const seen = new Set();
  const calculatedIngredients = [];

  for (let index = 0; index < ingredients.length; index += 1) {
    const ingredient = ingredients[index];
    const quantity = toNumber(ingredient.quantity);

    if (!ingredient.rawMaterialId) return failureFromCode(ErrorCodes.INGREDIENT_MATERIAL_REQUIRED, { row: index });
    if (ingredient.rawMaterialId === selfId) return failureFromCode(ErrorCodes.INGREDIENT_DUPLICATE_RAW_MATERIAL, { row: index });
    if (seen.has(ingredient.rawMaterialId)) return failureFromCode(ErrorCodes.INGREDIENT_DUPLICATE_RAW_MATERIAL, { row: index });
    if (!isPositiveNumber(quantity)) return failureFromCode(ErrorCodes.INGREDIENT_QUANTITY_INVALID, { row: index });
    if (!ingredient.unit) return failureFromCode(ErrorCodes.INGREDIENT_UNIT_REQUIRED, { row: index });

    seen.add(ingredient.rawMaterialId);
    const material = rawMaterials.find((item) => item.id === ingredient.rawMaterialId);
    if (!material) return failureFromCode(ErrorCodes.MISSING_RAW_MATERIAL, { row: index });

    const converted = convertQuantity(quantity, ingredient.unit, material.baseUnit, material);
    if (!converted.ok) return failureFromCode(converted.error.code, { row: index });

    const portionCostUSD = roundCalculation(converted.data.quantity * material.costPerBaseUnitUSD);
    calculatedIngredients.push({
      rawMaterialId: material.id,
      quantity,
      unit: ingredient.unit,
      convertedQuantity: converted.data.quantity,
      convertedUnit: converted.data.unit,
      portionCostUSD,
      portionCostLBP: roundCalculation(portionCostUSD * exchangeRate)
    });
  }

  return success({
    ingredients: calculatedIngredients,
    ingredientWeightGrams: calculateIngredientWeightGrams(calculatedIngredients),
    ingredientCostUSD: roundCalculation(calculatedIngredients.reduce((sum, ingredient) => sum + ingredient.portionCostUSD, 0)),
    ingredientCostLBP: roundCalculation(calculatedIngredients.reduce((sum, ingredient) => sum + ingredient.portionCostLBP, 0))
  });
}

function normalizeWeight(weight) {
  const quantity = toNumber(weight?.quantity);
  const unit = ['kg', 'g'].includes(weight?.unit) ? weight.unit : 'g';
  return isPositiveNumber(quantity) ? { quantity, unit } : null;
}

function calculateIngredientWeightGrams(ingredients) {
  return roundCalculation(ingredients.reduce((sum, ingredient) => {
    if (ingredient.convertedUnit === 'kg') return sum + Number(ingredient.convertedQuantity ?? 0) * 1000;
    if (ingredient.convertedUnit === 'g') return sum + Number(ingredient.convertedQuantity ?? 0);
    return sum;
  }, 0));
}

function roundCalculation(value) {
  return Number(Number(value).toFixed(12));
}

function normalizeCustomConversions(customConversions = {}) {
  const normalized = {};

  if (customConversions === null || typeof customConversions !== 'object' || Array.isArray(customConversions)) {
    return failureFromCode(ErrorCodes.CUSTOM_CONVERSION_INVALID);
  }

  for (const unit of SUPPORTED_CUSTOM_UNITS) {
    const conversion = customConversions[unit];
    if (!conversion) continue;

    const quantity = toNumber(conversion.quantity);
    if (!isPositiveNumber(quantity) || !isSupportedUnit(conversion.unit)) {
      return failureFromCode(ErrorCodes.CUSTOM_CONVERSION_INVALID);
    }

    normalized[unit] = {
      quantity,
      unit: conversion.unit
    };
  }

  return success(normalized);
}

function getNow(context) {
  return typeof context.now === 'function' ? context.now() : new Date().toISOString();
}

function toNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }

  return Number.NaN;
}
