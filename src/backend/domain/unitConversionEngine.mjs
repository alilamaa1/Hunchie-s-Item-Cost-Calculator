import { BaseUnits, CustomUnits } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { isPositiveNumber } from './validators.mjs';

const WEIGHT_UNITS = Object.freeze([BaseUnits.KG, BaseUnits.G]);
const VOLUME_UNITS = Object.freeze([BaseUnits.L, BaseUnits.ML]);
const COUNT_UNITS = Object.freeze([BaseUnits.PIECE, BaseUnits.PACK]);
const CUSTOM_MEASURING_UNITS = Object.freeze([
  CustomUnits.CUP,
  CustomUnits.TBSP,
  CustomUnits.TSP
]);

export function isWeightUnit(unit) {
  return WEIGHT_UNITS.includes(unit);
}

export function isVolumeUnit(unit) {
  return VOLUME_UNITS.includes(unit);
}

export function isCountUnit(unit) {
  return COUNT_UNITS.includes(unit);
}

export function isCustomMeasuringUnit(unit) {
  return CUSTOM_MEASURING_UNITS.includes(unit);
}

export function isSupportedUnit(unit) {
  return [
    ...WEIGHT_UNITS,
    ...VOLUME_UNITS,
    ...COUNT_UNITS,
    BaseUnits.CUSTOM,
    ...CUSTOM_MEASURING_UNITS
  ].includes(unit);
}

export function getCompatibleUnits(baseUnit, customConversions = {}) {
  const builtIn = new Set([baseUnit]);

  if (isWeightUnit(baseUnit)) {
    WEIGHT_UNITS.forEach((unit) => builtIn.add(unit));
  }

  if (isVolumeUnit(baseUnit)) {
    VOLUME_UNITS.forEach((unit) => builtIn.add(unit));
  }

  if (isCountUnit(baseUnit)) {
    builtIn.add(baseUnit);
  }

  for (const unit of CUSTOM_MEASURING_UNITS) {
    if (customConversions?.[unit]) {
      builtIn.add(unit);
    }
  }

  return [...builtIn];
}

export function convertQuantity(quantity, fromUnit, toUnit, material = undefined) {
  if (!isPositiveNumber(quantity)) {
    return failureFromCode(ErrorCodes.INGREDIENT_QUANTITY_INVALID);
  }

  if (fromUnit === toUnit) {
    return success({
      quantity,
      unit: toUnit
    });
  }

  if (isCustomMeasuringUnit(fromUnit)) {
    const conversion = material?.customConversions?.[fromUnit];

    if (!conversion) {
      return failureFromCode(ErrorCodes.UNIT_CONVERSION_MISSING);
    }

    if (!isPositiveNumber(conversion.quantity) || !conversion.unit) {
      return failureFromCode(ErrorCodes.UNIT_CONVERSION_MISSING);
    }

    return convertQuantity(quantity * conversion.quantity, conversion.unit, toUnit, material);
  }

  if (isWeightUnit(fromUnit) && isWeightUnit(toUnit)) {
    return success({
      quantity: toUnit === BaseUnits.KG ? toGrams(quantity, fromUnit) / 1000 : toGrams(quantity, fromUnit),
      unit: toUnit
    });
  }

  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    return success({
      quantity: toUnit === BaseUnits.L ? toMilliliters(quantity, fromUnit) / 1000 : toMilliliters(quantity, fromUnit),
      unit: toUnit
    });
  }

  if (isCountUnit(fromUnit) && isCountUnit(toUnit) && fromUnit === toUnit) {
    return success({
      quantity,
      unit: toUnit
    });
  }

  return failureFromCode(ErrorCodes.UNIT_CONVERSION_MISSING);
}

function toGrams(quantity, unit) {
  return unit === BaseUnits.KG ? quantity * 1000 : quantity;
}

function toMilliliters(quantity, unit) {
  return unit === BaseUnits.L ? quantity * 1000 : quantity;
}

