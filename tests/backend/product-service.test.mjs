import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import { createRawMaterial, deleteRawMaterial, updateRawMaterial } from '../../src/backend/services/rawMaterialService.mjs';
import {
  calculateIngredientPortion,
  calculateProductDraft,
  cleanupProductInput,
  createProduct,
  deleteProduct,
  getAvailableIngredientUnits,
  getProductById,
  listProducts,
  removeIngredientByRawMaterialId,
  replaceIngredientRawMaterial,
  searchProducts,
  updateProduct
} from '../../src/backend/services/productService.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

function materialInput(name, overrides = {}) {
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

function productInput(materials, overrides = {}) {
  return {
    name: ' Chocolate Cake ',
    ingredients: [
      { rawMaterialId: materials.flour.id, quantity: '2', unit: 'cup' },
      { rawMaterialId: materials.sugar.id, quantity: 200, unit: 'g' },
      { rawMaterialId: materials.eggs.id, quantity: 3, unit: 'piece' },
      { rawMaterialId: '', quantity: '', unit: '' }
    ],
    ...overrides
  };
}

async function withDataFolder(fn) {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    await initializeAppDataFolder({ dataFolder });
    const flour = await createRawMaterial(materialInput('Flour', {
      customConversions: {
        cup: { quantity: 120, unit: 'g' },
        tbsp: { quantity: 8, unit: 'g' },
        tsp: { quantity: 2.7, unit: 'g' }
      }
    }), { dataFolder });
    const sugar = await createRawMaterial(materialInput('Sugar', {
      purchaseQuantity: 10,
      purchasePrice: 8
    }), { dataFolder });
    const eggs = await createRawMaterial(materialInput('Eggs', {
      baseUnit: 'piece',
      purchaseQuantity: 30,
      purchaseUnit: 'piece',
      purchasePrice: 4.5
    }), { dataFolder });

    await fn(dataFolder, {
      flour: flour.data,
      sugar: sugar.data,
      eggs: eggs.data
    });
  } finally {
    await removeTempAppDataFolder(parent);
  }
}

test('product input cleanup trims name, removes final empty row, keeps partial rows, and normalizes quantities', async () => {
  await withDataFolder(async (_dataFolder, materials) => {
    const cleaned = cleanupProductInput(productInput(materials, {
      ingredients: [
        { rawMaterialId: materials.flour.id, quantity: '2', unit: 'cup' },
        { rawMaterialId: materials.sugar.id, quantity: '', unit: 'g' },
        { rawMaterialId: '', quantity: '', unit: '' }
      ]
    }));

    assert.equal(cleaned.name, 'Chocolate Cake');
    assert.equal(cleaned.ingredients.length, 2);
    assert.equal(cleaned.ingredients[0].quantity, 2);
    assert.equal(cleaned.ingredients[1].rawMaterialId, materials.sugar.id);
  });
});

test('product validation rejects missing names, ingredients, partial rows, invalid quantities, unknown material, missing unit, duplicates, and missing conversions', async () => {
  await withDataFolder(async (_dataFolder, materials) => {
    const allMaterials = Object.values(materials);

    assert.equal(calculateProductDraft(productInput(materials, { name: ' ' }), allMaterials).error.code, ErrorCodes.PRODUCT_NAME_REQUIRED);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: '', quantity: '', unit: '' }] }), allMaterials).error.code, ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.flour.id, quantity: '', unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_QUANTITY_REQUIRED);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: '', quantity: 2, unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_MATERIAL_REQUIRED);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.flour.id, quantity: 0, unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_QUANTITY_INVALID);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.flour.id, quantity: -2, unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_QUANTITY_INVALID);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.flour.id, quantity: 'abc', unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_QUANTITY_INVALID);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: 'RM-9999', quantity: 1, unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.MISSING_RAW_MATERIAL);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.flour.id, quantity: 1, unit: '' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_UNIT_REQUIRED);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.flour.id, quantity: 1, unit: 'kg' }, { rawMaterialId: materials.flour.id, quantity: 2, unit: 'kg' }] }), allMaterials).error.code, ErrorCodes.INGREDIENT_DUPLICATE_RAW_MATERIAL);
    assert.equal(calculateProductDraft(productInput(materials, { ingredients: [{ rawMaterialId: materials.sugar.id, quantity: 1, unit: 'cup' }] }), allMaterials).error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
  });
});

