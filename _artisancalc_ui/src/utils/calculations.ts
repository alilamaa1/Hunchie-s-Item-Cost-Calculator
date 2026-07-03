import { RecipeIngredient, RawMaterial } from '../types';

export function getConvertedQuantityToBaseUnit(quantity: number, unit: string, baseUnit: string): number {
  const u = unit.toLowerCase();
  const bu = baseUnit.toLowerCase();

  if (u === bu) return quantity;

  // Weight conversions
  if (u === 'g' && bu === 'kg') return quantity / 1000;
  if (u === 'kg' && bu === 'g') return quantity * 1000;
  if (u === 'oz' && bu === 'kg') return quantity * 0.0283495;
  if (u === 'lb' && bu === 'kg') return quantity * 0.453592;

  // Volume conversions
  if ((u === 'ml' || u === 'milliliter') && (bu === 'liter' || bu === 'l')) return quantity / 1000;
  if ((u === 'liter' || u === 'l') && (bu === 'ml' || bu === 'milliliter')) return quantity * 1000;

  // Default fallback if unknown conversion
  return quantity;
}

export function calculateIngredientPortionCost(ing: RecipeIngredient, materials: RawMaterial[]): number {
  const material = materials.find(m => m.id === ing.rawMaterialId || m.name === ing.rawMaterialName);
  const baseCost = material ? material.usdCost : ing.unitCostUsd;
  const baseUnit = material ? material.baseUnit : (ing.unit === 'g' || ing.unit === 'ml' ? (ing.unit === 'g' ? 'kg' : 'liter') : ing.unit);

  const convertedQty = getConvertedQuantityToBaseUnit(ing.quantity, ing.unit, baseUnit);
  return convertedQty * baseCost;
}

export function calculateRecipeBreakdown(
  ingredients: RecipeIngredient[],
  materials: RawMaterial[],
  unitsProduced: number,
  laborMultiplier: number,
  packagingCostPerUnitUsd: number
) {
  const safeUnits = unitsProduced && unitsProduced > 0 ? unitsProduced : 1;

  const totalRawCost = ingredients.reduce((sum, ing) => sum + calculateIngredientPortionCost(ing, materials), 0);
  const rawCostPerUnit = totalRawCost / safeUnits;

  // Labor mark-up is typically (Multiplier - 1) * RawCost or Multiplier * RawCost depending on definition.
  // In Screenshot 3:
  // Raw Materials / Unit: $0.28 ($1.80+4.25+0.60+0.27 = $6.92 total / 24 pcs = $0.2883 -> $0.28)
  // Labor Mark-up: +$0.14 (which is 0.5 * $0.2883 = $0.1441)
  // Packaging: +$0.06 (Wait, packaging per unit input in screenshot is $0.15 wait let's look at screenshot 3:
  // In screenshot 3 input box: Packaging per unit $0.15 wait, or in summary box: +$0.06? Wait let's inspect Screenshot 3 closely:
  // In screenshot 3: Labor Multiplier: 1.5x. Packaging per unit: $ 0.15 wait actually let's check the math:
  // If packaging is $0.06 per unit, then $0.2883 + $0.1441 + $0.06 = $0.4924 (or $0.48 depending on exact decimals).
  // Batch Total Cost: $11.52. $11.52 / 24 = $0.48!
  // So unit cost summary = $0.48.
  // Let's implement Labor Mark-up as: rawCostPerUnit * (laborMultiplier - 1)
  
  const laborMarkUpPerUnit = rawCostPerUnit * Math.max(0, laborMultiplier - 1);
  const totalUnitCost = rawCostPerUnit + laborMarkUpPerUnit + packagingCostPerUnitUsd;
  const batchTotalCost = totalUnitCost * safeUnits;

  return {
    totalRawCost,
    rawCostPerUnit,
    laborMarkUpPerUnit,
    packagingCostPerUnitUsd,
    totalUnitCost,
    batchTotalCost
  };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatLbp(usdAmount: number, rate: number): string {
  const lbp = Math.round(usdAmount * rate);
  return new Intl.NumberFormat('en-US').format(lbp) + ' LBP';
}
