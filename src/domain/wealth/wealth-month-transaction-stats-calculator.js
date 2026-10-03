/**
 * Stage 1.5Q — Wealth Month Transaction Stats Domain Calculator
 *
 * Pure domain calculation for income, expense, and net across transactions
 * in a given month (YYYY-MM), as used by getWealthMonthStats.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const mKey = inputs.mKey;
  const transactions = inputs.transactions;

  const monthTx = transactions.filter(t => t.date && t.date.startsWith(mKey) && !t._excluded);
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return { income, expense, net: income - expense };
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.WealthMonthTransactionStatsCalculator = { compute };
}
