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

const defaultStorage = Object.freeze({
  backupJsonFile,
  readJsonFile,
  writeJsonFile
});

export function validateRawMaterialInput(input, options = {}) {
  const exchangeRate = options.exchangeRate ?? DEFAULT_USD_TO_LBP;
  const name = typeof input?.name === 'string' ? input.name.trim() : '';

  if (!name) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
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

export async function createRawMaterial(input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const materialsResult = await loadRawMaterials(context.data);
  if (!materialsResult.ok) return materialsResult;

  const normalized = validateRawMaterialInput(input, context.data);
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

  const materialsResult = await loadRawMaterials(context.data);
  if (!materialsResult.ok) return materialsResult;

  const existing = materialsResult.data.find((material) => material.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_NOT_FOUND);
  }

  const normalized = validateRawMaterialInput(input, context.data);
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

  const materials = await loadRawMaterials(context.data);
  if (!materials.ok) return materials;

  return success(sortRawMaterials(materials.data));
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
    const inUse = productsResult.data.some((product) =>
      product.ingredients?.some((ingredient) => ingredient.rawMaterialId === id)
    );

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
