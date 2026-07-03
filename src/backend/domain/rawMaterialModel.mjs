import { SUPPORTED_BASE_UNITS, SUPPORTED_CUSTOM_UNITS } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import {
  isFiniteNumber,
  isIsoTimestamp,
  isNonEmptyString,
  isPlainObject,
  isPositiveNumber
} from './validators.mjs';

export function validateSavedRawMaterial(input) {
  if (!isPlainObject(input) || !isNonEmptyString(input.id)) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_ID_REQUIRED);
  }

  if (!isNonEmptyString(input.name)) {
    return failureFromCode(ErrorCodes.RAW_MATERIAL_NAME_REQUIRED);
  }

  if (!SUPPORTED_BASE_UNITS.includes(input.baseUnit)) {
    return failureFromCode(ErrorCodes.BASE_UNIT_UNSUPPORTED);
  }

  if (!isPositiveNumber(input.purchaseQuantity)) {
    return failureFromCode(ErrorCodes.PURCHASE_QUANTITY_REQUIRED);
  }

  if (!isNonEmptyString(input.purchaseUnit)) {
    return failureFromCode(ErrorCodes.PURCHASE_UNIT_REQUIRED);
  }

  if (!isFiniteNumber(input.purchasePriceUSD)) {
    return failureFromCode(ErrorCodes.PURCHASE_PRICE_USD_REQUIRED);
  }

  if (!isFiniteNumber(input.purchasePriceLBP)) {
    return failureFromCode(ErrorCodes.PURCHASE_PRICE_LBP_REQUIRED);
  }

  if (!isFiniteNumber(input.costPerBaseUnitUSD)) {
    return failureFromCode(ErrorCodes.COST_PER_UNIT_USD_REQUIRED);
  }

  if (!isFiniteNumber(input.costPerBaseUnitLBP)) {
    return failureFromCode(ErrorCodes.COST_PER_UNIT_LBP_REQUIRED);
  }

  const customConversions = input.customConversions ?? {};
  if (!isPlainObject(customConversions)) {
    return failureFromCode(ErrorCodes.CUSTOM_CONVERSION_INVALID);
  }

  for (const [unit, conversion] of Object.entries(customConversions)) {
    if (!SUPPORTED_CUSTOM_UNITS.includes(unit)) {
      return failureFromCode(ErrorCodes.CUSTOM_CONVERSION_INVALID);
    }

    if (
      !isPlainObject(conversion) ||
      !isPositiveNumber(conversion.quantity) ||
      !isNonEmptyString(conversion.unit)
    ) {
      return failureFromCode(ErrorCodes.CUSTOM_CONVERSION_INVALID);
    }
  }

  if (!isIsoTimestamp(input.createdAt) || !isIsoTimestamp(input.updatedAt)) {
    return failureFromCode(ErrorCodes.TIMESTAMP_INVALID);
  }

  return success({
    ...input,
    name: input.name.trim(),
    notes: typeof input.notes === 'string' ? input.notes : '',
    customConversions
  });
}

