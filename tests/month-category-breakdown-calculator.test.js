/**
 * Stage 1.5S — Month Category Breakdown Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the month category
 * breakdown calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/transactions/month-category-breakdown-calculator.js');

describe('MonthCategoryBreakdownCalculator', () => {
  describe('empty transactions', () => {
    it('returns empty object for empty array', () => {
      const result = compute({ mKey: '2024-01', transactions: [], type: 'expense' });
      assert.deepStrictEqual(result, {});
    });
  });

  describe('income type', () => {
    it('aggregates income transactions by category', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'income', date: '2024-01-15', category: 'salary', amount: 100 },
          { type: 'income', date: '2024-01-20', category: 'bonus', amount: 50 },
        ],
        type: 'income',
      });
      assert.strictEqual(result.salary, 100);
      assert.strictEqual(result.bonus, 50);
    });
  });

  describe('expense type', () => {
    it('aggregates expense transactions by category', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 30 },
          { type: 'expense', date: '2024-01-20', category: 'transport', amount: 20 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 30);
      assert.strictEqual(result.transport, 20);
    });
  });

  describe('multiple categories', () => {
    it('sums multiple categories correctly', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-05', category: 'food', amount: 30 },
          { type: 'expense', date: '2024-01-10', category: 'food', amount: 20 },
          { type: 'expense', date: '2024-01-15', category: 'transport', amount: 15 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 50);
      assert.strictEqual(result.transport, 15);
    });
  });

  describe('same category summed', () => {
    it('sums all transactions in the same category', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-05', category: 'food', amount: 10 },
          { type: 'expense', date: '2024-01-10', category: 'food', amount: 20 },
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 60);
    });
  });

  describe('different months', () => {
    it('excludes transactions from different months', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-02-05', category: 'food', amount: 100 },
          { type: 'expense', date: '2024-01-20', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 30);
    });
  });

  describe('startsWith matching', () => {
    it('includes transactions whose date starts with mKey', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-05', category: 'food', amount: 10 },
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 20 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 30);
    });
  });

  describe('missing date', () => {
    it('throws TypeError for transaction with undefined date', () => {
      assert.throws(() => {
        compute({
          mKey: '2024-01',
          transactions: [
            { type: 'expense', category: 'food', amount: 100 },
          ],
          type: 'expense',
        });
      }, /Cannot read properties of undefined/);
    });
  });

  describe('empty date string', () => {
    it('excludes transactions with empty date string', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '', category: 'food', amount: 100 },
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 30);
    });
  });

  describe('malformed date starting with mKey', () => {
    it('includes transaction if date starts with mKey even if malformed', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-not-a-date', category: 'food', amount: 100 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 100);
    });
  });

  describe('_excluded transactions', () => {
    it('excludes transactions with _excluded flag', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 100, _excluded: true },
          { type: 'expense', date: '2024-01-20', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 30);
    });
  });

  describe('unknown transaction types', () => {
    it('ignores unknown transaction types', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'unknown', date: '2024-01-15', category: 'food', amount: 100 },
          { type: 'expense', date: '2024-01-20', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 30);
    });
  });

  describe('_transfer flag', () => {
    it('includes _transfer expenses (not excluded)', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 50, _transfer: true },
          { type: 'expense', date: '2024-01-20', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 80);
    });
  });

  describe('_autoSave flag', () => {
    it('includes _autoSave expenses (not excluded)', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 50, _autoSave: true },
          { type: 'expense', date: '2024-01-20', category: 'food', amount: 30 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 80);
    });
  });

  describe('missing category', () => {
    it('uses undefined as category key when category is missing', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', amount: 100 },
        ],
        type: 'expense',
      });
      assert.ok('undefined' in result);
      assert.strictEqual(result['undefined'], 100);
    });
  });

  describe('missing amount', () => {
    it('propagates NaN from missing amount', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: undefined },
        ],
        type: 'expense',
      });
      assert.ok(Number.isNaN(result.food));
    });
  });

  describe('zero amounts', () => {
    it('handles zero amounts', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 0 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 0);
    });
  });

  describe('negative amounts', () => {
    it('handles negative amounts', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: -50 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, -50);
    });
  });

  describe('fractional amounts', () => {
    it('handles fractional amounts', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 49.99 },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 49.99);
    });
  });

  describe('NaN amount', () => {
    it('propagates NaN from NaN amount', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: NaN },
        ],
        type: 'expense',
      });
      assert.ok(Number.isNaN(result.food));
    });
  });

  describe('Infinity amount', () => {
    it('preserves Infinity amount', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: Infinity },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, Infinity);
    });
  });

  describe('undefined/null transactions', () => {
    it('throws when transactions is undefined', () => {
      assert.throws(() => {
        compute({ mKey: '2024-01', transactions: undefined, type: 'expense' });
      }, /Cannot read properties of undefined/);
    });

    it('throws when transactions is null', () => {
      assert.throws(() => {
        compute({ mKey: '2024-01', transactions: null, type: 'expense' });
      }, /Cannot read properties of null/);
    });
  });

  describe('input immutability', () => {
    it('does not mutate transactions array', () => {
      const transactions = [
        { type: 'expense', date: '2024-01-15', category: 'food', amount: 100 },
      ];
      const original = JSON.stringify(transactions);
      compute({ mKey: '2024-01', transactions, type: 'expense' });
      assert.strictEqual(JSON.stringify(transactions), original);
    });

    it('does not mutate transaction objects', () => {
      const tx = { type: 'expense', date: '2024-01-15', category: 'food', amount: 100 };
      const original = JSON.stringify(tx);
      compute({ mKey: '2024-01', transactions: [tx], type: 'expense' });
      assert.strictEqual(JSON.stringify(tx), original);
    });
  });

  describe('output shape', () => {
    it('returns a plain object with category keys', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 100 },
        ],
        type: 'expense',
      });
      assert.strictEqual(typeof result, 'object');
      assert.ok(!Array.isArray(result));
      assert.ok('food' in result);
    });
  });

  describe('combined flags', () => {
    it('only _excluded is excluded; _transfer and _autoSave are included', () => {
      const result = compute({
        mKey: '2024-01',
        transactions: [
          { type: 'expense', date: '2024-01-15', category: 'food', amount: 100, _excluded: true },
          { type: 'expense', date: '2024-01-16', category: 'food', amount: 50, _excluded: true },
          { type: 'expense', date: '2024-01-17', category: 'food', amount: 200 },
          { type: 'expense', date: '2024-01-18', category: 'food', amount: 80, _transfer: true },
          { type: 'expense', date: '2024-01-19', category: 'food', amount: 60, _autoSave: true },
        ],
        type: 'expense',
      });
      assert.strictEqual(result.food, 340);
    });
  });
});
