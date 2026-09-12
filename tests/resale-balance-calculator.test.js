/**
 * Stage 1.5C — Resale Balance Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/resale/resale-balance-calculator.js');

describe('ResaleBalanceCalculator', () => {
  describe('compute()', () => {
    it('returns 0 for empty transactions', () => {
      const result = compute({ sourceId: 's1', transactions: [] });
      assert.strictEqual(result, 0);
    });

    it('returns 0 when no transactions match sourceId', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's2', _resaleBalance: true, type: 'income', amount: 100 },
        ],
      });
      assert.strictEqual(result, 0);
    });

    it('returns held amount for single income with _resaleBalance', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
        ],
      });
      assert.strictEqual(result, 100);
    });

    it('returns 0 when held equals spent', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 100 },
        ],
      });
      assert.strictEqual(result, 0);
    });

    it('returns 0 when spent exceeds held', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 150 },
        ],
      });
      assert.strictEqual(result, 0);
    });

    it('returns remaining balance when held exceeds spent', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 500 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 200 },
        ],
      });
      assert.strictEqual(result, 300);
    });

    it('sums multiple held transactions', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 200 },
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 50 },
        ],
      });
      assert.strictEqual(result, 350);
    });

    it('sums multiple spent transactions', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 500 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 100 },
          { _sourceId: 's1', _resalePaidFromBalance: true, type: 'expense', amount: 150 },
        ],
      });
      assert.strictEqual(result, 250);
    });

    it('ignores transactions for other sources', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's2', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 200 },
        ],
      });
      assert.strictEqual(result, 200);
    });

    it('ignores income without _resaleBalance flag', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 50 },
        ],
      });
      assert.strictEqual(result, 50);
    });

    it('ignores expense without _resaleWithdraw or _resalePaidFromBalance flag', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', type: 'expense', amount: 30 },
        ],
      });
      assert.strictEqual(result, 100);
    });

    it('treats _resaleWithdraw as spent', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 30 },
        ],
      });
      assert.strictEqual(result, 70);
    });

    it('treats _resalePaidFromBalance as spent', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resalePaidFromBalance: true, type: 'expense', amount: 30 },
        ],
      });
      assert.strictEqual(result, 70);
    });

    it('handles zero amounts', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 0 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 0 },
        ],
      });
      assert.strictEqual(result, 0);
    });

    it('handles negative amounts in held', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: -50 },
        ],
      });
      assert.strictEqual(result, 0);
    });

    it('handles negative amounts in spent', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: -30 },
        ],
      });
      assert.strictEqual(result, 130);
    });

    it('handles fractional amounts', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100.50 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 49.99 },
        ],
      });
      assert.strictEqual(result, 50.51);
    });

    it('handles large values', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 1000000 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 250000 },
        ],
      });
      assert.strictEqual(result, 750000);
    });

    it('does not mutate input transactions', () => {
      const transactions = [
        { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
      ];
      const original = JSON.stringify(transactions);
      compute({ sourceId: 's1', transactions: transactions });
      assert.strictEqual(JSON.stringify(transactions), original);
    });

    it('produces same output for same inputs', () => {
      const inputs = {
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
          { _sourceId: 's1', _resaleWithdraw: true, type: 'expense', amount: 30 },
        ],
      };
      const r1 = compute(inputs);
      const r2 = compute(inputs);
      assert.strictEqual(r1, r2);
    });

    it('returns exact object shape (number)', () => {
      const result = compute({
        sourceId: 's1',
        transactions: [
          { _sourceId: 's1', _resaleBalance: true, type: 'income', amount: 100 },
        ],
      });
      assert.strictEqual(typeof result, 'number');
      assert.ok(result >= 0);
    });
  });
});
