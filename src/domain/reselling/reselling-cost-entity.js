/**
 * Stage 4 — Reselling Cost Domain Entity
 *
 * Pure entity factory and validation.
 * No storage, no UI, no side effects.
 */

export function createResellingCost({ userId, incomeProfileId, amount, category, date, description, accountId, linkedProductId, linkedSaleId, linkedOrderId }) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('VALIDATION_FAILED');
  }
  if (!category || typeof category !== 'string' || !['shipping', 'commission', 'packaging', 'advertising', 'equipment', 'other'].includes(category)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (!description || typeof description !== 'string' || description.trim() === '' || description.length > 500) {
    throw new Error('VALIDATION_FAILED');
  }
  if (accountId !== undefined && accountId !== null && typeof accountId !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (linkedProductId !== undefined && linkedProductId !== null && typeof linkedProductId !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (linkedSaleId !== undefined && linkedSaleId !== null && typeof linkedSaleId !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (linkedOrderId !== undefined && linkedOrderId !== null && typeof linkedOrderId !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const now = new Date().toISOString();

  return {
    id,
    userId,
    incomeProfileId,
    amount,
    category,
    date,
    description: description.trim(),
    accountId: accountId || '',
    linkedProductId: linkedProductId || '',
    linkedSaleId: linkedSaleId || '',
    linkedOrderId: linkedOrderId || '',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateResellingCostUpdate({ existing, updates }) {
  if (!existing || typeof existing !== 'object') {
    throw new Error('NOT_FOUND');
  }

  const result = { ...existing };

  if (updates.amount !== undefined) {
    if (typeof updates.amount !== 'number' || !Number.isFinite(updates.amount) || updates.amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    result.amount = updates.amount;
  }
  if (updates.category !== undefined) {
    if (typeof updates.category !== 'string' || !['shipping', 'commission', 'packaging', 'advertising', 'equipment', 'other'].includes(updates.category)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.category = updates.category;
  }
  if (updates.date !== undefined) {
    if (typeof updates.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.date = updates.date;
  }
  if (updates.description !== undefined) {
    if (typeof updates.description !== 'string' || updates.description.trim() === '' || updates.description.length > 500) {
      throw new Error('VALIDATION_FAILED');
    }
    result.description = updates.description.trim();
  }
  if (updates.accountId !== undefined) {
    if (updates.accountId !== null && typeof updates.accountId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.accountId = updates.accountId || '';
  }
  if (updates.linkedProductId !== undefined) {
    if (updates.linkedProductId !== null && typeof updates.linkedProductId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.linkedProductId = updates.linkedProductId || '';
  }
  if (updates.linkedSaleId !== undefined) {
    if (updates.linkedSaleId !== null && typeof updates.linkedSaleId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.linkedSaleId = updates.linkedSaleId || '';
  }
  if (updates.linkedOrderId !== undefined) {
    if (updates.linkedOrderId !== null && typeof updates.linkedOrderId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.linkedOrderId = updates.linkedOrderId || '';
  }

  if (updates.userId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.incomeProfileId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.id !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.createdAt !== undefined) throw new Error('VALIDATION_FAILED');

  result.updatedAt = new Date().toISOString();
  return result;
}
