/**
 * Stage 1.5A — Goal ETA Application Service
 *
 * Bridge between legacy global application state and the pure domain calculator.
 *
 * This service reads the current in-memory financial arrays and delegates
 * the final ETA calculation to the domain layer.
 *
 * It does NOT:
 * - manipulate the DOM
 * - render UI
 * - call Firebase directly
 * - persist data
 * - show toasts
 */

function computeForGoal(goalId) {
  const goals = window.goals || [];
  const goal = goals.find(g => g.id === goalId);
  if (!goal) {
    throw new Error('Goal not found: ' + goalId);
  }

  const transactions = window.transactions || [];
  const currentDate = new Date();

  const calculator = window.GoalEtaCalculator;
  if (!calculator) {
    throw new Error('GoalEtaCalculator not available');
  }

  return calculator.compute({
    goal: goal,
    transactions: transactions,
    currentDate: currentDate,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeForGoal };
}

if (typeof window !== 'undefined') {
  window.GoalEtaService = { computeForGoal };
}
