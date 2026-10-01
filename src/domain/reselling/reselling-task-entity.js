/**
 * Stage 4 — Reselling Task Domain Entity
 *
 * Pure entity factory and validation.
 * No storage, no UI, no side effects.
 */

export function createResellingTask({ userId, incomeProfileId, title, dueDate, priority, status, linkedProductId, linkedSaleId, linkedOrderId, note }) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!title || typeof title !== 'string' || title.trim() === '' || title.length > 200) {
    throw new Error('VALIDATION_FAILED');
  }
  if (dueDate !== undefined && dueDate !== null && typeof dueDate !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (priority !== undefined && priority !== null && typeof priority !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (status !== undefined && status !== null && typeof status !== 'string') {
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
  if (note !== undefined && note !== null && typeof note !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }

  const VALID_PRIORITIES = ['low', 'medium', 'high'];
  const finalPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'medium';

  const VALID_STATUSES = ['todo', 'in_progress', 'done'];
  const finalStatus = status && VALID_STATUSES.includes(status) ? status : 'todo';

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const now = new Date().toISOString();

  return {
    id,
    userId,
    incomeProfileId,
    title: title.trim(),
    dueDate: dueDate || '',
    priority: finalPriority,
    status: finalStatus,
    linkedProductId: linkedProductId || '',
    linkedSaleId: linkedSaleId || '',
    linkedOrderId: linkedOrderId || '',
    note: note ? String(note).trim() : '',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateResellingTaskUpdate({ existing, updates }) {
  if (!existing || typeof existing !== 'object') {
    throw new Error('NOT_FOUND');
  }

  const result = { ...existing };

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim() === '' || updates.title.length > 200) {
      throw new Error('VALIDATION_FAILED');
    }
    result.title = updates.title.trim();
  }
  if (updates.dueDate !== undefined) {
    if (updates.dueDate !== null && typeof updates.dueDate !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.dueDate = updates.dueDate || '';
  }
  if (updates.priority !== undefined) {
    if (typeof updates.priority !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    const VALID_PRIORITIES = ['low', 'medium', 'high'];
    if (!VALID_PRIORITIES.includes(updates.priority)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.priority = updates.priority;
  }
  if (updates.status !== undefined) {
    if (typeof updates.status !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    const VALID_STATUSES = ['todo', 'in_progress', 'done'];
    if (!VALID_STATUSES.includes(updates.status)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.status = updates.status;
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
  if (updates.note !== undefined) {
    if (updates.note !== null && typeof updates.note !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.note = updates.note ? String(updates.note).trim() : '';
  }

  if (updates.userId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.incomeProfileId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.id !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.createdAt !== undefined) throw new Error('VALIDATION_FAILED');

  result.updatedAt = new Date().toISOString();
  return result;
}
