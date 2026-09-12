/**
 * Stage 1.4 — Safe-to-Spend Legacy-Behavior Characterization Tests
 *
 * Verifies that the new SafeToSpendService produces results equivalent to a
 * verified mirror of the legacy computeSafeToSpend() formula for representative
 * scenarios.
 *
 * IMPORTANT: This file does NOT execute the actual production computeSafeToSpend()
 * from index.html. Instead, it reimplements the legacy calculation logic inline
 * (legacyComputeSafeToSpend) based on a line-by-line inspection of the current
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

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'safe-to-spend', 'safe-to-spend-service.js'), 'utf8');

function legacyComputeSafeToSpend(transactions, recurringTx, goals) {
  const b = { konto: 0, skarbonka: 0, gielda: 0 };
  transactions.forEach(t => {
    if (t._excluded || !t.place) return;
    const s = t.type === 'income' ? 1 : -1;
    b[t.place] += s * t.amount;
  });

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate() + 1;

  let totalBills = 0;
  const horizonDays = Math.max(0, daysLeft - 1);
  recurringTx.filter(r => r.active && r.type === 'expense').forEach(r => {
    const occurrences = recUpcomingOccurrences(r, horizonDays);
    totalBills += occurrences.reduce((s) => s + r.amount, 0);
  });

  let goalsReq = 0;
  goals.forEach(g => {
    const remaining = (g.target || 0) - (g.current || 0);
    if (remaining <= 0 || !g.deadline) return;
    const deadline = new Date(g.deadline);
    if (deadline < now) { goalsReq += remaining; return; }
    let monthsLeft = (deadline.getFullYear() - now.getFullYear()) * 12
                    + (deadline.getMonth() - now.getMonth()) + 1;
    monthsLeft = Math.max(1, monthsLeft);
    goalsReq += remaining / monthsLeft;
  });

  const freeFunds = b.konto;
  const safeTotal = freeFunds - totalBills - goalsReq;
  const perDay = safeTotal / daysLeft;

  return { daysLeft, freeFunds, bills: totalBills, goalsReq, safeTotal, perDay };
}

function recUpcomingOccurrences(r, daysAhead) {
  const todayD = new Date();
  const horizonD = new Date(todayD);
  horizonD.setDate(horizonD.getDate() + daysAhead);
  let cur = new Date(recNextDate(r));
  const results = [];
  let guard = 0;
  while (guard < 200 && cur <= horizonD) {
    if (cur >= todayD) results.push(new Date(cur));
    if (r.freq === 'weekly') {
      cur.setDate(cur.getDate() + 7);
    } else if (r.freq === 'yearly') {
      cur.setFullYear(cur.getFullYear() + 1);
    } else {
      cur.setMonth(cur.getMonth() + 1);
      const maxDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      cur.setDate(Math.min(r.dayOfMonth || 1, maxDay));
    }
    guard++;
  }
  return results;
}

function recNextDate(r) {
  const today = new Date().toISOString().split('T')[0];
  if (!r.lastBooked) return r.startDate;
  const last = new Date(r.lastBooked);
  let next = new Date(last);
  if (r.freq === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (r.freq === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(r.dayOfMonth || 1, maxDay));
  }
  return next.toISOString().split('T')[0];
}

const calculatorCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'domain', 'safe-to-spend', 'safe-to-spend-calculator.js'), 'utf8');

function setupService(mocks) {
  const calculatorModule = { exports: {} };
  new Function('module', calculatorCode)(calculatorModule);
  const calculator = calculatorModule.exports.compute ? { compute: calculatorModule.exports.compute } : null;

  const window = {
    getDaysLeftInMonth: mocks.getDaysLeftInMonth || function() {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return lastDay - now.getDate() + 1;
    },
    getBalances: mocks.getBalances || function() { return { konto: 0, skarbonka: 0, gielda: 0 }; },
    getUpcomingBillsThisMonth: mocks.getUpcomingBillsThisMonth || function() { return 0; },
    getRequiredGoalDepositsThisMonth: mocks.getRequiredGoalDepositsThisMonth || function() { return 0; },
    SafeToSpendCalculator: mocks.SafeToSpendCalculator || calculator,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('SafeToSpend Characterization', () => {
  it('empty financial state', () => {
    const legacy = legacyComputeSafeToSpend([], [], []);
    const { service } = setupService({
      getBalances: function() { return { konto: 0, skarbonka: 0, gielda: 0 }; },
      getUpcomingBillsThisMonth: function() { return 0; },
      getRequiredGoalDepositsThisMonth: function() { return 0; },
    });
    const modern = service.computeForCurrentState();

    assert.strictEqual(modern.freeFunds, legacy.freeFunds);
    assert.strictEqual(modern.bills, legacy.bills);
    assert.strictEqual(modern.goalsReq, legacy.goalsReq);
    assert.strictEqual(modern.safeTotal, legacy.safeTotal);
    assert.strictEqual(modern.perDay, legacy.perDay);
  });

  it('normal income/expense state', () => {
    const transactions = [
      { type: 'income', amount: 5000, place: 'konto', _excluded: false },
      { type: 'expense', amount: 2000, place: 'konto', _excluded: false },
      { type: 'income', amount: 1000, place: 'skarbonka', _excluded: false },
    ];

    const legacy = legacyComputeSafeToSpend(transactions, [], []);
    const { service } = setupService({
      getBalances: function() {
        const b = { konto: 0, skarbonka: 0, gielda: 0 };
        transactions.forEach(t => {
          if (t._excluded || !t.place) return;
          const s = t.type === 'income' ? 1 : -1;
          b[t.place] += s * t.amount;
        });
        return b;
      },
      getUpcomingBillsThisMonth: function() { return 0; },
      getRequiredGoalDepositsThisMonth: function() { return 0; },
    });
    const modern = service.computeForCurrentState();

    assert.strictEqual(modern.freeFunds, legacy.freeFunds);
    assert.strictEqual(modern.safeTotal, legacy.safeTotal);
    assert.strictEqual(modern.perDay, legacy.perDay);
  });

  it('with recurring bills', () => {
    const transactions = [
      { type: 'income', amount: 5000, place: 'konto', _excluded: false },
    ];
    const recurringTx = [
      { id: 'r1', active: true, type: 'expense', amount: 500, freq: 'monthly', dayOfMonth: 15, startDate: '2026-01-15', lastBooked: '2026-07-15' },
    ];

    const legacy = legacyComputeSafeToSpend(transactions, recurringTx, []);
    const { service } = setupService({
      getBalances: function() {
        const b = { konto: 0, skarbonka: 0, gielda: 0 };
        transactions.forEach(t => {
          if (t._excluded || !t.place) return;
          const s = t.type === 'income' ? 1 : -1;
          b[t.place] += s * t.amount;
        });
        return b;
      },
      getUpcomingBillsThisMonth: function() {
        return legacy.bills;
      },
      getRequiredGoalDepositsThisMonth: function() { return 0; },
    });
    const modern = service.computeForCurrentState();

    assert.strictEqual(modern.freeFunds, legacy.freeFunds);
    assert.strictEqual(modern.safeTotal, legacy.safeTotal);
  });

  it('with goals', () => {
    const transactions = [
      { type: 'income', amount: 3000, place: 'konto', _excluded: false },
    ];
    const goals = [
      { id: 'g1', target: 1000, current: 200, deadline: '2026-12-31' },
    ];

    const legacy = legacyComputeSafeToSpend(transactions, [], goals);
    const { service } = setupService({
      getBalances: function() {
        const b = { konto: 0, skarbonka: 0, gielda: 0 };
        transactions.forEach(t => {
          if (t._excluded || !t.place) return;
          const s = t.type === 'income' ? 1 : -1;
          b[t.place] += s * t.amount;
        });
        return b;
      },
      getUpcomingBillsThisMonth: function() { return 0; },
      getRequiredGoalDepositsThisMonth: function() {
        return legacy.goalsReq;
      },
    });
    const modern = service.computeForCurrentState();

    assert.strictEqual(modern.freeFunds, legacy.freeFunds);
    assert.strictEqual(modern.goalsReq, legacy.goalsReq);
    assert.strictEqual(modern.safeTotal, legacy.safeTotal);
  });

  it('negative safe-to-spend', () => {
    const transactions = [
      { type: 'expense', amount: 5000, place: 'konto', _excluded: false },
    ];
    const recurringTx = [
      { id: 'r1', active: true, type: 'expense', amount: 1000, freq: 'monthly', dayOfMonth: 15, startDate: '2026-01-15', lastBooked: '2026-07-15' },
    ];
    const goals = [
      { id: 'g1', target: 2000, current: 0, deadline: '2026-12-31' },
    ];

    const legacy = legacyComputeSafeToSpend(transactions, recurringTx, goals);
    const { service } = setupService({
      getBalances: function() {
        const b = { konto: 0, skarbonka: 0, gielda: 0 };
        transactions.forEach(t => {
          if (t._excluded || !t.place) return;
          const s = t.type === 'income' ? 1 : -1;
          b[t.place] += s * t.amount;
        });
        return b;
      },
      getUpcomingBillsThisMonth: function() { return legacy.bills; },
      getRequiredGoalDepositsThisMonth: function() { return legacy.goalsReq; },
    });
    const modern = service.computeForCurrentState();

    assert.strictEqual(modern.safeTotal, legacy.safeTotal);
    assert.strictEqual(modern.perDay, legacy.perDay);
    assert.ok(modern.safeTotal < 0, 'safeTotal should be negative');
  });
});
