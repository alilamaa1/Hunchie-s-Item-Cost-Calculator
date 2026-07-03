import React, { useState } from 'react';
import { Product, RawMaterial, RecipeIngredient } from '../types';
import { calculateRecipeBreakdown, formatUsd, calculateIngredientPortionCost } from '../utils/calculations';
import { Plus, Trash2, Download, Save, Sparkles, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface RecipeCostBuilderProps {
  initialProduct?: Product | null;
  materials: RawMaterial[];
  onSaveProduct: (product: Product) => void;
  lbpRate: number;
}

export const RecipeCostBuilderView: React.FC<RecipeCostBuilderProps> = ({
  initialProduct,
  materials,
  onSaveProduct,
  lbpRate
}) => {
  const [name, setName] = useState(initialProduct?.name || 'Classic Butter Croissant');
  const [category, setCategory] = useState<Product['category']>(initialProduct?.category || 'Viennoiserie');
  const [unitsProduced, setUnitsProduced] = useState<number>(initialProduct?.unitsProduced || 24);
  const [yieldWeight, setYieldWeight] = useState(initialProduct?.yieldWeightOrBatch || '85 g');
  const [laborMultiplier, setLaborMultiplier] = useState<number>(initialProduct?.laborMultiplier || 1.5);
  const [packagingCost, setPackagingCost] = useState<number>(initialProduct?.packagingCostPerUnitUsd || 0.06);
  const [imageUrl, setImageUrl] = useState(initialProduct?.imageUrl || 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80');

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initialProduct?.ingredients || [
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
  );

  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [selectedMatId, setSelectedMatId] = useState(materials[0]?.id || '');

  // Calculate live breakdown
  const breakdown = calculateRecipeBreakdown(
    ingredients,
    materials,
    unitsProduced || 1,
    laborMultiplier || 1,
    packagingCost || 0
  );

  const lbpUnitCost = Math.round(breakdown.totalUnitCost * lbpRate);

  const handleUpdateIngredientQty = (id: string, newQty: number) => {
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, quantity: newQty } : ing));
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const handleAddIngredientFromCatalog = () => {
    const mat = materials.find(m => m.id === selectedMatId);
    if (!mat) return;

    const newIng: RecipeIngredient = {
      id: `ing-${Date.now()}`,
      rawMaterialId: mat.id,
      rawMaterialName: mat.name,
      quantity: mat.baseUnit === 'g' || mat.baseUnit === 'ml' ? 100 : 1,
      unit: mat.baseUnit === 'liter' ? 'ml' : (mat.baseUnit === 'kg' ? 'kg' : mat.baseUnit),
      unitCostUsd: mat.usdCost
    };

    setIngredients([...ingredients, newIng]);
    setIsAddingIngredient(false);
  };

  const handleExportSpecSheet = () => {
    const specContent = `ARTISAN PRECISION - PRODUCT SPECIFICATION SHEET\n` +
      `============================================\n` +
      `Product Name: ${name}\n` +
      `Category: ${category}\n` +
      `Batch Yield: ${unitsProduced} pieces (${yieldWeight})\n` +
      `Exchange Rate: ${lbpRate} LBP/USD\n\n` +
      `BILL OF MATERIALS:\n` +
      ingredients.map(ing => {
        const cost = calculateIngredientPortionCost(ing, materials);
        return `- ${ing.rawMaterialName}: ${ing.quantity} ${ing.unit} ($${cost.toFixed(2)})`;
      }).join('\n') + `\n\n` +
      `COST SUMMARY:\n` +
      `- Raw Materials / Unit: $${breakdown.rawCostPerUnit.toFixed(2)}\n` +
      `- Labor Mark-up / Unit: +$${breakdown.laborMarkUpPerUnit.toFixed(2)} (${laborMultiplier}x)\n` +
      `- Packaging / Unit: +$${breakdown.packagingCostPerUnitUsd.toFixed(2)}\n` +
      `--------------------------------------------\n` +
      `TOTAL UNIT COST: $${breakdown.totalUnitCost.toFixed(2)} (${lbpUnitCost.toLocaleString()} LBP)\n` +
      `BATCH TOTAL COST (${unitsProduced} pcs): $${breakdown.batchTotalCost.toFixed(2)}`;

    const blob = new Blob([specContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '_')}_spec_sheet.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    onSaveProduct({
      id: initialProduct?.id || `prod-${Date.now()}`,
      name,
      category,
      yieldWeightOrBatch: yieldWeight,
      unitsProduced: unitsProduced || 1,
      laborMultiplier,
      packagingCostPerUnitUsd: packagingCost,
      imageUrl,
      ingredients
    });
  };

  return (
    <div className="pt-8 pb-12 px-2 sm:px-6 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1c1a] tracking-tight font-sans">
          Recipe Cost Builder
        </h2>
        <p className="text-base text-[#615e57] mt-1 font-medium">
          Assemble ingredients and allocate overhead to determine the final cost per unit.
        </p>
      </div>

      {/* Main 2-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column (Cards builder) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Product Details */}
          <div className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-8 border border-white/80 space-y-6">
            <div className="flex items-center gap-2.5 text-lg font-bold text-[#1a1c1a]">
              <FileSpreadsheet className="w-5 h-5 text-[#914853]" />
              <h3>Product Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-bold text-[#867274] uppercase tracking-wider block mb-2">
                  RECIPE NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-[#867274] rounded-xl px-4 py-3 text-base font-medium text-[#1a1c1a] focus:outline-none focus:border-[#914853] focus:ring-1 focus:ring-[#914853]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#867274] uppercase tracking-wider block mb-2">
                  CATEGORY
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-white border border-[#867274] rounded-xl px-4 py-3 text-base font-medium text-[#1a1c1a] appearance-none focus:outline-none focus:border-[#914853]"
                  >
                    <option value="Viennoiserie">Viennoiserie</option>
                    <option value="Cakes">Cakes</option>
                    <option value="Breads">Breads</option>
                    <option value="Petits Fours">Petits Fours</option>
                    <option value="Tarts">Tarts</option>
                    <option value="Pastries">Pastries</option>
                  </select>
                  <ChevronDown className="w-5 h-5 text-[#867274] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Bill of Materials */}
          <div className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-8 border border-white/80 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-lg font-bold text-[#1a1c1a]">
                <span className="text-xl">㊞</span>
                <h3>Bill of Materials</h3>
              </div>
              <span className="px-3 py-1 bg-[#efeeeb] text-[#615e57] rounded-full text-xs font-semibold border border-[#d8c1c2]/40">
                {ingredients.length} Ingredients
              </span>
            </div>

            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 pb-2 border-b border-[#d8c1c2]/60 text-xs font-bold text-[#867274] tracking-wider">
              <div className="col-span-5">Raw Material</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-2 text-right">Unit Cost</div>
              <div className="col-span-2 text-right">Portion Cost</div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {ingredients.map((ing, idx) => {
                const mat = materials.find(m => m.id === ing.rawMaterialId || m.name === ing.rawMaterialName);
                const unitCost = mat ? mat.usdCost : ing.unitCostUsd;
                const baseUnit = mat ? mat.baseUnit : 'kg';
                const portionCost = calculateIngredientPortionCost(ing, materials);
                const isAlternate = idx % 2 === 1;

                return (
                  <div 
                    key={ing.id}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center p-3 sm:p-3.5 rounded-2xl transition-colors group relative ${
                      isAlternate ? 'bg-[#efeeeb]/50' : 'bg-transparent'
                    }`}
                  >
                    {/* Material Name */}
                    <div className="sm:col-span-5 font-semibold text-[#1a1c1a] text-sm sm:text-base pr-2 flex items-center justify-between sm:justify-start">
                      <span>{ing.rawMaterialName}</span>
                      <button
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="sm:hidden p-1 text-[#ba1a1a]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity Input */}
                    <div className="sm:col-span-3 flex items-center justify-start sm:justify-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={ing.quantity}
                        onChange={e => handleUpdateIngredientQty(ing.id, parseFloat(e.target.value) || 0)}
                        className="w-20 sm:w-24 bg-white border border-[#867274] rounded-xl px-2.5 py-1.5 text-center text-base font-bold font-mono text-[#1a1c1a] focus:outline-none focus:border-[#914853] shadow-sm"
                      />
                      <span className="text-xs font-bold px-2 py-1 bg-[#efeeeb] text-[#615e57] rounded-lg border border-[#d8c1c2]/40">
                        {ing.unit}
                      </span>
                    </div>

                    {/* Unit Cost */}
                    <div className="sm:col-span-2 text-left sm:text-right text-xs sm:text-sm font-medium text-[#615e57]">
                      <span className="sm:hidden text-xs text-[#867274]">Unit Cost: </span>
                      ${unitCost.toFixed(2)}/{baseUnit === 'liter' ? 'L' : baseUnit}
                    </div>

                    {/* Portion Cost */}
                    <div className="sm:col-span-2 text-right text-base font-bold text-[#1a1c1a] flex items-center justify-end gap-2">
                      <span>${portionCost.toFixed(2)}</span>
                      <button
                        onClick={() => handleRemoveIngredient(ing.id)}
                        title="Remove material"
                        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#867274] hover:text-[#ba1a1a]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add ingredient dropdown UI */}
            {isAddingIngredient ? (
              <div className="p-4 bg-white/90 rounded-2xl border border-[#914853] shadow-lg flex flex-col sm:flex-row gap-3 items-center animate-scale-up">
                <select
                  value={selectedMatId}
                  onChange={e => setSelectedMatId(e.target.value)}
                  className="w-full sm:flex-1 bg-[#faf9f6] border border-[#d8c1c2] rounded-xl px-3 py-2 text-sm font-semibold"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (${m.usdCost}/{m.baseUnit})</option>
                  ))}
                </select>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setIsAddingIngredient(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#615e57] bg-[#efeeeb]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddIngredientFromCatalog}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#914853]"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  onClick={() => setIsAddingIngredient(true)}
                  className="flex items-center gap-2 text-sm font-bold text-[#914853] hover:text-[#74313c] transition-colors p-2 hover:bg-[#914853]/5 rounded-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Raw Material</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 3: Expected Yield & Overhead Allocation */}
          <div className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-8 border border-white/80 grid grid-cols-1 sm:grid-cols-2 gap-8">
            
            {/* Expected Yield */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base font-bold text-[#1a1c1a]">
                <span>㊞</span>
                <h4>Expected Yield</h4>
              </div>

              <div className="bg-white/80 rounded-2xl border border-[#d8c1c2] p-5 space-y-2">
                <label className="text-[11px] font-bold text-[#867274] block">Units Produced</label>
                <input
                  type="number"
                  min="1"
                  value={unitsProduced}
                  onChange={e => setUnitsProduced(parseInt(e.target.value) || 1)}
                  className="w-full text-3xl font-bold font-mono text-[#1a1c1a] bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="bg-white/80 rounded-2xl border border-[#d8c1c2] p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-[#867274]">Yield Weight / Label</span>
                <input
                  type="text"
                  value={yieldWeight}
                  onChange={e => setYieldWeight(e.target.value)}
                  placeholder="e.g. 85 g or Batch (24)"
                  className="w-32 bg-[#efeeeb] rounded-lg px-2 py-1 text-xs font-bold text-[#1a1c1a] text-right border-none focus:ring-1 focus:ring-[#914853]"
                />
              </div>
            </div>

            {/* Labor & Mark-up */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base font-bold text-[#1a1c1a]">
                <span>🧑‍🍳</span>
                <h4>Labor & Mark-up</h4>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#615e57]">Labor Multiplier</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      value={laborMultiplier}
                      onChange={e => setLaborMultiplier(parseFloat(e.target.value) || 1)}
                      className="w-20 bg-white border border-[#867274] rounded-xl px-2 py-1.5 text-center font-bold text-base text-[#1a1c1a]"
                    />
                    <span className="text-[#615e57] font-bold">x</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#d8c1c2]/50 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-[#615e57] block">Packaging per unit</span>
                    <span className="text-[11px] text-[#867274]">pieces / boxes wrapping</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#615e57]">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={packagingCost}
                      onChange={e => setPackagingCost(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white border border-[#867274] rounded-xl px-2 py-1.5 text-center font-bold text-base text-[#1a1c1a]"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right column (Summary & Actions Panel) */}
        <div className="lg:col-span-4 sticky top-28 space-y-6">
          
          <div className="bg-[#74313c] rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 relative overflow-hidden border border-[#914853]/50">
            {/* Subtle background glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#d27d88]/20 rounded-full blur-3xl pointer-events-none" />

            <div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#ffdbd0] block mb-2">
                UNIT COST SUMMARY
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-normal text-white/90">$</span>
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                  {breakdown.totalUnitCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-[#ffb2bb] font-medium mt-1.5">
                ≈ LBP {lbpUnitCost.toLocaleString()} <span className="text-white/60">(Rate: {lbpRate.toLocaleString()})</span>
              </p>
            </div>

            <div className="border-t border-white/15 pt-5 space-y-3 text-sm">
              <div className="flex justify-between items-center text-white/90">
                <span className="font-light">Raw Materials / Unit</span>
                <span className="font-bold font-mono">${breakdown.rawCostPerUnit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-white/90">
                <span className="font-light">Labor Mark-up</span>
                <span className="font-bold font-mono">+${breakdown.laborMarkUpPerUnit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-white/90">
                <span className="font-light">Packaging</span>
                <span className="font-bold font-mono">+${breakdown.packagingCostPerUnitUsd.toFixed(2)}</span>
              </div>
            </div>

            {/* Dark inner card */}
            <div className="bg-[#41281f]/40 rounded-2xl p-4.5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white/90 block">Batch Total Cost</span>
                <span className="text-[10px] text-white/60">For {unitsProduced} pieces</span>
              </div>
              <span className="text-xl font-bold font-mono text-white">
                ${breakdown.batchTotalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleExportSpecSheet}
              className="w-full py-3.5 px-4 bg-[#efeeeb] hover:bg-[#e3e2e0] text-[#1a1c1a] font-bold text-sm rounded-2xl shadow-sm border border-[#d8c1c2] flex items-center justify-center gap-2.5 transition-all active:scale-98"
            >
              <Download className="w-4 h-4 text-[#615e57]" />
              <span>Export Spec Sheet</span>
            </button>

            <button
              onClick={handleSave}
              className="w-full py-3.5 px-4 bg-[#914853] hover:bg-[#74313c] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#914853]/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Save Product Recipe</span>
            </button>
          </div>

          {/* Tips Card */}
          <div className="glass-surface ambient-shadow rounded-2xl p-5 border border-white text-xs text-[#615e57] space-y-2 leading-relaxed">
            <h5 className="font-bold text-[#914853] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Chef's Margin Insight
            </h5>
            <p>
              To maintain standard pâtisserie margins (65–70%), recommended retail price for this item is <strong className="text-[#1a1c1a]">${(breakdown.totalUnitCost * 3.1).toFixed(2)}</strong>.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
