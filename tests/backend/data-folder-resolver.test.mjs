import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { resolveAppDataFolder } from '../../src/backend/storage/dataFolderResolver.mjs';

test('resolves default folder to Desktop/Item Cost Calculator', () => {
  const desktopPath = join('C:', 'Users', 'StoreOwner', 'Desktop');

  assert.equal(
    resolveAppDataFolder({ desktopPath }),
    join(desktopPath, 'Item Cost Calculator')
  );
});

test('keeps folder resolution isolated behind one function for test injection', () => {
  const tempFolder = join('C:', 'Temp', 'item-cost-calculator-test');

  assert.equal(
    resolveAppDataFolder({ overrideFolder: tempFolder }),
    tempFolder
  );
});

test('uses future settings or dependency-injected data folder override when provided', () => {
  const settingsFolder = join('D:', 'Cost Data');
  const injectedFolder = join('E:', 'Injected Cost Data');

  assert.equal(
    resolveAppDataFolder({ settings: { dataFolder: settingsFolder } }),
    settingsFolder
  );

  assert.equal(
    resolveAppDataFolder({
      settings: { dataFolder: settingsFolder },
      dataFolderOverride: injectedFolder
    }),
    injectedFolder
  );
});

