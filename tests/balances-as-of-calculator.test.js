/**
 * Stage 1.5M — Balances As Of Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/balances/balances-as-of-calculator.js');

describe('BalancesAsOfCalculator', () => {
  describe('empty transactions', () => {
    it('returns zeroed balances for empty array', () => {
      assert.deepStrictEqual(compute({ dateStr: '2026-03-31', transactions: [] }), { konto: 0, skarbonka: 0 });
    });

    it('returns zeroed balances for undefined transactions', () => {
      assert.deepStrictEqual(compute({ dateStr: '2026-03-31', transactions: undefined }), { konto: 0, skarbonka: 0 });
    });
  });

  describe('konto', () => {
    it('adds income to konto', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100 }] }),
        { konto: 100, skarbonka: 0 }
      );
    });

    it('subtracts expense from konto', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'expense', place: 'konto', date: '2026-03-01', amount: 50 }] }),
        { konto: -50, skarbonka: 0 }
      );
    });

    it('accumulates multiple konto transactions', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [
          { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 },
          { type: 'expense', place: 'konto', date: '2026-03-02', amount: 30 },
        ] }),
        { konto: 70, skarbonka: 0 }
      );
    });
  });

  describe('skarbonka', () => {
    it('adds income to skarbonka', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'skarbonka', date: '2026-03-01', amount: 200 }] }),
        { konto: 0, skarbonka: 200 }
      );
    });

    it('subtracts expense from skarbonka', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'expense', place: 'skarbonka', date: '2026-03-01', amount: 80 }] }),
        { konto: 0, skarbonka: -80 }
      );
    });
  });

  describe('mixed places', () => {
    it('accumulates both konto and skarbonka', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [
          { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 },
          { type: 'income', place: 'skarbonka', date: '2026-03-01', amount: 200 },
          { type: 'expense', place: 'konto', date: '2026-03-02', amount: 30 },
        ] }),
        { konto: 70, skarbonka: 200 }
      );
    });
  });

  describe('date filtering', () => {
    it('includes transaction before cutoff', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100 }] }),
        { konto: 100, skarbonka: 0 }
      );
    });

    it('excludes transaction after cutoff', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-04-01', amount: 100 }] }),
        { konto: 0, skarbonka: 0 }
      );
    });

    it('includes transaction exactly on cutoff', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-31', amount: 100 }] }),
        { konto: 100, skarbonka: 0 }
      );
    });

    it('excludes transaction with missing date', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', amount: 100 }] }),
        { konto: 0, skarbonka: 0 }
      );
    });
  });

  describe('exclusion rules', () => {
    it('excludes _excluded transaction', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100, _excluded: true }] }),
        { konto: 0, skarbonka: 0 }
      );
    });

    it('ignores transaction with missing place', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', date: '2026-03-01', amount: 100 }] }),
        { konto: 0, skarbonka: 0 }
      );
    });

    it('ignores transaction with unknown place', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'other', date: '2026-03-01', amount: 100 }] }),
        { konto: 0, skarbonka: 0 }
      );
    });

    it('does NOT exclude _transfer transactions', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'expense', place: 'konto', date: '2026-03-01', amount: 50, _transfer: true }] }),
        { konto: -50, skarbonka: 0 }
      );
    });

    it('does NOT exclude _autoSave transactions', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'expense', place: 'konto', date: '2026-03-01', amount: 50, _autoSave: true }] }),
        { konto: -50, skarbonka: 0 }
      );
    });
  });

  describe('transaction types', () => {
    it('treats unknown type as expense (subtracts)', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'unknown', place: 'konto', date: '2026-03-01', amount: 100 }] }),
        { konto: -100, skarbonka: 0 }
      );
    });
  });

  describe('amount edge cases', () => {
    it('handles negative amount', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: -100 }] }),
        { konto: -100, skarbonka: 0 }
      );
    });

    it('handles fractional amount', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 99.99 }] }),
        { konto: 99.99, skarbonka: 0 }
      );
    });

    it('handles zero amount', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 0 }] }),
        { konto: 0, skarbonka: 0 }
      );
    });

    it('propagates NaN', () => {
      const result = compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: NaN }] });
      assert.ok(Number.isNaN(result.konto));
      assert.strictEqual(result.skarbonka, 0);
    });

    it('propagates Infinity', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [{ type: 'income', place: 'konto', date: '2026-03-01', amount: Infinity }] }),
        { konto: Infinity, skarbonka: 0 }
      );
    });
  });

  describe('multiple transactions', () => {
    it('sums multiple matching transactions', () => {
      assert.deepStrictEqual(
        compute({ dateStr: '2026-03-31', transactions: [
          { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 },
          { type: 'income', place: 'konto', date: '2026-03-02', amount: 200 },
          { type: 'expense', place: 'konto', date: '2026-03-03', amount: 50 },
        ] }),
        { konto: 250, skarbonka: 0 }
      );
    });
  });

  describe('input immutability', () => {
    it('does not mutate transactions array', () => {
      const transactions = [{ type: 'income', place: 'konto', date: '2026-03-01', amount: 100 }];
      const original = JSON.stringify(transactions);
      compute({ dateStr: '2026-03-31', transactions });
      assert.strictEqual(JSON.stringify(transactions), original);
    });

    it('does not mutate transaction objects', () => {
      const t = { type: 'income', place: 'konto', date: '2026-03-01', amount: 100 };
      const original = JSON.stringify(t);
      compute({ dateStr: '2026-03-31', transactions: [t] });
      assert.strictEqual(JSON.stringify(t), original);
    });
  });
});
