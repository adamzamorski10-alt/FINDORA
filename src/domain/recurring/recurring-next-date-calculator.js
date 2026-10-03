/**
 * Stage 1.5V — Recurring Next Date Domain Calculator
 *
 * Pure domain calculation for the next occurrence date of a recurring rule.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const rule = inputs.rule;

  if (!rule.lastBooked) return rule.startDate;

  const last = new Date(rule.lastBooked);
  let next = new Date(last);

  if (rule.freq === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (rule.freq === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else { // monthly
    next.setMonth(next.getMonth() + 1);
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(rule.dayOfMonth || 1, maxDay));
  }

  return next.toISOString().split('T')[0];
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.RecurringNextDateCalculator = { compute };
}
