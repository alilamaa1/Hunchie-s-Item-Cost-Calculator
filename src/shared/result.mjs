import { getErrorMessage } from './errors.mjs';

export function success(data) {
  return {
    ok: true,
    data
  };
}

export function failure(code, message, details = undefined) {
  const error = { code, message };

  if (details !== undefined) {
    error.details = details;
  }

  return {
    ok: false,
    error
  };
}

export function failureFromCode(code, details = undefined) {
  return failure(code, getErrorMessage(code), details);
}
