export type Unit = 'kg' | 'g' | 'liter' | 'ml' | 'tray' | 'pcs' | 'oz' | 'lb';

export interface RawMaterial {
  id: string;
  name: string;
  baseUnit: string; // e.g. 'kg', 'tray', 'liter'
  usdCost: number; // cost per baseUnit
  category?: string;
  icon?: string; // lucide icon name or emoji identifier
}

export interface RecipeIngredient {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: string;
  unitCostUsd: number; // calculated base cost per unit used
}

export interface Product {
  id: string;
  name: string;
  category: 'Cakes' | 'Viennoiserie' | 'Breads' | 'Petits Fours' | 'Tarts' | 'Pastries';
  yieldWeightOrBatch: string; // e.g. '1.2 kg', '85 g', 'Batch (24)'
  unitsProduced: number;
  ingredients: RecipeIngredient[];
  laborMultiplier: number; // e.g. 1.5
  packagingCostPerUnitUsd: number; // e.g. 0.15
  imageUrl: string;
}

export interface AppSettings {
  bakeryName: string;
  lbpRate: number; // e.g. 90000
  currencySymbol: string;
  secondaryCurrencySymbol: string;
}

export type ActiveTab = 'home' | 'materials' | 'products' | 'settings' | 'builder';
