import React from 'react';
import { ActiveTab } from '../types';
import { Home, Boxes, Cake, Settings, Plus, X } from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onNewCalculation: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNewCalculation,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'home' as ActiveTab, label: 'Home', icon: Home },
    { id: 'materials' as ActiveTab, label: 'Raw Materials', icon: Boxes },
    { id: 'products' as ActiveTab, label: 'Products', icon: Cake },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full py-6 px-6 bg-white/60 backdrop-blur-xl border-r border-[#615e57]/10 shadow-[0px_10px_30px_rgba(93,64,55,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d27d88] flex items-center justify-center text-white font-bold text-xl shadow-sm">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#914853] leading-tight font-sans tracking-tight">
              ArtisanCalc
            </h1>
            <p className="text-xs font-medium text-[#615e57]">
              Culinary Precision
            </p>
          </div>
        </div>
        {/* Close mobile drawer button */}
        <button 
          onClick={onCloseMobile} 
          className="md:hidden p-2 text-[#615e57] hover:text-[#914853] rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'builder' && item.id === 'products');
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-left ${
                isActive
                  ? 'text-[#914853] font-bold border-r-4 border-[#914853] bg-[#914853]/10 shadow-sm'
                  : 'text-[#615e57] hover:text-[#914853] hover:bg-[#914853]/5 active:scale-[0.98]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#914853]' : 'text-[#615e57]'}`} />
              <span className="text-[15px]">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* CTA Button */}
      <div className="mt-auto pt-6">
        <button
          onClick={() => {
            onNewCalculation();
            onCloseMobile();
          }}
          className="w-full bg-[#914853] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-[0px_8px_16px_rgba(145,72,83,0.25)] hover:bg-[#74313c] hover:scale-[1.02] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Calculation</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 h-screen w-[280px] z-50 hidden md:block">
        {content}
      </nav>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full bg-[#faf9f6] z-10 animate-slide-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
