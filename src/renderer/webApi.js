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
    const response = await fetch('/api/app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args })
    });
    const result = await response.json();
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
