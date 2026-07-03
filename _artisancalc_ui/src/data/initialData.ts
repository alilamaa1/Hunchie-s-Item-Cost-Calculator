import { RawMaterial, Product } from '../types';

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  {
    id: 'mat-1',
    name: 'T55 Flour',
    baseUnit: 'kg',
    usdCost: 0.85,
    category: 'Dry Goods',
    icon: 'flour'
  },
  {
    id: 'mat-2',
    name: 'Eggs (Large)',
    baseUnit: 'tray',
    usdCost: 4.20,
    category: 'Dairy & Eggs',
    icon: 'egg'
  },
  {
    id: 'mat-3',
    name: 'Whole Milk',
    baseUnit: 'liter',
    usdCost: 1.50,
    category: 'Dairy & Eggs',
    icon: 'milk'
  },
  {
    id: 'mat-4',
    name: 'Unsalted Butter',
    baseUnit: 'kg',
    usdCost: 8.50,
    category: 'Dairy & Eggs',
    icon: 'butter'
  },
  {
    id: 'mat-5',
    name: 'High Protein Flour (T55)',
    baseUnit: 'kg',
    usdCost: 1.20,
    category: 'Dry Goods',
    icon: 'flour'
  },
  {
    id: 'mat-6',
    name: 'European Butter (82%)',
    baseUnit: 'kg',
    usdCost: 8.50,
    category: 'Dairy & Eggs',
    icon: 'butter'
  },
  {
    id: 'mat-7',
    name: 'Fresh Yeast',
    baseUnit: 'kg',
    usdCost: 6.00,
    category: 'Leavening',
    icon: 'yeast'
  },
  {
    id: 'mat-8',
    name: 'Valrhona Cocoa Powder',
    baseUnit: 'kg',
    usdCost: 14.50,
    category: 'Chocolate',
    icon: 'cocoa'
  },
  {
    id: 'mat-9',
    name: 'Caster Sugar',
    baseUnit: 'kg',
    usdCost: 1.10,
    category: 'Dry Goods',
    icon: 'sugar'
  },
  {
    id: 'mat-10',
    name: 'Raspberry Purée',
    baseUnit: 'kg',
    usdCost: 9.80,
    category: 'Fruit',
    icon: 'fruit'
  },
  {
    id: 'mat-11',
    name: 'Almond Flour',
    baseUnit: 'kg',
    usdCost: 11.20,
    category: 'Nuts',
    icon: 'almond'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-croissant',
    name: 'Classic Butter Croissant',
    category: 'Viennoiserie',
    yieldWeightOrBatch: '85 g',
    unitsProduced: 24,
    laborMultiplier: 1.5,
    packagingCostPerUnitUsd: 0.15,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      {
        id: 'ing-1',
        rawMaterialId: 'mat-5',
        rawMaterialName: 'High Protein Flour (T55)',
        quantity: 1.5,
        unit: 'kg',
        unitCostUsd: 1.20
      },
      {
        id: 'ing-2',
        rawMaterialId: 'mat-6',
        rawMaterialName: 'European Butter (82%)',
        quantity: 0.5,
        unit: 'kg',
        unitCostUsd: 8.50
      },
      {
        id: 'ing-3',
        rawMaterialId: 'mat-3',
        rawMaterialName: 'Whole Milk',
        quantity: 400,
        unit: 'ml',
        unitCostUsd: 1.50
      },
      {
        id: 'ing-4',
        rawMaterialId: 'mat-7',
        rawMaterialName: 'Fresh Yeast',
        quantity: 45,
        unit: 'g',
        unitCostUsd: 6.00
      }
    ]
  },
  {
    id: 'prod-cake',
    name: 'Signature Chocolate Cake',
    category: 'Cakes',
    yieldWeightOrBatch: '1.2 kg',
    unitsProduced: 10, // 10 slices
    laborMultiplier: 1.8,
    packagingCostPerUnitUsd: 0.35,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { id: 'c-1', rawMaterialId: 'mat-1', rawMaterialName: 'T55 Flour', quantity: 0.8, unit: 'kg', unitCostUsd: 0.85 },
      { id: 'c-2', rawMaterialId: 'mat-8', rawMaterialName: 'Valrhona Cocoa Powder', quantity: 0.3, unit: 'kg', unitCostUsd: 14.50 },
      { id: 'c-3', rawMaterialId: 'mat-9', rawMaterialName: 'Caster Sugar', quantity: 0.9, unit: 'kg', unitCostUsd: 1.10 },
      { id: 'c-4', rawMaterialId: 'mat-2', rawMaterialName: 'Eggs (Large)', quantity: 0.4, unit: 'tray', unitCostUsd: 4.20 },
      { id: 'c-5', rawMaterialId: 'mat-4', rawMaterialName: 'Unsalted Butter', quantity: 0.6, unit: 'kg', unitCostUsd: 8.50 },
      { id: 'c-6', rawMaterialId: 'mat-3', rawMaterialName: 'Whole Milk', quantity: 0.5, unit: 'liter', unitCostUsd: 1.50 }
    ]
  },
  {
    id: 'prod-sourdough',
    name: 'Artisan Sourdough Boule',
    category: 'Breads',
    yieldWeightOrBatch: '800 g',
    unitsProduced: 12,
    laborMultiplier: 1.4,
    packagingCostPerUnitUsd: 0.10,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { id: 's-1', rawMaterialId: 'mat-5', rawMaterialName: 'High Protein Flour (T55)', quantity: 5.0, unit: 'kg', unitCostUsd: 1.20 },
      { id: 's-2', rawMaterialId: 'mat-1', rawMaterialName: 'T55 Flour', quantity: 1.0, unit: 'kg', unitCostUsd: 0.85 }
    ]
  },
  {
    id: 'prod-macarons',
    name: 'Raspberry Rose Macarons',
    category: 'Petits Fours',
    yieldWeightOrBatch: 'Batch (24)',
    unitsProduced: 24, // 1 box of 24
    laborMultiplier: 2.2,
    packagingCostPerUnitUsd: 0.80,
    imageUrl: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { id: 'm-1', rawMaterialId: 'mat-11', rawMaterialName: 'Almond Flour', quantity: 0.6, unit: 'kg', unitCostUsd: 11.20 },
      { id: 'm-2', rawMaterialId: 'mat-9', rawMaterialName: 'Caster Sugar', quantity: 1.2, unit: 'kg', unitCostUsd: 1.10 },
      { id: 'm-3', rawMaterialId: 'mat-2', rawMaterialName: 'Eggs (Large)', quantity: 0.3, unit: 'tray', unitCostUsd: 4.20 },
      { id: 'm-4', rawMaterialId: 'mat-10', rawMaterialName: 'Raspberry Purée', quantity: 0.4, unit: 'kg', unitCostUsd: 9.80 }
    ]
  }
];
