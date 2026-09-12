/**
 * Stage 1.4 — Safe-to-Spend Domain Calculator
 *
 * Pure domain calculation for daily safe spending amount.
 *
 * Formula:
 *   safeTotal = freeFunds - bills - goalsReq
 *   perDay    = safeTotal / daysLeft
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const freeFunds = inputs.freeFunds || 0;
  const bills = inputs.bills || 0;
  const goalsReq = inputs.goalsReq || 0;
  const daysLeft = inputs.daysLeft || 0;

  const safeTotal = freeFunds - bills - goalsReq;
  const perDay = safeTotal / daysLeft;

  return {
    daysLeft: daysLeft,
    freeFunds: freeFunds,
    bills: bills,
    goalsReq: goalsReq,
    safeTotal: safeTotal,
    perDay: perDay,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.SafeToSpendCalculator = { compute };
}
