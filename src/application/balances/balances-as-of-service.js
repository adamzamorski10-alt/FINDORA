/**
 * Stage 1.5M — Balances As Of Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory transactions array and delegates
 * the final balance calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeAsOf(dateStr) {
  const transactions = window.transactions || [];

  const calculator = window.BalancesAsOfCalculator;
  if (!calculator) {
    throw new Error('BalancesAsOfCalculator not available');
  }

  return calculator.compute({
    dateStr: dateStr,
    transactions: transactions,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeAsOf };
}

if (typeof window !== 'undefined') {
  window.BalancesAsOfService = { computeAsOf };
}
