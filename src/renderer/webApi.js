const apiMethods = [
  'initializeApp',
  'listRawMaterials',
  'createRawMaterial',
  'updateRawMaterial',
  'getRawMaterial',
  'deleteRawMaterial',
  'calculateRawMaterialDraft',
  'listProducts',
  'createProduct',
  'updateProduct',
  'getProduct',
  'deleteProduct',
  'calculateProductDraft',
  'loadSettings',
  'updateSettings',
  'verifyAdminKey',
  'listUsers',
  'createUser',
  'updateUser',
  'authenticateUser'
];

const ADMIN_KEY_SESSION_KEY = 'item_cost_admin_key';

export function createWebApi() {
  return Object.fromEntries(apiMethods.map((method) => [
    method,
    (...args) => callApi(method, args)
  ]));
}

export function shouldUseWebApi() {
  return !window.itemCostApi &&
    window.location.protocol.startsWith('http') &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);
}

async function callApi(method, args) {
  try {
    const payload = {
      method,
      args,
      adminKey: sessionStorage.getItem(ADMIN_KEY_SESSION_KEY) ?? ''
    };
    const response = await fetch('/api/app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (method === 'verifyAdminKey' && result?.ok) {
      sessionStorage.setItem(ADMIN_KEY_SESSION_KEY, String(args[0] ?? ''));
    }
    if (!response.ok && result?.ok !== false) {
      return { ok: false, error: { message: 'Server request failed.' } };
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : 'Server request failed.'
      }
    };
  }
}
