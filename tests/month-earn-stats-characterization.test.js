/**
 * Stage 1.5J — Month Earn Stats Legacy-Behavior Characterization Tests
 *
 * Verifies that the new MonthEarnStatsService produces results equivalent to a
 * verified mirror of the legacy getMonthEarnStats() formula for representative
 * scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production getMonthEarnStats()
 * from index.html. Instead, it reimplements the legacy calculation logic inline
 * (legacyGetMonthEarnStats) based on a direct inspection of the current
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

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'income', 'month-earn-stats-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'income', 'month-earn-stats-calculator.js'), 'utf8');
const sharedCalculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'income', 'source-monthly-earnings-calculator.js'), 'utf8');

function legacyGetSourceTransactions(sourceId, transactions) {
  return transactions.filter(t => t.type === 'income' && t._sourceId === sourceId);
}

function legacyGetSourceExpenses(sourceId, transactions) {
  return transactions.filter(t => t.type === 'expense' && t._sourceId === sourceId && !t._transfer && !t._autoSave);
}

function legacyGetMonthEarnStats(mKey, incomeSources, transactions, gieldaOps) {
  let income = 0, expense = 0;
  const bySource = [];
  incomeSources.forEach(s => {
    let sInc = 0, sExp = 0;
    if (s._profileType === 'gielda') {
      const ops = gieldaOps.filter(o => o.date && o.date.startsWith(mKey));
      sInc = ops.filter(o => o.type === 'zarobek').reduce((sum, o) => sum + o.amount, 0);
      sExp = ops.filter(o => o.type === 'strata').reduce((sum, o) => sum + o.amount, 0);
    } else {
      sInc = legacyGetSourceTransactions(s.id, transactions)
        .filter(t => t.date && t.date.startsWith(mKey))
        .reduce((sum, t) => sum + t.amount, 0);
      sExp = legacyGetSourceExpenses(s.id, transactions)
        .filter(t => t.date && t.date.startsWith(mKey))
        .reduce((sum, t) => sum + t.amount, 0);
    }
    income += sInc;
    expense += sExp;
    bySource.push({ source: s, income: sInc, expense: sExp, net: sInc - sExp });
  });
  return { income, expense, net: income - expense, bySource };
}

function setupService(mocks) {
  const window = {
    incomeSources: mocks.incomeSources || [],
    transactions: mocks.transactions || [],
    gieldaOps: mocks.gieldaOps || [],
    SourceMonthlyEarningsCalculator: null,
    MonthEarnStatsCalculator: null,
  };

  const sharedModule = { exports: {} };
  new Function('window', 'module', sharedCalculatorCode)(window, sharedModule);
  const sharedCalculator = sharedModule.exports.compute ? { compute: sharedModule.exports.compute } : null;

  const calculatorModule = { exports: {} };
  new Function('window', 'module', calculatorCode)(window, calculatorModule);
  window.MonthEarnStatsCalculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('MonthEarnStats Characterization', () => {
  const mKey = '2026-03';

  it('empty incomeSources', () => {
    const legacy = legacyGetMonthEarnStats(mKey, [], [], []);
    const { service } = setupService({
      incomeSources: [],
      transactions: [],
      gieldaOps: [],
    });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('one regular source', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('multiple regular sources', () => {
    const incomeSources = [
      { id: 's1', _profileType: 'regular', name: 'Job' },
      { id: 's2', _profileType: 'regular', name: 'Freelance' },
    ];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'income', _sourceId: 's2', date: '2026-03-02', amount: 200 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-03', amount: 50 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('gielda source', () => {
    const incomeSources = [{ id: 'g1', _profileType: 'gielda', name: 'Stocks' }];
    const gieldaOps = [
      { type: 'zarobek', date: '2026-03-01', amount: 100 },
      { type: 'strata', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, [], gieldaOps);
    const { service } = setupService({ incomeSources, transactions: [], gieldaOps });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('mixed regular + gielda sources', () => {
    const incomeSources = [
      { id: 's1', _profileType: 'regular', name: 'Job' },
      { id: 'g1', _profileType: 'gielda', name: 'Stocks' },
    ];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
    ];
    const gieldaOps = [
      { type: 'zarobek', date: '2026-03-02', amount: 50 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, gieldaOps);
    const { service } = setupService({ incomeSources, transactions, gieldaOps });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('totals match', () => {
    const incomeSources = [
      { id: 's1', _profileType: 'regular', name: 'A' },
      { id: 's2', _profileType: 'regular', name: 'B' },
    ];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'income', _sourceId: 's2', date: '2026-03-02', amount: 200 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-03', amount: 50 },
      { type: 'expense', _sourceId: 's2', date: '2026-03-04', amount: 30 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.strictEqual(modern.income, legacy.income);
    assert.strictEqual(modern.expense, legacy.expense);
    assert.strictEqual(modern.net, legacy.net);
  });

  it('net equals income minus expense', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 40 },
    ];
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.strictEqual(modern.net, modern.income - modern.expense);
  });

  it('bySource order matches incomeSources order', () => {
    const incomeSources = [
      { id: 's1', _profileType: 'regular', name: 'A' },
      { id: 's2', _profileType: 'regular', name: 'B' },
      { id: 's3', _profileType: 'regular', name: 'C' },
    ];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 10 },
      { type: 'income', _sourceId: 's2', date: '2026-03-02', amount: 20 },
      { type: 'income', _sourceId: 's3', date: '2026-03-03', amount: 30 },
    ];
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.strictEqual(modern.bySource.length, 3);
    assert.strictEqual(modern.bySource[0].source.id, 's1');
    assert.strictEqual(modern.bySource[1].source.id, 's2');
    assert.strictEqual(modern.bySource[2].source.id, 's3');
  });

  it('bySource shape matches legacy', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.strictEqual(modern.bySource.length, legacy.bySource.length);
    assert.deepStrictEqual(modern.bySource[0].source, legacy.bySource[0].source);
    assert.strictEqual(modern.bySource[0].income, legacy.bySource[0].income);
    assert.strictEqual(modern.bySource[0].expense, legacy.bySource[0].expense);
    assert.strictEqual(modern.bySource[0].net, legacy.bySource[0].net);
  });

  it('transfers excluded', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 50, _transfer: true },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('autosave excluded', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 50, _autoSave: true },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('missing dates excluded', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', amount: 100 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('malformed dates excluded', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: 'not-a-date', amount: 100 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('negative amounts preserved', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: -100 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: -50 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('fractional amounts preserved', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100.50 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 49.99 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('zero amounts preserved', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 0 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 0 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('missing amount propagates NaN', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: undefined },
    ];
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.ok(Number.isNaN(modern.income));
    assert.ok(Number.isNaN(modern.net));
  });

  it('unknown types ignored', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'unknown', _sourceId: 's1', date: '2026-03-01', amount: 100 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });

  it('duplicate records summed', () => {
    const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
    ];
    const legacy = legacyGetMonthEarnStats(mKey, incomeSources, transactions, []);
    const { service } = setupService({ incomeSources, transactions, gieldaOps: [] });
    const modern = service.computeForMonth(mKey);
    assert.deepStrictEqual(modern, legacy);
  });
});
