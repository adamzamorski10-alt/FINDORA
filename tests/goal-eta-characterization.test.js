/**
 * Stage 1.5A — Goal ETA Legacy-Behavior Characterization Tests
 *
 * Verifies that the new GoalEtaService produces results equivalent to a
 * verified mirror of the legacy goalEtaInfo() formula for representative
 * scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production goalEtaInfo()
 * from index.html. Instead, it reimplements the legacy calculation logic inline
 * (legacyGoalEtaInfo) based on a line-by-line inspection of the current
 * index.html implementation. This is a legacy-behavior characterization harness,
 * not a true golden-master test against the live production function.
 *
 * This test sets up controlled global state, invokes both the mirrored legacy
 * calculation and the new service, and compares results.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'goals', 'goal-eta-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'goals', 'goal-eta-calculator.js'), 'utf8');

function legacyGoalEtaInfo(g, transactions) {
  const remaining = g.target - g.current;
  if (remaining <= 0) return null;

  const goalTx = transactions.filter(t => t._goalId === g.id && t.type === 'expense' && !t._excluded);
  if (goalTx.length === 0) return { unknown: true };

  const dates = goalTx.map(t => new Date(t.date)).sort((a, b) => a - b);
  const first = dates[0];
  const now = new Date();
  const monthsSpan = Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1);
  const totalSaved = goalTx.reduce((s, t) => s + t.amount, 0);
  const avgPerMonth = totalSaved / monthsSpan;

  if (avgPerMonth <= 0) return { unknown: true };

  const monthsNeeded = Math.ceil(remaining / avgPerMonth);
  const etaDate = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, 1);
  return { monthsNeeded, avgPerMonth, etaDate, unknown: false };
}

function setupService(mocks) {
  const calculatorModule = { exports: {} };
  new Function('module', calculatorCode)(calculatorModule);
  const calculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const window = {
    goals: mocks.goals || [],
    transactions: mocks.transactions || [],
    GoalEtaCalculator: mocks.GoalEtaCalculator || calculator,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('GoalEta Characterization', () => {
  it('goal already reached', () => {
    const goal = { id: 'g1', target: 1000, current: 1000 };
    const legacy = legacyGoalEtaInfo(goal, []);
    const { service } = setupService({
      goals: [goal],
      transactions: [],
    });
    const modern = service.computeForGoal('g1');

    assert.strictEqual(modern, legacy);
  });

  it('no matching transactions', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g2', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.unknown, legacy.unknown);
  });

  it('normal deposits', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-03-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.unknown, legacy.unknown);
    assert.strictEqual(modern.monthsNeeded, legacy.monthsNeeded);
    assert.strictEqual(modern.avgPerMonth, legacy.avgPerMonth);
  });

  it('excluded transactions ignored', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: true },
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.monthsNeeded, legacy.monthsNeeded);
    assert.strictEqual(modern.avgPerMonth, legacy.avgPerMonth);
  });

  it('irrelevant transactions ignored', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g2', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
      { _goalId: 'g1', type: 'income', amount: 100, date: '2026-01-01', _excluded: false },
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.monthsNeeded, legacy.monthsNeeded);
    assert.strictEqual(modern.avgPerMonth, legacy.avgPerMonth);
  });

  it('fractional amounts', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g1', type: 'expense', amount: 50.5, date: '2026-01-01', _excluded: false },
      { _goalId: 'g1', type: 'expense', amount: 49.5, date: '2026-02-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.monthsNeeded, legacy.monthsNeeded);
    assert.strictEqual(modern.avgPerMonth, legacy.avgPerMonth);
  });

  it('year boundary', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2025-01-01', _excluded: false },
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2025-12-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.monthsNeeded, legacy.monthsNeeded);
    assert.strictEqual(modern.avgPerMonth, legacy.avgPerMonth);
  });

  it('zero/negative rate returns unknown', () => {
    const goal = { id: 'g1', target: 1000, current: 200 };
    const transactions = [
      { _goalId: 'g1', type: 'expense', amount: 0, date: '2026-01-01', _excluded: false },
    ];
    const legacy = legacyGoalEtaInfo(goal, transactions);
    const { service } = setupService({
      goals: [goal],
      transactions: transactions,
    });
    const modern = service.computeForGoal('g1');

    assert.ok(modern);
    assert.ok(legacy);
    assert.strictEqual(modern.unknown, legacy.unknown);
  });
});
