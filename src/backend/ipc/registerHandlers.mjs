import { IpcChannels } from './channels.mjs';

export function registerIpcHandlers(ipcMain, services, contextFactory = () => ({})) {
  const handlers = {
    [IpcChannels.INITIALIZE_APP]: () => services.initializeApp(contextFactory()),
    [IpcChannels.RAW_MATERIAL_LIST]: () => services.listRawMaterials(contextFactory()),
    [IpcChannels.RAW_MATERIAL_CREATE]: (_event, input) => services.createRawMaterial(input, contextFactory()),
    [IpcChannels.RAW_MATERIAL_UPDATE]: (_event, id, input) => services.updateRawMaterial(id, input, contextFactory()),
    [IpcChannels.RAW_MATERIAL_DETAIL]: (_event, id) => services.getRawMaterialById(id, contextFactory()),
    [IpcChannels.RAW_MATERIAL_DELETE]: (_event, id) => services.deleteRawMaterial(id, contextFactory()),
    [IpcChannels.PRODUCT_LIST]: () => services.listProducts(contextFactory()),
    [IpcChannels.PRODUCT_CREATE]: (_event, input) => services.createProduct(input, contextFactory()),
    [IpcChannels.PRODUCT_UPDATE]: (_event, id, input) => services.updateProduct(id, input, contextFactory()),
    [IpcChannels.PRODUCT_DETAIL]: (_event, id) => services.getProductById(id, contextFactory()),
    [IpcChannels.PRODUCT_DELETE]: (_event, id) => services.deleteProduct(id, contextFactory()),
    [IpcChannels.PRODUCT_DRAFT_CALCULATE]: (_event, input) => services.calculateProductDraft(input, contextFactory()),
    [IpcChannels.RAW_MATERIAL_DRAFT_CALCULATE]: (_event, input) => services.calculateRawMaterialDraft(input, contextFactory()),
    [IpcChannels.SETTINGS_LOAD]: () => services.loadSettings(contextFactory()),
    [IpcChannels.SETTINGS_UPDATE]: (_event, input) => services.updateSettings(input, contextFactory()),
    [IpcChannels.ADMIN_VERIFY]: (_event, pin) => services.verifyAdminKey(pin),
    [IpcChannels.USER_LIST]: () => services.listUsers(contextFactory()),
    [IpcChannels.USER_CREATE]: (_event, input) => services.createUser(input, contextFactory()),
    [IpcChannels.USER_UPDATE]: (_event, id, input) => services.updateUser(id, input, contextFactory()),
    [IpcChannels.USER_AUTHENTICATE]: (_event, input) => services.authenticateUser(input, contextFactory())
  };

  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, handler);
  }

  return handlers;
}
