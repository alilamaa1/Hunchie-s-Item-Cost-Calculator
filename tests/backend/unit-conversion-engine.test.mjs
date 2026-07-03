import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import {
  convertQuantity,
  getCompatibleUnits,
  isCountUnit,
  isCustomMeasuringUnit,
  isSupportedUnit,
  isVolumeUnit,
  isWeightUnit
} from '../../src/backend/domain/unitConversionEngine.mjs';

const flour = {
  baseUnit: 'kg',
  customConversions: {
    cup: { quantity: 120, unit: 'g' },
    tbsp: { quantity: 8, unit: 'g' },
    tsp: { quantity: 2.7, unit: 'g' }
  }
};

test('weight units kg and g are recognized', () => {
  assert.equal(isWeightUnit('kg'), true);
  assert.equal(isWeightUnit('g'), true);
});

test('volume units L and ml are recognized', () => {
  assert.equal(isVolumeUnit('L'), true);
  assert.equal(isVolumeUnit('ml'), true);
});

test('count units piece and pack are recognized', () => {
  assert.equal(isCountUnit('piece'), true);
  assert.equal(isCountUnit('pack'), true);
});

test('custom units cup, tbsp, and tsp are recognized', () => {
  assert.equal(isCustomMeasuringUnit('cup'), true);
  assert.equal(isCustomMeasuringUnit('tbsp'), true);
  assert.equal(isCustomMeasuringUnit('tsp'), true);
});

test('custom is supported as a base unit label', () => {
  assert.equal(isSupportedUnit('custom'), true);
});

test('converts kg to g', () => {
  assert.equal(convertQuantity(1, 'kg', 'g').data.quantity, 1000);
});

test('converts g to kg', () => {
  assert.equal(convertQuantity(1000, 'g', 'kg').data.quantity, 1);
});

test('converts weight ingredient to raw material base weight unit', () => {
  assert.equal(convertQuantity(240, 'g', 'kg').data.quantity, 0.24);
});

test('rejects weight-to-volume conversion without custom conversion', () => {
  const result = convertQuantity(1, 'g', 'ml');

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
});

test('converts L to ml', () => {
  assert.equal(convertQuantity(1, 'L', 'ml').data.quantity, 1000);
});

test('converts ml to L', () => {
  assert.equal(convertQuantity(1000, 'ml', 'L').data.quantity, 1);
});

test('converts volume ingredient to raw material base volume unit', () => {
  assert.equal(convertQuantity(250, 'ml', 'L').data.quantity, 0.25);
});

test('rejects volume-to-weight conversion without custom conversion', () => {
  const result = convertQuantity(1, 'ml', 'g');

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
});

test('converts piece and pack directly', () => {
  assert.equal(convertQuantity(3, 'piece', 'piece').data.quantity, 3);
  assert.equal(convertQuantity(2, 'pack', 'pack').data.quantity, 2);
});

test('rejects piece to kg and pack to piece without custom conversion', () => {
  assert.equal(convertQuantity(1, 'piece', 'kg').error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
  assert.equal(convertQuantity(1, 'pack', 'piece').error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
});

test('converts raw-material-specific cup, tbsp, and tsp conversions', () => {
  assert.equal(convertQuantity(2, 'cup', 'kg', flour).data.quantity, 0.24);
  assert.equal(convertQuantity(1, 'tbsp', 'kg', flour).data.quantity, 0.008);
  assert.equal(convertQuantity(1, 'tsp', 'kg', flour).data.quantity, 0.0027);
});

test('rejects custom unit when conversion is missing or invalid', () => {
  assert.equal(convertQuantity(1, 'cup', 'kg', {}).error.code, ErrorCodes.UNIT_CONVERSION_MISSING);
  assert.equal(
    convertQuantity(1, 'cup', 'kg', { customConversions: { cup: { quantity: 0, unit: 'g' } } }).error.code,
    ErrorCodes.UNIT_CONVERSION_MISSING
  );
});

test('compatible ingredient units include base, compatible, and configured custom units', () => {
  assert.deepEqual(getCompatibleUnits('kg', flour.customConversions), ['kg', 'g', 'cup', 'tbsp', 'tsp']);
  assert.deepEqual(getCompatibleUnits('L', { cup: { quantity: 240, unit: 'ml' } }), ['L', 'ml', 'cup']);
  assert.deepEqual(getCompatibleUnits('piece', {}), ['piece']);
});

