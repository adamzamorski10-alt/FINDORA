/**
 * Stage 1.5J — Month Earn Stats Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'income', 'month-earn-stats-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    incomeSources: mocks.incomeSources || [],
    transactions: mocks.transactions || [],
    gieldaOps: mocks.gieldaOps || [],
    MonthEarnStatsCalculator: mocks.MonthEarnStatsCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('MonthEarnStatsService', () => {
  it('reads correct window globals and delegates to domain calculator', () => {
    const incomeSources = [
      { id: 's1', _profileType: 'regular', name: 'Job' },
      { id: 'g1', _profileType: 'gielda', name: 'Stocks' },
    ];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
    ];
    const gieldaOps = [
      { type: 'zarobek', date: '2026-03-01', amount: 50 },
    ];

    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return { income: 100, expense: 0, net: 100, bySource: [] };
      }
    };

    const { service } = setupService({
      incomeSources: incomeSources,
      transactions: transactions,
      gieldaOps: gieldaOps,
      MonthEarnStatsCalculator: mockCalculator,
    });

    const result = service.computeForMonth('2026-03');

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.mKey, '2026-03');
    assert.strictEqual(capturedInput.incomeSources.length, 2);
    assert.strictEqual(capturedInput.transactions.length, 1);
    assert.strictEqual(capturedInput.gieldaOps.length, 1);
    assert.deepStrictEqual(result, { income: 100, expense: 0, net: 100, bySource: [] });
  });

  it('does not require DOM or Firebase', () => {
    const { service } = setupService({});
    assert.strictEqual(typeof service.computeForMonth, 'function');
  });

  it('returns calculator result directly', () => {
    const expectedResult = { income: 1, expense: 2, net: -1, bySource: [] };
    const mockCalculator = { compute: function() { return expectedResult; } };

    const { service } = setupService({
      incomeSources: [{ id: 's1', _profileType: 'regular' }],
      MonthEarnStatsCalculator: mockCalculator,
    });

    const result = service.computeForMonth('2026-03');
    assert.strictEqual(result, expectedResult);
  });

  it('throws when MonthEarnStatsCalculator is not available', () => {
    const { service } = setupService({
      incomeSources: [{ id: 's1', _profileType: 'regular' }],
    });
    assert.throws(() => service.computeForMonth('2026-03'), /MonthEarnStatsCalculator not available/);
  });

  it('passes empty arrays when window globals are missing', () => {
    let capturedInput = null;
    const mockCalculator = {
      compute: function(input) {
        capturedInput = input;
        return { income: 0, expense: 0, net: 0, bySource: [] };
      }
    };

    const { service } = setupService({
      MonthEarnStatsCalculator: mockCalculator,
    });

    service.computeForMonth('2026-03');
    assert.strictEqual(capturedInput.incomeSources.length, 0);
    assert.strictEqual(capturedInput.transactions.length, 0);
    assert.strictEqual(capturedInput.gieldaOps.length, 0);
  });
});
