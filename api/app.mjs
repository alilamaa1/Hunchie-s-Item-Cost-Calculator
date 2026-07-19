import { createAppServices } from '../src/backend/services/appServices.mjs';
import { blobFileSystem, blobJsonStorage } from '../src/backend/storage/blobJsonStorage.mjs';

const services = createAppServices();
const DATA_FOLDER = 'vercel-data';
const adminMethods = new Set(['listUsers', 'createUser', 'updateUser', 'deleteUser']);

const handlers = Object.freeze({
  initializeApp: () => services.initializeApp(context()),
  listRawMaterials: () => services.listRawMaterials(context()),
  createRawMaterial: (input) => services.createRawMaterial(input, context()),
  updateRawMaterial: (id, input) => services.updateRawMaterial(id, input, context()),
  getRawMaterial: (id) => services.getRawMaterialById(id, context()),
  deleteRawMaterial: (id) => services.deleteRawMaterial(id, context()),
  calculateRawMaterialDraft: (input) => services.calculateRawMaterialDraft(input, context()),
  listProducts: () => services.listProducts(context()),
  createProduct: (input) => services.createProduct(input, context()),
  updateProduct: (id, input) => services.updateProduct(id, input, context()),
  getProduct: (id) => services.getProductById(id, context()),
  deleteProduct: (id) => services.deleteProduct(id, context()),
  calculateProductDraft: (input) => services.calculateProductDraft(input, context()),
  loadSettings: () => services.loadSettings(context()),
  updateSettings: (input) => services.updateSettings(input, context()),
  verifyAdminKey: (pin) => services.verifyAdminKey(pin),
  listUsers: () => services.listUsers(context()),
  createUser: (input) => services.createUser(input, context()),
  updateUser: (id, input) => services.updateUser(id, input, context()),
  deleteUser: (id) => services.deleteUser(id, context()),
  changePassword: (id, input) => services.changePassword(id, input, context()),
  authenticateUser: (input) => services.authenticateUser(input, context())
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return send(response, 405, { ok: false, error: { message: 'Method not allowed.' } });
  }

  try {
    const payload = await readJsonBody(request);
    const method = String(payload?.method ?? '');
    const fn = handlers[method];
    if (!fn) return send(response, 404, { ok: false, error: { message: 'Unknown API method.' } });
    if (adminMethods.has(method)) {
      const admin = await services.verifyAdminKey(payload?.adminKey);
      if (!admin.ok) return send(response, 403, admin);
    }

    const result = await fn(...(Array.isArray(payload.args) ? payload.args : []));
    return send(response, 200, result);
  } catch (error) {
    return send(response, 500, {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'Server error.'
      }
    });
  }
}

function context() {
  return {
    dataFolder: DATA_FOLDER,
    fileSystem: blobFileSystem,
    storage: blobJsonStorage
  };
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function send(response, status, data) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(data));
}
