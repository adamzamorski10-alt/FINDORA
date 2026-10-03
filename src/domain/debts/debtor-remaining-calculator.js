/**
 * Stage 1.5T — Debtor Remaining Domain Calculator
 *
 * Pure domain calculation for the remaining debt amount for a single debtor.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function computeGeneralRepaid(inputs) {
  const debtor = inputs.debtor;
  return (debtor.repayments || []).reduce((s, r) => s + r.amount, 0);
}

function compute(inputs) {
  const debtor = inputs.debtor;
  const activeSum = debtor.debts.filter(x => !x.paid).reduce((s, x) => s + x.amount, 0);
  return Math.max(0, activeSum - computeGeneralRepaid({ debtor }));
}

export { compute, computeGeneralRepaid };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute, computeGeneralRepaid };
}

if (typeof window !== 'undefined') {
  window.DebtorRemainingCalculator = { compute, computeGeneralRepaid };
}
