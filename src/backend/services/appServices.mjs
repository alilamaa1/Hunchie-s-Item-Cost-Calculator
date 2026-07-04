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
    authenticateUser,
    calculateProductDraft: async (input, context) => {
      const materials = await listRawMaterials(context);
      if (!materials.ok) return materials;
      return calculateProductDraft(input, materials.data, context);
    }
  };
}
