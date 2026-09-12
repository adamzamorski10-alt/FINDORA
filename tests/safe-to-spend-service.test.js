/**
 * Stage 1.4 — Safe-to-Spend Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'safe-to-spend', 'safe-to-spend-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    getDaysLeftInMonth: mocks.getDaysLeftInMonth || function() { return 30; },
    getBalances: mocks.getBalances || function() { return { konto: 1000, skarbonka: 0, gielda: 0 }; },
    getUpcomingBillsThisMonth: mocks.getUpcomingBillsThisMonth || function() { return 200; },
    getRequiredGoalDepositsThisMonth: mocks.getRequiredGoalDepositsThisMonth || function() { return 100; },
    SafeToSpendCalculator: mocks.SafeToSpendCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('SafeToSpendService', () => {
  it('reads current state and delegates to domain calculator', () => {
    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return { daysLeft: 30, freeFunds: 1000, bills: 200, goalsReq: 100, safeTotal: 700, perDay: 700 / 30 };
      }
    };

    const { service, window } = setupService({
      SafeToSpendCalculator: mockCalculator,
    });

    const result = service.computeForCurrentState();

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.freeFunds, 1000);
    assert.strictEqual(capturedInput.bills, 200);
    assert.strictEqual(capturedInput.goalsReq, 100);
    assert.strictEqual(capturedInput.daysLeft, 30);
    assert.strictEqual(result.safeTotal, 700);
  });

  it('does not require DOM or Firebase', () => {
    const { service } = setupService({});
    assert.strictEqual(typeof service.computeForCurrentState, 'function');
  });

  it('does not mutate source arrays', () => {
    const transactions = [{ type: 'income', amount: 100, place: 'konto' }];
    const recurringTx = [];
    const goals = [];

    const mockCalculator = {
      compute: function(input) {
        return { daysLeft: 30, freeFunds: 100, bills: 0, goalsReq: 0, safeTotal: 100, perDay: 100 / 30 };
      }
    };

    const { service } = setupService({
      getBalances: function() {
        const b = { konto: 0, skarbonka: 0, gielda: 0 };
        transactions.forEach(t => {
          if (t._excluded || !t.place) return;
          const s = t.type === 'income' ? 1 : -1;
          b[t.place] += s * t.amount;
        });
        return b;
      },
      getUpcomingBillsThisMonth: function() { return 0; },
      getRequiredGoalDepositsThisMonth: function() { return 0; },
      getDaysLeftInMonth: function() { return 30; },
      SafeToSpendCalculator: mockCalculator,
    });

    const originalTx = JSON.stringify(transactions);
    service.computeForCurrentState();
    assert.strictEqual(JSON.stringify(transactions), originalTx);
  });

  it('returns calculator result directly', () => {
    const expectedResult = { daysLeft: 30, freeFunds: 500, bills: 100, goalsReq: 50, safeTotal: 350, perDay: 350 / 30 };
    const mockCalculator = { compute: function() { return expectedResult; } };

    const { service } = setupService({ SafeToSpendCalculator: mockCalculator });
    const result = service.computeForCurrentState();
    assert.deepStrictEqual(result, expectedResult);
  });
});
