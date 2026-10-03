/**
 * Stage 1.5K — Income Profile Balance Legacy-Behavior Characterization Tests
 *
 * Verifies that the new IncomeProfileBalanceService produces results equivalent
 * to a verified mirror of the legacy computeIncomeProfileBalance() formula for
 * representative scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production
 * computeIncomeProfileBalance() from index.html. Instead, it reimplements the
 * legacy calculation logic inline (legacyComputeIncomeProfileBalance) based on
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

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'income', 'income-profile-balance-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'income', 'income-profile-balance-calculator.js'), 'utf8').replace(/\bexport\s+\{\s*compute\s*\};?/g, '');

function legacyComputeIncomeProfileBalance(profile, transactions, gieldaBalance) {
  if (!profile) return 0;
  if (profile.id === 'gielda') {
    return gieldaBalance || 0;
  }
  const base = Number(profile.balance) || 0;
  const txNet = (typeof transactions !== 'undefined' ? transactions : [])
    .filter(t => t._sourceId === profile.id && !t._transfer)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  return base + txNet;
}

function setupService(mocks) {
  const window = {
    transactions: mocks.transactions || [],
    GieldaBalanceService: mocks.GieldaBalanceService || null,
    IncomeProfileBalanceCalculator: null,
  };

  const calculatorModule = { exports: {} };
  new Function('window', 'module', calculatorCode)(window, calculatorModule);
  window.IncomeProfileBalanceCalculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('IncomeProfileBalance Characterization', () => {
  it('null profile returns 0', () => {
    const { service } = setupService({});
    assert.strictEqual(service.computeForProfile(null), 0);
  });

  it('undefined profile returns 0', () => {
    const { service } = setupService({});
    assert.strictEqual(service.computeForProfile(undefined), 0);
  });

  it('regular profile with income only', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [{ type: 'income', _sourceId: 's1', amount: 100 }];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('regular profile with expense only', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [{ type: 'expense', _sourceId: 's1', amount: 50 }];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('regular profile with mixed transactions', () => {
    const profile = { id: 's1', balance: 100 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: 200 },
      { type: 'expense', _sourceId: 's1', amount: 50 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('excludes transfer transactions', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'expense', _sourceId: 's1', amount: 50, _transfer: true },
      { type: 'expense', _sourceId: 's1', amount: 30 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('includes _autoSave transactions', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'expense', _sourceId: 's1', amount: 50, _autoSave: true },
      { type: 'expense', _sourceId: 's1', amount: 30 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('includes _excluded transactions', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: 100, _excluded: true },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('ignores transactions for other sources', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'income', _sourceId: 's2', amount: 100 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('treats unknown type as expense', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'unknown', _sourceId: 's1', amount: 100 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('gielda profile delegates to gieldaBalance', () => {
    const profile = { id: 'gielda' };
    const mockGieldaService = { computeCurrent: () => 750 };
    const { service } = setupService({ GieldaBalanceService: mockGieldaService });
    assert.strictEqual(service.computeForProfile(profile), 750);
  });

  it('gielda profile returns 0 when GieldaBalanceService is unavailable', () => {
    const profile = { id: 'gielda' };
    const { service } = setupService({});
    assert.strictEqual(service.computeForProfile(profile), 0);
  });

  it('missing profile.balance defaults to 0', () => {
    const profile = { id: 's1' };
    const transactions = [];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('handles fractional amounts', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: 100.50 },
      { type: 'expense', _sourceId: 's1', amount: 49.99 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('handles negative amounts', () => {
    const profile = { id: 's1', balance: -50 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: -100 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('handles empty transactions', () => {
    const profile = { id: 's1', balance: 200 };
    const transactions = [];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('handles NaN amount propagation', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: undefined },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.ok(Number.isNaN(service.computeForProfile(profile)));
    assert.ok(Number.isNaN(legacy));
  });

  it('handles Infinity', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: Infinity },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });

  it('sums duplicate records', () => {
    const profile = { id: 's1', balance: 0 };
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: 100 },
      { type: 'income', _sourceId: 's1', amount: 100 },
    ];
    const legacy = legacyComputeIncomeProfileBalance(profile, transactions, 0);
    const { service } = setupService({ transactions });
    assert.strictEqual(service.computeForProfile(profile), legacy);
  });
});
