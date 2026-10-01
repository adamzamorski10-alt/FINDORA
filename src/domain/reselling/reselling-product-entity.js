/**
 * Stage 4 — Reselling Product Domain Entity
 *
 * Pure entity factory and validation.
 * No storage, no UI, no side effects.
 */

export function createResellingProduct({ userId, incomeProfileId, name, sku, platform, purchasePrice, plannedSalePrice, purchaseDate, quantity, location, notes, status }) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 200) {
    throw new Error('VALIDATION_FAILED');
  }
  if (purchasePrice === undefined || typeof purchasePrice !== 'number' || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
    throw new Error('VALIDATION_FAILED');
  }
  if (purchaseDate === undefined || typeof purchaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (quantity === undefined || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error('VALIDATION_FAILED');
  }
  if (sku !== undefined && sku !== null && typeof sku !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (platform !== undefined && platform !== null && typeof platform !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (plannedSalePrice !== undefined && plannedSalePrice !== null && (typeof plannedSalePrice !== 'number' || !Number.isFinite(plannedSalePrice) || plannedSalePrice < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (location !== undefined && location !== null && typeof location !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (status !== undefined && status !== null && typeof status !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }

  const VALID_STATUSES = ['ordered', 'in_transit', 'in_stock', 'listed', 'reserved', 'sold', 'returned', 'cancelled'];
  const finalStatus = status && VALID_STATUSES.includes(status) ? status : 'ordered';

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const now = new Date().toISOString();

  return {
    id,
    userId,
    incomeProfileId,
    name: name.trim(),
    sku: sku ? String(sku).trim() : '',
    platform: platform ? String(platform).trim() : '',
    purchasePrice,
    plannedSalePrice: plannedSalePrice || null,
    purchaseDate,
    quantity: Math.max(1, Math.floor(quantity)),
    location: location ? String(location).trim() : '',
    notes: notes ? String(notes).trim() : '',
    status: finalStatus,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateResellingProductUpdate({ existing, updates }) {
  if (!existing || typeof existing !== 'object') {
    throw new Error('NOT_FOUND');
  }

  const result = { ...existing };

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || updates.name.trim() === '' || updates.name.length > 200) {
      throw new Error('VALIDATION_FAILED');
    }
    result.name = updates.name.trim();
  }
  if (updates.sku !== undefined) {
    if (updates.sku !== null && typeof updates.sku !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.sku = updates.sku ? String(updates.sku).trim() : '';
  }
  if (updates.platform !== undefined) {
    if (updates.platform !== null && typeof updates.platform !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.platform = updates.platform ? String(updates.platform).trim() : '';
  }
  if (updates.purchasePrice !== undefined) {
    if (typeof updates.purchasePrice !== 'number' || !Number.isFinite(updates.purchasePrice) || updates.purchasePrice < 0) {
      throw new Error('VALIDATION_FAILED');
    }
    result.purchasePrice = updates.purchasePrice;
  }
  if (updates.plannedSalePrice !== undefined) {
    if (updates.plannedSalePrice !== null && (typeof updates.plannedSalePrice !== 'number' || !Number.isFinite(updates.plannedSalePrice) || updates.plannedSalePrice < 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.plannedSalePrice = updates.plannedSalePrice || null;
  }
  if (updates.purchaseDate !== undefined) {
    if (typeof updates.purchaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updates.purchaseDate)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.purchaseDate = updates.purchaseDate;
  }
  if (updates.quantity !== undefined) {
    if (typeof updates.quantity !== 'number' || !Number.isInteger(updates.quantity) || updates.quantity < 1) {
      throw new Error('VALIDATION_FAILED');
    }
    result.quantity = Math.max(1, Math.floor(updates.quantity));
  }
  if (updates.location !== undefined) {
    if (updates.location !== null && typeof updates.location !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.location = updates.location ? String(updates.location).trim() : '';
  }
  if (updates.notes !== undefined) {
    if (updates.notes !== null && typeof updates.notes !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.notes = updates.notes ? String(updates.notes).trim() : '';
  }
  if (updates.status !== undefined) {
    if (typeof updates.status !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    const VALID_STATUSES = ['ordered', 'in_transit', 'in_stock', 'listed', 'reserved', 'sold', 'returned', 'cancelled'];
    if (!VALID_STATUSES.includes(updates.status)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.status = updates.status;
  }

  if (updates.userId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.incomeProfileId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.id !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.createdAt !== undefined) throw new Error('VALIDATION_FAILED');

  result.updatedAt = new Date().toISOString();
  return result;
}
