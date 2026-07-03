import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateNextProductId,
  generateNextRawMaterialId,
  preserveProductId,
  preserveRawMaterialId
} from '../../src/backend/domain/idGenerator.mjs';

test('empty raw material list generates RM-0001', () => {
  assert.equal(generateNextRawMaterialId([]), 'RM-0001');
});

test('raw material ID generation scans existing records', () => {
  assert.equal(
    generateNextRawMaterialId([{ id: 'RM-0001' }, { id: 'RM-0002' }]),
    'RM-0003'
  );
});

test('raw material ID generation ignores malformed IDs safely', () => {
  assert.equal(
    generateNextRawMaterialId([{ id: 'RM-0002' }, { id: 'bad' }, { id: null }]),
    'RM-0003'
  );
});

test('editing raw material preserves the existing ID', () => {
  assert.deepEqual(
    preserveRawMaterialId({ id: 'RM-0001' }, { id: 'RM-9999', name: 'Flour' }),
    { id: 'RM-0001', name: 'Flour' }
  );
});

test('empty product list generates PR-0001', () => {
  assert.equal(generateNextProductId([]), 'PR-0001');
});

test('product ID generation scans existing records', () => {
  assert.equal(
    generateNextProductId([{ id: 'PR-0001' }, { id: 'PR-0002' }]),
    'PR-0003'
  );
});

test('product ID generation ignores malformed IDs safely', () => {
  assert.equal(
    generateNextProductId([{ id: 'PR-0002' }, { id: 'PR-XYZ' }, {}]),
    'PR-0003'
  );
});

test('editing product preserves the existing ID', () => {
  assert.deepEqual(
    preserveProductId({ id: 'PR-0001' }, { id: 'PR-9999', name: 'Cake' }),
    { id: 'PR-0001', name: 'Cake' }
  );
});

