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

const SUPPORTED_INGREDIENT_UNITS = Object.freeze([
  ...SUPPORTED_BASE_UNITS,
  ...SUPPORTED_CUSTOM_UNITS
]);

export function validateSavedProduct(input) {
  if (!isPlainObject(input) || !isNonEmptyString(input.id)) {
    return failureFromCode(ErrorCodes.PRODUCT_ID_REQUIRED);
  }

  if (!isNonEmptyString(input.name)) {
    return failureFromCode(ErrorCodes.PRODUCT_NAME_REQUIRED);
  }

  if (!Array.isArray(input.ingredients)) {
    return failureFromCode(ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
  }

  for (const ingredient of input.ingredients) {
    const validation = validateSavedIngredient(ingredient);
    if (!validation.ok) {
      return validation;
    }
  }

  if (!isFiniteNumber(input.ingredientCostUSD) || !isFiniteNumber(input.ingredientCostLBP)) {
    return failureFromCode(ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
  }

  if (!isFiniteNumber(input.totalCostUSD) || !isFiniteNumber(input.totalCostLBP)) {
    return failureFromCode(ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
  }

  if (!isIsoTimestamp(input.createdAt) || !isIsoTimestamp(input.updatedAt)) {
    return failureFromCode(ErrorCodes.TIMESTAMP_INVALID);
  }

  return success({
    ...input,
    name: input.name.trim()
  });
}

export function validateSavedIngredient(input) {
  if (!isPlainObject(input) || !isNonEmptyString(input.rawMaterialId)) {
    return failureFromCode(ErrorCodes.INGREDIENT_MATERIAL_REQUIRED);
  }

  if (!isPositiveNumber(input.quantity)) {
    return failureFromCode(ErrorCodes.INGREDIENT_QUANTITY_INVALID);
  }

  if (!SUPPORTED_INGREDIENT_UNITS.includes(input.unit)) {
    return failureFromCode(ErrorCodes.INGREDIENT_UNIT_REQUIRED);
  }

  if (!isFiniteNumber(input.convertedQuantity) || !isNonEmptyString(input.convertedUnit)) {
    return failureFromCode(ErrorCodes.UNIT_CONVERSION_MISSING);
  }

  if (!isFiniteNumber(input.portionCostUSD) || !isFiniteNumber(input.portionCostLBP)) {
    return failureFromCode(ErrorCodes.PRODUCT_INGREDIENTS_REQUIRED);
  }

  return success(input);
}
