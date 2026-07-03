import React from 'react';
import { Product, RawMaterial } from '../types';
import { calculateRecipeBreakdown, formatUsd } from '../utils/calculations';
import { Plus, ArrowRight, Cake, Sparkles } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  materials: RawMaterial[];
  onSelectProduct: (product: Product) => void;
  onCreateNew: () => void;
  lbpRate: number;
  searchQuery: string;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  materials,
  onSelectProduct,
  onCreateNew,
  lbpRate,
  searchQuery
}) => {
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCostLabel = (prod: Product) => {
    if (prod.yieldWeightOrBatch.toLowerCase().includes('batch')) return 'BATCH COST';
    if (prod.category === 'Viennoiserie' || prod.category === 'Pastries') return 'COST PER UNIT';
    return 'TOTAL COST';
  };

  return (
    <div className="pt-8 pb-12 px-2 sm:px-6 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1c1a] tracking-tight font-sans">
          Products Portfolio
        </h2>
        <p className="text-base text-[#615e57] mt-1 font-medium">
          Manage your baked goods catalogue and review their calculated recipe costs.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashed "+ Create New" Card */}
        <button
          onClick={onCreateNew}
          className="border-2 border-dashed border-[#d8c1c2] hover:border-[#914853] bg-[#faf9f6]/40 hover:bg-[#914853]/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[380px] transition-all duration-300 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-[#efeeeb] group-hover:bg-[#914853] text-[#867274] group-hover:text-white flex items-center justify-center transition-all shadow-sm">
            <Plus className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-[200px]">
            <h3 className="text-xl font-bold text-[#1a1c1a] group-hover:text-[#914853] transition-colors">
              Create New
            </h3>
            <p className="text-xs font-normal text-[#615e57] leading-relaxed">
              Formulate a new recipe to calculate its exact cost.
            </p>
          </div>
        </button>

        {/* Product Cards */}
        {filteredProducts.map((prod) => {
          const breakdown = calculateRecipeBreakdown(
            prod.ingredients,
            materials,
            prod.unitsProduced,
            prod.laborMultiplier,
            prod.packagingCostPerUnitUsd
          );

          // For Viennoiserie/units, screenshot displays $0.45 (or $0.48), let's use totalUnitCost or batchTotalCost depending on label
          const costToDisplay = getCostLabel(prod) === 'BATCH COST' 
            ? breakdown.batchTotalCost 
            : breakdown.totalUnitCost;

          const lbpVal = Math.round(costToDisplay * lbpRate);

          return (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              className="glass-surface ambient-shadow rounded-3xl flex flex-col overflow-hidden hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer group border border-white/90"
            >
              {/* Image & Badge container */}
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#e7e2d8]">
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Top right yield badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#1a1c1a] shadow-sm flex items-center gap-1 border border-white/60">
                  <span className="text-[10px]">⚖️</span>
                  <span>{prod.yieldWeightOrBatch}</span>
                </div>
              </div>

              {/* Content body */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between bg-white/70 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-[#1a1c1a] group-hover:text-[#914853] transition-colors leading-snug">
                    {prod.name}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2 mt-3.5">
                    <span className="px-3 py-1 bg-[#efeeeb] text-[#615e57] rounded-full text-xs font-medium border border-[#d8c1c2]/50">
                      {prod.ingredients.length} Ingredients
                    </span>
                    <span className="px-3 py-1 bg-[#efeeeb] text-[#615e57] rounded-full text-xs font-medium border border-[#d8c1c2]/50">
                      {prod.category}
                    </span>
                  </div>
                </div>

                {/* Footer Cost & Arrow */}
                <div className="pt-4 border-t border-[#efeeeb] flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#867274] uppercase tracking-wider block">
                      {getCostLabel(prod)}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-bold text-[#914853]">
                        {formatUsd(costToDisplay)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#615e57]">
                      {lbpVal.toLocaleString()} LBP
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-[#efeeeb] group-hover:bg-[#914853] group-hover:text-white text-[#867274] flex items-center justify-center transition-all shadow-sm">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
