import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';

const defaultFileSystem = Object.freeze({
  copyFile,
  readFile,
  writeFile
});

export async function readJsonFile(filePath, options = {}) {
  const fileSystem = options.fileSystem ?? defaultFileSystem;

  try {
    const content = await fileSystem.readFile(filePath, 'utf8');
    return success(JSON.parse(content));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return failureFromCode(ErrorCodes.FILE_MISSING, { path: filePath });
    }

    if (error instanceof SyntaxError) {
      return failureFromCode(ErrorCodes.FILE_INVALID_JSON, { path: filePath });
    }

    return failureFromCode(ErrorCodes.FILE_READ_ERROR, {
      path: filePath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function writeJsonFile(filePath, data, options = {}) {
  const fileSystem = options.fileSystem ?? defaultFileSystem;

  try {
    await fileSystem.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return success({ path: filePath });
  } catch (error) {
    return failureFromCode(ErrorCodes.FILE_SAVE_ERROR, {
      path: filePath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function backupJsonFile(filePath, backupsFolder, options = {}) {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const now = options.now ?? new Date();
  const backupPath = join(backupsFolder, createBackupFileName(filePath, now));

  try {
    await fileSystem.copyFile(filePath, backupPath);
    return success({ backupPath });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return failureFromCode(ErrorCodes.FILE_MISSING, { path: filePath });
    }

    return failureFromCode(ErrorCodes.FILE_SAVE_ERROR, {
      path: backupPath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export function createBackupFileName(filePath, date = new Date()) {
  const originalName = basename(filePath).replace(/\.json$/i, '');
  const timestamp = date.toISOString()
    .slice(0, 16)
    .replace('T', '_')
    .replace(':', '-');

  return `${originalName}_${timestamp}.json`;
}

