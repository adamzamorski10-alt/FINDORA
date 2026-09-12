/**
 * Stage 1.5U — Loan Remaining Domain Calculator
 *
 * Pure domain calculation for the remaining loan amount and total repaid
 * amount for a single loan.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function computeRepaid(inputs) {
  const loan = inputs.loan;
  return (loan.repayments || []).reduce((s, r) => s + r.amount, 0);
}

function compute(inputs) {
  const loan = inputs.loan;
  const repaid = computeRepaid({ loan });
  return Math.max(0, loan.amount - repaid);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute, computeRepaid };
}

if (typeof window !== 'undefined') {
  window.LoanRemainingCalculator = { compute, computeRepaid };
}
