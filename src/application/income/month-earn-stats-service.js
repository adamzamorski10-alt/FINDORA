/**
 * Stage 1.5J — Month Earn Stats Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory income sources, transactions, and
 * gielda operations, then delegates the final month earn stats calculation to
 * the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeForMonth(mKey) {
  const incomeSources = window.incomeSources || [];
  const transactions = window.transactions || [];
  const gieldaOps = window.gieldaOps || [];

  const calculator = window.MonthEarnStatsCalculator;
  const sharedCalculator = window.SourceMonthlyEarningsCalculator;
  if (!calculator) {
    throw new Error('MonthEarnStatsCalculator not available');
  }

  return calculator.compute({
    mKey: mKey,
    incomeSources: incomeSources,
    transactions: transactions,
    gieldaOps: gieldaOps,
    calculator: sharedCalculator,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeForMonth };
}

if (typeof window !== 'undefined') {
  window.MonthEarnStatsService = { computeForMonth };
}
