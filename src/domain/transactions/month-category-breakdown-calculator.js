/**
 * Stage 1.5S — Month Category Breakdown Domain Calculator
 *
 * Pure domain calculation for aggregating transaction amounts by category
 * within a given month (YYYY-MM), as used by getMonthExpenseByCategory
 * and getMonthIncomeByCategory.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const mKey = inputs.mKey;
  const transactions = inputs.transactions;
  const type = inputs.type;

  const result = {};
  transactions.filter(t => t.date.startsWith(mKey) && !t._excluded && t.type === type).forEach(t => {
    result[t.category] = (result[t.category] || 0) + t.amount;
  });
  return result;
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.MonthCategoryBreakdownCalculator = { compute };
}
