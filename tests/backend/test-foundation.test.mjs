import test from 'node:test';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

test('backend test runner discovers and executes backend tests', () => {
  assert.equal(1 + 1, 2);
});

test('temporary app data helper creates an isolated folder for each test', async () => {
  const firstFolder = await createTempAppDataFolder();
  const secondFolder = await createTempAppDataFolder();

  try {
    assert.notEqual(firstFolder, secondFolder);
    await writeFile(join(firstFolder, 'sample.txt'), 'sample');
    await access(join(firstFolder, 'sample.txt'));
  } finally {
    await removeTempAppDataFolder(firstFolder);
    await removeTempAppDataFolder(secondFolder);
  }
});

