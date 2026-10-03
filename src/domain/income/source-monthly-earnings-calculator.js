/**
 * Stage 1.5J — Source Monthly Earnings Domain Calculator
 *
 * Pure domain calculation for monthly income, expense, and net of a single
 * income source in a given month (YYYY-MM).
 *
 * This is the shared primitive for:
 *   - SourceNetCalculator (returns net only)
 *   - MonthEarnStatsCalculator (returns income/expense/net + bySource breakdown)
 *
 * Gielda sources are special-cased: their "earnings" are zarobek/strata ops,
 * not generic transactions.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const source = inputs.source;
  const mKey = inputs.mKey;
  const transactions = inputs.transactions;
  const gieldaOps = inputs.gieldaOps;

  if (source._profileType === 'gielda') {
    const ops = gieldaOps.filter(o => o.date && o.date.startsWith(mKey));
    const income = ops.filter(o => o.type === 'zarobek').reduce((s, o) => s + o.amount, 0);
    const expense = ops.filter(o => o.type === 'strata').reduce((s, o) => s + o.amount, 0);
    return { income, expense, net: income - expense };
  }

  const inc = transactions
    .filter(t => t.type === 'income' && t._sourceId === source.id && t.date && t.date.startsWith(mKey))
    .reduce((s, t) => s + t.amount, 0);

  const exp = transactions
    .filter(t => t.type === 'expense' && t._sourceId === source.id && !t._transfer && !t._autoSave && t.date && t.date.startsWith(mKey))
    .reduce((s, t) => s + t.amount, 0);

  return { income: inc, expense: exp, net: inc - exp };
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.SourceMonthlyEarningsCalculator = { compute };
}
