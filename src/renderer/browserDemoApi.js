const STORAGE_KEYS = {
  materials: 'item_cost_demo_materials',
  products: 'item_cost_demo_products',
  settings: 'item_cost_demo_settings',
  users: 'item_cost_demo_users'
};

const defaultSettings = {
  currency: { usdToLbp: 90000 },
  dataFolder: 'Desktop/Item Cost Calculator',
  appVersion: '1.0.0'
};

const sectionPermissions = Object.freeze({
  home: { visible: true, edit: false },
  materials: { visible: true, edit: true },
  products: { visible: true, edit: true },
  settings: { visible: true, edit: true }
});

const metricSpoonsMl = Object.freeze({
  cup: 240,
  tbsp: 15,
  tsp: 5
});

export function createBrowserDemoApi() {
  return {
    initializeApp: async () => ok({ dataFolder: defaultSettings.dataFolder }),
    listRawMaterials: async () => ok(readList(STORAGE_KEYS.materials)),
    createRawMaterial: async (input) => {
      const materials = readList(STORAGE_KEYS.materials);
      const draft = calculateRawMaterialDraft(input);
      if (!draft.ok) return draft;
      if (materials.some((material) => normalizeName(material.name) === normalizeName(draft.data.name))) {
        return fail('A raw material with this name already exists.', 'RAW_MATERIAL_DUPLICATE_NAME');
      }
      const now = new Date().toISOString();
      const material = {
        id: nextId(materials, 'RM'),
        ...draft.data,
        createdAt: now,
        updatedAt: now
      };
      writeList(STORAGE_KEYS.materials, [...materials, material]);
      return ok(material);
    },
    updateRawMaterial: async (id, input) => {
      const materials = readList(STORAGE_KEYS.materials);
      const existing = materials.find((item) => item.id === id);
      if (!existing) return fail('Raw material not found.');
      const draft = calculateRawMaterialDraft(input);
      if (!draft.ok) return draft;
      if (materials.some((material) => material.id !== id && normalizeName(material.name) === normalizeName(draft.data.name))) {
        return fail('A raw material with this name already exists.', 'RAW_MATERIAL_DUPLICATE_NAME');
      }
      const updated = { ...draft.data, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
      writeList(STORAGE_KEYS.materials, materials.map((item) => item.id === id ? updated : item));
      return ok(updated);
    },
    getRawMaterial: async (id) => ok(readList(STORAGE_KEYS.materials).find((item) => item.id === id)),
    deleteRawMaterial: async (id) => {
      writeList(STORAGE_KEYS.materials, readList(STORAGE_KEYS.materials).filter((item) => item.id !== id));
      return ok({ deletedId: id });
    },
    calculateRawMaterialDraft: async (input) => calculateRawMaterialDraft(input),
    listProducts: async () => ok(readList(STORAGE_KEYS.products).map((product) => ({ ...product, ingredientCount: product.ingredients.length }))),
    createProduct: async (input) => {
      const products = readList(STORAGE_KEYS.products);
      const draft = calculateProductDraft(input, readList(STORAGE_KEYS.materials));
      if (!draft.ok) return draft;
      const now = new Date().toISOString();
      const product = { id: nextId(products, 'PR'), ...draft.data, createdAt: now, updatedAt: now };
      writeList(STORAGE_KEYS.products, [...products, product]);
      return ok(product);
    },
    updateProduct: async (id, input) => {
      const products = readList(STORAGE_KEYS.products);
      const existing = products.find((item) => item.id === id);
      if (!existing) return fail('Product not found.');
      const draft = calculateProductDraft(input, readList(STORAGE_KEYS.materials));
      if (!draft.ok) return draft;
      const updated = { id, ...draft.data, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
      writeList(STORAGE_KEYS.products, products.map((item) => item.id === id ? updated : item));
      return ok(updated);
    },
    getProduct: async (id) => {
      const product = readList(STORAGE_KEYS.products).find((item) => item.id === id);
      if (!product) return fail('Product not found.');
      const materials = readList(STORAGE_KEYS.materials);
      return ok({
        ...product,
        ingredients: product.ingredients.map((ingredient) => ({
          ...ingredient,
          rawMaterialName: materials.find((material) => material.id === ingredient.rawMaterialId)?.name ?? null,
          missingRawMaterial: !materials.some((material) => material.id === ingredient.rawMaterialId)
        })),
        warnings: []
      });
    },
    deleteProduct: async (id) => {
      writeList(STORAGE_KEYS.products, readList(STORAGE_KEYS.products).filter((item) => item.id !== id));
      return ok({ deletedId: id });
    },
    calculateProductDraft: async (input) => calculateProductDraft(input, readList(STORAGE_KEYS.materials)),
    loadSettings: async () => ok(readJson(STORAGE_KEYS.settings, defaultSettings)),
    updateSettings: async (input) => {
      const settings = {
        ...defaultSettings,
        ...readJson(STORAGE_KEYS.settings, defaultSettings),
        currency: { usdToLbp: Number(input?.currency?.usdToLbp ?? 90000) }
      };
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      return ok({ settings, warnings: [{ message: 'Browser preview settings saved locally.' }] });
    },
    verifyAdminKey: async (pin) => {
      return String(pin ?? '') === '494' ? ok({ authorized: true }) : fail('Admin key is incorrect.', 'ADMIN_KEY_INVALID');
    },
    listUsers: async () => ok(readList(STORAGE_KEYS.users).map(normalizeStoredUser)),
    createUser: async (input) => {
      const users = readList(STORAGE_KEYS.users).map(normalizeStoredUser);
      const normalized = normalizeUserInput(input);
      if (!normalized.ok) return normalized;
      if (users.some((user) => user.username === normalized.data.username)) {
        return fail('user already exists.', 'USER_ALREADY_EXISTS');
      }
      const now = new Date().toISOString();
      const user = {
        id: nextId(users, 'US'),
        username: normalized.data.username,
        password: normalized.data.password,
        name: normalized.data.name,
        department: normalized.data.department,
        permissions: normalized.data.permissions,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      writeList(STORAGE_KEYS.users, [...users, user]);
      return ok(withoutPrivateFields(user));
    },
    updateUser: async (id, input) => {
      const users = readList(STORAGE_KEYS.users).map(normalizeStoredUser);
      const existing = users.find((user) => user.id === id);
      if (!existing) return fail('This user could not be found.', 'USER_NOT_FOUND');
      const normalized = normalizeUserInput({
        username: input?.username ?? existing.username,
        password: input?.password ?? existing.password,
        name: input?.name ?? existing.name,
        department: input?.department ?? existing.department,
        permissions: input?.permissions ?? existing.permissions
      });
      if (!normalized.ok) return normalized;
      if (users.some((user) => user.id !== id && user.username === normalized.data.username)) {
        return fail('user already exists.', 'USER_ALREADY_EXISTS');
      }
      const updated = {
        ...existing,
        username: normalized.data.username,
        password: normalized.data.password,
        name: normalized.data.name,
        department: normalized.data.department,
        permissions: normalized.data.permissions,
        isActive: typeof input?.isActive === 'boolean' ? input.isActive : existing.isActive,
        updatedAt: new Date().toISOString()
      };
      writeList(STORAGE_KEYS.users, users.map((user) => user.id === id ? updated : user));
      return ok(withoutPrivateFields(updated));
    },
    authenticateUser: async (input) => {
      const username = normalizeUsername(input?.username);
      const password = String(input?.password ?? '');
      const user = readList(STORAGE_KEYS.users).map(normalizeStoredUser).find((item) => item.username === username && item.password === password);
      if (!user) return fail('Username or password is incorrect.', 'LOGIN_INVALID');
      if (!user.isActive) return fail('This user no longer has access.', 'USER_INACTIVE');
      return ok(withoutPrivateFields(user));
    }
  };
}

function calculateRawMaterialDraft(input) {
  if (!String(input?.name ?? '').trim()) return fail('Enter a raw material name.');
  const quantity = Number(input.purchaseQuantity);
  const price = Number(input.purchasePrice);
  if (!Number.isFinite(quantity) || quantity <= 0) return fail('Enter a purchase quantity greater than zero.');
  if (!Number.isFinite(price) || price < 0) return fail('Enter a purchase price.');
  const purchasePriceUSD = input.purchaseCurrency === 'LBP' ? price / 90000 : price;
  const purchasePriceLBP = input.purchaseCurrency === 'LBP' ? price : price * 90000;
  const baseQuantity = convert(quantity, input.purchaseUnit, input.baseUnit, input.customConversions ?? {});
  if (baseQuantity == null) return fail('Add the missing unit conversion for this raw material.');
  return ok({
    name: String(input.name).trim(),
    baseUnit: input.baseUnit,
    purchaseQuantity: quantity,
    purchaseUnit: input.purchaseUnit,
    purchaseCurrency: input.purchaseCurrency,
    purchasePriceUSD,
    purchasePriceLBP,
    costPerBaseUnitUSD: purchasePriceUSD / baseQuantity,
    costPerBaseUnitLBP: purchasePriceLBP / baseQuantity,
    customConversions: cleanConversions(input.customConversions ?? {}),
    notes: input.notes ?? ''
  });
}

function calculateProductDraft(input, materials) {
  const name = String(input?.name ?? '').trim();
  if (!name) return fail('Enter a product name.');
  const rows = (input.ingredients ?? []).filter((row) => row.rawMaterialId || row.quantity || row.unit);
  if (rows.length === 0) return fail('Add at least one ingredient.');
  const ingredients = [];
  const seen = new Set();
  for (const row of rows) {
    const material = materials.find((item) => item.id === row.rawMaterialId);
    if (!material) return fail('Choose a raw material for this ingredient row.');
    if (seen.has(row.rawMaterialId)) {
      return fail('Use each raw material only once in a product.', 'INGREDIENT_DUPLICATE_RAW_MATERIAL');
    }
    seen.add(row.rawMaterialId);
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return fail('Enter an ingredient quantity greater than zero.');
    const convertedQuantity = convert(quantity, row.unit, material.baseUnit, material.customConversions ?? {});
    if (convertedQuantity == null) return fail('Add the missing unit conversion for this raw material.');
    const portionCostUSD = round(convertedQuantity * material.costPerBaseUnitUSD);
    ingredients.push({
      rawMaterialId: material.id,
      quantity,
      unit: row.unit,
      convertedQuantity,
      convertedUnit: material.baseUnit,
      portionCostUSD,
      portionCostLBP: round(portionCostUSD * 90000)
    });
  }
  return ok({
    name,
    ingredients,
    totalCostUSD: round(ingredients.reduce((sum, item) => sum + item.portionCostUSD, 0)),
    totalCostLBP: round(ingredients.reduce((sum, item) => sum + item.portionCostLBP, 0))
  });
}

function convert(quantity, from, to, conversions) {
  if (from === to) return quantity;
  if (from === 'kg' && to === 'g') return quantity * 1000;
  if (from === 'g' && to === 'kg') return quantity / 1000;
  if (from === 'L' && to === 'ml') return quantity * 1000;
  if (from === 'ml' && to === 'L') return quantity / 1000;
  const density = inferGramsPerMl(conversions);
  if (density && ['L', 'ml'].includes(from) && ['kg', 'g'].includes(to)) {
    const grams = (from === 'L' ? quantity * 1000 : quantity) * density;
    return to === 'kg' ? grams / 1000 : grams;
  }
  if (density && ['kg', 'g'].includes(from) && ['L', 'ml'].includes(to)) {
    const milliliters = (from === 'kg' ? quantity * 1000 : quantity) / density;
    return to === 'L' ? milliliters / 1000 : milliliters;
  }
  if (['cup', 'tbsp', 'tsp'].includes(from)) {
    const conversion = conversions[from];
    if (!conversion) return null;
    return convert(quantity * Number(conversion.quantity), conversion.unit, to, conversions);
  }
  return null;
}

function inferGramsPerMl(conversions = {}) {
  for (const unit of ['cup', 'tbsp', 'tsp']) {
    const conversion = conversions[unit];
    if (!conversion || !['kg', 'g'].includes(conversion.unit) || !(Number(conversion.quantity) > 0)) continue;
    const grams = conversion.unit === 'kg' ? Number(conversion.quantity) * 1000 : Number(conversion.quantity);
    return grams / metricSpoonsMl[unit];
  }
  return null;
}

function cleanConversions(conversions) {
  return Object.fromEntries(Object.entries(conversions).filter(([, value]) => value?.quantity));
}

function readList(key) {
  return readJson(key, []);
}

function writeList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeUserInput(input) {
  const username = normalizeUsername(input?.username);
  const password = String(input?.password ?? '');
  const name = String(input?.name ?? '').trim();
  const department = String(input?.department ?? '').trim();
  const permissions = normalizePermissions(input?.permissions);
  if (!username) return fail('Enter a username.', 'USERNAME_REQUIRED');
  if (!password) return fail('Enter a password.', 'PASSWORD_REQUIRED');
  return ok({ username, password, name, department, permissions });
}

function normalizeUsername(value) {
  return String(value ?? '').trim().replace(/\s+/g, '_');
}

function normalizeStoredUser(user) {
  return {
    ...user,
    name: String(user?.name ?? '').trim(),
    department: String(user?.department ?? '').trim(),
    permissions: normalizePermissions(user?.permissions)
  };
}

function normalizePermissions(input) {
  return Object.fromEntries(Object.entries(sectionPermissions).map(([section, defaults]) => {
    const current = input?.[section] ?? {};
    const visible = typeof current.visible === 'boolean' ? current.visible : defaults.visible;
    const edit = visible && defaults.edit && (typeof current.edit === 'boolean' ? current.edit : defaults.edit);
    return [section, { visible, edit }];
  }));
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function withoutPrivateFields(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function nextId(records, prefix) {
  const max = records.reduce((highest, item) => Math.max(highest, Number(item.id?.split('-')[1]) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

function ok(data) {
  return { ok: true, data };
}

function fail(message, code = 'BROWSER_PREVIEW_ERROR') {
  return { ok: false, error: { code, message } };
}

function round(value) {
  return Number(Number(value).toFixed(12));
}
