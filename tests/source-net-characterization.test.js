/**
 * Stage 1.5G — Source Net Legacy-Behavior Characterization Tests
 *
 * Verifies that the new SourceNetService produces results equivalent to a
 * verified mirror of the legacy getSourceNetForMonth() formula for representative
 * scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production getSourceNetForMonth()
 * from index.html. Instead, it reimplements the legacy calculation logic inline
 * (legacyGetSourceNetForMonth) based on a line-by-line inspection of the current
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

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'income', 'source-net-service.js'), 'utf8');
const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'income', 'source-net-calculator.js'), 'utf8');
const sharedCalculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'income', 'source-monthly-earnings-calculator.js'), 'utf8');

function legacyGetSourceTransactions(sourceId, transactions) {
  return transactions.filter(t => t.type === 'income' && t._sourceId === sourceId);
}

function legacyGetSourceExpenses(sourceId, transactions) {
  return transactions.filter(t => t.type === 'expense' && t._sourceId === sourceId && !t._transfer && !t._autoSave);
}

function legacyGetSourceNetForMonth(source, mKey, transactions, gieldaOps) {
  if (source._profileType === 'gielda') {
    const ops = gieldaOps.filter(o => o.date && o.date.startsWith(mKey));
    const earn = ops.filter(o => o.type === 'zarobek').reduce((s, o) => s + o.amount, 0);
    const loss = ops.filter(o => o.type === 'strata').reduce((s, o) => s + o.amount, 0);
    return earn - loss;
  }
  const inc = legacyGetSourceTransactions(source.id, transactions)
    .filter(t => t.date && t.date.startsWith(mKey))
    .reduce((s, t) => s + t.amount, 0);
  const exp = legacyGetSourceExpenses(source.id, transactions)
    .filter(t => t.date && t.date.startsWith(mKey))
    .reduce((s, t) => s + t.amount, 0);
  return inc - exp;
}

function setupService(mocks) {
  const window = {
    incomeSources: mocks.incomeSources || [],
    transactions: mocks.transactions || [],
    gieldaOps: mocks.gieldaOps || [],
    SourceMonthlyEarningsCalculator: mocks.SourceMonthlyEarningsCalculator || null,
    SourceNetCalculator: null,
  };

  const sharedModule = { exports: {} };
  new Function('window', 'module', sharedCalculatorCode)(window, sharedModule);
  const sharedCalculator = sharedModule.exports.compute ? { compute: sharedModule.exports.compute } : null;

  if (!mocks.SourceNetCalculator) {
    const calculatorModule = { exports: {} };
    new Function('window', 'module', calculatorCode)(window, calculatorModule);
    window.SourceNetCalculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;
  }

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('SourceNet Characterization', () => {
  const regularSource = { id: 's1', _profileType: 'regular' };
  const gieldaSource = { id: 'g1', _profileType: 'gielda' };
  const mKey = '2026-03';

  it('regular source income only', () => {
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
    ];
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, transactions, []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: transactions,
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('regular source expense only', () => {
    const transactions = [
      { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 50, _transfer: false, _autoSave: false },
    ];
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, transactions, []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: transactions,
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('regular source mixed income and expense', () => {
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30, _transfer: false, _autoSave: false },
    ];
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, transactions, []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: transactions,
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('excludes _transfer expenses', () => {
    const transactions = [
      { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 30, _transfer: true, _autoSave: false },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 20, _transfer: false, _autoSave: false },
    ];
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, transactions, []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: transactions,
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('excludes _autoSave expenses', () => {
    const transactions = [
      { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 30, _transfer: false, _autoSave: true },
      { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 20, _transfer: false, _autoSave: false },
    ];
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, transactions, []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: transactions,
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('gielda zarobek only', () => {
    const gieldaOps = [
      { type: 'zarobek', date: '2026-03-01', amount: 100 },
    ];
    const legacy = legacyGetSourceNetForMonth(gieldaSource, mKey, [], gieldaOps);
    const { service } = setupService({
      incomeSources: [gieldaSource],
      transactions: [],
      gieldaOps: gieldaOps,
    });
    const modern = service.computeForSourceMonth('g1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('gielda strata only', () => {
    const gieldaOps = [
      { type: 'strata', date: '2026-03-01', amount: 50 },
    ];
    const legacy = legacyGetSourceNetForMonth(gieldaSource, mKey, [], gieldaOps);
    const { service } = setupService({
      incomeSources: [gieldaSource],
      transactions: [],
      gieldaOps: gieldaOps,
    });
    const modern = service.computeForSourceMonth('g1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('gielda mixed zarobek and strata', () => {
    const gieldaOps = [
      { type: 'zarobek', date: '2026-03-01', amount: 100 },
      { type: 'strata', date: '2026-03-02', amount: 30 },
    ];
    const legacy = legacyGetSourceNetForMonth(gieldaSource, mKey, [], gieldaOps);
    const { service } = setupService({
      incomeSources: [gieldaSource],
      transactions: [],
      gieldaOps: gieldaOps,
    });
    const modern = service.computeForSourceMonth('g1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('unrelated month returns 0', () => {
    const transactions = [
      { type: 'income', _sourceId: 's1', date: '2026-02-01', amount: 100 },
    ];
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, transactions, []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: transactions,
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });

  it('empty data returns 0', () => {
    const legacy = legacyGetSourceNetForMonth(regularSource, mKey, [], []);
    const { service } = setupService({
      incomeSources: [regularSource],
      transactions: [],
      gieldaOps: [],
    });
    const modern = service.computeForSourceMonth('s1', mKey);
    assert.strictEqual(modern, legacy);
  });
});
