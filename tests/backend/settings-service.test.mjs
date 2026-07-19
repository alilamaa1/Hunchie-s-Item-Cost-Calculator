import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { usdToLbp } from '../../src/backend/domain/currencyEngine.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import { loadSettings, updateSettings } from '../../src/backend/services/settingsService.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

async function withDataFolder(fn) {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    await initializeAppDataFolder({ dataFolder });
    await fn(dataFolder);
  } finally {
    await removeTempAppDataFolder(parent);
  }
}

test('settings service loads exchange rate and data folder display path', async () => {
  await withDataFolder(async (dataFolder) => {
    const result = await loadSettings({ dataFolder });

    assert.equal(result.ok, true);
    assert.equal(result.data.currency.usdToLbp, 90000);
    assert.equal(result.data.formulas.totalCostMultiplier, 2.5);
    assert.equal(result.data.dataFolder, dataFolder);
  });
});

test('settings service merges missing settings with defaults', async () => {
  await withDataFolder(async (dataFolder) => {
    await writeFile(join(dataFolder, 'settings.json'), JSON.stringify({ currency: { usdToLbp: 90000 }, dataFolder }));
    const result = await loadSettings({ dataFolder });

    assert.equal(result.ok, true);
    assert.equal(result.data.appVersion, '1.0.0');
    assert.equal(result.data.formulas.totalCostMultiplier, 2.5);
  });
});

test('settings service rejects invalid exchange rate', async () => {
  await withDataFolder(async (dataFolder) => {
    await writeFile(join(dataFolder, 'settings.json'), JSON.stringify({ currency: { usdToLbp: -1 }, dataFolder, appVersion: '1.0.0' }));
    const result = await loadSettings({ dataFolder });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, ErrorCodes.EXCHANGE_RATE_INVALID);
  });
});

test('settings service updates exchange rate, returns warning, and preserves data folder', async () => {
  await withDataFolder(async (dataFolder) => {
    const result = await updateSettings({ currency: { usdToLbp: 100000 }, dataFolder: 'ignored' }, { dataFolder });

    assert.equal(result.ok, true);
    assert.equal(result.data.settings.currency.usdToLbp, 100000);
    assert.equal(result.data.settings.dataFolder, dataFolder);
    assert.equal(result.data.warnings[0].code, 'EXCHANGE_RATE_CHANGED');
    assert.equal(usdToLbp(2, result.data.settings.currency.usdToLbp).data, 200000);
    assert.equal(JSON.parse(await readFile(join(dataFolder, 'settings.json'), 'utf8')).dataFolder, dataFolder);
  });
});

test('settings service updates total cost formula multiplier', async () => {
  await withDataFolder(async (dataFolder) => {
    const result = await updateSettings({ formulas: { totalCostMultiplier: 3.1 } }, { dataFolder });

    assert.equal(result.ok, true);
    assert.equal(result.data.settings.formulas.totalCostMultiplier, 3.1);
    assert.equal(JSON.parse(await readFile(join(dataFolder, 'settings.json'), 'utf8')).formulas.totalCostMultiplier, 3.1);
  });
});
