import React from 'react';
import { ActiveTab } from '../types';
import { Boxes, Receipt, Refrigerator, Cake, ArrowRight } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onNewCalculation: () => void;
  rawMaterialsCount: number;
  productsCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onNewCalculation,
  rawMaterialsCount,
  productsCount
}) => {
  return (
    <div className="pt-8 pb-12 px-2 sm:px-6 max-w-[1200px] mx-auto space-y-12 animate-fade-in">
      {/* Welcome Hero */}
      <section className="space-y-3">
        <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#1a1c1a] tracking-tight font-sans">
          Good morning.
        </h2>
        <p className="text-base sm:text-lg font-medium text-[#615e57] max-w-2xl leading-relaxed">
          Your workshop is ready. Review your inventory, track costs, and refine your culinary creations with precision.
        </p>
      </section>

      {/* Live Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stat Card 1 */}
        <div 
          onClick={() => onNavigate('materials')}
          className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-7 flex items-center justify-between hover:scale-[1.01] hover:border-[#914853]/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#867274] uppercase tracking-widest block">
              Inventory Status
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#914853] block">
              {rawMaterialsCount} Items Tracked
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#efeeeb] flex items-center justify-center text-[#914853] border border-[#d8c1c2]/50 group-hover:bg-[#914853] group-hover:text-white transition-colors shadow-sm">
            <Boxes className="w-7 h-7" />
          </div>
        </div>

        {/* Stat Card 2 */}
        <div 
          onClick={() => onNavigate('products')}
          className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-7 flex items-center justify-between hover:scale-[1.01] hover:border-[#914853]/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#867274] uppercase tracking-widest block">
              Production Ready
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-[#914853] block">
              {productsCount} Recipes Costed
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#efeeeb] flex items-center justify-center text-[#914853] border border-[#d8c1c2]/50 group-hover:bg-[#914853] group-hover:text-white transition-colors shadow-sm">
            <Receipt className="w-7 h-7" />
          </div>
        </div>
      </section>

      {/* Main Action Portals */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Raw Materials Portal */}
        <div 
          onClick={() => onNavigate('materials')}
          className="group glass-surface ambient-shadow rounded-3xl p-8 sm:p-9 flex flex-col min-h-[280px] justify-between border border-transparent hover:border-[#914853]/25 transition-all duration-300 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-[#914853]/5 rounded-full blur-3xl group-hover:bg-[#914853]/15 transition-colors pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#efeeeb] border border-[#d8c1c2]/40 flex items-center justify-center text-[#615e57] group-hover:text-[#914853] group-hover:scale-105 transition-all shadow-sm">
              <Refrigerator className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#867274] group-hover:text-[#914853] group-hover:bg-[#914853]/10 transition-all">
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          <div className="relative z-10 pt-8">
            <h3 className="text-2xl font-bold text-[#1a1c1a] mb-2 font-sans">
              Raw Materials
            </h3>
            <p className="text-base font-normal text-[#615e57] leading-relaxed">
              Manage ingredients, update vendor pricing, and track yield percentages to ensure accurate base costs.
            </p>
          </div>
        </div>

        {/* Products Portal */}
        <div 
          onClick={() => onNavigate('products')}
          className="group glass-surface ambient-shadow rounded-3xl p-8 sm:p-9 flex flex-col min-h-[280px] justify-between border border-transparent hover:border-[#914853]/25 transition-all duration-300 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-[#b28d82]/10 rounded-full blur-3xl group-hover:bg-[#b28d82]/25 transition-colors pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#efeeeb] border border-[#d8c1c2]/40 flex items-center justify-center text-[#615e57] group-hover:text-[#914853] group-hover:scale-105 transition-all shadow-sm">
              <Cake className="w-8 h-8" />
            </div>
            <div className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#867274] group-hover:text-[#914853] group-hover:bg-[#914853]/10 transition-all">
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          <div className="relative z-10 pt-8">
            <h3 className="text-2xl font-bold text-[#1a1c1a] mb-2 font-sans">
              Products
            </h3>
            <p className="text-base font-normal text-[#615e57] leading-relaxed">
              Build recipes, define labor costs, and establish retail margins for your final artisanal offerings.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Launch CTA Banner */}
      <section className="bg-gradient-to-r from-[#914853] to-[#b28d82] rounded-3xl p-8 sm:p-10 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 text-center sm:text-left">
          <h4 className="text-2xl font-bold tracking-tight">Formulating a new creation?</h4>
          <p className="text-white/80 text-sm sm:text-base max-w-xl">
            Jump straight into the Recipe Cost Builder to assemble your Bill of Materials and compute exact retail margins.
          </p>
        </div>
        <button
          onClick={onNewCalculation}
          className="bg-white text-[#914853] font-bold px-7 py-4 rounded-2xl shadow-md hover:bg-[#faf9f6] hover:scale-105 active:scale-95 transition-all whitespace-nowrap text-sm flex items-center gap-2"
        >
          <span>Open Cost Builder</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
