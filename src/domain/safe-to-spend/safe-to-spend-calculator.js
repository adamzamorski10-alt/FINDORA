/**
 * Stage 1.4 — Safe-to-Spend Domain Calculator
 *
 * Pure domain calculation for daily safe spending amount.
 *
 * Frozen MVP-1 formula:
 *   safeTotal = freeFunds - goalsReq
 *   perDay    = safeTotal / daysLeft (daysLeft clamped to >= 1)
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

export function compute(inputs) {
  const freeFunds = inputs.freeFunds || 0;
  const goalsReq = inputs.goalsReq || 0;
  const daysLeft = Math.max(1, inputs.daysLeft || 0);

  const safeTotal = freeFunds - goalsReq;
  const perDay = safeTotal / daysLeft;

  return {
    safeTotal,
    perDay,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.SafeToSpendCalculator = { compute };
}
