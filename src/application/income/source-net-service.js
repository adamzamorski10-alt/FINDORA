/**
 * Stage 1.5G — Source Net Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory income sources, transactions, and
 * gielda operations, then delegates the final net calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeForSourceMonth(sourceId, mKey) {
  const incomeSources = window.incomeSources || [];
  const source = incomeSources.find(s => s.id === sourceId);
  if (!source) {
    throw new Error('Income source not found: ' + sourceId);
  }

  const transactions = window.transactions || [];
  const gieldaOps = window.gieldaOps || [];

  const calculator = window.SourceNetCalculator;
  const sharedCalculator = window.SourceMonthlyEarningsCalculator;
  if (!calculator) {
    throw new Error('SourceNetCalculator not available');
  }

  return calculator.compute({
    source: source,
    mKey: mKey,
    transactions: transactions,
    gieldaOps: gieldaOps,
    calculator: sharedCalculator,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeForSourceMonth };
}

if (typeof window !== 'undefined') {
  window.SourceNetService = { computeForSourceMonth };
}
