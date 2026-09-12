/**
 * Stage 1.5C — Resale Balance Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory transactions array and delegates
 * the final resale balance calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeForSource(sourceId) {
  const transactions = window.transactions || [];

  const calculator = window.ResaleBalanceCalculator;
  if (!calculator) {
    throw new Error('ResaleBalanceCalculator not available');
  }

  return calculator.compute({
    sourceId: sourceId,
    transactions: transactions,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeForSource };
}

if (typeof window !== 'undefined') {
  window.ResaleBalanceService = { computeForSource };
}
