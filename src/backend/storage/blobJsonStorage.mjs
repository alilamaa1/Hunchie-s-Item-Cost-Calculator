import { get, head, put } from '@vercel/blob';
import { basename } from 'node:path';
import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { createBackupFileName } from './jsonStorage.mjs';

const DATA_PREFIX = 'app-data';
const JSON_FILES = new Set(['raw_materials.json', 'products.json', 'users.json', 'settings.json']);

export const blobFileSystem = Object.freeze({
  access: async (filePath) => {
    if (isBackupsFolder(filePath)) return;
    try {
      await head(toBlobPath(filePath));
    } catch (error) {
      throw notFoundError(error);
    }
  },
  mkdir: async () => {},
  writeFile: async (filePath, content, options = {}) => {
    const pathname = toBlobPath(filePath);
    if (options?.flag === 'wx') {
      try {
        await head(pathname);
        const error = new Error('Blob already exists.');
        error.code = 'EEXIST';
        throw error;
      } catch (error) {
        if (error?.code === 'EEXIST') throw error;
      }
    }
    await put(pathname, String(content), {
      access: 'private',
      allowOverwrite: options?.flag !== 'wx',
      contentType: 'application/json'
    });
  }
});

export const blobJsonStorage = Object.freeze({
  readJsonFile,
  writeJsonFile,
  backupJsonFile
});

export async function readJsonFile(filePath) {
  try {
    const blob = await get(toBlobPath(filePath), { access: 'private' });
    if (!blob) return failureFromCode(ErrorCodes.FILE_MISSING, { path: filePath });
    const content = await new Response(blob.stream).text();
    return success(JSON.parse(content));
  } catch (error) {
    if (isBlobNotFound(error)) return failureFromCode(ErrorCodes.FILE_MISSING, { path: filePath });
    if (error instanceof SyntaxError) return failureFromCode(ErrorCodes.FILE_INVALID_JSON, { path: filePath });
    return failureFromCode(ErrorCodes.FILE_READ_ERROR, {
      path: filePath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function writeJsonFile(filePath, data) {
  try {
    await put(toBlobPath(filePath), `${JSON.stringify(data, null, 2)}\n`, {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json'
    });
    return success({ path: filePath });
  } catch (error) {
    return failureFromCode(ErrorCodes.FILE_SAVE_ERROR, {
      path: filePath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function backupJsonFile(filePath, backupsFolder, options = {}) {
  try {
    const source = await get(toBlobPath(filePath), { access: 'private' });
    if (!source) return failureFromCode(ErrorCodes.FILE_MISSING, { path: filePath });
    const content = await new Response(source.stream).text();
    const backupPath = `${toBlobPath(backupsFolder)}/${createBackupFileName(filePath, options.now ?? new Date())}`;
    await put(backupPath, content, {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json'
    });
    return success({ backupPath });
  } catch (error) {
    if (isBlobNotFound(error)) return failureFromCode(ErrorCodes.FILE_MISSING, { path: filePath });
    return failureFromCode(ErrorCodes.FILE_SAVE_ERROR, {
      path: filePath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function toBlobPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  if (isBackupsFolder(normalized)) return `${DATA_PREFIX}/backups`;
  if (normalized.includes('/backups/')) return `${DATA_PREFIX}/backups/${basename(normalized)}`;

  const fileName = basename(normalized);
  if (JSON_FILES.has(fileName)) return `${DATA_PREFIX}/${fileName}`;
  return `${DATA_PREFIX}/${fileName}`;
}

function isBackupsFolder(filePath) {
  return String(filePath).replace(/\\/g, '/').endsWith('/backups');
}

function isBlobNotFound(error) {
  return error?.name === 'BlobNotFoundError' || /not found/i.test(String(error?.message ?? ''));
}

function notFoundError(error) {
  if (isBlobNotFound(error)) {
    const next = new Error('Blob not found.');
    next.code = 'ENOENT';
    return next;
  }
  return error;
}
