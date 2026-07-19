import { initializeApp } from './appInitializationService.mjs';
import {
  calculateRawMaterialDraft,
  createRawMaterial,
  deleteRawMaterial,
  getRawMaterialById,
  listRawMaterials,
  searchRawMaterials,
  updateRawMaterial
} from './rawMaterialService.mjs';
import {
  calculateProductDraft,
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  loadProducts,
  searchProducts,
  updateProduct
} from './productService.mjs';
import { loadSettings, updateSettings } from './settingsService.mjs';
import {
  authenticateUser,
  changePassword,
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  verifyAdminKey
} from './userService.mjs';

export function createAppServices() {
  return {
    initializeApp,
    calculateRawMaterialDraft,
    createRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    listRawMaterials,
    getRawMaterialById,
    searchRawMaterials,
    createProduct,
    updateProduct,
    deleteProduct,
    listProducts,
    getProductById,
    searchProducts,
    loadProducts,
    loadSettings,
    updateSettings,
    verifyAdminKey,
    listUsers,
    createUser,
    deleteUser,
    updateUser,
    changePassword,
    authenticateUser,
    calculateProductDraft: async (input, context) => {
      const [materials, settings] = await Promise.all([
        listRawMaterials(context),
        loadSettings(context)
      ]);
      if (!materials.ok) return materials;
      if (!settings.ok) return settings;
      return calculateProductDraft(input, materials.data, {
        exchangeRate: settings.data.currency.usdToLbp,
        totalCostMultiplier: settings.data.formulas.totalCostMultiplier
      });
    }
  };
}
