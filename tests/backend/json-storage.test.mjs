import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { backupJsonFile, createBackupFileName, readJsonFile, writeJsonFile } from '../../src/backend/storage/jsonStorage.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

test('reads raw materials, products, and settings JSON', async () => {
  const folder = await createTempAppDataFolder();

  try {
    const rawPath = join(folder, 'raw_materials.json');
    const productsPath = join(folder, 'products.json');
    const settingsPath = join(folder, 'settings.json');
    await writeFile(rawPath, '[{"id":"RM-0001"}]');
    await writeFile(productsPath, '[{"id":"PR-0001"}]');
    await writeFile(settingsPath, '{"currency":{"usdToLbp":90000}}');

    assert.deepEqual((await readJsonFile(rawPath)).data, [{ id: 'RM-0001' }]);
    assert.deepEqual((await readJsonFile(productsPath)).data, [{ id: 'PR-0001' }]);
    assert.equal((await readJsonFile(settingsPath)).data.currency.usdToLbp, 90000);
  } finally {
    await removeTempAppDataFolder(folder);
  }
});

test('missing JSON file returns file missing error', async () => {
  const result = await readJsonFile('C:\\missing\\raw_materials.json');

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.FILE_MISSING);
});

test('invalid JSON returns error and leaves corrupted file untouched', async () => {
  const folder = await createTempAppDataFolder();
  const filePath = join(folder, 'raw_materials.json');

  try {
    await writeFile(filePath, '{bad json');
    const result = await readJsonFile(filePath);

    assert.equal(result.ok, false);
    assert.equal(result.error.code, ErrorCodes.FILE_INVALID_JSON);
    assert.equal(await readFile(filePath, 'utf8'), '{bad json');
  } finally {
    await removeTempAppDataFolder(folder);
  }
});

test('writes JSON arrays and objects with indentation', async () => {
  const folder = await createTempAppDataFolder();

  try {
    const arrayPath = join(folder, 'products.json');
    const objectPath = join(folder, 'settings.json');

    assert.equal((await writeJsonFile(arrayPath, [{ id: 'PR-0001' }])).ok, true);
    assert.equal((await writeJsonFile(objectPath, { currency: { usdToLbp: 90000 } })).ok, true);

    assert.deepEqual(JSON.parse(await readFile(arrayPath, 'utf8')), [{ id: 'PR-0001' }]);
    assert.equal(JSON.parse(await readFile(objectPath, 'utf8')).currency.usdToLbp, 90000);
    assert.match(await readFile(arrayPath, 'utf8'), /\n  \{\n/);
  } finally {
    await removeTempAppDataFolder(folder);
  }
});

test('write failure returns file save error', async () => {
  const result = await writeJsonFile('C:\\blocked\\settings.json', {}, {
    fileSystem: {
      writeFile: async () => {
        throw new Error('blocked');
      }
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, ErrorCodes.FILE_SAVE_ERROR);
});

test('creates timestamped backup with previous contents', async () => {
  const folder = await createTempAppDataFolder();
  const backups = join(folder, 'backups');
  const filePath = join(folder, 'raw_materials.json');
  const now = new Date('2026-06-28T08:30:00.000Z');

  try {
    await mkdir(backups);
    await writeFile(filePath, '[{"id":"old"}]');

    const result = await backupJsonFile(filePath, backups, { now });

    assert.equal(result.ok, true);
    assert.match(result.data.backupPath, /raw_materials_2026-06-28_08-30\.json$/);
    assert.equal(await readFile(result.data.backupPath, 'utf8'), '[{"id":"old"}]');
    assert.equal(createBackupFileName(filePath, now), 'raw_materials_2026-06-28_08-30.json');
  } finally {
    await removeTempAppDataFolder(folder);
  }
});

