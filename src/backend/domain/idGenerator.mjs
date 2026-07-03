export function generateNextRawMaterialId(rawMaterials) {
  return generateNextId(rawMaterials, 'RM');
}

export function generateNextProductId(products) {
  return generateNextId(products, 'PR');
}

export function preserveRawMaterialId(existingMaterial, updates) {
  return {
    ...updates,
    id: existingMaterial.id
  };
}

export function preserveProductId(existingProduct, updates) {
  return {
    ...updates,
    id: existingProduct.id
  };
}

function generateNextId(records, prefix) {
  const maxNumber = records.reduce((max, record) => {
    const id = typeof record?.id === 'string' ? record.id : '';
    const match = id.match(new RegExp(`^${prefix}-(\\d{4,})$`));

    if (!match) {
      return max;
    }

    const numericPart = Number.parseInt(match[1], 10);
    return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
}

