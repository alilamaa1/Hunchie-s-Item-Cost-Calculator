import { DEFAULT_APP_VERSION, DEFAULT_USD_TO_LBP } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { isNonEmptyString, isPlainObject, isPositiveNumber } from './validators.mjs';

export const DEFAULT_TOTAL_COST_MULTIPLIER = 2.5;

export function createDefaultSettings(options = {}) {
  return {
    currency: {
      usdToLbp: options.usdToLbp ?? DEFAULT_USD_TO_LBP
    },
    formulas: {
      totalCostMultiplier: options.totalCostMultiplier ?? DEFAULT_TOTAL_COST_MULTIPLIER
    },
    dataFolder: options.dataFolder ?? '',
    appVersion: options.appVersion ?? DEFAULT_APP_VERSION
  };
}

export function validateSettings(input) {
  if (!isPlainObject(input) || !isPlainObject(input.currency)) {
    return failureFromCode(ErrorCodes.SETTINGS_CURRENCY_REQUIRED);
  }

  if (!isPositiveNumber(input.currency.usdToLbp)) {
    return failureFromCode(ErrorCodes.EXCHANGE_RATE_INVALID);
  }

  if (!isPlainObject(input.formulas) || !isPositiveNumber(input.formulas.totalCostMultiplier)) {
    return failureFromCode(ErrorCodes.FORMULA_MULTIPLIER_INVALID);
  }

  if (!isNonEmptyString(input.dataFolder)) {
    return failureFromCode(ErrorCodes.SETTINGS_DATA_FOLDER_REQUIRED);
  }

  if (!isNonEmptyString(input.appVersion)) {
    return failureFromCode(ErrorCodes.SETTINGS_APP_VERSION_REQUIRED);
  }

  return success({
    currency: {
      usdToLbp: input.currency.usdToLbp
    },
    formulas: {
      totalCostMultiplier: input.formulas.totalCostMultiplier
    },
    dataFolder: input.dataFolder,
    appVersion: input.appVersion
  });
}