test('available ingredient units depend on selected raw material', async () => {
  await withDataFolder(async (_dataFolder, materials) => {
    assert.deepEqual(getAvailableIngredientUnits(materials.flour), ['kg', 'g', 'cup', 'tbsp', 'tsp']);
    assert.deepEqual(getAvailableIngredientUnits(materials.eggs), ['piece']);
  });
});

test('ingredient portion and product totals calculate with base, compatible, custom, and piece units', async () => {
  await withDataFolder(async (_dataFolder, materials) => {
    assert.equal(calculateIngredientPortion(materials.flour, { quantity: 1, unit: 'kg' }, 90000).data.portionCostUSD, 0.8);
    assert.equal(calculateIngredientPortion(materials.flour, { quantity: 500, unit: 'g' }, 90000).data.portionCostUSD, 0.4);
    assert.equal(calculateIngredientPortion(materials.flour, { quantity: 2, unit: 'cup' }, 90000).data.portionCostUSD, 0.192);
    assert.equal(calculateIngredientPortion(materials.flour, { quantity: 1, unit: 'tbsp' }, 90000).data.portionCostUSD, 0.0064);
    assert.equal(calculateIngredientPortion(materials.flour, { quantity: 1, unit: 'tsp' }, 90000).data.portionCostUSD, 0.00216);
    assert.equal(calculateIngredientPortion(materials.eggs, { quantity: 3, unit: 'piece' }, 90000).data.portionCostUSD, 0.45);

    const draft = calculateProductDraft(productInput(materials), Object.values(materials), { exchangeRate: 90000 });
    assert.equal(draft.ok, true);
    assert.equal(draft.data.ingredients[0].convertedQuantity, 0.24);
    assert.equal(draft.data.ingredients[0].convertedUnit, 'kg');
    assert.ok(draft.data.ingredients.every((ingredient) => typeof ingredient.portionCostUSD === 'number' && typeof ingredient.portionCostLBP === 'number'));
    assert.equal(draft.data.totalCostUSD, draft.data.ingredients.reduce((sum, ingredient) => sum + ingredient.portionCostUSD, 0));
    assert.equal(draft.data.totalCostLBP, draft.data.ingredients.reduce((sum, ingredient) => sum + ingredient.portionCostLBP, 0));
  });
});

test('creates, updates, lists, gets, searches, and persists products', async () => {
  await withDataFolder(async (dataFolder, materials) => {
    const created = await createProduct(productInput(materials), {
      dataFolder,
      now: () => '2026-06-28T12:00:00.000Z'
    });
    const edited = await updateProduct(created.data.id, productInput(materials, {
      name: 'Cake',
      ingredients: [{ rawMaterialId: materials.flour.id, quantity: 1, unit: 'kg' }]
    }), {
      dataFolder,
      now: () => '2026-06-28T13:00:00.000Z'
    });

    assert.equal(created.ok, true);
    assert.equal(created.data.id, 'PR-0001');
    assert.equal(created.data.createdAt, '2026-06-28T12:00:00.000Z');
    assert.equal(edited.data.id, 'PR-0001');
    assert.equal(edited.data.createdAt, '2026-06-28T12:00:00.000Z');
    assert.equal(edited.data.updatedAt, '2026-06-28T13:00:00.000Z');
    assert.equal((await listProducts({ dataFolder })).data[0].ingredientCount, 1);
    assert.equal((await getProductById('PR-0001', { dataFolder })).data.ingredients[0].rawMaterialName, 'Flour');
    assert.equal((await searchProducts('CAKE', { dataFolder })).data[0].name, 'Cake');
    assert.equal(JSON.parse(await readFile(join(dataFolder, 'products.json'), 'utf8')).length, 1);
  });
});

test('product services return not found and preserve raw materials on delete', async () => {
  await withDataFolder(async (dataFolder, materials) => {
    const created = await createProduct(productInput(materials), { dataFolder });

    assert.equal((await updateProduct('PR-9999', productInput(materials), { dataFolder })).error.code, ErrorCodes.PRODUCT_NOT_FOUND);
    assert.equal((await getProductById('PR-9999', { dataFolder })).error.code, ErrorCodes.PRODUCT_NOT_FOUND);
    assert.equal((await deleteProduct('PR-9999', { dataFolder })).error.code, ErrorCodes.PRODUCT_NOT_FOUND);
    assert.equal((await deleteProduct(created.data.id, { dataFolder })).ok, true);
    assert.equal(JSON.parse(await readFile(join(dataFolder, 'raw_materials.json'), 'utf8')).length, 3);
  });
});

