/**
 * Stage 1.5N — Debts As Of Legacy-Behavior Characterization Tests
 *
 * Verifies that the new DebtsAsOfService produces results equivalent
 * to a verified mirror of the legacy getDebtsAsOf() formula for
 * representative scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production
 * getDebtsAsOf() from index.html. Instead, it reimplements the
 * legacy calculation logic inline (legacyGetDebtsAsOf) based on
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

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'debts', 'debts-as-of-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'debts', 'debts-as-of-calculator.js'), 'utf8').replace(/\bexport\s+\{\s*compute\s*\};?/g, '');

function legacyGetDebtsAsOf(dateStr, debtors) {
  const endTs = new Date(dateStr + 'T23:59:59').getTime();
  let sum = 0;
  (debtors || []).forEach(d => {
    (d.debts || []).forEach(x => {
      if (!x.date || x.date > dateStr) return;
      if (x.paid && x.paidAt && x.paidAt <= endTs) return;
      sum += x.amount;
    });
  });
  return sum;
}

function setupService(mocks) {
  const window = {
    debtors: mocks.debtors || [],
    DebtsAsOfCalculator: null,
  };

  const calculatorModule = { exports: {} };
  new Function('window', 'module', calculatorCode)(window, calculatorModule);
  window.DebtsAsOfCalculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('DebtsAsOf Characterization', () => {
  it('empty debtors returns 0', () => {
    const legacy = legacyGetDebtsAsOf('2026-03-31', []);
    const { service } = setupService({ debtors: [] });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('single unpaid debt before cutoff', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('single unpaid debt exactly on cutoff', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-31', paid: false, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('debt after cutoff is excluded', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-04-01', paid: false, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('paid debt with paidAt before endTs is excluded', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: 1000000000000, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('paid debt with paidAt after endTs is included', () => {
    const endTs = new Date('2026-03-31T23:59:59').getTime();
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: endTs + 1000, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('paid debt with paidAt=null is included', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: null, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('paid debt with missing paidAt is included', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('missing date is excluded', () => {
    const debtors = [{ id: 'd1', debts: [{ paid: false, amount: 100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('multiple debtors and debts are summed', () => {
    const debtors = [
      { id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] },
      { id: 'd2', debts: [{ date: '2026-03-01', paid: false, amount: 200 }] },
    ];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles zero amount', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 0 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles negative amount', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: -100 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles fractional amount', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 99.99 }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('handles NaN amount', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: NaN }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    const modern = service.computeAsOf('2026-03-31');
    assert.ok(Number.isNaN(modern));
    assert.ok(Number.isNaN(legacy));
  });

  it('handles Infinity amount', () => {
    const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: Infinity }] }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('debtor with missing debts property', () => {
    const debtors = [{ id: 'd1' }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });

  it('mixed included and excluded debts', () => {
    const debtors = [{
      id: 'd1',
      debts: [
        { date: '2026-03-01', paid: false, amount: 100 },
        { date: '2026-04-01', paid: false, amount: 200 },
        { date: '2026-03-02', paid: true, paidAt: 1000000000000, amount: 50 },
      ],
    }];
    const legacy = legacyGetDebtsAsOf('2026-03-31', debtors);
    const { service } = setupService({ debtors });
    assert.strictEqual(service.computeAsOf('2026-03-31'), legacy);
  });
});
