import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { Search, Bell, User, Menu, DollarSign, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu: () => void;
  lbpRate: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  lbpRate,
  onOpenSettings
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const getPageTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'home': return 'Workshop Dashboard';
      case 'materials': return 'Raw Materials';
      case 'products': return 'Products Portfolio';
      case 'builder': return 'Recipe Cost Builder';
      case 'settings': return 'System Settings';
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[280px] h-20 bg-[#faf9f6]/80 backdrop-blur-md flex items-center justify-between px-6 md:px-8 z-40 border-b border-[#615e57]/5">
      {/* Left side: Mobile Hamburger & Breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-[#615e57] hover:text-[#914853] hover:bg-[#914853]/10 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 text-sm md:text-base font-medium">
          <span className="text-[#914853] font-semibold hidden sm:inline">Artisan Precision</span>
          <span className="text-[#d8c1c2] hidden sm:inline">/</span>
          <span className="text-[#615e57] font-bold">{getPageTitle(activeTab)}</span>
        </div>
      </div>

      {/* Right side: Search bar & Quick actions */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Search input (visible on inventory and products) */}
        {(activeTab === 'materials' || activeTab === 'products') && (
          <div className="relative">
            <Search className="w-4 h-4 text-[#867274] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'materials' ? "Search ingredients..." : "Search baked goods..."}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-[180px] sm:w-[240px] md:w-[280px] bg-white/80 border border-[#d8c1c2]/60 rounded-xl pl-10 pr-4 py-2 text-sm text-[#1a1c1a] placeholder-[#867274] focus:outline-none focus:border-[#914853] focus:ring-2 focus:ring-[#914853]/10 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#867274] hover:text-[#1a1c1a] bg-[#efeeeb] rounded-full w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Quick Exchange Rate Badge */}
        <button
          onClick={onOpenSettings}
          title="Click to adjust exchange rate in settings"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#efeeeb] hover:bg-[#e7e2d8] text-[#615e57] hover:text-[#914853] rounded-lg text-xs font-semibold transition-all border border-[#d8c1c2]/40"
        >
          <DollarSign className="w-3.5 h-3.5 text-[#914853]" />
          <span>Rate: {lbpRate.toLocaleString()} LBP</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="p-2.5 rounded-full text-[#615e57] hover:text-[#914853] transition-colors hover:bg-[#914853]/10 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#914853] rounded-full ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#d8c1c2]/50 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#efeeeb]">
                <h4 className="font-bold text-sm text-[#1a1c1a] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#d27d88]" /> Workshop Alerts
                </h4>
                <span className="text-[10px] bg-[#efeeeb] px-2 py-0.5 rounded-full font-bold text-[#615e57]">2 New</span>
              </div>
              <div className="py-3 space-y-3">
                <div className="text-xs">
                  <p className="font-semibold text-[#1a1c1a]">🧈 Butter price updated</p>
                  <p className="text-[#615e57] mt-0.5">European Butter benchmark increased by $0.20/kg.</p>
                  <span className="text-[10px] text-[#867274]">10 mins ago</span>
                </div>
                <div className="text-xs pt-2 border-t border-[#efeeeb]">
                  <p className="font-semibold text-[#1a1c1a]">🥐 Croissant margin optimal</p>
                  <p className="text-[#615e57] mt-0.5">Current cost per unit ($0.48) yields a 68% gross margin at retail.</p>
                  <span className="text-[10px] text-[#867274]">1 hour ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Popover */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="p-2.5 rounded-full text-[#615e57] hover:text-[#914853] transition-colors hover:bg-[#914853]/10"
          >
            <User className="w-5 h-5" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#d8c1c2]/50 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 pb-3 border-b border-[#efeeeb]">
                <div className="w-10 h-10 rounded-full bg-[#914853]/10 flex items-center justify-center text-[#914853] font-bold">
                  AP
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#1a1c1a]">Artisan Pâtissier</h4>
                  <p className="text-xs text-[#615e57]">Chef de Partie</p>
                </div>
              </div>
              <div className="py-2 space-y-1">
                <button 
                  onClick={() => {
                    onOpenSettings();
                    setShowProfile(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[#615e57] hover:text-[#914853] hover:bg-[#efeeeb] rounded-lg transition-colors"
                >
                  ⚙️ Workshop Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
