/**
 * Stage 1.5Q — Wealth Month Transaction Stats Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the wealth month
 * transaction stats calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/wealth/wealth-month-transaction-stats-calculator.js');

describe('WealthMonthTransactionStatsCalculator', () => {
  describe('empty transactions', () => {
    it('returns zeroed stats for empty array', () => {
      const result = compute({ mKey: '2024-01', transactions: [] });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });
  });

  describe('normal data', () => {
    it('computes income and expense for matching transactions', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 100 },
          { type: 'expense', date: '2024-01-20', amount: 30 },
        ],
      });
      assert.strictEqual(result.income, 100);
      assert.strictEqual(result.expense, 30);
      assert.strictEqual(result.net, 70);
    });
  });

  describe('multiple income and expense', () => {
    it('sums multiple income and expense transactions', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-05', amount: 100 },
          { type: 'income', date: '2024-01-10', amount: 200 },
          { type: 'expense', date: '2024-01-15', amount: 50 },
          { type: 'expense', date: '2024-01-20', amount: 75 },
        ],
      });
      assert.strictEqual(result.income, 300);
      assert.strictEqual(result.expense, 125);
      assert.strictEqual(result.net, 175);
    });
  });

  describe('net equals income minus expense', () => {
    it('computes net as income minus expense', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 200 },
          { type: 'expense', date: '2024-01-20', amount: 80 },
        ],
      });
      assert.strictEqual(result.net, result.income - result.expense);
    });
  });

  describe('_excluded transactions', () => {
    it('excludes transactions with _excluded flag', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 100, _excluded: true },
          { type: 'expense', date: '2024-01-20', amount: 30, _excluded: true },
        ],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });
  });

  describe('_transfer flag', () => {
    it('includes _transfer expenses (not excluded)', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', amount: 50, _transfer: true },
          { type: 'expense', date: '2024-01-20', amount: 30 },
        ],
      });
      assert.strictEqual(result.expense, 80);
    });
  });

  describe('_autoSave flag', () => {
    it('includes _autoSave expenses (not excluded)', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', amount: 50, _autoSave: true },
          { type: 'expense', date: '2024-01-20', amount: 30 },
        ],
      });
      assert.strictEqual(result.expense, 80);
    });
  });

  describe('unknown transaction types', () => {
    it('ignores unknown transaction types', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'unknown', date: '2024-01-15', amount: 100 },
          { type: 'income', date: '2024-01-20', amount: 50 },
        ],
      });
      assert.strictEqual(result.income, 50);
      assert.strictEqual(result.expense, 0);
    });
  });

  describe('missing date', () => {
    it('excludes transactions with missing date', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', amount: 100 },
          { type: 'expense', amount: 50 },
        ],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });
  });

  describe('empty date string', () => {
    it('excludes transactions with empty date string', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '', amount: 100 },
          { type: 'expense', date: '', amount: 50 },
        ],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });
  });

  describe('startsWith matching', () => {
    it('includes transactions whose date starts with mKey', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-05', amount: 100 },
          { type: 'income', date: '2024-01-15', amount: 200 },
        ],
      });
      assert.strictEqual(result.income, 300);
    });
  });

  describe('different month', () => {
    it('excludes transactions from different months', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-02-05', amount: 100 },
          { type: 'expense', date: '2024-01-20', amount: 30 },
        ],
      });
      assert.strictEqual(result.income, 0);
      assert.strictEqual(result.expense, 30);
    });
  });

  describe('malformed date starting with mKey', () => {
    it('includes transaction if date starts with mKey even if malformed', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-not-a-date', amount: 100 },
        ],
      });
      assert.strictEqual(result.income, 100);
    });
  });

  describe('missing amount', () => {
    it('propagates NaN from missing amount in income', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: undefined },
        ],
      });
      assert.ok(Number.isNaN(result.income));
      assert.ok(Number.isNaN(result.net));
    });

    it('propagates NaN from missing amount in expense', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', amount: undefined },
        ],
      });
      assert.ok(Number.isNaN(result.expense));
      assert.ok(Number.isNaN(result.net));
    });
  });

  describe('zero amounts', () => {
    it('handles zero amounts', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 0 },
          { type: 'expense', date: '2024-01-20', amount: 0 },
        ],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });
  });

  describe('negative amounts', () => {
    it('handles negative amounts', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: -100 },
          { type: 'expense', date: '2024-01-20', amount: -50 },
        ],
      });
      assert.strictEqual(result.income, -100);
      assert.strictEqual(result.expense, -50);
      assert.strictEqual(result.net, -50);
    });
  });

  describe('fractional amounts', () => {
    it('handles fractional amounts', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 100.50 },
          { type: 'expense', date: '2024-01-20', amount: 49.99 },
        ],
      });
      assert.strictEqual(result.income, 100.50);
      assert.strictEqual(result.expense, 49.99);
      assert.strictEqual(result.net, 50.51);
    });
  });

  describe('NaN amount', () => {
    it('propagates NaN from NaN amount', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: NaN },
        ],
      });
      assert.ok(Number.isNaN(result.income));
      assert.ok(Number.isNaN(result.net));
    });
  });

  describe('Infinity amount', () => {
    it('preserves Infinity amount', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: Infinity },
        ],
      });
      assert.strictEqual(result.income, Infinity);
      assert.strictEqual(result.net, Infinity);
    });
  });

  describe('input immutability', () => {
    it('does not mutate transactions array', () => {
      const transactions = [
        { type: 'income', date: '2024-01-15', amount: 100 },
      ];
      const original = JSON.stringify(transactions);
      compute({ mKey: '2024-01', transactions });
      assert.strictEqual(JSON.stringify(transactions), original);
    });

    it('does not mutate transaction objects', () => {
      const tx = { type: 'income', date: '2024-01-15', amount: 100 };
      const original = JSON.stringify(tx);
      compute({ mKey: '2024-01', transactions: [tx] });
      assert.strictEqual(JSON.stringify(tx), original);
    });
  });

  describe('output shape', () => {
    it('returns exactly {income, expense, net} with no extra fields', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 100 },
          { type: 'expense', date: '2024-01-20', amount: 30 },
        ],
      });
      assert.ok('income' in result);
      assert.ok('expense' in result);
      assert.ok('net' in result);
      assert.strictEqual(Object.keys(result).length, 3);
    });

    it('returns numbers for all fields', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 100 },
          { type: 'expense', date: '2024-01-20', amount: 30 },
        ],
      });
      assert.strictEqual(typeof result.income, 'number');
      assert.strictEqual(typeof result.expense, 'number');
      assert.strictEqual(typeof result.net, 'number');
    });
  });

  describe('undefined/null transactions', () => {
    it('throws when transactions is undefined', () => {
      assert.throws(() => {
        compute({ mKey: '2024-01', transactions: undefined });
      }, /Cannot read properties of undefined/);
    });

    it('throws when transactions is null', () => {
      assert.throws(() => {
        compute({ mKey: '2024-01', transactions: null });
      }, /Cannot read properties of null/);
    });
  });

  describe('combined flags', () => {
    it('only _excluded is excluded; _transfer and _autoSave are included', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', amount: 100, _excluded: true },
          { type: 'expense', date: '2024-01-16', amount: 50, _excluded: true },
          { type: 'income', date: '2024-01-17', amount: 200 },
          { type: 'expense', date: '2024-01-18', amount: 80, _transfer: true },
          { type: 'expense', date: '2024-01-19', amount: 60, _autoSave: true },
        ],
      });
      assert.strictEqual(result.income, 200);
      assert.strictEqual(result.expense, 140);
    });
  });
});
