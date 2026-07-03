import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_USD_TO_LBP } from '../../src/shared/constants.mjs';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

test('initialization creates the missing app data folder', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Desktop', 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });

    assert.equal(result.ok, true);
    await access(dataFolder);
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('initialization creates the backups folder', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });

    assert.equal(result.ok, true);
    await access(join(dataFolder, 'backups'));
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('initialization preserves unknown files in the app folder', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');
  const unknownFile = join(dataFolder, 'owner-notes.txt');

  try {
    await mkdir(dataFolder, { recursive: true });
    await writeFile(unknownFile, 'keep me');

    const result = await initializeAppDataFolder({ dataFolder });

    assert.equal(result.ok, true);
    assert.equal(await readFile(unknownFile, 'utf8'), 'keep me');
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('initialization preserves existing JSON data files', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');
  const rawMaterialsPath = join(dataFolder, 'raw_materials.json');

  try {
    await mkdir(dataFolder, { recursive: true });
    await writeFile(rawMaterialsPath, '[{"id":"RM-0001"}]\n');

    const result = await initializeAppDataFolder({ dataFolder });

    assert.equal(result.ok, true);
    assert.equal(await readFile(rawMaterialsPath, 'utf8'), '[{"id":"RM-0001"}]\n');
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('missing raw_materials.json is created as an empty array', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });
    const rawMaterials = JSON.parse(await readFile(join(dataFolder, 'raw_materials.json'), 'utf8'));

    assert.equal(result.ok, true);
    assert.deepEqual(rawMaterials, []);
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('missing products.json is created as an empty array', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });
    const products = JSON.parse(await readFile(join(dataFolder, 'products.json'), 'utf8'));

    assert.equal(result.ok, true);
    assert.deepEqual(products, []);
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('missing users.json is created as an empty array', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });
    const users = JSON.parse(await readFile(join(dataFolder, 'users.json'), 'utf8'));

    assert.equal(result.ok, true);
    assert.deepEqual(users, []);
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('missing settings.json contains default exchange rate', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });
    const settings = JSON.parse(await readFile(join(dataFolder, 'settings.json'), 'utf8'));

    assert.equal(result.ok, true);
    assert.equal(settings.currency.usdToLbp, DEFAULT_USD_TO_LBP);
    assert.equal(settings.dataFolder, dataFolder);
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('initialization succeeds only when required files exist', async () => {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    const result = await initializeAppDataFolder({ dataFolder });

    assert.equal(result.ok, true);
    await access(result.data.files['raw_materials.json']);
    await access(result.data.files['products.json']);
    await access(result.data.files['settings.json']);
    await access(result.data.files['users.json']);
  } finally {
    await removeTempAppDataFolder(parent);
  }
});

test('simulated write failure returns a structured save error', async () => {
  const result = await initializeAppDataFolder({
    dataFolder: 'C:\\blocked\\Item Cost Calculator',
    fileSystem: {
      mkdir: async () => undefined,
      access: async () => {
        throw new Error('missing');
      },
      writeFile: async () => {
        throw new Error('permission denied');
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.FILE_SAVE_ERROR);
  assert.equal(typeof result.error.message, 'string');
});
