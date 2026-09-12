/**
 * Stage 1.5I — Gielda Balance Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory gieldaOps array and delegates
 * the final balance calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeCurrent() {
  const operations = window.gieldaOps || [];

  const calculator = window.GieldaBalanceCalculator;
  if (!calculator) {
    throw new Error('GieldaBalanceCalculator not available');
  }

  return calculator.compute({ operations: operations });
}

function computeAsOf(dateStr) {
  const operations = window.gieldaOps || [];

  const calculator = window.GieldaBalanceCalculator;
  if (!calculator) {
    throw new Error('GieldaBalanceCalculator not available');
  }

  return calculator.compute({ operations: operations, asOfDate: dateStr });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeCurrent, computeAsOf };
}

if (typeof window !== 'undefined') {
  window.GieldaBalanceService = { computeCurrent, computeAsOf };
}
