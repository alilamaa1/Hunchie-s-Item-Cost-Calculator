import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createMainWindowConfig } from './windowConfig.mjs';
import { registerIpcHandlers } from '../../backend/ipc/registerHandlers.mjs';
import { createAppServices } from '../../backend/services/appServices.mjs';
import { resolveAppDataFolder } from '../../backend/storage/dataFolderResolver.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

function createContext() {
  return {
    dataFolder: resolveAppDataFolder()
  };
}

function createWindow() {
  const preloadPath = join(__dirname, '../preload/preload.cjs');
  const window = new BrowserWindow(createMainWindowConfig({ preloadPath }));

  if (isDev) {
    window.loadURL('http://127.0.0.1:5173');
  } else {
    window.loadFile(join(__dirname, '../../../dist/index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  registerIpcHandlers(ipcMain, createAppServices(), createContext);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

