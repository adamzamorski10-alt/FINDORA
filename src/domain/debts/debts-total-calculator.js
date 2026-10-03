/**
 * Stage 1.5T — Debts Total Domain Calculator
 *
 * Pure domain calculation for the total remaining debt amount across all debtors.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const debtors = inputs.debtors;
  return debtors.reduce((s, d) => {
    const activeSum = d.debts.filter(x => !x.paid).reduce((ss, x) => ss + x.amount, 0);
    const generalRepaid = (d.repayments || []).reduce((ss, r) => ss + r.amount, 0);
    return s + Math.max(0, activeSum - generalRepaid);
  }, 0);
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.DebtsTotalCalculator = { compute };
}
