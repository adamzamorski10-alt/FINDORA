/**
 * Stage 1.5N — Debts As Of Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'debts', 'debts-as-of-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    debtors: mocks.debtors || [],
    DebtsAsOfCalculator: mocks.DebtsAsOfCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('DebtsAsOfService', () => {
  it('computes endTs and delegates to calculator with correct explicit inputs', () => {
    const debtors = [
      { id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] },
    ];

    let capturedInput = null;
    let capturedDateStr = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        capturedDateStr = input.dateStr;
        return 100;
      }
    };

    const { service } = setupService({
      debtors,
      DebtsAsOfCalculator: mockCalculator,
    });

    const result = service.computeAsOf('2026-03-31');

    assert.ok(capturedInput, 'Calculator should be called');
    assert.strictEqual(capturedDateStr, '2026-03-31');
    assert.strictEqual(capturedInput.debtors.length, 1);
    assert.ok(typeof capturedInput.endTs === 'number', 'endTs should be a number');
    assert.strictEqual(result, 100);
  });

  it('passes empty array when window.debtors is missing', () => {
    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return 0;
      }
    };

    const { service } = setupService({
      DebtsAsOfCalculator: mockCalculator,
    });

    service.computeAsOf('2026-03-31');
    assert.strictEqual(capturedInput.debtors.length, 0);
  });

  it('returns calculator result directly', () => {
    const mockCalculator = {
      compute: function() {
        return 500;
      }
    };

    const { service } = setupService({
      debtors: [],
      DebtsAsOfCalculator: mockCalculator,
    });

    const result = service.computeAsOf('2026-03-31');
    assert.strictEqual(result, 500);
  });

  it('throws when DebtsAsOfCalculator is not available', () => {
    const { service } = setupService({});
    assert.throws(() => service.computeAsOf('2026-03-31'), /DebtsAsOfCalculator not available/);
  });

  it('computes endTs using legacy expression', () => {
    let capturedEndTs = null;
    const mockCalculator = {
      compute: function(input) {
        capturedEndTs = input.endTs;
        return 0;
      }
    };

    const { service } = setupService({
      debtors: [],
      DebtsAsOfCalculator: mockCalculator,
    });

    service.computeAsOf('2026-03-31');
    const expectedEndTs = new Date('2026-03-31T23:59:59').getTime();
    assert.strictEqual(capturedEndTs, expectedEndTs);
  });
});
