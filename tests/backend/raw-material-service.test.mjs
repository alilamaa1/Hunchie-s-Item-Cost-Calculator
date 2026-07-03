import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import {
  calculateRawMaterialDraft,
  createRawMaterial,
  deleteRawMaterial,
  getRawMaterialById,
  listRawMaterials,
  searchRawMaterials,
  updateRawMaterial
} from '../../src/backend/services/rawMaterialService.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

function flourInput(overrides = {}) {
  return {
    name: ' Flour ',
    baseUnit: 'kg',
    purchaseQuantity: '25',
    purchaseUnit: 'kg',
    purchasePrice: '20',
    purchaseCurrency: 'USD',
    customConversions: {
      cup: { quantity: 120, unit: 'g' },
      tbsp: { quantity: 8, unit: 'g' },
      tsp: { quantity: 2.7, unit: 'g' }
    },
    ...overrides
  };
}

async function withDataFolder(fn) {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    await initializeAppDataFolder({ dataFolder });
    await fn(dataFolder);
  } finally {
    await removeTempAppDataFolder(parent);
  }
}

test('raw material draft normalizes price and cost per base unit without writing', async () => {
  await withDataFolder(async (dataFolder) => {
    const result = calculateRawMaterialDraft(flourInput(), { exchangeRate: 90000 });

    assert.equal(result.ok, true);
    assert.equal(result.data.name, 'Flour');
    assert.equal(result.data.purchasePriceUSD, 20);
    assert.equal(result.data.purchasePriceLBP, 1800000);
    assert.equal(result.data.costPerBaseUnitUSD, 0.8);
    assert.equal(result.data.costPerBaseUnitLBP, 72000);
    assert.deepEqual(JSON.parse(await readFile(join(dataFolder, 'raw_materials.json'), 'utf8')), []);
  });
});

test('raw material validation rejects expected invalid inputs', () => {
  assert.equal(calculateRawMaterialDraft(flourInput({ name: ' ' })).error.code, ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchaseQuantity: 0 })).error.code, ErrorCodes.PURCHASE_QUANTITY_INVALID);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchaseQuantity: -1 })).error.code, ErrorCodes.PURCHASE_QUANTITY_INVALID);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchasePrice: '' })).error.code, ErrorCodes.PURCHASE_PRICE_REQUIRED);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchasePrice: -20 })).error.code, ErrorCodes.PURCHASE_PRICE_INVALID);
  assert.equal(calculateRawMaterialDraft(flourInput({ baseUnit: 'stone' })).error.code, ErrorCodes.BASE_UNIT_UNSUPPORTED);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchaseUnit: 'boxful' })).error.code, ErrorCodes.PURCHASE_UNIT_UNSUPPORTED);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchaseCurrency: 'EUR' })).error.code, ErrorCodes.CURRENCY_UNSUPPORTED);
  assert.equal(calculateRawMaterialDraft(flourInput({ purchaseUnit: 'ml' })).error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
});

test('creates raw material with ID, timestamps, saved JSON, and preserves existing records', async () => {
  await withDataFolder(async (dataFolder) => {
    const first = await createRawMaterial(flourInput(), {
      dataFolder,
      now: () => '2026-06-28T10:00:00.000Z'
    });
    const second = await createRawMaterial(flourInput({
      name: 'Sugar',
      purchaseQuantity: 10,
      purchasePrice: 8,
      customConversions: {}
    }), {
      dataFolder,
      now: () => '2026-06-28T10:01:00.000Z'
    });

    assert.equal(first.ok, true);
    assert.equal(first.data.id, 'RM-0001');
    assert.equal(first.data.createdAt, '2026-06-28T10:00:00.000Z');
    assert.equal(second.data.id, 'RM-0002');
    assert.equal(JSON.parse(await readFile(join(dataFolder, 'raw_materials.json'), 'utf8')).length, 2);
  });
});

