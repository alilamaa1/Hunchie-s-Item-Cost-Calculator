import { IpcChannels } from '../../backend/ipc/channels.mjs';

export function createPreloadApi(ipcRenderer) {
  return Object.freeze({
    initializeApp: () => ipcRenderer.invoke(IpcChannels.INITIALIZE_APP),
    listRawMaterials: () => ipcRenderer.invoke(IpcChannels.RAW_MATERIAL_LIST),
    createRawMaterial: (input) => ipcRenderer.invoke(IpcChannels.RAW_MATERIAL_CREATE, input),
    updateRawMaterial: (id, input) => ipcRenderer.invoke(IpcChannels.RAW_MATERIAL_UPDATE, id, input),
    getRawMaterial: (id) => ipcRenderer.invoke(IpcChannels.RAW_MATERIAL_DETAIL, id),
    deleteRawMaterial: (id) => ipcRenderer.invoke(IpcChannels.RAW_MATERIAL_DELETE, id),
    listProducts: () => ipcRenderer.invoke(IpcChannels.PRODUCT_LIST),
    createProduct: (input) => ipcRenderer.invoke(IpcChannels.PRODUCT_CREATE, input),
    updateProduct: (id, input) => ipcRenderer.invoke(IpcChannels.PRODUCT_UPDATE, id, input),
    getProduct: (id) => ipcRenderer.invoke(IpcChannels.PRODUCT_DETAIL, id),
    deleteProduct: (id) => ipcRenderer.invoke(IpcChannels.PRODUCT_DELETE, id),
    calculateProductDraft: (input) => ipcRenderer.invoke(IpcChannels.PRODUCT_DRAFT_CALCULATE, input),
    calculateRawMaterialDraft: (input) => ipcRenderer.invoke(IpcChannels.RAW_MATERIAL_DRAFT_CALCULATE, input),
    loadSettings: () => ipcRenderer.invoke(IpcChannels.SETTINGS_LOAD),
    updateSettings: (input) => ipcRenderer.invoke(IpcChannels.SETTINGS_UPDATE, input),
    verifyAdminKey: (pin) => ipcRenderer.invoke(IpcChannels.ADMIN_VERIFY, pin),
    listUsers: () => ipcRenderer.invoke(IpcChannels.USER_LIST),
    createUser: (input) => ipcRenderer.invoke(IpcChannels.USER_CREATE, input),
    updateUser: (id, input) => ipcRenderer.invoke(IpcChannels.USER_UPDATE, id, input),
    deleteUser: (id) => ipcRenderer.invoke(IpcChannels.USER_DELETE, id),
    authenticateUser: (input) => ipcRenderer.invoke(IpcChannels.USER_AUTHENTICATE, input)
  });
}

export const APPROVED_PRELOAD_API_KEYS = Object.freeze([
  'initializeApp',
  'listRawMaterials',
  'createRawMaterial',
  'updateRawMaterial',
  'getRawMaterial',
  'deleteRawMaterial',
  'listProducts',
  'createProduct',
  'updateProduct',
  'getProduct',
  'deleteProduct',
  'calculateProductDraft',
  'calculateRawMaterialDraft',
  'loadSettings',
  'updateSettings',
  'verifyAdminKey',
  'listUsers',
  'createUser',
  'updateUser',
  'deleteUser',
  'authenticateUser'
]);
