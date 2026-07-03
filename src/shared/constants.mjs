export const DEFAULT_USD_TO_LBP = 90000;
export const APP_DATA_FOLDER_NAME = 'Item Cost Calculator';
export const DEFAULT_APP_VERSION = '1.0.0';

export const Currencies = Object.freeze({
  USD: 'USD',
  LBP: 'LBP'
});

export const BaseUnits = Object.freeze({
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'ml',
  PIECE: 'piece',
  PACK: 'pack',
  CUSTOM: 'custom'
});

export const CustomUnits = Object.freeze({
  CUP: 'cup',
  TBSP: 'tbsp',
  TSP: 'tsp'
});

export const REQUIRED_DATA_FILES = Object.freeze([
  'raw_materials.json',
  'products.json',
  'settings.json',
  'users.json'
]);

export const SUPPORTED_BASE_UNITS = Object.freeze(Object.values(BaseUnits));
export const SUPPORTED_CUSTOM_UNITS = Object.freeze(Object.values(CustomUnits));
