/**
 * Stage 1.5N — Debts As Of Domain Calculator
 *
 * Pure domain calculation for the total unpaid debt amount as of a specific date.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const dateStr = inputs.dateStr;
  const endTs = inputs.endTs;
  const debtors = inputs.debtors;

  let sum = 0;

  if (!debtors || debtors.length === 0) {
    return sum;
  }

  for (let d = 0; d < debtors.length; d++) {
    const debts = debtors[d].debts || [];
    for (let x = 0; x < debts.length; x++) {
      const debt = debts[x];
      if (!debt.date || debt.date > dateStr) continue;
      if (debt.paid && debt.paidAt && debt.paidAt <= endTs) continue;
      sum += debt.amount;
    }
  }

  return sum;
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.DebtsAsOfCalculator = { compute };
}
