import { get, head, list, put } from '@vercel/blob';
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
      if (await latestVersionPath(filePath)) return;
      await head(toDirectBlobPath(filePath));
    } catch (error) {
      throw notFoundError(error);
    }
  },
  mkdir: async () => {},
  writeFile: async (filePath, content, options = {}) => {
    if (options?.flag === 'wx') {
      if (await latestVersionPath(filePath)) {
        const error = new Error('Blob already exists.');
        error.code = 'EEXIST';
        throw error;
      }
    }
    await put(toVersionBlobPath(filePath), String(content), {
      access: 'private',
      allowOverwrite: false,
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
    const pathname = await latestVersionPath(filePath) ?? toDirectBlobPath(filePath);
    const blob = await get(pathname, { access: 'private' });
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
    const content = `${JSON.stringify(data, null, 2)}\n`;
    const pathname = toVersionBlobPath(filePath);
    await put(pathname, content, {
      access: 'private',
      allowOverwrite: false,
      contentType: 'application/json'
    });
    return success({ path: filePath, blobPath: pathname });
  } catch (error) {
    return failureFromCode(ErrorCodes.FILE_SAVE_ERROR, {
      path: filePath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function backupJsonFile(filePath, backupsFolder, options = {}) {
  try {
    const current = await readJsonFile(filePath);
    if (!current.ok) return current;
    const content = `${JSON.stringify(current.data, null, 2)}\n`;
    const backupPath = `${toDirectBlobPath(backupsFolder)}/${createUniqueBackupFileName(filePath, options.now ?? new Date())}`;
    await put(backupPath, content, {
      access: 'private',
      allowOverwrite: false,
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

export function createUniqueBackupFileName(filePath, date) {
  const name = createBackupFileName(filePath, date);
  const unique = `${date.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
  return name.replace(/\.json$/i, `_${unique}.json`);
}

async function latestVersionPath(filePath) {
  const fileName = basename(String(filePath).replace(/\\/g, '/'));
  if (!JSON_FILES.has(fileName)) return null;

  const result = await list({
    prefix: `${DATA_PREFIX}/versions/${fileName}/`,
    limit: 1000
  });
  const latest = result.blobs
    .filter((blob) => blob.pathname.endsWith('.json'))
    .sort((first, second) => {
      const dateDiff = new Date(second.uploadedAt).getTime() - new Date(first.uploadedAt).getTime();
      return dateDiff || second.pathname.localeCompare(first.pathname);
    })[0];

  return latest?.pathname ?? null;
}

function toVersionBlobPath(filePath) {
  const fileName = basename(String(filePath).replace(/\\/g, '/'));
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${DATA_PREFIX}/versions/${fileName}/${unique}.json`;
}

function toDirectBlobPath(filePath) {
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
