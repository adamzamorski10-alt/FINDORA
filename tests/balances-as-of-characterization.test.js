/**
 * Stage 1.5M — Balances As Of Legacy-Behavior Characterization Tests
 *
 * Verifies that the new BalancesAsOfService produces results equivalent
 * to a verified mirror of the legacy getBalancesAsOf() formula for
 * representative scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production
 * getBalancesAsOf() from index.html. Instead, it reimplements the
 * legacy calculation logic inline (legacyGetBalancesAsOf) based on
 * a direct inspection of the current index.html implementation. This is a
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

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'balances', 'balances-as-of-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'balances', 'balances-as-of-calculator.js'), 'utf8').replace(/\bexport\s+\{\s*compute\s*\};?/g, '');

function legacyGetBalancesAsOf(dateStr, transactions) {
  const b = { konto: 0, skarbonka: 0 };
  (transactions || []).forEach(t => {
    if (t._excluded || !t.place || !t.date || t.date > dateStr) return;
    if (b[t.place] === undefined) return;
    b[t.place] += (t.type === 'income' ? 1 : -1) * t.amount;
  });
  return b;
}

function setupService(mocks) {
  const window = {
    transactions: mocks.transactions || [],
    BalancesAsOfCalculator: null,
  };

  const calculatorModule = { exports: {} };
  new Function('window', 'module', calculatorCode)(window, calculatorModule);
  window.BalancesAsOfCalculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('BalancesAsOf Characterization', () => {
  it('empty transactions returns zeroed balances', () => {
    const legacy = legacyGetBalancesAsOf('2026-03-31', []);
    const { service } = setupService({ transactions: [] });
    const modern = service.computeAsOf('2026-03-31');
    assert.deepStrictEqual(modern, legacy);
  });

  it('single income to konto', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('single expense from konto', () => {
    const transactions = [{ type: 'expense', place: 'konto', date: '2026-03-01', amount: 50 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('single income to skarbonka', () => {
    const transactions = [{ type: 'income', place: 'skarbonka', date: '2026-03-01', amount: 200 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('single expense from skarbonka', () => {
    const transactions = [{ type: 'expense', place: 'skarbonka', date: '2026-03-01', amount: 80 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('mixed konto and skarbonka', () => {
    const transactions = [
      { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 },
      { type: 'income', place: 'skarbonka', date: '2026-03-01', amount: 200 },
      { type: 'expense', place: 'konto', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('transaction before cutoff is included', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('transaction after cutoff is excluded', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-04-01', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('transaction exactly on cutoff is included', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-31', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('excludes _excluded transaction', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100, _excluded: true }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('ignores missing place', () => {
    const transactions = [{ type: 'income', date: '2026-03-01', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('ignores unknown place', () => {
    const transactions = [{ type: 'income', place: 'other', date: '2026-03-01', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('does NOT exclude _transfer transaction', () => {
    const transactions = [{ type: 'expense', place: 'konto', date: '2026-03-01', amount: 50, _transfer: true }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('does NOT exclude _autoSave transaction', () => {
    const transactions = [{ type: 'expense', place: 'konto', date: '2026-03-01', amount: 50, _autoSave: true }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('treats unknown type as expense', () => {
    const transactions = [{ type: 'unknown', place: 'konto', date: '2026-03-01', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles negative amount', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: -100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles fractional amount', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 99.99 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles zero amount', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 0 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('ignores missing date', () => {
    const transactions = [{ type: 'income', place: 'konto', amount: 100 }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('sums multiple transactions', () => {
    const transactions = [
      { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 },
      { type: 'income', place: 'konto', date: '2026-03-02', amount: 200 },
      { type: 'expense', place: 'konto', date: '2026-03-03', amount: 50 },
    ];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles NaN amount', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: NaN }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    const modern = service.computeAsOf('2026-03-31');
    assert.ok(Number.isNaN(modern.konto));
    assert.strictEqual(modern.skarbonka, 0);
    assert.ok(Number.isNaN(legacy.konto));
  });

  it('handles Infinity amount', () => {
    const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: Infinity }];
    const legacy = legacyGetBalancesAsOf('2026-03-31', transactions);
    const { service } = setupService({ transactions });
    assert.deepStrictEqual(service.computeAsOf('2026-03-31'), legacy);
  });
});
