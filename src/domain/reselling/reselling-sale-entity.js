/**
 * Stage 4 — Reselling Sale Domain Entity
 *
 * Pure entity factory and validation.
 * No storage, no UI, no side effects.
 */

export function createResellingSale({ userId, incomeProfileId, productId, quantity, salePrice, platform, commission, shipping, otherCosts, saleDate, paymentStatus, saleStatus, accountId, linkedTransactionId }) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }
  if (quantity === undefined || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error('VALIDATION_FAILED');
  }
  if (salePrice === undefined || typeof salePrice !== 'number' || !Number.isFinite(salePrice) || salePrice < 0) {
    throw new Error('VALIDATION_FAILED');
  }
  if (platform !== undefined && platform !== null && typeof platform !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (commission !== undefined && commission !== null && (typeof commission !== 'number' || !Number.isFinite(commission) || commission < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (shipping !== undefined && shipping !== null && (typeof shipping !== 'number' || !Number.isFinite(shipping) || shipping < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (otherCosts !== undefined && otherCosts !== null && (typeof otherCosts !== 'number' || !Number.isFinite(otherCosts) || otherCosts < 0)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (!saleDate || typeof saleDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
    throw new Error('VALIDATION_FAILED');
  }
  if (paymentStatus !== undefined && paymentStatus !== null && typeof paymentStatus !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (saleStatus !== undefined && saleStatus !== null && typeof saleStatus !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (accountId !== undefined && accountId !== null && typeof accountId !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }
  if (linkedTransactionId !== undefined && linkedTransactionId !== null && typeof linkedTransactionId !== 'string') {
    throw new Error('VALIDATION_FAILED');
  }

  const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
  const finalPaymentStatus = paymentStatus && VALID_PAYMENT_STATUSES.includes(paymentStatus) ? paymentStatus : 'pending';

  const VALID_SALE_STATUSES = ['sold', 'awaiting_payment', 'paid', 'shipped', 'completed', 'cancelled'];
  const finalSaleStatus = saleStatus && VALID_SALE_STATUSES.includes(saleStatus) ? saleStatus : 'sold';

  const commissionNum = commission || 0;
  const shippingNum = shipping || 0;
  const otherCostsNum = otherCosts || 0;
  const netAmount = salePrice - commissionNum - shippingNum - otherCostsNum;

  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const now = new Date().toISOString();

  return {
    id,
    userId,
    incomeProfileId,
    productId,
    quantity: Math.max(1, Math.floor(quantity)),
    salePrice,
    platform: platform ? String(platform).trim() : '',
    commission: commissionNum,
    shipping: shippingNum,
    otherCosts: otherCostsNum,
    netAmount,
    saleDate,
    paymentStatus: finalPaymentStatus,
    saleStatus: finalSaleStatus,
    accountId: accountId || '',
    linkedTransactionId: linkedTransactionId || '',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateResellingSaleUpdate({ existing, updates }) {
  if (!existing || typeof existing !== 'object') {
    throw new Error('NOT_FOUND');
  }

  const result = { ...existing };

  if (updates.productId !== undefined) {
    if (!updates.productId || typeof updates.productId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.productId = updates.productId;
  }
  if (updates.quantity !== undefined) {
    if (typeof updates.quantity !== 'number' || !Number.isInteger(updates.quantity) || updates.quantity < 1) {
      throw new Error('VALIDATION_FAILED');
    }
    result.quantity = Math.max(1, Math.floor(updates.quantity));
  }
  if (updates.salePrice !== undefined) {
    if (typeof updates.salePrice !== 'number' || !Number.isFinite(updates.salePrice) || updates.salePrice < 0) {
      throw new Error('VALIDATION_FAILED');
    }
    result.salePrice = updates.salePrice;
  }
  if (updates.platform !== undefined) {
    if (updates.platform !== null && typeof updates.platform !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.platform = updates.platform ? String(updates.platform).trim() : '';
  }
  if (updates.commission !== undefined) {
    if (updates.commission !== null && (typeof updates.commission !== 'number' || !Number.isFinite(updates.commission) || updates.commission < 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.commission = updates.commission || 0;
  }
  if (updates.shipping !== undefined) {
    if (updates.shipping !== null && (typeof updates.shipping !== 'number' || !Number.isFinite(updates.shipping) || updates.shipping < 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.shipping = updates.shipping || 0;
  }
  if (updates.otherCosts !== undefined) {
    if (updates.otherCosts !== null && (typeof updates.otherCosts !== 'number' || !Number.isFinite(updates.otherCosts) || updates.otherCosts < 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.otherCosts = updates.otherCosts || 0;
  }
  if (updates.saleDate !== undefined) {
    if (typeof updates.saleDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updates.saleDate)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.saleDate = updates.saleDate;
  }
  if (updates.paymentStatus !== undefined) {
    if (typeof updates.paymentStatus !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
    if (!VALID_PAYMENT_STATUSES.includes(updates.paymentStatus)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.paymentStatus = updates.paymentStatus;
  }
  if (updates.saleStatus !== undefined) {
    if (typeof updates.saleStatus !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    const VALID_SALE_STATUSES = ['sold', 'awaiting_payment', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!VALID_SALE_STATUSES.includes(updates.saleStatus)) {
      throw new Error('VALIDATION_FAILED');
    }
    result.saleStatus = updates.saleStatus;
  }
  if (updates.accountId !== undefined) {
    if (updates.accountId !== null && typeof updates.accountId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.accountId = updates.accountId || '';
  }
  if (updates.linkedTransactionId !== undefined) {
    if (updates.linkedTransactionId !== null && typeof updates.linkedTransactionId !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    result.linkedTransactionId = updates.linkedTransactionId || '';
  }

  const commissionNum = result.commission || 0;
  const shippingNum = result.shipping || 0;
  const otherCostsNum = result.otherCosts || 0;
  result.netAmount = result.salePrice - commissionNum - shippingNum - otherCostsNum;

  if (updates.userId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.incomeProfileId !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.id !== undefined) throw new Error('VALIDATION_FAILED');
  if (updates.createdAt !== undefined) throw new Error('VALIDATION_FAILED');

  result.updatedAt = new Date().toISOString();
  return result;
}
