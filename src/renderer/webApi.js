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
  'deleteUser',
  'authenticateUser'
];

const ADMIN_KEY_SESSION_KEY = 'item_cost_admin_key';
let activeAdminKey = safeReadAdminKey();

export function createWebApi() {
  return {
    ...Object.fromEntries(apiMethods.map((method) => [
    method,
    (...args) => callApi(method, args)
    ])),
    setAdminKey: (value) => {
      activeAdminKey = String(value ?? '');
      safeWriteAdminKey(activeAdminKey);
    }
  };
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
      adminKey: activeAdminKey
    };
    const response = await fetch('/api/app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (method === 'verifyAdminKey' && result?.ok) {
      activeAdminKey = String(args[0] ?? '');
      safeWriteAdminKey(activeAdminKey);
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

function safeReadAdminKey() {
  try {
    return sessionStorage.getItem(ADMIN_KEY_SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

function safeWriteAdminKey(value) {
  try {
    sessionStorage.setItem(ADMIN_KEY_SESSION_KEY, value);
  } catch {
    // Some browser privacy modes block storage. The in-memory key still works for the current page.
  }
}
