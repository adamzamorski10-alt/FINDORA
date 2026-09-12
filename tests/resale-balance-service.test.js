/**
 * Stage 1.5C — Resale Balance Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'resale', 'resale-balance-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    transactions: mocks.transactions || [],
    ResaleBalanceCalculator: mocks.ResaleBalanceCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('ResaleBalanceService', () => {
  it('reads transactions and delegates to domain calculator', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
      { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 30 },
    ];

    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return 70;
      }
    };

    const { service } = setupService({
      transactions: transactions,
      ResaleBalanceCalculator: mockCalculator,
    });

    const result = service.computeForSource('s1');

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.sourceId, 's1');
    assert.strictEqual(capturedInput.transactions.length, 2);
    assert.strictEqual(result, 70);
  });

  it('does not require DOM or Firebase', () => {
    const { service } = setupService({});
    assert.strictEqual(typeof service.computeForSource, 'function');
  });

  it('returns calculator result directly', () => {
    const expectedResult = 42;
    const mockCalculator = { compute: function() { return expectedResult; } };

    const { service } = setupService({
      transactions: [],
      ResaleBalanceCalculator: mockCalculator,
    });

    const result = service.computeForSource('s1');
    assert.strictEqual(result, expectedResult);
  });
});
