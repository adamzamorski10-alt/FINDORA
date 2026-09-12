/**
 * Stage 1.5M — Balances As Of Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'balances', 'balances-as-of-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    transactions: mocks.transactions || [],
    BalancesAsOfCalculator: mocks.BalancesAsOfCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('BalancesAsOfService', () => {
  it('delegates to calculator with correct explicit inputs', () => {
    const transactions = [
      { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 },
      { type: 'expense', place: 'konto', date: '2026-03-02', amount: 30 },
    ];

    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return { konto: 70, skarbonka: 0 };
      }
    };

    const { service } = setupService({
      transactions,
      BalancesAsOfCalculator: mockCalculator,
    });

    const result = service.computeAsOf('2026-03-31');

    assert.ok(capturedInput, 'Calculator should be called');
    assert.strictEqual(capturedInput.dateStr, '2026-03-31');
    assert.strictEqual(capturedInput.transactions.length, 2);
    assert.deepStrictEqual(result, { konto: 70, skarbonka: 0 });
  });

  it('passes empty array when window.transactions is missing', () => {
    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return { konto: 0, skarbonka: 0 };
      }
    };

    const { service } = setupService({
      BalancesAsOfCalculator: mockCalculator,
    });

    service.computeAsOf('2026-03-31');
    assert.strictEqual(capturedInput.transactions.length, 0);
  });

  it('returns calculator result directly', () => {
    const mockCalculator = {
      compute: function() {
        return { konto: 500, skarbonka: 300 };
      }
    };

    const { service } = setupService({
      transactions: [],
      BalancesAsOfCalculator: mockCalculator,
    });

    const result = service.computeAsOf('2026-03-31');
    assert.deepStrictEqual(result, { konto: 500, skarbonka: 300 });
  });

  it('throws when BalancesAsOfCalculator is not available', () => {
    const { service } = setupService({});
    assert.throws(() => service.computeAsOf('2026-03-31'), /BalancesAsOfCalculator not available/);
  });
});