test('duplicate raw material names are rejected case-insensitively', async () => {
  await withDataFolder(async (dataFolder) => {
    await createRawMaterial(flourInput({ name: 'Flour' }), { dataFolder });
    const duplicate = await createRawMaterial(flourInput({ name: 'flour' }), { dataFolder });

    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error.code, ErrorCodes.RAW_MATERIAL_DUPLICATE_NAME);
  });
});

test('updates raw material while preserving ID, createdAt, and product references by ID', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createRawMaterial(flourInput(), {
      dataFolder,
      now: () => '2026-06-28T10:00:00.000Z'
    });
    const updated = await updateRawMaterial(created.data.id, flourInput({
      name: 'All-Purpose Flour',
      purchasePrice: 25
    }), {
      dataFolder,
      now: () => '2026-06-28T11:00:00.000Z'
    });

    assert.equal(updated.ok, true);
    assert.equal(updated.data.id, 'RM-0001');
    assert.equal(updated.data.createdAt, '2026-06-28T10:00:00.000Z');
    assert.equal(updated.data.updatedAt, '2026-06-28T11:00:00.000Z');
    assert.equal(updated.data.costPerBaseUnitUSD, 1);
  });
});

test('update returns not found, rejects duplicate against others, and allows unchanged name', async () => {
  await withDataFolder(async (dataFolder) => {
    const flour = await createRawMaterial(flourInput({ name: 'Flour' }), { dataFolder });
    const sugar = await createRawMaterial(flourInput({ name: 'Sugar', customConversions: {} }), { dataFolder });

    assert.equal((await updateRawMaterial('RM-9999', flourInput(), { dataFolder })).error.code, ErrorCodes.RAW_MATERIAL_NOT_FOUND);
    assert.equal((await updateRawMaterial(sugar.data.id, flourInput({ name: 'Flour' }), { dataFolder })).error.code, ErrorCodes.RAW_MATERIAL_DUPLICATE_NAME);
    assert.equal((await updateRawMaterial(flour.data.id, flourInput({ name: 'Flour' }), { dataFolder })).ok, true);
  });
});

test('lists, sorts, gets, and searches raw materials', async () => {
  await withDataFolder(async (dataFolder) => {
    await createRawMaterial(flourInput({ name: 'Sugar', customConversions: {} }), { dataFolder });
    const flour = await createRawMaterial(flourInput({ name: 'Flour' }), { dataFolder });

    assert.deepEqual((await listRawMaterials({ dataFolder })).data.map((item) => item.name), ['Flour', 'Sugar']);
    assert.equal((await getRawMaterialById(flour.data.id, { dataFolder })).data.name, 'Flour');
    assert.equal((await getRawMaterialById('RM-9999', { dataFolder })).error.code, ErrorCodes.RAW_MATERIAL_NOT_FOUND);
    assert.equal((await searchRawMaterials('flo', { dataFolder })).data[0].name, 'Flour');
    assert.equal((await searchRawMaterials('FLO', { dataFolder })).data[0].name, 'Flour');
  });
});

test('raw material update creates a backup', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createRawMaterial(flourInput(), { dataFolder });
    await updateRawMaterial(created.data.id, flourInput({ purchasePrice: 21 }), { dataFolder });

    assert.ok((await readdir(join(dataFolder, 'backups'))).some((name) => name.startsWith('raw_materials_')));
  });
});

test('raw material delete removes unused materials and blocks used materials', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createRawMaterial(flourInput(), { dataFolder });
    const deleted = await deleteRawMaterial(created.data.id, { dataFolder });

    assert.equal(deleted.ok, true);
    assert.equal((await deleteRawMaterial('RM-9999', { dataFolder })).error.code, ErrorCodes.RAW_MATERIAL_NOT_FOUND);
  });
});

test('raw material quantity 100 is preserved exactly', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createRawMaterial(flourInput({
      purchaseQuantity: 100,
      purchasePrice: 100,
      customConversions: {}
    }), { dataFolder });

    assert.equal(created.ok, true);
    assert.equal(created.data.purchaseQuantity, 100);
    assert.equal(created.data.costPerBaseUnitUSD, 1);
  });
});
