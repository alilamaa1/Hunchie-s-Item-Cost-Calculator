import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import { createRawMaterial } from '../../src/backend/services/rawMaterialService.mjs';
import { createProduct, getProductById, listProducts } from '../../src/backend/services/productService.mjs';
import { readJsonFile } from '../../src/backend/storage/jsonStorage.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

function rawMaterial(name, overrides = {}) {
  return {
    name,
    baseUnit: 'kg',
    purchaseQuantity: 25,
    purchaseUnit: 'kg',
    purchasePrice: 20,
    purchaseCurrency: 'USD',
    customConversions: {},
    ...overrides
  };
}

test('happy path initializes, adds flour sugar eggs, creates cake, reloads from disk, and resolves IDs', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const init = await initializeAppDataFolder({ dataFolder });
    assert.equal(init.ok, true);

    const flour = await createRawMaterial(rawMaterial('Flour', {
      customConversions: {
        cup: { quantity: 120, unit: 'g' },
        tbsp: { quantity: 8, unit: 'g' },
        tsp: { quantity: 2.7, unit: 'g' }
      }
    }), { dataFolder });
    const sugar = await createRawMaterial(rawMaterial('Sugar', {
      purchaseQuantity: 10,
      purchasePrice: 8
    }), { dataFolder });
    const eggs = await createRawMaterial(rawMaterial('Eggs', {
      baseUnit: 'piece',
      purchaseQuantity: 30,
      purchaseUnit: 'piece',
      purchasePrice: 4.5
    }), { dataFolder });

    assert.equal(flour.data.costPerBaseUnitUSD, 0.8);
    assert.equal(sugar.data.costPerBaseUnitUSD, 0.8);
    assert.equal(eggs.data.costPerBaseUnitUSD, 0.15);

    const cake = await createProduct({
      name: 'Cake',
      ingredients: [
        { rawMaterialId: flour.data.id, quantity: 2, unit: 'cup' },
        { rawMaterialId: sugar.data.id, quantity: 200, unit: 'g' },
        { rawMaterialId: eggs.data.id, quantity: 3, unit: 'piece' }
      ]
    }, { dataFolder });

    assert.equal(cake.ok, true);
    assert.ok(cake.data.ingredients.every((ingredient) => ingredient.portionCostUSD > 0 && ingredient.portionCostLBP > 0));
    assert.equal(cake.data.ingredientCostUSD, cake.data.ingredients.reduce((sum, ingredient) => sum + ingredient.portionCostUSD, 0));
    assert.equal(cake.data.totalCostUSD, cake.data.ingredientCostUSD * 2.5);

    const productsAfterReopen = await listProducts({ dataFolder });
    const detailAfterReopen = await getProductById(productsAfterReopen.data[0].id, { dataFolder });

    assert.equal(productsAfterReopen.data.length, 1);
    assert.equal(detailAfterReopen.data.ingredients[0].rawMaterialName, 'Flour');
    assert.equal(detailAfterReopen.data.ingredients[1].rawMaterialName, 'Sugar');
    assert.equal(detailAfterReopen.data.ingredients[2].rawMaterialName, 'Eggs');
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('break scenarios fail clearly and do not overwrite data unexpectedly', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    await initializeAppDataFolder({ dataFolder });
    const before = await readFile(join(dataFolder, 'raw_materials.json'), 'utf8');

    assert.equal((await createRawMaterial(rawMaterial(''), { dataFolder })).error.code, ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
    assert.equal((await createRawMaterial(rawMaterial('Bad', { purchaseQuantity: -1 }), { dataFolder })).error.code, ErrorCodes.PURCHASE_QUANTITY_INVALID);
    assert.equal(await readFile(join(dataFolder, 'raw_materials.json'), 'utf8'), before);

    await writeFile(join(dataFolder, 'raw_materials.json'), '{bad json');
    const corrupted = await readJsonFile(join(dataFolder, 'raw_materials.json'));
    assert.equal(corrupted.error.code, ErrorCodes.FILE_INVALID_JSON);
    assert.equal(await readFile(join(dataFolder, 'raw_materials.json'), 'utf8'), '{bad json');
  } finally {
    await removeTempAppDataFolder(parent);
  }
});
