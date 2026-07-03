import { initializeAppDataFolder } from '../storage/dataFolderInitializer.mjs';

export async function initializeApp(options = {}) {
  return initializeAppDataFolder(options);
}

