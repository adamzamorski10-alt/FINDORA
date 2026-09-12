/**
 * Stage 1.5G — Source Net Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'income', 'source-net-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    incomeSources: mocks.incomeSources || [],
    transactions: mocks.transactions || [],
    gieldaOps: mocks.gieldaOps || [],
    SourceNetCalculator: mocks.SourceNetCalculator || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('SourceNetService', () => {
  it('reads correct source and delegates to domain calculator', () => {
    const incomeSources = [
      { id: 's1', _profileType: 'regular' },
      { id: 's2', _profileType: 'gielda' },
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
        return 42;
      }
    };

    const { service } = setupService({
      incomeSources: incomeSources,
      transactions: transactions,
      gieldaOps: gieldaOps,
      SourceNetCalculator: mockCalculator,
    });

    const result = service.computeForSourceMonth('s1', '2026-03');

    assert.ok(capturedInput, 'Domain calculator should be called');
    assert.strictEqual(capturedInput.source.id, 's1');
    assert.strictEqual(capturedInput.mKey, '2026-03');
    assert.strictEqual(capturedInput.transactions.length, 1);
    assert.strictEqual(capturedInput.gieldaOps.length, 1);
    assert.strictEqual(result, 42);
  });

  it('does not require DOM or Firebase', () => {
    const { service } = setupService({});
    assert.strictEqual(typeof service.computeForSourceMonth, 'function');
  });

  it('throws when source is not found', () => {
    const { service } = setupService({
      incomeSources: [{ id: 's1', _profileType: 'regular' }],
    });
    assert.throws(() => service.computeForSourceMonth('missing', '2026-03'), /Income source not found/);
  });

  it('returns calculator result directly', () => {
    const expectedResult = 123;
    const mockCalculator = { compute: function() { return expectedResult; } };

    const { service } = setupService({
      incomeSources: [{ id: 's1', _profileType: 'regular' }],
      SourceNetCalculator: mockCalculator,
    });

    const result = service.computeForSourceMonth('s1', '2026-03');
    assert.strictEqual(result, expectedResult);
  });
});
