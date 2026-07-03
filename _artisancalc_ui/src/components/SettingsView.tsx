import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Store, DollarSign, RefreshCw, Check, Sparkles } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetDemoData
}) => {
  const [bakeryName, setBakeryName] = useState(settings.bakeryName);
  const [lbpRate, setLbpRate] = useState(settings.lbpRate.toString());
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(lbpRate) || 90000;
    onUpdateSettings({
      ...settings,
      bakeryName: bakeryName.trim() || 'Artisan Precision',
      lbpRate: rateNum
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="pt-8 pb-12 px-2 sm:px-6 max-w-[800px] mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1c1a] tracking-tight font-sans">
          System Settings
        </h2>
        <p className="text-base text-[#615e57] mt-1 font-medium">
          Configure workshop currency conversion rates and bakery parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General bakery params */}
        <div className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-8 border border-white/80 space-y-6">
          <div className="flex items-center gap-2.5 text-lg font-bold text-[#914853]">
            <Store className="w-5 h-5" />
            <h3>Workshop Identity</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1.5">
              Bakery / Workshop Name
            </label>
            <input
              type="text"
              required
              value={bakeryName}
              onChange={e => setBakeryName(e.target.value)}
              className="w-full bg-white border border-[#d8c1c2] rounded-xl px-4 py-3 text-base text-[#1a1c1a] font-medium focus:outline-none focus:border-[#914853]"
            />
          </div>
        </div>

        {/* Currency Conversion */}
        <div className="glass-surface ambient-shadow rounded-3xl p-6 sm:p-8 border border-white/80 space-y-6">
          <div className="flex items-center gap-2.5 text-lg font-bold text-[#914853]">
            <DollarSign className="w-5 h-5" />
            <h3>Currency & Conversion Benchmark</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1.5">
                Primary Base Currency
              </label>
              <input
                type="text"
                disabled
                value="USD ($)"
                className="w-full bg-[#efeeeb] border border-[#d8c1c2]/60 rounded-xl px-4 py-3 text-sm font-bold text-[#615e57]"
              />
              <span className="text-[11px] text-[#867274] mt-1 block">All raw materials are priced in USD.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-[#867274] uppercase tracking-wider block mb-1.5">
                Secondary Benchmark Rate (LBP per USD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="500"
                  required
                  value={lbpRate}
                  onChange={e => setLbpRate(e.target.value)}
                  className="w-full bg-white border border-[#d8c1c2] rounded-xl pl-4 pr-16 py-3 text-base text-[#1a1c1a] font-bold focus:outline-none focus:border-[#914853]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#867274]">
                  LBP
                </span>
              </div>
              <span className="text-[11px] text-[#867274] mt-1 block">e.g. 90,000 or 89,500</span>
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="text-sm font-bold text-[#914853] flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" /> Benchmark Saved
            </span>
          )}
          <button
            type="submit"
            className="bg-[#914853] hover:bg-[#74313c] text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-[#914853]/20 hover:scale-105 active:scale-95 transition-all text-sm"
          >
            Save Configuration
          </button>
        </div>
      </form>

      {/* Demo data management */}
      <div className="pt-8 border-t border-[#d8c1c2]/40">
        <div className="bg-[#efeeeb] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-[#d8c1c2]/50">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-bold text-base text-[#1a1c1a]">Restore Default Catalogue</h4>
            <p className="text-xs text-[#615e57] max-w-md leading-relaxed">
              Reset all inventory raw materials and calculated recipe portfolios back to the initial pâtisserie benchmark state.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDemoData}
            className="px-5 py-3 rounded-xl border border-[#867274] bg-white hover:bg-[#faf9f6] font-semibold text-xs text-[#615e57] flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
