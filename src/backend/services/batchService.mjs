import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { generateNextBatchId } from '../domain/idGenerator.mjs';
import { getAppFilePaths } from '../storage/appFiles.mjs';
import { backupJsonFile, readJsonFile, writeJsonFile } from '../storage/jsonStorage.mjs';
import { listRawMaterials } from './rawMaterialService.mjs';
import { calculateProductDraft } from './productService.mjs';
import { loadSettings } from './settingsService.mjs';

const defaultStorage = Object.freeze({
  backupJsonFile,
  readJsonFile,
  writeJsonFile
});

export async function calculateBatchDraft(input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [materials, settings] = await Promise.all([
    listRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!materials.ok) return materials;
  if (!settings.ok) return settings;

  return calculateBatchFromMaterials(input, materials.data, settings.data);
}

export function calculateBatchFromMaterials(input, rawMaterials, settings) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name) return failureFromCode(ErrorCodes.BATCH_NAME_REQUIRED);

  const batchQuantity = Number(input?.batchQuantity);
  if (!Number.isFinite(batchQuantity) || batchQuantity <= 0) {
    return failureFromCode(ErrorCodes.BATCH_QUANTITY_INVALID);
  }

  const servingCount = normalizeOptionalPositiveNumber(input?.servingCount);
  const finalWeight = normalizeOptionalWeight(input?.finalWeight);
  const productDraft = calculateProductDraft({
    name,
    category: input?.category ?? 'cake',
    servingCount,
    finalWeight,
    ingredients: input?.ingredients ?? []
  }, rawMaterials, {
    exchangeRate: settings.currency.usdToLbp,
    totalCostMultiplier: settings.formulas.totalCostMultiplier
  });
  if (!productDraft.ok) return productDraft;

  return success({
    name,
    category: productDraft.data.category,
    servingCount,
    batchQuantity,
    ingredients: productDraft.data.ingredients,
    finalWeight,
    ingredientWeightGrams: productDraft.data.ingredientWeightGrams,
    ingredientCostUSD: productDraft.data.ingredientCostUSD,
    ingredientCostLBP: productDraft.data.ingredientCostLBP,
    totalCostUSD: productDraft.data.totalCostUSD,
    totalCostLBP: productDraft.data.totalCostLBP,
    perUnit: divideBatch(productDraft.data, batchQuantity, finalWeight)
  });
}

export async function createBatch(input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const batches = await loadBatches(context.data);
  if (!batches.ok) return batches;

  const draft = await calculateBatchDraft(input, context.data);
  if (!draft.ok) return draft;

  const now = getNow(context.data);
  const batch = {
    id: generateNextBatchId(batches.data),
    ...draft.data,
    createdAt: now,
    updatedAt: now
  };

  const save = await saveBatches([...batches.data, batch], context.data);
  if (!save.ok) return save;
  return success(batch);
}

export async function updateBatch(id, input, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const batches = await loadBatches(context.data);
  if (!batches.ok) return batches;
  const existing = batches.data.find((batch) => batch.id === id);
  if (!existing) return failureFromCode(ErrorCodes.BATCH_NOT_FOUND);

  const draft = await calculateBatchDraft(input, context.data);
  if (!draft.ok) return draft;

  const updated = {
    id,
    ...draft.data,
    createdAt: existing.createdAt,
    updatedAt: getNow(context.data)
  };

  const save = await saveBatches(batches.data.map((batch) => batch.id === id ? updated : batch), context.data, { backup: true });
  if (!save.ok) return save;
  return success(updated);
}

export async function listBatches(options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const [batches, materials, settings] = await Promise.all([
    loadBatches(context.data),
    listRawMaterials(context.data),
    loadSettings(context.data)
  ]);
  if (!batches.ok) return batches;
  if (!materials.ok) return materials;
  if (!settings.ok) return settings;
  return success([...batches.data]
    .map((batch) => batchForRead(batch, materials.data, settings.data))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)));
}

export async function getBatchById(id, options) {
  const batches = await listBatches(options);
  if (!batches.ok) return batches;
  const batch = batches.data.find((item) => item.id === id);
  return batch ? success(batch) : failureFromCode(ErrorCodes.BATCH_NOT_FOUND);
}

export async function deleteBatch(id, options) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const batches = await loadBatches(context.data);
  if (!batches.ok) return batches;
  if (!batches.data.some((batch) => batch.id === id)) return failureFromCode(ErrorCodes.BATCH_NOT_FOUND);

  const save = await saveBatches(batches.data.filter((batch) => batch.id !== id), context.data, { backup: true });
  if (!save.ok) return save;
  return success({ deletedId: id });
}

export async function loadBatches(context) {
  const result = await context.storage.readJsonFile(getAppFilePaths(context.dataFolder).batches);
  if (!result.ok) return result;
  return Array.isArray(result.data) ? success(result.data) : failureFromCode(ErrorCodes.FILE_INVALID_JSON);
}

export async function saveBatches(batches, context, options = {}) {
  const filePath = getAppFilePaths(context.dataFolder).batches;
  if (options.backup) {
    const backup = await context.storage.backupJsonFile(filePath, getAppFilePaths(context.dataFolder).backups);
    if (!backup.ok && backup.error.code !== ErrorCodes.FILE_MISSING) return backup;
  }
  return context.storage.writeJsonFile(filePath, batches);
}

function divideBatch(batch, quantity, finalWeight) {
  return {
    servingCount: batch.servingCount,
    ingredientWeightGrams: roundCalculation(batch.ingredientWeightGrams / quantity),
    finalWeight: finalWeight ? {
      quantity: roundCalculation(finalWeight.quantity / quantity),
      unit: finalWeight.unit
    } : null,
    ingredientCostUSD: roundCalculation(batch.ingredientCostUSD / quantity),
    ingredientCostLBP: roundCalculation(batch.ingredientCostLBP / quantity),
    totalCostUSD: roundCalculation(batch.totalCostUSD / quantity),
    totalCostLBP: roundCalculation(batch.totalCostLBP / quantity)
  };
}

function batchForRead(batch, materials, settings) {
  const draft = calculateBatchFromMaterials({
    name: batch.name,
    category: batch.category,
    servingCount: batch.servingCount,
    batchQuantity: batch.batchQuantity,
    finalWeight: batch.finalWeight,
    ingredients: batch.ingredients
  }, materials, settings);
  return draft.ok ? { ...batch, ...draft.data } : batch;
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

function requireDataFolder(options = {}) {
  if (!options?.dataFolder) return failureFromCode(ErrorCodes.FILE_MISSING, { path: 'dataFolder' });
  return success({
    dataFolder: options.dataFolder,
    storage: options.storage ?? defaultStorage,
    now: options.now
  });
}

function getNow(context) {
  return typeof context.now === 'function' ? context.now() : new Date().toISOString();
}

function roundCalculation(value) {
  return Number(Number(value).toFixed(12));
}
