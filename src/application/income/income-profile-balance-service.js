/**
 * Stage 1.5K — Income Profile Balance Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory transactions array and delegates
 * the final balance calculation to the domain layer.
 *
 * For Gielda profiles, it delegates to the existing GieldaBalanceService.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeForProfile(profile) {
  if (!profile) return 0;

  const transactions = window.transactions || [];

  const calculator = window.IncomeProfileBalanceCalculator;
  if (!calculator) {
    throw new Error('IncomeProfileBalanceCalculator not available');
  }

  if (profile.id === 'gielda') {
    const gieldaService = window.GieldaBalanceService;
    if (gieldaService && typeof gieldaService.computeCurrent === 'function') {
      return calculator.compute({
        profile: profile,
        transactions: transactions,
        gieldaBalance: gieldaService.computeCurrent(),
      });
    }
    return calculator.compute({
      profile: profile,
      transactions: transactions,
      gieldaBalance: 0,
    });
  }

  return calculator.compute({
    profile: profile,
    transactions: transactions,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeForProfile };
}

if (typeof window !== 'undefined') {
  window.IncomeProfileBalanceService = { computeForProfile };
}
