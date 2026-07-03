import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { formatUsd } from '../utils/calculations';
import { Plus, Wheat, Egg, Droplet, Refrigerator, Sparkles, Trash2, Edit2, X, Check } from 'lucide-react';

interface RawMaterialsViewProps {
  materials: RawMaterial[];
  onAddMaterial: (mat: Omit<RawMaterial, 'id'>) => void;
  onUpdateMaterial: (mat: RawMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  lbpRate: number;
  searchQuery: string;
}

export const RawMaterialsView: React.FC<RawMaterialsViewProps> = ({
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  lbpRate,
  searchQuery
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('kg');
  const [usdCost, setUsdCost] = useState('1.00');
  const [category, setCategory] = useState('Dry Goods');

  // Filtered materials
  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddMaterial({
      name: name.trim(),
      baseUnit,
      usdCost: parseFloat(usdCost) || 0,
      category,
      icon: category === 'Dairy & Eggs' ? 'egg' : 'flour'
    });
    setName('');
    setUsdCost('1.00');
    setIsAdding(false);
  };

  const getIcon = (item: RawMaterial) => {
    const n = item.name.toLowerCase();
    const c = (item.category || '').toLowerCase();
    if (n.includes('egg')) return <Egg className="w-5 h-5 text-[#914853]" />;
    if (n.includes('milk') || n.includes('purée') || n.includes('liquid') || item.baseUnit === 'liter') {
      return <Droplet className="w-5 h-5 text-[#914853]" />;
    }
    if (n.includes('butter') || c.includes('dairy') || n.includes('cream')) {
      return <Refrigerator className="w-5 h-5 text-[#914853]" />;
    }
    return <Wheat className="w-5 h-5 text-[#914853]" />;
  };

  return (
    <div className="pt-8 pb-12 px-2 sm:px-6 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#914853] tracking-tight font-sans">
            Inventory
          </h2>
          <p className="text-base text-[#615e57] mt-1 font-medium">
            Manage and price your base ingredients.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#914853] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-[0px_8px_16px_rgba(145,72,83,0.25)] hover:bg-[#74313c] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 self-start sm:self-center"
        >
          <Plus className="w-5 h-5" />
          <span>Add Raw Material</span>
        </button>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#faf9f6] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d8c1c2] animate-scale-up space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#914853]">New Raw Material</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 text-[#615e57] hover:text-[#1a1c1a]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Belgian Dark Chocolate (54%)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-[#d8c1c2] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#914853]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1">Base Unit</label>
                  <select
                    value={baseUnit}
                    onChange={e => setBaseUnit(e.target.value)}
                    className="w-full bg-white border border-[#d8c1c2] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#914853]"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="liter">liter (Liter)</option>
                    <option value="ml">ml (Milliliter)</option>
                    <option value="tray">tray (Tray/30)</option>
                    <option value="pcs">pcs (Piece)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1">USD Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#867274]">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={usdCost}
                      onChange={e => setUsdCost(e.target.value)}
                      className="w-full bg-white border border-[#d8c1c2] rounded-xl pl-8 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#914853]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white border border-[#d8c1c2] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#914853]"
                >
                  <option value="Dry Goods">Dry Goods</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Chocolate">Chocolate</option>
                  <option value="Fruit">Fruit</option>
                  <option value="Leavening">Leavening</option>
                  <option value="Nuts">Nuts</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#d8c1c2] font-semibold text-sm text-[#615e57] hover:bg-[#efeeeb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#914853] text-white font-bold text-sm shadow-md hover:bg-[#74313c]"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMaterials.map((mat) => {
          const lbpVal = Math.round(mat.usdCost * lbpRate);
          const isEditing = editingId === mat.id;

          return (
            <div
              key={mat.id}
              className="glass-surface ambient-shadow rounded-3xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group relative border border-white/80"
            >
              {/* Top part: Icon & Name */}
              <div className="flex items-start gap-3.5 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-[#efeeeb] flex items-center justify-center border border-[#d8c1c2]/50 shrink-0 shadow-sm">
                  {getIcon(mat)}
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      defaultValue={mat.name}
                      onBlur={(e) => {
                        onUpdateMaterial({ ...mat, name: e.target.value });
                        setEditingId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full text-lg font-bold text-[#1a1c1a] bg-white border border-[#914853] rounded px-1 -ml-1 focus:outline-none"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-[#1a1c1a] leading-snug truncate">
                      {mat.name}
                    </h3>
                  )}

                  <div className="mt-1.5">
                    <span className="inline-block px-2.5 py-0.5 bg-[#efeeeb] text-[#615e57] rounded-full text-[11px] font-semibold border border-[#d8c1c2]/40">
                      Base: {mat.baseUnit}
                    </span>
                  </div>
                </div>

                {/* Edit / Delete quick menu on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 absolute right-4 top-4">
                  <button
                    onClick={() => setEditingId(isEditing ? null : mat.id)}
                    title="Quick rename"
                    className="p-1.5 hover:bg-[#efeeeb] rounded-lg text-[#615e57] hover:text-[#914853]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteMaterial(mat.id)}
                    title="Delete ingredient"
                    className="p-1.5 hover:bg-[#ffdad6] rounded-lg text-[#615e57] hover:text-[#ba1a1a]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom part: Costs */}
              <div className="space-y-2 pt-4 border-t border-[#efeeeb]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#867274] tracking-wider">USD COST</span>
                  <div className="font-semibold text-[#914853]">
                    <span className="text-sm font-bold">{formatUsd(mat.usdCost)}</span>
                    <span className="text-[#867274] ml-1">/ {mat.baseUnit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#867274] tracking-wider">LBP COST</span>
                  <div className="font-medium text-[#1a1c1a]">
                    <span className="text-sm font-semibold">{lbpVal.toLocaleString()}</span>
                    <span className="text-[#867274] ml-1">/ {mat.baseUnit}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dashed "+ Add Ingredient" Card */}
        <button
          onClick={() => setIsAdding(true)}
          className="border-2 border-dashed border-[#d8c1c2] hover:border-[#914853] bg-[#faf9f6]/40 hover:bg-[#914853]/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-3.5 min-h-[190px] transition-all duration-300 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-[#efeeeb] group-hover:bg-[#914853] text-[#867274] group-hover:text-white flex items-center justify-center transition-all shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-[#914853]">Add Ingredient</span>
        </button>
      </div>
    </div>
  );
};
