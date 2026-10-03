/**
 * Stage 1.5C — Resale Balance Legacy-Behavior Characterization Tests
 *
 * Verifies that the new ResaleBalanceService produces results equivalent to a
 * verified mirror of the legacy getResaleBalance() formula for representative
 * scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production getResaleBalance()
 * from index.html. Instead, it reimplements the legacy calculation logic inline
 * (legacyGetResaleBalance) based on a line-by-line inspection of the current
 * index.html implementation. This is a legacy-behavior characterization harness,
 * not a true golden-master test against the live production function.
 *
 * This test sets up controlled global state, invokes both the mirrored legacy
 * calculation and the new service, and compares results.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'resale', 'resale-balance-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'resale', 'resale-balance-calculator.js'), 'utf8').replace(/\bexport\s+\{\s*compute\s*\};?/g, '');

function legacyGetResaleBalance(sourceId, transactions) {
  const held = transactions
    .filter(t => t._sourceId === sourceId && t._resaleBalance && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const spent = transactions
    .filter(t => t._sourceId === sourceId && (t._resaleWithdraw || t._resalePaidFromBalance) && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  return Math.max(0, held - spent);
}

function setupService(mocks) {
  const calculatorModule = { exports: {} };
  new Function('module', calculatorCode)(calculatorModule);
  const calculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const window = {
    transactions: mocks.transactions || [],
    ResaleBalanceCalculator: mocks.ResaleBalanceCalculator || calculator,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('ResaleBalance Characterization', () => {
  it('empty transactions', () => {
    const legacy = legacyGetResaleBalance('s1', []);
    const { service } = setupService({ transactions: [] });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('no matching source', () => {
    const transactions = [
      { _sourceId: 's2', _resaleBalance: true, type: 'income', amount: 100 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('single held income', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('held and spent', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 500 },
      { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 200 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('spent exceeds held returns 0', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
      { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 150 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('ignores income without _resaleBalance', () => {
    const transactions = [
      { _sourceId: 's1', type: 'income', amount: 100 },
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 50 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('ignores expense without resale flags', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
      { _sourceId: 's1', type: 'expense', amount: 30 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('both _resaleWithdraw and _resalePaidFromBalance count as spent', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 500 },
      { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 100 },
      { _sourceId: 's1', _resalePaidFromBalance: true, type: 'expense', amount: 150 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('fractional amounts', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100.50 },
      { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 49.99 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });

  it('negative held amount', () => {
    const transactions = [
      { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: -50 },
    ];
    const legacy = legacyGetResaleBalance('s1', transactions);
    const { service } = setupService({ transactions: transactions });
    const modern = service.computeForSource('s1');
    assert.strictEqual(modern, legacy);
  });
});
