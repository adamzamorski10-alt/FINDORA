/**
 * Stage 1.5I — Gielda Balance Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'gielda', 'gielda-balance-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    gieldaOps: mocks.gieldaOps || [],
    GieldaBalanceCalculator: mocks.GieldaBalanceCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('GieldaBalanceService', () => {
  it('reads gieldaOps and delegates to domain calculator', () => {
    const gieldaOps = [
      { type: 'wplata', amount: 100 },
      { type: 'wyplata', amount: 30 },
    ];

    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return 70;
      }
    };

    const { service } = setupService({
      gieldaOps: gieldaOps,
      GieldaBalanceCalculator: mockCalculator,
    });

    const result = service.computeCurrent();

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.operations.length, 2);
    assert.strictEqual(result, 70);
  });

  it('reads gieldaOps and delegates to domain calculator with asOfDate', () => {
    const gieldaOps = [
      { type: 'wplata', amount: 100, date: '2024-01-15' },
      { type: 'wyplata', amount: 30, date: '2024-06-15' },
    ];

    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return 70;
      }
    };

    const { service } = setupService({
      gieldaOps: gieldaOps,
      GieldaBalanceCalculator: mockCalculator,
    });

    const result = service.computeAsOf('2024-06-30');

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.asOfDate, '2024-06-30');
    assert.strictEqual(capturedInput.operations.length, 2);
    assert.strictEqual(result, 70);
  });

  it('does not require DOM or Firebase', () => {
    const { service } = setupService({});
    assert.strictEqual(typeof service.computeCurrent, 'function');
    assert.strictEqual(typeof service.computeAsOf, 'function');
  });

  it('returns calculator result directly', () => {
    const expectedResult = 42;
    const mockCalculator = { compute: function() { return expectedResult; } };

    const { service } = setupService({
      gieldaOps: [],
      GieldaBalanceCalculator: mockCalculator,
    });

    assert.strictEqual(service.computeCurrent(), expectedResult);
    assert.strictEqual(service.computeAsOf('2024-12-31'), expectedResult);
  });

  it('changes result when window.gieldaOps changes', () => {
    const mockCalculator = { compute: function(input) { return input.operations.length; } };

    const { service, window } = setupService({
      gieldaOps: [{ type: 'wplata', amount: 100 }],
      GieldaBalanceCalculator: mockCalculator,
    });

    assert.strictEqual(service.computeCurrent(), 1);

    window.gieldaOps = [
      { type: 'wplata', amount: 100 },
      { type: 'wyplata', amount: 50 },
    ];
    assert.strictEqual(service.computeCurrent(), 2);
  });

  it('throws when GieldaBalanceCalculator is not available', () => {
    const { service } = setupService({ GieldaBalanceCalculator: null });
    assert.throws(() => service.computeCurrent(), /GieldaBalanceCalculator not available/);
    assert.throws(() => service.computeAsOf('2024-12-31'), /GieldaBalanceCalculator not available/);
  });
});
