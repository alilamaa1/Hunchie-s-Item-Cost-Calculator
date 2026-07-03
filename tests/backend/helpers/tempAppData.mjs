import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export async function createTempAppDataFolder() {
  return mkdtemp(join(tmpdir(), 'item-cost-calculator-'));
}

export async function removeTempAppDataFolder(folderPath) {
  await rm(folderPath, {
    recursive: true,
    force: true
  });
}

