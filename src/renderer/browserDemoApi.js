const STORAGE_KEYS = {
  materials: 'item_cost_demo_materials',
  products: 'item_cost_demo_products',
  batches: 'item_cost_demo_batches',
  settings: 'item_cost_demo_settings',
  users: 'item_cost_demo_users'
};

const defaultSettings = {
  currency: { usdToLbp: 90000 },
  formulas: { totalCostMultiplier: 2.5 },
  dataFolder: 'Desktop/Item Cost Calculator',
  appVersion: '1.0.0'
};

const sectionPermissions = Object.freeze({
  home: { visible: true, edit: false },
  materials: { visible: true, edit: true },
  productionMaterials: { visible: true, edit: true },
  products: { visible: true, edit: true },
  batches: { visible: true, edit: true },
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
    listRawMaterials: async () => ok(recalculateProductionMaterials(readList(STORAGE_KEYS.materials))),
    createRawMaterial: async (input) => {
      const materials = readList(STORAGE_KEYS.materials);
      const draft = calculateRawMaterialDraft(input);
      if (!draft.ok) return draft;
      if (materials.some((material) => normalizeName(material.name) === normalizeName(draft.data.name))) {
        return fail('raw material already exists.', 'RAW_MATERIAL_DUPLICATE_NAME');
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
        return fail('raw material already exists.', 'RAW_MATERIAL_DUPLICATE_NAME');
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
    listProducts: async () => {
      const settings = readJson(STORAGE_KEYS.settings, defaultSettings);
      const materials = recalculateProductionMaterials(readList(STORAGE_KEYS.materials));
      return ok(readList(STORAGE_KEYS.products).map((product) => ({ ...productForRead(product, materials, settings), ingredientCount: product.ingredients.length })));
    },
    createProduct: async (input) => {
      const products = readList(STORAGE_KEYS.products);
      const draft = calculateProductDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)), readJson(STORAGE_KEYS.settings, defaultSettings));
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
      const draft = calculateProductDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)), readJson(STORAGE_KEYS.settings, defaultSettings));
      if (!draft.ok) return draft;
      const updated = { id, ...draft.data, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
      writeList(STORAGE_KEYS.products, products.map((item) => item.id === id ? updated : item));
      return ok(updated);
    },
    getProduct: async (id) => {
      const product = readList(STORAGE_KEYS.products).find((item) => item.id === id);
      if (!product) return fail('Product not found.');
      const materials = recalculateProductionMaterials(readList(STORAGE_KEYS.materials));
      const settings = readJson(STORAGE_KEYS.settings, defaultSettings);
      const recalculated = productForRead(product, materials, settings);
      return ok({
        ...recalculated,
        ingredients: recalculated.ingredients.map((ingredient) => ({
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
    calculateProductDraft: async (input) => calculateProductDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)), readJson(STORAGE_KEYS.settings, defaultSettings)),
    listBatches: async () => ok(readList(STORAGE_KEYS.batches)),
    createBatch: async (input) => {
      const batches = readList(STORAGE_KEYS.batches);
      const draft = calculateBatchDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)), readJson(STORAGE_KEYS.settings, defaultSettings));
      if (!draft.ok) return draft;
      const now = new Date().toISOString();
      const batch = { id: nextId(batches, 'BP'), ...draft.data, createdAt: now, updatedAt: now };
      writeList(STORAGE_KEYS.batches, [...batches, batch]);
      return ok(batch);
    },
    updateBatch: async (id, input) => {
      const batches = readList(STORAGE_KEYS.batches);
      const existing = batches.find((item) => item.id === id);
      if (!existing) return fail('This batch could not be found.', 'BATCH_NOT_FOUND');
      const draft = calculateBatchDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)), readJson(STORAGE_KEYS.settings, defaultSettings));
      if (!draft.ok) return draft;
      const updated = { id, ...draft.data, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
      writeList(STORAGE_KEYS.batches, batches.map((item) => item.id === id ? updated : item));
      return ok(updated);
    },
    getBatch: async (id) => {
      const batch = readList(STORAGE_KEYS.batches).find((item) => item.id === id);
      return batch ? ok(batch) : fail('This batch could not be found.', 'BATCH_NOT_FOUND');
    },
    deleteBatch: async (id) => {
      writeList(STORAGE_KEYS.batches, readList(STORAGE_KEYS.batches).filter((item) => item.id !== id));
      return ok({ deletedId: id });
    },
    calculateBatchDraft: async (input) => calculateBatchDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)), readJson(STORAGE_KEYS.settings, defaultSettings)),
    loadSettings: async () => ok(readJson(STORAGE_KEYS.settings, defaultSettings)),
    updateSettings: async (input) => {
      const settings = {
        ...defaultSettings,
        ...readJson(STORAGE_KEYS.settings, defaultSettings),
        currency: { usdToLbp: Number(input?.currency?.usdToLbp ?? 90000) },
        formulas: { totalCostMultiplier: Number(input?.formulas?.totalCostMultiplier ?? readJson(STORAGE_KEYS.settings, defaultSettings).formulas?.totalCostMultiplier ?? 2.5) }
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
    deleteUser: async (id) => {
      const users = readList(STORAGE_KEYS.users).map(normalizeStoredUser);
      if (!users.some((user) => user.id === id)) return fail('This user could not be found.', 'USER_NOT_FOUND');
      writeList(STORAGE_KEYS.users, users.filter((user) => user.id !== id));
      return ok({ deletedId: id });
    },
    changePassword: async (id, input) => {
      const users = readList(STORAGE_KEYS.users).map(normalizeStoredUser);
      const existing = users.find((user) => user.id === id);
      if (!existing) return fail('This user could not be found.', 'USER_NOT_FOUND');
      if (existing.password !== String(input?.oldPassword ?? '')) return fail('Username or password is incorrect.', 'LOGIN_INVALID');
      const newPassword = String(input?.newPassword ?? '');
      if (!newPassword) return fail('Enter a password.', 'PASSWORD_REQUIRED');
      const updated = { ...existing, password: newPassword, updatedAt: new Date().toISOString() };
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
  if (input?.sourceType === 'production') {
    return calculateProductionMaterialDraft(input, recalculateProductionMaterials(readList(STORAGE_KEYS.materials)));
  }
  const supplier = String(input?.supplier ?? '').trim();
  const brand = String(input?.brand ?? '').trim();
  const materialName = String(input?.materialName ?? '').trim();
  const legacyName = String(input?.name ?? '').trim();
  const usesStructuredName = Boolean(supplier || brand || materialName || !legacyName);
  if (usesStructuredName && !supplier) return fail('Enter the supplier name.', 'RAW_MATERIAL_SUPPLIER_REQUIRED');
  if (usesStructuredName && !brand) return fail('Enter the brand.', 'RAW_MATERIAL_BRAND_REQUIRED');
  if (usesStructuredName && !materialName) return fail('Enter the material name.', 'RAW_MATERIAL_MATERIAL_REQUIRED');
  const name = usesStructuredName ? [supplier, brand, materialName].filter(Boolean).join(' ') : legacyName;
  if (!name) return fail('Enter a raw material name.');
  const quantity = Number(input.purchaseQuantity);
  const price = Number(input.purchasePrice);
  if (!Number.isFinite(quantity) || quantity <= 0) return fail('Enter a purchase quantity greater than zero.');
  if (!Number.isFinite(price) || price < 0) return fail('Enter a purchase price.');
  const purchasePriceUSD = input.purchaseCurrency === 'LBP' ? price / 90000 : price;
  const purchasePriceLBP = input.purchaseCurrency === 'LBP' ? price : price * 90000;
  const baseQuantity = convert(quantity, input.purchaseUnit, input.baseUnit, input.customConversions ?? {});
  if (baseQuantity == null) return fail('Add the missing unit conversion for this raw material.');
  return ok({
    name,
    sourceType: 'supplier',
    supplier,
    brand,
    materialName: materialName || legacyName,
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

function calculateProductDraft(input, materials, settings = defaultSettings) {
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
  const ingredientCostUSD = round(ingredients.reduce((sum, item) => sum + item.portionCostUSD, 0));
  const ingredientCostLBP = round(ingredients.reduce((sum, item) => sum + item.portionCostLBP, 0));
  const totalCostMultiplier = resolveTotalCostMultiplier(settings.formulas?.totalCostMultiplier);
  const ingredientWeightGrams = ingredientWeight(ingredients);
  return ok({
    name,
    category: ['piece', 'cake', 'box'].includes(input?.category) ? input.category : 'cake',
    servingCount: optionalNumber(input?.servingCount),
    finalWeight: optionalWeight(input?.finalWeight),
    ingredients,
    ingredientWeightGrams,
    ingredientCostUSD,
    ingredientCostLBP,
    totalCostUSD: round(ingredientCostUSD * totalCostMultiplier),
    totalCostLBP: round(ingredientCostLBP * totalCostMultiplier),
    visions: calculateVisions(input?.visions, {
      servingCount: optionalNumber(input?.servingCount),
      ingredients,
      ingredientWeightGrams,
      ingredientCostUSD,
      ingredientCostLBP,
      totalCostMultiplier
    })
  });
}

function calculateProductionMaterialDraft(input, materials) {
  const name = String(input?.name ?? '').trim();
  if (!name) return fail('Enter a raw material name.');
  const finalWeight = optionalWeight(input?.finalWeight);
  if (!finalWeight) return fail('Enter a purchase quantity greater than zero.');
  const baseUnit = ['kg', 'g'].includes(input?.baseUnit) ? input.baseUnit : 'g';
  const product = calculateProductDraft({
    name,
    category: 'cake',
    ingredients: input?.ingredients ?? []
  }, materials, readJson(STORAGE_KEYS.settings, defaultSettings));
  if (!product.ok) return product;
  const finalBaseQuantity = convert(finalWeight.quantity, finalWeight.unit, baseUnit, {});
  if (!finalBaseQuantity) return fail('Add the missing unit conversion for this raw material.');
  return ok({
    name,
    sourceType: 'production',
    supplier: '',
    brand: '',
    materialName: name,
    baseUnit,
    purchaseQuantity: finalWeight.quantity,
    purchaseUnit: finalWeight.unit,
    purchaseCurrency: 'USD',
    purchasePriceUSD: product.data.ingredientCostUSD,
    purchasePriceLBP: product.data.ingredientCostLBP,
    costPerBaseUnitUSD: round(product.data.ingredientCostUSD / finalBaseQuantity),
    costPerBaseUnitLBP: round(product.data.ingredientCostLBP / finalBaseQuantity),
    customConversions: {},
    ingredients: product.data.ingredients,
    ingredientWeightGrams: product.data.ingredientWeightGrams,
    finalWeight,
    notes: input?.notes ?? ''
  });
}

function recalculateProductionMaterials(materials) {
  let current = materials;
  for (let pass = 0; pass < 3; pass += 1) {
    current = current.map((material) => {
      if (material.sourceType !== 'production') return material;
      const draft = calculateProductionMaterialDraft(material, current.filter((item) => item.id !== material.id));
      return draft.ok ? { ...material, ...draft.data, id: material.id, createdAt: material.createdAt, updatedAt: material.updatedAt } : material;
    });
  }
  return current;
}

function productForRead(product, materials, settings) {
  const draft = calculateProductDraft({
    name: product.name,
    category: product.category,
    servingCount: product.servingCount,
    finalWeight: product.finalWeight,
    visions: product.visions,
    ingredients: product.ingredients
  }, materials, settings);
  return draft.ok ? { ...product, ...draft.data } : applyProductFormula(product, settings.formulas?.totalCostMultiplier);
}

function calculateBatchDraft(input, materials, settings) {
  const batchQuantity = Number(input?.batchQuantity);
  if (!Number.isFinite(batchQuantity) || batchQuantity <= 0) return fail('Enter a batch quantity greater than zero.', 'BATCH_QUANTITY_INVALID');
  const product = calculateProductDraft(input, materials, settings);
  if (!product.ok) return product;
  return ok({
    ...product.data,
    batchQuantity,
    perUnit: {
      servingCount: product.data.servingCount,
      ingredientWeightGrams: round(product.data.ingredientWeightGrams / batchQuantity),
      finalWeight: product.data.finalWeight ? { quantity: round(product.data.finalWeight.quantity / batchQuantity), unit: product.data.finalWeight.unit } : null,
      ingredientCostUSD: round(product.data.ingredientCostUSD / batchQuantity),
      ingredientCostLBP: round(product.data.ingredientCostLBP / batchQuantity),
      totalCostUSD: round(product.data.totalCostUSD / batchQuantity),
      totalCostLBP: round(product.data.totalCostLBP / batchQuantity)
    }
  });
}

function applyProductFormula(product, multiplier = 2.5) {
  const ingredientCostUSD = round((product.ingredients ?? []).reduce((sum, item) => sum + Number(item.portionCostUSD ?? 0), 0));
  const ingredientCostLBP = round((product.ingredients ?? []).reduce((sum, item) => sum + Number(item.portionCostLBP ?? 0), 0));
  const totalCostMultiplier = resolveTotalCostMultiplier(multiplier);
  return {
    ...product,
    category: product.category ?? 'cake',
    servingCount: product.servingCount ?? null,
    finalWeight: product.finalWeight ?? null,
    ingredientWeightGrams: product.ingredientWeightGrams ?? ingredientWeight(product.ingredients ?? []),
    ingredientCostUSD,
    ingredientCostLBP,
    totalCostUSD: round(ingredientCostUSD * totalCostMultiplier),
    totalCostLBP: round(ingredientCostLBP * totalCostMultiplier)
  };
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function optionalWeight(weight) {
  const quantity = optionalNumber(weight?.quantity);
  const unit = ['kg', 'g'].includes(weight?.unit) ? weight.unit : 'g';
  return quantity ? { quantity, unit } : null;
}

function ingredientWeight(ingredients) {
  return round((ingredients ?? []).reduce((sum, ingredient) => {
    if (ingredient.convertedUnit === 'kg') return sum + Number(ingredient.convertedQuantity ?? 0) * 1000;
    if (ingredient.convertedUnit === 'g') return sum + Number(ingredient.convertedQuantity ?? 0);
    return sum;
  }, 0));
}

function calculateVisions(visions, product) {
  if (!Array.isArray(visions) || !product.servingCount) return [];
  return visions.map((vision) => {
    const servingCount = optionalNumber(vision?.servingCount);
    if (!servingCount) return null;
    const scale = servingCount / product.servingCount;
    const ingredientCostUSD = round(product.ingredientCostUSD * scale);
    const ingredientCostLBP = round(product.ingredientCostLBP * scale);
    return {
      servingCount,
      scale: round(scale),
      ingredientWeightGrams: round(product.ingredientWeightGrams * scale),
      ingredientCostUSD,
      ingredientCostLBP,
      totalCostUSD: round(ingredientCostUSD * product.totalCostMultiplier),
      totalCostLBP: round(ingredientCostLBP * product.totalCostMultiplier),
      ingredients: product.ingredients.map((ingredient) => ({
        ...ingredient,
        quantity: round(Number(ingredient.quantity) * scale),
        convertedQuantity: round(Number(ingredient.convertedQuantity) * scale),
        portionCostUSD: round(Number(ingredient.portionCostUSD) * scale),
        portionCostLBP: round(Number(ingredient.portionCostLBP) * scale)
      }))
    };
  }).filter(Boolean);
}

function resolveTotalCostMultiplier(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 2.5;
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
