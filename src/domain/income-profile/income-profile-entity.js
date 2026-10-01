/**
 * Stage 3 — Income Profile Domain Entity
 *
 * Pure entity factory and validation.
 * No storage, no UI, no side effects.
 */

export function createIncomeProfile({ userId, type, name, description }) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!type || typeof type !== 'string' || type.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 100) {
    throw new Error('VALIDATION_FAILED');
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const now = new Date().toISOString();

  return {
    id,
    userId,
    type: type.trim(),
    name: name.trim(),
    description: description ? String(description).trim() : '',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateProfileUpdate({ existing, updates }) {
  if (!existing || typeof existing !== 'object') {
    throw new Error('NOT_FOUND');
  }

  const result = { ...existing };

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || updates.name.trim() === '' || updates.name.length > 100) {
      throw new Error('VALIDATION_FAILED');
    }
    result.name = updates.name.trim();
  }

  if (updates.description !== undefined) {
    if (updates.description !== null && typeof updates.description !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.description = updates.description ? String(updates.description).trim() : '';
  }

  if (updates.type !== undefined) {
    throw new Error('VALIDATION_FAILED');
  }

  result.updatedAt = new Date().toISOString();
  return result;
}
