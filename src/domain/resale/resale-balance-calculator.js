/**
 * Stage 1.5C — Resale Balance Domain Calculator
 *
 * Pure domain calculation for internal Resale wallet balance.
 *
 * Formula:
 *   held  = sum of income transactions marked as _resaleBalance for the source
 *   spent = sum of expense transactions marked as _resaleWithdraw or _resalePaidFromBalance for the source
 *   return max(0, held - spent)
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const sourceId = inputs.sourceId;
  const transactions = inputs.transactions || [];

  const held = transactions
    .filter(t => t._sourceId === sourceId && t._resaleBalance && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const spent = transactions
    .filter(t => t._sourceId === sourceId && (t._resaleWithdraw || t._resalePaidFromBalance) && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return Math.max(0, held - spent);
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.ResaleBalanceCalculator = { compute };
}
