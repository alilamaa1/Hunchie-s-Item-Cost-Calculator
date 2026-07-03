import test from 'node:test';
import assert from 'node:assert/strict';
import { IpcChannels } from '../../src/backend/ipc/channels.mjs';
import { registerIpcHandlers } from '../../src/backend/ipc/registerHandlers.mjs';
import { APPROVED_PRELOAD_API_KEYS, createPreloadApi } from '../../src/electron/preload/apiContract.mjs';
import { createMainWindowConfig } from '../../src/electron/main/windowConfig.mjs';

test('IPC handlers register every approved backend channel and delegate to services', async () => {
  const registered = new Map();
  const calls = [];
  const ipcMain = {
    handle(channel, handler) {
      registered.set(channel, handler);
    }
  };
  const services = Object.fromEntries([
    'initializeApp',
    'listRawMaterials',
    'createRawMaterial',
    'updateRawMaterial',
    'getRawMaterialById',
    'deleteRawMaterial',
    'listProducts',
    'createProduct',
    'updateProduct',
    'getProductById',
    'deleteProduct',
    'calculateProductDraft',
    'calculateRawMaterialDraft',
    'loadSettings',
    'updateSettings'
  ].map((name) => [name, (...args) => {
    calls.push({ name, args });
    return Promise.resolve({ ok: true, data: name });
  }]));

  registerIpcHandlers(ipcMain, services, () => ({ dataFolder: 'test' }));

  assert.deepEqual([...registered.keys()].sort(), Object.values(IpcChannels).sort());
  await registered.get(IpcChannels.RAW_MATERIAL_CREATE)({}, { name: 'Flour' });
  assert.equal(calls.at(-1).name, 'createRawMaterial');
  assert.deepEqual(calls.at(-1).args, [{ name: 'Flour' }, { dataFolder: 'test' }]);
});

test('preload API exposes only approved app methods and no generic filesystem access', async () => {
  const calls = [];
  const ipcRenderer = {
    invoke(channel, ...args) {
      calls.push({ channel, args });
      return Promise.resolve({ ok: true });
    }
  };
  const api = createPreloadApi(ipcRenderer);

  assert.deepEqual(Object.keys(api).sort(), [...APPROVED_PRELOAD_API_KEYS].sort());
  assert.equal('readFile' in api, false);
  assert.equal('writeFile' in api, false);
  assert.equal(api.createProduct({ name: 'Cake' }) instanceof Promise, true);
  await api.createProduct({ name: 'Cake' });
  assert.equal(calls.at(-1).channel, IpcChannels.PRODUCT_CREATE);
});

test('Electron window config enables context isolation and disables renderer node integration', () => {
  const config = createMainWindowConfig({ preloadPath: 'preload.js' });

  assert.equal(config.webPreferences.contextIsolation, true);
  assert.equal(config.webPreferences.nodeIntegration, false);
  assert.equal(config.webPreferences.sandbox, true);
});

