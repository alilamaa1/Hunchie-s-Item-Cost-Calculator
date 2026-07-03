import { DEFAULT_USD_TO_LBP } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { isNonNegativeNumber, isPositiveNumber } from './validators.mjs';

export function validateExchangeRate(rate) {
  if (!isPositiveNumber(rate)) {
    return failureFromCode(ErrorCodes.EXCHANGE_RATE_INVALID);
  }

  return success(rate);
}

export function usdToLbp(usdAmount, rate = DEFAULT_USD_TO_LBP) {
  const rateValidation = validateExchangeRate(rate);
  if (!rateValidation.ok) {
    return rateValidation;
  }

  return success(usdAmount * rate);
}

export function lbpToUsd(lbpAmount, rate = DEFAULT_USD_TO_LBP) {
  const rateValidation = validateExchangeRate(rate);
  if (!rateValidation.ok) {
    return rateValidation;
  }

  return success(lbpAmount / rate);
}

export function normalizeMoneyByCurrency(amount, currency, rate = DEFAULT_USD_TO_LBP) {
  if (!isNonNegativeNumber(amount)) {
    return failureFromCode(ErrorCodes.PURCHASE_PRICE_INVALID);
  }

  if (currency === 'USD') {
    const lbp = usdToLbp(amount, rate);
    return lbp.ok ? success({ usd: amount, lbp: lbp.data }) : lbp;
  }

  if (currency === 'LBP') {
    const usd = lbpToUsd(amount, rate);
    return usd.ok ? success({ usd: usd.data, lbp: amount }) : usd;
  }

  return failureFromCode(ErrorCodes.CURRENCY_UNSUPPORTED);
}

export function formatUsdForDisplay(amount) {
  return Number(amount).toFixed(2);
}

export function roundLbpForDisplay(amount) {
  return Math.round(amount);
}

export function assertStoredMoneyNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

