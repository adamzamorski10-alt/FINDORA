/**
 * Stage 1.5W — Recurring To Monthly Domain Calculator
 *
 * Pure domain calculation for converting a recurring rule amount to its
 * monthly equivalent.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const rule = inputs.rule;

  if (rule.freq === 'weekly')  return rule.amount * 4.33;
  if (rule.freq === 'yearly')  return rule.amount / 12;
  return rule.amount;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.RecurringToMonthlyCalculator = { compute };
}
