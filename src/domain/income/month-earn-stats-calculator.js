/**
 * Stage 1.5J — Month Earn Stats Domain Calculator
 *
 * Pure domain calculation for total income, expense, and net earnings
 * across ALL income sources in a given month (YYYY-MM).
 *
 * This calculator delegates per-source monthly calculations to the shared
 * SourceMonthlyEarningsCalculator.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const mKey = inputs.mKey;
  const incomeSources = inputs.incomeSources;
  const transactions = inputs.transactions;
  const gieldaOps = inputs.gieldaOps;

  const calculator = inputs.calculator;
  if (!calculator) {
    throw new Error('SourceMonthlyEarningsCalculator not available');
  }

  let income = 0, expense = 0;
  const bySource = [];

  incomeSources.forEach(s => {
    const result = calculator.compute({
      source: s,
      mKey: mKey,
      transactions: transactions,
      gieldaOps: gieldaOps,
    });

    income += result.income;
    expense += result.expense;
    bySource.push({ source: s, income: result.income, expense: result.expense, net: result.net });
  });

  return { income, expense, net: income - expense, bySource };
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.MonthEarnStatsCalculator = { compute };
}
