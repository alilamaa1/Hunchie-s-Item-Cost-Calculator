/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, RawMaterial, Product, AppSettings } from './types';
import { INITIAL_RAW_MATERIALS, INITIAL_PRODUCTS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { RawMaterialsView } from './components/RawMaterialsView';
import { ProductsView } from './components/ProductsView';
import { RecipeCostBuilderView } from './components/RecipeCostBuilderView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // App persistent settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('artisancalc_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      bakeryName: 'Artisan Precision',
      lbpRate: 90000,
      currencySymbol: '$',
      secondaryCurrencySymbol: 'LBP'
    };
  });

  // Raw Materials catalogue
  const [materials, setMaterials] = useState<RawMaterial[]>(() => {
    const saved = localStorage.getItem('artisancalc_materials');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_RAW_MATERIALS;
  });

  // Products Portfolio
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('artisancalc_products');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_PRODUCTS;
  });

  // Save state effects
  useEffect(() => {
    localStorage.setItem('artisancalc_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('artisancalc_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('artisancalc_products', JSON.stringify(products));
  }, [products]);

  // Handlers
  const handleAddMaterial = (mat: Omit<RawMaterial, 'id'>) => {
    const newMat: RawMaterial = {
      ...mat,
      id: `mat-${Date.now()}`
    };
    setMaterials(prev => [newMat, ...prev]);
  };

  const handleUpdateMaterial = (updated: RawMaterial) => {
    setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleSelectProductFromList = (prod: Product) => {
    setSelectedProduct(prod);
    setActiveTab('builder');
  };

  const handleCreateNewRecipe = () => {
    setSelectedProduct(null);
    setActiveTab('builder');
  };

  const handleSaveProductRecipe = (savedProd: Product) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === savedProd.id);
      if (exists) {
        return prev.map(p => p.id === savedProd.id ? savedProd : p);
      }
      return [savedProd, ...prev];
    });
    // Navigate back to products list
    setActiveTab('products');
  };

  const handleResetDemoData = () => {
    setMaterials(INITIAL_RAW_MATERIALS);
    setProducts(INITIAL_PRODUCTS);
    setSettings({
      bakeryName: 'Artisan Precision',
      lbpRate: 90000,
      currencySymbol: '$',
      secondaryCurrencySymbol: 'LBP'
    });
    localStorage.removeItem('artisancalc_materials');
    localStorage.removeItem('artisancalc_products');
    localStorage.removeItem('artisancalc_settings');
  };

  // Reset search when changing tab
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1c1a] font-sans flex flex-col selection:bg-[#d27d88] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        onNewCalculation={handleCreateNewRecipe}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        lbpRate={settings.lbpRate}
        onOpenSettings={() => handleTabChange('settings')}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 md:ml-[280px] pt-20 pb-12 transition-all duration-300">
        {activeTab === 'home' && (
          <HomeView
            onNavigate={handleTabChange}
            onNewCalculation={handleCreateNewRecipe}
            rawMaterialsCount={materials.length}
            productsCount={products.length}
          />
        )}

        {activeTab === 'materials' && (
          <RawMaterialsView
            materials={materials}
            onAddMaterial={handleAddMaterial}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            lbpRate={settings.lbpRate}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            materials={materials}
            onSelectProduct={handleSelectProductFromList}
            onCreateNew={handleCreateNewRecipe}
            lbpRate={settings.lbpRate}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'builder' && (
          <RecipeCostBuilderView
            initialProduct={selectedProduct}
            materials={materials}
            onSaveProduct={handleSaveProductRecipe}
            lbpRate={settings.lbpRate}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            onResetDemoData={handleResetDemoData}
          />
        )}
      </main>
    </div>
  );
}
