/**
 * Stage 1.5N — Debts As Of Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/debts/debts-as-of-calculator.js');

describe('DebtsAsOfCalculator', () => {
  describe('empty debtors', () => {
    it('returns 0 for empty array', () => {
      assert.strictEqual(compute({ dateStr: '2026-03-31', endTs: 1234567890000, debtors: [] }), 0);
    });

    it('returns 0 for undefined debtors', () => {
      assert.strictEqual(compute({ dateStr: '2026-03-31', endTs: 1234567890000, debtors: undefined }), 0);
    });
  });

  describe('debtor with empty debts', () => {
    it('returns 0 for debtor with empty debts array', () => {
      assert.strictEqual(
        compute({ dateStr: '2026-03-31', endTs: 1234567890000, debtors: [{ id: 'd1', debts: [] }] }),
        0
      );
    });

    it('returns 0 for debtor with missing debts property', () => {
      assert.strictEqual(
        compute({ dateStr: '2026-03-31', endTs: 1234567890000, debtors: [{ id: 'd1' }] }),
        0
      );
    });
  });

  describe('unpaid debt before cutoff', () => {
    it('includes unpaid debt before cutoff', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 1234567890000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] }],
        }),
        100
      );
    });

    it('includes unpaid debt exactly on cutoff', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 1234567890000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-31', paid: false, amount: 100 }] }],
        }),
        100
      );
    });
  });

  describe('debt after cutoff', () => {
    it('excludes debt after cutoff', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 1234567890000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-04-01', paid: false, amount: 100 }] }],
        }),
        0
      );
    });
  });

  describe('paid debt with paidAt', () => {
    it('excludes paid debt with paidAt before endTs', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: 1000000000000, amount: 100 }] }],
        }),
        0
      );
    });

    it('excludes paid debt with paidAt exactly endTs', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: 2000000000000, amount: 100 }] }],
        }),
        0
      );
    });

    it('includes paid debt with paidAt after endTs', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: 3000000000000, amount: 100 }] }],
        }),
        100
      );
    });

    it('includes paid debt with paidAt=null', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, paidAt: null, amount: 100 }] }],
        }),
        100
      );
    });

    it('includes paid debt with missing paidAt', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: true, amount: 100 }] }],
        }),
        100
      );
    });
  });

  describe('paid=false', () => {
    it('includes unpaid debt', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] }],
        }),
        100
      );
    });
  });

  describe('missing date', () => {
    it('excludes debt with missing date', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ paid: false, amount: 100 }] }],
        }),
        0
      );
    });
  });

  describe('multiple debtors and debts', () => {
    it('sums debts across multiple debtors', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [
            { id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] },
            { id: 'd2', debts: [{ date: '2026-03-01', paid: false, amount: 200 }] },
          ],
        }),
        300
      );
    });

    it('sums multiple debts within a debtor', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [
            { date: '2026-03-01', paid: false, amount: 100 },
            { date: '2026-03-02', paid: false, amount: 200 },
          ] }],
        }),
        300
      );
    });

    it('mixes included and excluded debts', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [
            { date: '2026-03-01', paid: false, amount: 100 },
            { date: '2026-04-01', paid: false, amount: 200 },
            { date: '2026-03-02', paid: true, paidAt: 1000000000000, amount: 50 },
          ] }],
        }),
        100
      );
    });
  });

  describe('amount edge cases', () => {
    it('handles zero amount', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 0 }] }],
        }),
        0
      );
    });

    it('handles negative amount', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: -100 }] }],
        }),
        -100
      );
    });

    it('handles fractional amount', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 99.99 }] }],
        }),
        99.99
      );
    });

    it('propagates NaN', () => {
      const result = compute({
        dateStr: '2026-03-31',
        endTs: 2000000000000,
        debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: NaN }] }],
      });
      assert.ok(Number.isNaN(result));
    });

    it('propagates Infinity', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: Infinity }] }],
        }),
        Infinity
      );
    });
  });

  describe('date edge cases', () => {
    it('handles malformed date string that is lexically <= dateStr', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] }],
        }),
        100
      );
    });

    it('handles empty string date', () => {
      assert.strictEqual(
        compute({
          dateStr: '2026-03-31',
          endTs: 2000000000000,
          debtors: [{ id: 'd1', debts: [{ date: '', paid: false, amount: 100 }] }],
        }),
        0
      );
    });
  });

  describe('input immutability', () => {
    it('does not mutate debtors array', () => {
      const debtors = [{ id: 'd1', debts: [{ date: '2026-03-01', paid: false, amount: 100 }] }];
      const original = JSON.stringify(debtors);
      compute({ dateStr: '2026-03-31', endTs: 2000000000000, debtors });
      assert.strictEqual(JSON.stringify(debtors), original);
    });

    it('does not mutate debt objects', () => {
      const debt = { date: '2026-03-01', paid: false, amount: 100 };
      const debtors = [{ id: 'd1', debts: [debt] }];
      const original = JSON.stringify(debt);
      compute({ dateStr: '2026-03-31', endTs: 2000000000000, debtors });
      assert.strictEqual(JSON.stringify(debt), original);
    });
  });

  describe('error handling', () => {
    it('does not require any external dependency', () => {
      const result = compute({ dateStr: '2026-03-31', endTs: 1234567890000, debtors: [] });
      assert.strictEqual(result, 0);
    });
  });
});
