/**
 * Goal Required Deposit Calculator
 *
 * Pure domain calculation for required monthly goal deposits.
 *
 * Formula:
 *   For each goal with deadline and remaining > 0:
 *     monthsLeft = (deadlineYear - currentYear) * 12 + (deadlineMonth - currentMonth) + 1
 *     if monthsLeft < 1 (past deadline):
 *       monthly = remaining
 *     else:
 *       monthly = ceil(remaining / max(1, monthsLeft))
 *   Sum all monthly values.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

export function compute(inputs) {
  const goals = inputs.goals || [];
  const currentDate = inputs.currentDate ? new Date(inputs.currentDate) : new Date();

  let total = 0;
  for (const goal of goals) {
    if (goal.archived) continue;
    const remaining = goal.target - goal.current;
    if (remaining <= 0) continue;
    if (!goal.deadline) continue;

    const deadline = new Date(goal.deadline);
    const monthsLeft = (deadline.getFullYear() - currentDate.getFullYear()) * 12 + (deadline.getMonth() - currentDate.getMonth()) + 1;

    if (monthsLeft < 1) {
      total += remaining;
    } else {
      total += Math.ceil(remaining / Math.max(1, monthsLeft));
    }
  }

  return total;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.GoalRequiredDepositCalculator = { compute };
}
