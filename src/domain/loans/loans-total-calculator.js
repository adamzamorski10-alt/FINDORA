/**
 * Stage 1.5U — Loans Total Domain Calculator
 *
 * Pure domain calculation for the total remaining loan amount across all
 * creditors, considering only unpaid loans.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const creditors = inputs.creditors;
  return creditors.reduce((s, c) => {
    const unpaid = c.loans.filter(l => !l.paid);
    return s + unpaid.reduce((ss, l) => {
      const repaid = (l.repayments || []).reduce((s, r) => s + r.amount, 0);
      return ss + Math.max(0, l.amount - repaid);
    }, 0);
  }, 0);
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.LoansTotalCalculator = { compute };
}
