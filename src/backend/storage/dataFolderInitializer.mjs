import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { REQUIRED_DATA_FILES } from '../../shared/constants.mjs';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { createDefaultSettings } from '../domain/settingsModel.mjs';
import { resolveAppDataFolder } from './dataFolderResolver.mjs';

const defaultFileSystem = Object.freeze({
  access,
  mkdir,
  writeFile
});

export async function initializeAppDataFolder(options = {}) {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const dataFolder = options.dataFolder ?? resolveAppDataFolder(options);
  const backupsFolder = join(dataFolder, 'backups');

  try {
    await fileSystem.mkdir(dataFolder, { recursive: true });
    await fileSystem.mkdir(backupsFolder, { recursive: true });

    await ensureJsonFile(fileSystem, join(dataFolder, 'raw_materials.json'), []);
    await ensureJsonFile(fileSystem, join(dataFolder, 'products.json'), []);
    await ensureJsonFile(fileSystem, join(dataFolder, 'users.json'), []);
    await ensureJsonFile(
      fileSystem,
      join(dataFolder, 'settings.json'),
      createDefaultSettings({ dataFolder })
    );

    const files = Object.fromEntries(
      REQUIRED_DATA_FILES.map((fileName) => [fileName, join(dataFolder, fileName)])
    );

    await fileSystem.access(backupsFolder);
    for (const filePath of Object.values(files)) {
      await fileSystem.access(filePath);
    }

    return success({
      dataFolder,
      backupsFolder,
      files
    });
  } catch (error) {
    return failureFromCode(ErrorCodes.FILE_SAVE_ERROR, {
      path: dataFolder,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

async function ensureJsonFile(fileSystem, filePath, defaultValue) {
  try {
    await fileSystem.access(filePath);
    return;
  } catch {
    await fileSystem.writeFile(
      filePath,
      `${JSON.stringify(defaultValue, null, 2)}\n`,
      { flag: 'wx' }
    );
  }
}
