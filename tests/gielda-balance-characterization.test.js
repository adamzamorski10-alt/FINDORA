/**
 * Stage 1.5I — Gielda Balance Legacy-Behavior Characterization Tests
 *
 * Verifies that the new GieldaBalanceService produces results equivalent to a
 * verified mirror of the legacy getGieldaBalance() and getGieldaBalanceAsOf()
 * formulas for representative scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production functions
 * from index.html. Instead, it reimplements the legacy calculation logic inline
 * (legacyGetGieldaBalance / legacyGetGieldaBalanceAsOf) based on a line-by-line
 * inspection of the current index.html implementation. This is a
 * legacy-behavior characterization harness, not a true golden-master test
 * against the live production function.
 *
 * This test sets up controlled global state, invokes both the mirrored legacy
 * calculation and the new service, and compares results.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'gielda', 'gielda-balance-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'gielda', 'gielda-balance-calculator.js'), 'utf8').replace(/\bexport\s+\{\s*compute\s*\};?/g, '');

function legacyGetGieldaBalance(operations) {
  const dep = operations.filter(o => o.type === 'wplata').reduce((s, o) => s + o.amount, 0);
  const wit = operations.filter(o => o.type === 'wyplata').reduce((s, o) => s + o.amount, 0);
  const ear = operations.filter(o => o.type === 'zarobek').reduce((s, o) => s + o.amount, 0);
  const los = operations.filter(o => o.type === 'strata').reduce((s, o) => s + o.amount, 0);
  return dep - wit + ear - los;
}

function legacyGetGieldaBalanceAsOf(operations, dateStr) {
  let bal = 0;
  operations.forEach(o => {
    if (!o.date || o.date > dateStr) return;
    if (o.type === 'wplata') bal += o.amount;
    else if (o.type === 'wyplata') bal -= o.amount;
    else if (o.type === 'zarobek') bal += o.amount;
    else if (o.type === 'strata') bal -= o.amount;
  });
  return bal;
}

function setupService(mocks) {
  const calculatorModule = { exports: {} };
  new Function('module', calculatorCode)(calculatorModule);
  const calculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const window = {
    gieldaOps: mocks.gieldaOps || [],
    GieldaBalanceCalculator: mocks.GieldaBalanceCalculator || calculator,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('GieldaBalance Characterization', () => {
  describe('computeCurrent vs legacy getGieldaBalance', () => {
    it('empty operations', () => {
      const legacy = legacyGetGieldaBalance([]);
      const { service } = setupService({ gieldaOps: [] });
      const modern = service.computeCurrent();
      assert.strictEqual(modern, legacy);
    });

    it('single deposit', () => {
      const ops = [{ type: 'wplata', amount: 100 }];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('multiple deposits', () => {
      const ops = [{ type: 'wplata', amount: 100 }, { type: 'wplata', amount: 50 }];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('single withdrawal', () => {
      const ops = [{ type: 'wyplata', amount: 100 }];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('mixed operations', () => {
      const ops = [
        { type: 'wplata', amount: 1000 },
        { type: 'wyplata', amount: 200 },
        { type: 'zarobek', amount: 300 },
        { type: 'strata', amount: 100 },
      ];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('unknown operation type', () => {
      const ops = [
        { type: 'wplata', amount: 100 },
        { type: 'unknown', amount: 50 },
        { type: 'zarobek', amount: 30 },
      ];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('negative amount', () => {
      const ops = [{ type: 'wplata', amount: -100 }];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('fractional amounts', () => {
      const ops = [
        { type: 'wplata', amount: 100.50 },
        { type: 'wyplata', amount: 49.99 },
        { type: 'zarobek', amount: 25.25 },
        { type: 'strata', amount: 10.10 },
      ];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });

    it('zero amounts', () => {
      const ops = [
        { type: 'wplata', amount: 0 },
        { type: 'wyplata', amount: 0 },
      ];
      const legacy = legacyGetGieldaBalance(ops);
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeCurrent(), legacy);
    });
  });

  describe('computeAsOf vs legacy getGieldaBalanceAsOf', () => {
    it('operation before cutoff', () => {
      const ops = [{ type: 'wplata', amount: 100, date: '2024-01-15' }];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('operation exactly on cutoff', () => {
      const ops = [{ type: 'wplata', amount: 100, date: '2024-06-30' }];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('operation after cutoff', () => {
      const ops = [{ type: 'wplata', amount: 100, date: '2024-07-01' }];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('future operation', () => {
      const ops = [{ type: 'wplata', amount: 100, date: '2099-01-01' }];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('missing date', () => {
      const ops = [{ type: 'wplata', amount: 100 }];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('mixed dated and undated operations', () => {
      const ops = [
        { type: 'wplata', amount: 100, date: '2024-01-15' },
        { type: 'wplata', amount: 200 },
        { type: 'wyplata', amount: 50, date: '2024-03-10' },
      ];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('all operation types before cutoff', () => {
      const ops = [
        { type: 'wplata', amount: 1000, date: '2024-01-01' },
        { type: 'wyplata', amount: 200, date: '2024-02-01' },
        { type: 'zarobek', amount: 300, date: '2024-03-01' },
        { type: 'strata', amount: 100, date: '2024-04-01' },
      ];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-12-31');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-12-31'), legacy);
    });

    it('negative amounts with date cutoff', () => {
      const ops = [
        { type: 'wplata', amount: -100, date: '2024-01-15' },
        { type: 'wyplata', amount: -50, date: '2024-02-15' },
      ];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });

    it('unknown operation type with valid date', () => {
      const ops = [
        { type: 'unknown', amount: 100, date: '2024-01-15' },
        { type: 'wplata', amount: 50, date: '2024-01-15' },
      ];
      const legacy = legacyGetGieldaBalanceAsOf(ops, '2024-06-30');
      const { service } = setupService({ gieldaOps: ops });
      assert.strictEqual(service.computeAsOf('2024-06-30'), legacy);
    });
  });
});