test('product recalculates from latest raw material costs', async () => {
  await withDataFolder(async (dataFolder, materials) => {
    const created = await createProduct(productInput(materials, {
      ingredients: [{ rawMaterialId: materials.flour.id, quantity: 1, unit: 'kg' }]
    }), { dataFolder });
    await updateRawMaterial(materials.flour.id, materialInput('Flour', {
      purchasePrice: 40,
      customConversions: materials.flour.customConversions
    }), { dataFolder });
    const edited = await updateProduct(created.data.id, productInput(materials, {
      ingredients: [{ rawMaterialId: materials.flour.id, quantity: 1, unit: 'kg' }]
    }), { dataFolder });

    assert.equal(edited.data.totalCostUSD, 1.6);
  });
});

test('product ingredient quantity 100 is preserved exactly in both same-unit and converted-unit paths', async () => {
  await withDataFolder(async (_dataFolder, materials) => {
    const sameUnit = calculateProductDraft({
      name: 'Sugar Batch',
      ingredients: [{ rawMaterialId: materials.sugar.id, quantity: 100, unit: 'kg' }]
    }, Object.values(materials));
    const convertedUnit = calculateProductDraft({
      name: 'Sugar Batch',
      ingredients: [{ rawMaterialId: materials.sugar.id, quantity: 100, unit: 'g' }]
    }, Object.values(materials));

    assert.equal(sameUnit.ok, true);
    assert.equal(sameUnit.data.ingredients[0].quantity, 100);
    assert.equal(sameUnit.data.ingredients[0].convertedQuantity, 100);
    assert.equal(convertedUnit.ok, true);
    assert.equal(convertedUnit.data.ingredients[0].quantity, 100);
    assert.equal(convertedUnit.data.ingredients[0].convertedQuantity, 0.1);
  });
});

test('raw material delete blocks used material, or allows missing references by policy', async () => {
  await withDataFolder(async (dataFolder, materials) => {
    await createProduct(productInput(materials), { dataFolder });

    assert.equal((await deleteRawMaterial(materials.flour.id, { dataFolder })).error.code, ErrorCodes.RAW_MATERIAL_IN_USE);
    assert.equal((await deleteRawMaterial(materials.flour.id, { dataFolder, deletePolicy: 'allow-missing-references' })).ok, true);
    const detail = await getProductById('PR-0001', { dataFolder });
    assert.equal(detail.data.warnings[0].code, ErrorCodes.MISSING_RAW_MATERIAL);
    assert.equal(detail.data.ingredients[0].missingRawMaterial, true);
  });
});

test('missing material can be removed or replaced before saving', async () => {
  await withDataFolder(async (dataFolder, materials) => {
    await createProduct(productInput(materials), { dataFolder });
    await deleteRawMaterial(materials.flour.id, { dataFolder, deletePolicy: 'allow-missing-references' });

    const detail = await getProductById('PR-0001', { dataFolder });
    const removed = removeIngredientByRawMaterialId(detail.data, materials.flour.id);
    const savedAfterRemoval = await updateProduct('PR-0001', removed, { dataFolder });

    assert.equal(savedAfterRemoval.ok, true);
  });
});

test('missing material can be replaced before saving', async () => {
  await withDataFolder(async (dataFolder, materials) => {
    const product = await createProduct({
      name: 'Flour Test',
      ingredients: [{ rawMaterialId: materials.flour.id, quantity: 1, unit: 'kg' }]
    }, { dataFolder });
    await deleteRawMaterial(materials.flour.id, { dataFolder, deletePolicy: 'allow-missing-references' });

    const detail = await getProductById(product.data.id, { dataFolder });
    const replaced = replaceIngredientRawMaterial(detail.data, materials.flour.id, {
      rawMaterialId: materials.eggs.id,
      unit: 'piece'
    });
    replaced.ingredients[0].quantity = 2;

    const savedAfterReplacement = await updateProduct(product.data.id, replaced, { dataFolder });
    assert.equal(savedAfterReplacement.ok, true);
  });
});
