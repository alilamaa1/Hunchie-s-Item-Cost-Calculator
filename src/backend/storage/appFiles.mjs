import { join } from 'node:path';

export function getAppFilePaths(dataFolder) {
  return {
    rawMaterials: join(dataFolder, 'raw_materials.json'),
    products: join(dataFolder, 'products.json'),
    settings: join(dataFolder, 'settings.json'),
    users: join(dataFolder, 'users.json'),
    backups: join(dataFolder, 'backups')
  };
}

export async function readRawMaterials(dataFolder, storage) {
  const result = await storage.readJsonFile(getAppFilePaths(dataFolder).rawMaterials);
  return result.ok ? result : result;
}

export async function readProducts(dataFolder, storage) {
  const result = await storage.readJsonFile(getAppFilePaths(dataFolder).products);
  return result.ok ? result : result;
}

export async function readSettings(dataFolder, storage) {
  const result = await storage.readJsonFile(getAppFilePaths(dataFolder).settings);
  return result.ok ? result : result;
}
