import { initializeApp } from './appInitializationService.mjs';
import {
  calculateRawMaterialDraft,
  calculateProductionRawMaterialDraft,
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
import {
  calculateBatchDraft,
  createBatch,
  deleteBatch,
  getBatchById,
  listBatches,
  updateBatch
} from './batchService.mjs';
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
    calculateBatchDraft,
    createBatch,
    updateBatch,
    deleteBatch,
    listBatches,
    getBatchById,
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
    calculateRawMaterialDraft: async (input, context) => {
      if (input?.sourceType !== 'production') {
        const settings = await loadSettings(context);
        if (!settings.ok) return settings;
        return calculateRawMaterialDraft(input, {
          ...context,
          exchangeRate: settings.data.currency.usdToLbp
        });
      }
      const [materials, settings] = await Promise.all([
        listRawMaterials(context),
        loadSettings(context)
      ]);
      if (!materials.ok) return materials;
      if (!settings.ok) return settings;
      return calculateProductionRawMaterialDraft(input, materials.data, {
        exchangeRate: settings.data.currency.usdToLbp
      });
    },
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
