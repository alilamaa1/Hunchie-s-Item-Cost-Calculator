export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isPositiveNumber(value) {
  return isFiniteNumber(value) && value > 0;
}

export function isNonNegativeNumber(value) {
  return isFiniteNumber(value) && value >= 0;
}

export function isIsoTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const time = Date.parse(value);
  return Number.isFinite(time);
}

