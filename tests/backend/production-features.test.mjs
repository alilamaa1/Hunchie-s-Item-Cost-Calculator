import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import { createBatch, listBatches } from '../../src/backend/services/batchService.mjs';
import { createProduct, getProductById } from '../../src/backend/services/productService.mjs';
import { createRawMaterial, listRawMaterials, updateRawMaterial } from '../../src/backend/services/rawMaterialService.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

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

function supplierMaterial(input = {}) {
  return {
    sourceType: 'supplier',
    supplier: 'SupplierCo',
    brand: 'House',
    materialName: 'Flour',
    baseUnit: 'kg',
    purchaseQuantity: 10,
    purchaseUnit: 'kg',
    purchasePrice: 5,
    purchaseCurrency: 'USD',
    customConversions: {},
    ...input
  };
}

test('supplier raw material names are composed from supplier brand and material', async () => {
  await withDataFolder(async (dataFolder) => {
    const flour = await createRawMaterial(supplierMaterial(), { dataFolder });

    assert.equal(flour.ok, true);
    assert.equal(flour.data.name, 'SupplierCo House Flour');
    assert.equal(flour.data.supplier, 'SupplierCo');
    assert.equal(flour.data.brand, 'House');
    assert.equal(flour.data.materialName, 'Flour');
  });
});

test('product detail recalculates ingredient cost after a supplier raw material price update', async () => {
  await withDataFolder(async (dataFolder) => {
    const flour = await createRawMaterial(supplierMaterial(), { dataFolder });
    const cake = await createProduct({
      name: 'Fudge Cake',
      category: 'cake',
      servingCount: 8,
      ingredients: [{ rawMaterialId: flour.data.id, quantity: 1, unit: 'kg' }]
    }, { dataFolder });

    await updateRawMaterial(flour.data.id, supplierMaterial({ purchasePrice: 10 }), { dataFolder });
    const detail = await getProductById(cake.data.id, { dataFolder });

    assert.equal(detail.ok, true);
    assert.equal(detail.data.ingredientCostUSD, 1);
    assert.equal(detail.data.totalCostUSD, 2.5);
  });
});

test('production raw materials calculate cost from recipe and update when ingredients change', async () => {
  await withDataFolder(async (dataFolder) => {
    const milk = await createRawMaterial(supplierMaterial({ materialName: 'Milk' }), { dataFolder });
    const sugar = await createRawMaterial(supplierMaterial({ materialName: 'Sugar', purchasePrice: 8 }), { dataFolder });
    const cream = await createRawMaterial({
      sourceType: 'production',
      name: 'Whipping Cream X',
      baseUnit: 'g',
      finalWeight: { quantity: 900, unit: 'g' },
      ingredients: [
        { rawMaterialId: milk.data.id, quantity: 1, unit: 'kg' },
        { rawMaterialId: sugar.data.id, quantity: 500, unit: 'g' }
      ]
    }, { dataFolder });

    await updateRawMaterial(sugar.data.id, supplierMaterial({ materialName: 'Sugar', purchasePrice: 16 }), { dataFolder });
    const listed = await listRawMaterials({ dataFolder });
    const recalculatedCream = listed.data.find((material) => material.id === cream.data.id);

    assert.equal(cream.ok, true);
    assert.equal(recalculatedCream.sourceType, 'production');
    assert.equal(recalculatedCream.purchasePriceUSD, 1.3);
    assert.equal(Math.round(recalculatedCream.costPerBaseUnitUSD * 100 * 10000) / 10000, 0.1444);
  });
});

test('batch production stores batch totals and per-unit totals separately from products', async () => {
  await withDataFolder(async (dataFolder) => {
    const flour = await createRawMaterial(supplierMaterial(), { dataFolder });
    const batch = await createBatch({
      name: 'Red Velvet',
      category: 'cake',
      servingCount: 8,
      batchQuantity: 5,
      finalWeight: { quantity: 5, unit: 'kg' },
      ingredients: [{ rawMaterialId: flour.data.id, quantity: 5, unit: 'kg' }]
    }, { dataFolder });
    const batches = await listBatches({ dataFolder });

    assert.equal(batch.ok, true);
    assert.equal(batch.data.ingredientCostUSD, 2.5);
    assert.equal(batch.data.totalCostUSD, 6.25);
    assert.equal(batch.data.perUnit.totalCostUSD, 1.25);
    assert.equal(batches.data.length, 1);
  });
});
