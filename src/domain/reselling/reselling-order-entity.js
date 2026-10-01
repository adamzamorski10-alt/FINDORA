/**
 * Stage 4 — Reselling Order Domain Entity
 *
 * Pure entity factory and validation.
 * No storage, no UI, no side effects.
 */

export function createResellingOrder({ userId, incomeProfileId, orderNumber, supplier, platform, date, items, shipping, additionalCosts, totalCost, status, tracking, notes }) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.trim() === '' || orderNumber.length > 100) {
    throw new Error('VALIDATION_FAILED');
  }
  if (supplier !== undefined && supplier !== null && typeof supplier !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (platform !== undefined && platform !== null && typeof platform !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('VALIDATION_FAILED');
  }
  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    if (item.quantity === undefined || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error('VALIDATION_FAILED');
    }
    if (item.purchasePrice === undefined || typeof item.purchasePrice !== 'number' || !Number.isFinite(item.purchasePrice) || item.purchasePrice < 0) {
      throw new Error('VALIDATION_FAILED');
    }
  }
  if (shipping !== undefined && shipping !== null && (typeof shipping !== 'number' || !Number.isFinite(shipping) || shipping < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (additionalCosts !== undefined && additionalCosts !== null && (typeof additionalCosts !== 'number' || !Number.isFinite(additionalCosts) || additionalCosts < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (totalCost !== undefined && (typeof totalCost !== 'number' || !Number.isFinite(totalCost) || totalCost < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (status !== undefined && status !== null && typeof status !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (tracking !== undefined && tracking !== null && typeof tracking !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }

  const VALID_STATUSES = ['ordered', 'processing', 'shipped', 'delivered', 'cancelled'];
  const finalStatus = status && VALID_STATUSES.includes(status) ? status : 'ordered';

  const computedItems = items.map(item => ({
    productId: item.productId,
    quantity: Math.max(1, Math.floor(item.quantity)),
    purchasePrice: item.purchasePrice,
  }));

  const computedTotalCost = totalCost !== undefined
    ? totalCost
    : computedItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0)
        + (shipping || 0)
        + (additionalCosts || 0);

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const now = new Date().toISOString();

  return {
    id,
    userId,
    incomeProfileId,
    orderNumber: orderNumber.trim(),
    supplier: supplier ? String(supplier).trim() : '',
    platform: platform ? String(platform).trim() : '',
    date,
    items: computedItems,
    shipping: shipping || 0,
    additionalCosts: additionalCosts || 0,
    totalCost: computedTotalCost,
    status: finalStatus,
    tracking: tracking ? String(tracking).trim() : '',
    notes: notes ? String(notes).trim() : '',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateResellingOrderUpdate({ existing, updates }) {
  if (!existing || typeof existing !== 'object') {
    throw new Error('NOT_FOUND');
  }

  const result = { ...existing };

  if (updates.orderNumber !== undefined) {
    if (typeof updates.orderNumber !== 'string' || updates.orderNumber.trim() === '' || updates.orderNumber.length > 100) {
      throw new Error('VALIDATION_FAILED');
    }
    result.orderNumber = updates.orderNumber.trim();
  }
  if (updates.supplier !== undefined) {
    if (updates.supplier !== null && typeof updates.supplier !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.supplier = updates.supplier ? String(updates.supplier).trim() : '';
  }
  if (updates.platform !== undefined) {
    if (updates.platform !== null && typeof updates.platform !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.platform = updates.platform ? String(updates.platform).trim() : '';
  }
  if (updates.date !== undefined) {
    if (typeof updates.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.date = updates.date;
  }
  if (updates.items !== undefined) {
    if (!Array.isArray(updates.items) || updates.items.length === 0) {
      throw new Error('VALIDATION_FAILED');
    }
    for (const item of updates.items) {
      if (!item.productId || typeof item.productId !== 'string') {
        throw new Error('VALIDATION_FAILED');
      }
      if (item.quantity === undefined || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error('VALIDATION_FAILED');
      }
      if (item.purchasePrice === undefined || typeof item.purchasePrice !== 'number' || !Number.isFinite(item.purchasePrice) || item.purchasePrice < 0) {
        throw new Error('VALIDATION_FAILED');
      }
    }
    result.items = updates.items.map(item => ({
      productId: item.productId,
      quantity: Math.max(1, Math.floor(item.quantity)),
      purchasePrice: item.purchasePrice,
    }));
    const shipping = updates.shipping !== undefined ? updates.shipping : result.shipping;
    const additionalCosts = updates.additionalCosts !== undefined ? updates.additionalCosts : result.additionalCosts;
    result.totalCost = result.items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0)
      + (shipping || 0)
      + (additionalCosts || 0);
  }
  if (updates.shipping !== undefined) {
    if (updates.shipping !== null && (typeof updates.shipping !== 'number' || !Number.isFinite(updates.shipping) || updates.shipping < 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.shipping = updates.shipping || 0;
  }
  if (updates.additionalCosts !== undefined) {
    if (updates.additionalCosts !== null && (typeof updates.additionalCosts !== 'number' || !Number.isFinite(updates.additionalCosts) || updates.additionalCosts < 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.additionalCosts = updates.additionalCosts || 0;
  }
  if (updates.totalCost !== undefined) {
    if (typeof updates.totalCost !== 'number' || !Number.isFinite(updates.totalCost) || updates.totalCost < 0) {
      throw new Error('VALIDATION_FAILED');
    }
    result.totalCost = updates.totalCost;
  }
  if (updates.status !== undefined) {
    if (typeof updates.status !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    const VALID_STATUSES = ['ordered', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!VALID_STATUSES.includes(updates.status)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.status = updates.status;
  }
  if (updates.tracking !== undefined) {
    if (updates.tracking !== null && typeof updates.tracking !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.tracking = updates.tracking ? String(updates.tracking).trim() : '';
  }
  if (updates.notes !== undefined) {
    if (updates.notes !== null && typeof updates.notes !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.notes = updates.notes ? String(updates.notes).trim() : '';
  }

  if (updates.userId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.incomeProfileId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.id !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.createdAt !== undefined) throw new Error('VALIDATION_FAILED');

  result.updatedAt = new Date().toISOString();
  return result;
}
