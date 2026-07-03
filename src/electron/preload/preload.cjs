const { contextBridge, ipcRenderer } = require('electron');

const channels = {
  INITIALIZE_APP: 'app:initialize',
  RAW_MATERIAL_LIST: 'raw-material:list',
  RAW_MATERIAL_CREATE: 'raw-material:create',
  RAW_MATERIAL_UPDATE: 'raw-material:update',
  RAW_MATERIAL_DETAIL: 'raw-material:detail',
  RAW_MATERIAL_DELETE: 'raw-material:delete',
  PRODUCT_LIST: 'product:list',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DETAIL: 'product:detail',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_DRAFT_CALCULATE: 'product-draft:calculate',
  RAW_MATERIAL_DRAFT_CALCULATE: 'raw-material-draft:calculate',
  SETTINGS_LOAD: 'settings:load',
  SETTINGS_UPDATE: 'settings:update',
  ADMIN_VERIFY: 'admin:verify',
  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_AUTHENTICATE: 'user:authenticate'
};

contextBridge.exposeInMainWorld('itemCostApi', {
  initializeApp: () => ipcRenderer.invoke(channels.INITIALIZE_APP),
  listRawMaterials: () => ipcRenderer.invoke(channels.RAW_MATERIAL_LIST),
  createRawMaterial: (input) => ipcRenderer.invoke(channels.RAW_MATERIAL_CREATE, input),
  updateRawMaterial: (id, input) => ipcRenderer.invoke(channels.RAW_MATERIAL_UPDATE, id, input),
  getRawMaterial: (id) => ipcRenderer.invoke(channels.RAW_MATERIAL_DETAIL, id),
  deleteRawMaterial: (id) => ipcRenderer.invoke(channels.RAW_MATERIAL_DELETE, id),
  listProducts: () => ipcRenderer.invoke(channels.PRODUCT_LIST),
  createProduct: (input) => ipcRenderer.invoke(channels.PRODUCT_CREATE, input),
  updateProduct: (id, input) => ipcRenderer.invoke(channels.PRODUCT_UPDATE, id, input),
  getProduct: (id) => ipcRenderer.invoke(channels.PRODUCT_DETAIL, id),
  deleteProduct: (id) => ipcRenderer.invoke(channels.PRODUCT_DELETE, id),
  calculateProductDraft: (input) => ipcRenderer.invoke(channels.PRODUCT_DRAFT_CALCULATE, input),
  calculateRawMaterialDraft: (input) => ipcRenderer.invoke(channels.RAW_MATERIAL_DRAFT_CALCULATE, input),
  loadSettings: () => ipcRenderer.invoke(channels.SETTINGS_LOAD),
  updateSettings: (input) => ipcRenderer.invoke(channels.SETTINGS_UPDATE, input),
  verifyAdminKey: (pin) => ipcRenderer.invoke(channels.ADMIN_VERIFY, pin),
  listUsers: () => ipcRenderer.invoke(channels.USER_LIST),
  createUser: (input) => ipcRenderer.invoke(channels.USER_CREATE, input),
  updateUser: (id, input) => ipcRenderer.invoke(channels.USER_UPDATE, id, input),
  authenticateUser: (input) => ipcRenderer.invoke(channels.USER_AUTHENTICATE, input)
});
