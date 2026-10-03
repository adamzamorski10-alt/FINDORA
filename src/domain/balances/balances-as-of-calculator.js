/**
 * Stage 1.5M — Balances As Of Domain Calculator
 *
 * Pure domain calculation for account balances as of a specific date.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const dateStr = inputs.dateStr;
  const transactions = inputs.transactions;

  const b = { konto: 0, skarbonka: 0 };

  if (!transactions || transactions.length === 0) {
    return b;
  }

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t._excluded || !t.place || !t.date || t.date > dateStr) continue;
    if (b[t.place] === undefined) continue;
    b[t.place] += (t.type === 'income' ? 1 : -1) * t.amount;
  }

  return b;
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.BalancesAsOfCalculator = { compute };
}
