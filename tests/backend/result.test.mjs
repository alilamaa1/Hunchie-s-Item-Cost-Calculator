import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCodes, ErrorMessages, getErrorMessage } from '../../src/shared/errors.mjs';
import { failure, failureFromCode, success } from '../../src/shared/result.mjs';
import { validateRawMaterialDraft } from '../../src/backend/services/rawMaterialDraft.mjs';

test('success result shape is ok true with data', () => {
  assert.deepEqual(success({ id: 'RM-0001' }), {
    ok: true,
    data: { id: 'RM-0001' }
  });
});

test('failure result shape is ok false with error', () => {
  assert.deepEqual(failure(ErrorCodes.FILE_SAVE_ERROR, 'Save failed.'), {
    ok: false,
    error: {
      code: ErrorCodes.FILE_SAVE_ERROR,
      message: 'Save failed.'
    }
  });
});

test('validation errors include stable machine-readable codes', () => {
  const result = failureFromCode(ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
});

test('every error code maps to a non-empty human-readable message', () => {
  for (const code of Object.values(ErrorCodes)) {
    assert.equal(typeof ErrorMessages[code], 'string');
    assert.ok(ErrorMessages[code].length > 0);
    assert.equal(getErrorMessage(code), ErrorMessages[code]);
  }
});

test('expected user mistakes return failure results instead of uncaught exceptions', () => {
  const result = validateRawMaterialDraft({ name: '   ' });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
  assert.equal(typeof result.error.message, 'string');
});

