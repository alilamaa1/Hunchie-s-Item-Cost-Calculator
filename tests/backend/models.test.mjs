import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_USD_TO_LBP } from '../../src/shared/constants.mjs';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { validateSavedProduct } from '../../src/backend/domain/productModel.mjs';
import { validateSavedRawMaterial } from '../../src/backend/domain/rawMaterialModel.mjs';
import { createDefaultSettings, validateSettings } from '../../src/backend/domain/settingsModel.mjs';

const now = '2026-06-28T12:00:00.000Z';

function validRawMaterial(overrides = {}) {
  return {
    id: 'RM-0001',
    name: 'Flour',
    baseUnit: 'kg',
    purchaseQuantity: 25,
    purchaseUnit: 'kg',
    purchasePriceUSD: 20,
    purchasePriceLBP: 1800000,
    costPerBaseUnitUSD: 0.8,
    costPerBaseUnitLBP: 72000,
    customConversions: {
      cup: { quantity: 120, unit: 'g' }
    },
    notes: 'Bread flour',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function validProduct(overrides = {}) {
  return {
    id: 'PR-0001',
    name: 'Chocolate Cake',
    ingredients: [
      {
        rawMaterialId: 'RM-0001',
        quantity: 2,
        unit: 'cup',
        convertedQuantity: 0.24,
        convertedUnit: 'kg',
        portionCostUSD: 0.192,
        portionCostLBP: 17280
      }
    ],
    ingredientCostUSD: 0.192,
    ingredientCostLBP: 17280,
    totalCostUSD: 0.48,
    totalCostLBP: 43200,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

test('raw material missing ID fails saved-object validation', () => {
  const result = validateSavedRawMaterial(validRawMaterial({ id: undefined }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.RAW_MATERIAL_ID_REQUIRED);
});

test('raw material missing name fails validation', () => {
  const result = validateSavedRawMaterial(validRawMaterial({ name: ' ' }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
});

test('unsupported raw material base unit fails validation', () => {
  const result = validateSavedRawMaterial(validRawMaterial({ baseUnit: 'stone' }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.BASE_UNIT_UNSUPPORTED);
});

test('raw material missing purchase quantity or unit fails validation', () => {
  assert.equal(
    validateSavedRawMaterial(validRawMaterial({ purchaseQuantity: undefined })).error.code,
    ErrorCodes.PURCHASE_QUANTITY_REQUIRED
  );
  assert.equal(
    validateSavedRawMaterial(validRawMaterial({ purchaseUnit: undefined })).error.code,
    ErrorCodes.PURCHASE_UNIT_REQUIRED
  );
});

test('normalized raw material requires both purchase price fields', () => {
  assert.equal(
    validateSavedRawMaterial(validRawMaterial({ purchasePriceUSD: undefined })).error.code,
    ErrorCodes.PURCHASE_PRICE_USD_REQUIRED
  );
  assert.equal(
    validateSavedRawMaterial(validRawMaterial({ purchasePriceLBP: undefined })).error.code,
    ErrorCodes.PURCHASE_PRICE_LBP_REQUIRED
  );
});

test('normalized raw material requires both cost-per-unit fields', () => {
  assert.equal(
    validateSavedRawMaterial(validRawMaterial({ costPerBaseUnitUSD: undefined })).error.code,
    ErrorCodes.COST_PER_UNIT_USD_REQUIRED
  );
  assert.equal(
    validateSavedRawMaterial(validRawMaterial({ costPerBaseUnitLBP: undefined })).error.code,
    ErrorCodes.COST_PER_UNIT_LBP_REQUIRED
  );
});

test('raw material without custom conversions remains valid', () => {
  const result = validateSavedRawMaterial(validRawMaterial({ customConversions: undefined }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.data.customConversions, {});
});

test('omitted raw material notes become an empty string', () => {
  const result = validateSavedRawMaterial(validRawMaterial({ notes: undefined }));

  assert.equal(result.ok, true);
  assert.equal(result.data.notes, '');
});

test('raw material invalid timestamp fails validation', () => {
  const result = validateSavedRawMaterial(validRawMaterial({ createdAt: 'not a date' }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.TIMESTAMP_INVALID);
});

test('product missing ID fails saved-object validation', () => {
  const result = validateSavedProduct(validProduct({ id: undefined }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.PRODUCT_ID_REQUIRED);
});

test('product missing name fails validation', () => {
  const result = validateSavedProduct(validProduct({ name: '' }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.PRODUCT_NAME_REQUIRED);
});

test('product missing ingredients array fails validation', () => {
  const result = validateSavedProduct(validProduct({ ingredients: undefined }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
});

test('product ingredient without raw material ID fails validation', () => {
  const product = validProduct({
    ingredients: [{ ...validProduct().ingredients[0], rawMaterialId: '' }]
  });

  const result = validateSavedProduct(product);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.INGREDIENT_MATERIAL_REQUIRED);
});

test('product ingredient quantity must be positive and unit must be supported', () => {
  const invalidQuantity = validateSavedProduct(validProduct({
    ingredients: [{ ...validProduct().ingredients[0], quantity: 0 }]
  }));
  const invalidUnit = validateSavedProduct(validProduct({
    ingredients: [{ ...validProduct().ingredients[0], unit: 'scoop' }]
  }));

  assert.equal(invalidQuantity.error.code, ErrorCodes.INGREDIENT_QUANTITY_INVALID);
  assert.equal(invalidUnit.error.code, ErrorCodes.INGREDIENT_UNIT_REQUIRED);
});

test('saved product ingredient includes converted amount and unit', () => {
  const result = validateSavedProduct(validProduct({
    ingredients: [{ ...validProduct().ingredients[0], convertedQuantity: undefined }]
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
});

test('saved product ingredient includes both portion cost fields', () => {
  const result = validateSavedProduct(validProduct({
    ingredients: [{ ...validProduct().ingredients[0], portionCostUSD: undefined }]
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
});

test('saved product includes numeric total costs', () => {
  const result = validateSavedProduct(validProduct({ totalCostUSD: '0.192' }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
});

test('saved product includes numeric ingredient costs', () => {
  const result = validateSavedProduct(validProduct({ ingredientCostUSD: undefined }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
});

test('product invalid timestamp fails validation', () => {
  const result = validateSavedProduct(validProduct({ updatedAt: 'invalid' }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.TIMESTAMP_INVALID);
});

test('settings without exchange rate fail validation', () => {
  const result = validateSettings({
    currency: {},
    dataFolder: 'Desktop/Item Cost Calculator',
    appVersion: '1.0.0'
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.EXCHANGE_RATE_INVALID);
});

test('settings can store visible data folder path', () => {
  const result = validateSettings(createDefaultSettings({
    dataFolder: 'Desktop/Item Cost Calculator'
  }));

  assert.equal(result.ok, true);
  assert.equal(result.data.dataFolder, 'Desktop/Item Cost Calculator');
});

test('settings can store app version', () => {
  const result = validateSettings(createDefaultSettings({
    dataFolder: 'Desktop/Item Cost Calculator',
    appVersion: '1.0.0'
  }));

  assert.equal(result.ok, true);
  assert.equal(result.data.appVersion, '1.0.0');
});

test('default settings include usdToLbp 90000', () => {
  const settings = createDefaultSettings({ dataFolder: 'Desktop/Item Cost Calculator' });

  assert.equal(settings.currency.usdToLbp, DEFAULT_USD_TO_LBP);
  assert.equal(settings.formulas.totalCostMultiplier, 2.5);
});
