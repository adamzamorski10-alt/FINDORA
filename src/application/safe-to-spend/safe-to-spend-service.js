/**
 * Stage 1.4 — Safe-to-Spend Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory financial arrays and delegates
 * the final calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeForCurrentState() {
  const daysLeft = window.getDaysLeftInMonth();
  const balances = window.getBalances();
  const freeFunds = balances.konto;
  const bills = window.getUpcomingBillsThisMonth();
  const goalsReq = window.getRequiredGoalDepositsThisMonth();

  const calculator = window.SafeToSpendCalculator;
  if (!calculator) {
    throw new Error('SafeToSpendCalculator not available');
  }

  return calculator.compute({
    freeFunds: freeFunds,
    bills: bills,
    goalsReq: goalsReq,
    daysLeft: daysLeft,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeForCurrentState };
}

if (typeof window !== 'undefined') {
  window.SafeToSpendService = { computeForCurrentState };
}
