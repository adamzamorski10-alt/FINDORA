/**
 * Stage 1.5N — Debts As Of Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory debtors array and delegates
 * the final debt calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeAsOf(dateStr) {
  const debtors = window.debtors || [];

  const endTs = new Date(dateStr + 'T23:59:59').getTime();

  const calculator = window.DebtsAsOfCalculator;
  if (!calculator) {
    throw new Error('DebtsAsOfCalculator not available');
  }

  return calculator.compute({
    dateStr: dateStr,
    endTs: endTs,
    debtors: debtors,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeAsOf };
}

if (typeof window !== 'undefined') {
  window.DebtsAsOfService = { computeAsOf };
}
