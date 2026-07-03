import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import {
  assertStoredMoneyNumber,
  formatUsdForDisplay,
  lbpToUsd,
  normalizeMoneyByCurrency,
  roundLbpForDisplay,
  usdToLbp
} from '../../src/backend/domain/currencyEngine.mjs';

test('converts USD to LBP using exchange rate', () => {
  assert.equal(usdToLbp(20, 90000).data, 1800000);
});

test('converts LBP to USD using exchange rate', () => {
  assert.equal(lbpToUsd(1800000, 90000).data, 20);
});

test('custom exchange rate changes output', () => {
  assert.equal(usdToLbp(20, 100000).data, 2000000);
});

test('zero exchange rate is rejected', () => {
  const result = usdToLbp(20, 0);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.EXCHANGE_RATE_INVALID);
});

test('negative exchange rate is rejected', () => {
  const result = lbpToUsd(1800000, -90000);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.EXCHANGE_RATE_INVALID);
});

test('USD display formatter rounds to 2 decimals', () => {
  assert.equal(formatUsdForDisplay(1.236), '1.24');
});

test('internal precision can preserve portion cost values', () => {
  const normalized = normalizeMoneyByCurrency(0.192, 'USD', 90000);

  assert.equal(normalized.ok, true);
  assert.equal(normalized.data.usd, 0.192);
});

test('LBP display values round to whole LBP', () => {
  assert.equal(roundLbpForDisplay(17280.4), 17280);
  assert.equal(roundLbpForDisplay(17280.6), 17281);
});

test('stored money values are numbers', () => {
  const normalized = normalizeMoneyByCurrency(1800000, 'LBP', 90000);

  assert.equal(normalized.ok, true);
  assert.equal(assertStoredMoneyNumber(normalized.data.usd), true);
  assert.equal(assertStoredMoneyNumber(normalized.data.lbp), true);
});

