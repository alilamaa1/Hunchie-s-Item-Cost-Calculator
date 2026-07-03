import { homedir } from 'node:os';
import { join } from 'node:path';
import { APP_DATA_FOLDER_NAME } from '../../shared/constants.mjs';

export function getDefaultDesktopPath(options = {}) {
  const homeDirectory = options.homeDirectory ?? homedir();
  return join(homeDirectory, 'Desktop');
}

export function resolveAppDataFolder(options = {}) {
  const overrideFolder =
    options.overrideFolder ??
    options.dataFolderOverride ??
    options.settings?.dataFolder;

  if (typeof overrideFolder === 'string' && overrideFolder.trim().length > 0) {
    return overrideFolder;
  }

  const desktopPath = options.desktopPath ?? getDefaultDesktopPath(options);
  return join(desktopPath, APP_DATA_FOLDER_NAME);
}

