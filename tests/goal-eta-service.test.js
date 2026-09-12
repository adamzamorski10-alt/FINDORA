/**
 * Stage 1.5A — Goal ETA Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'goals', 'goal-eta-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    goals: mocks.goals || [],
    transactions: mocks.transactions || [],
    GoalEtaCalculator: mocks.GoalEtaCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('GoalEtaService', () => {
  it('reads correct goal and delegates to domain calculator', () => {
    const goals = [
      { id: 'g1', target: 1000, current: 200 },
      { id: 'g2', target: 500, current: 100 },
    ];
    const transactions = [
      { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
    ];

    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return { monthsNeeded: 8, avgPerMonth: 100, etaDate: new Date('2026-11-01'), unknown: false };
      }
    };

    const { service } = setupService({
      goals: goals,
      transactions: transactions,
      GoalEtaCalculator: mockCalculator,
    });

    const result = service.computeForGoal('g1');

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.goal.id, 'g1');
    assert.strictEqual(capturedInput.goal.target, 1000);
    assert.strictEqual(capturedInput.goal.current, 200);
    assert.strictEqual(capturedInput.transactions.length, 1);
    assert.ok(capturedInput.currentDate instanceof Date);
    assert.strictEqual(result.monthsNeeded, 8);
  });

  it('does not require DOM or Firebase', () => {
    const { service } = setupService({});
    assert.strictEqual(typeof service.computeForGoal, 'function');
  });

  it('throws when goal is not found', () => {
    const { service } = setupService({
      goals: [{ id: 'g1', target: 1000, current: 200 }],
    });
    assert.throws(() => service.computeForGoal('missing'), /Goal not found/);
  });

  it('returns calculator result directly', () => {
    const expectedResult = { monthsNeeded: 5, avgPerMonth: 200, etaDate: new Date('2026-08-01'), unknown: false };
    const mockCalculator = { compute: function() { return expectedResult; } };

    const { service } = setupService({
      goals: [{ id: 'g1', target: 1000, current: 200 }],
      GoalEtaCalculator: mockCalculator,
    });

    const result = service.computeForGoal('g1');
    assert.deepStrictEqual(result, expectedResult);
  });
});
