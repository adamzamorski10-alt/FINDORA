/**
 * Stage 1.5A — Goal ETA Domain Calculator
 *
 * Pure domain calculation for goal completion ETA estimation.
 *
 * Formula:
 *   remaining = goal.target - goal.current
 *   monthsSpan = max(1, (currentYear - firstYear) * 12 + (currentMonth - firstMonth) + 1)
 *   avgPerMonth = totalSaved / monthsSpan
 *   monthsNeeded = ceil(remaining / avgPerMonth)
 *   etaDate = Date(currentYear, currentMonth + monthsNeeded, 1)
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const goal = inputs.goal;
  const transactions = inputs.transactions || [];
  const currentDate = inputs.currentDate;

  const remaining = goal.target - goal.current;
  if (remaining <= 0) return null;

  const goalTx = transactions.filter(t => t._goalId === goal.id && t.type === 'expense' && !t._excluded);
  if (goalTx.length === 0) return { unknown: true };

  const dates = goalTx.map(t => new Date(t.date)).sort((a, b) => a - b);
  const first = dates[0];

  const monthsSpan = Math.max(1, (currentDate.getFullYear() - first.getFullYear()) * 12 + (currentDate.getMonth() - first.getMonth()) + 1);
  const totalSaved = goalTx.reduce((s, t) => s + t.amount, 0);
  const avgPerMonth = totalSaved / monthsSpan;

  if (avgPerMonth <= 0) return { unknown: true };

  const monthsNeeded = Math.ceil(remaining / avgPerMonth);
  const etaDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthsNeeded, 1);
  return { monthsNeeded, avgPerMonth, etaDate, unknown: false };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.GoalEtaCalculator = { compute };
}
