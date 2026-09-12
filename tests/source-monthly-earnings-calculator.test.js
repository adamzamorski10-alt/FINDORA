/**
 * Stage 1.5J — Source Monthly Earnings Domain Calculator Tests
 *
 * Pure unit tests for the shared domain primitive.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/income/source-monthly-earnings-calculator.js');

describe('SourceMonthlyEarningsCalculator', () => {
  describe('regular source', () => {
    it('returns 0 for empty transactions', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('returns income for single income transaction', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [{ type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 }],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 100, expense: 0, net: 100 });
    });

    it('returns expense for single expense transaction', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [{ type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 50 }],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 50, net: -50 });
    });

    it('computes mixed income and expense', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 200 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-20', amount: 80 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 200, expense: 80, net: 120 });
    });

    it('excludes transfer expense', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 50, _transfer: true },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: 30 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 30, net: -30 });
    });

    it('excludes autosave expense', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 50, _autoSave: true },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: 30 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 30, net: -30 });
    });

    it('includes _excluded transactions', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100, _excluded: true },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 100, expense: 0, net: 100 });
    });

    it('ignores transactions for other sources', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's2', date: '2024-01-15', amount: 100 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('ignores unknown transaction types', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'unknown', _sourceId: 's1', date: '2024-01-15', amount: 100 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('excludes transactions with missing date', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', amount: 100 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('excludes transactions with malformed date', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: 'not-a-date', amount: 100 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('isolates by month', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'income', _sourceId: 's1', date: '2024-02-15', amount: 200 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 100, expense: 0, net: 100 });
    });
  });

  describe('gielda source', () => {
    it('returns zarobek as income', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [{ type: 'zarobek', date: '2024-01-15', amount: 100 }],
      });
      assert.deepStrictEqual(result, { income: 100, expense: 0, net: 100 });
    });

    it('returns strata as expense', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [{ type: 'strata', date: '2024-01-15', amount: 50 }],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 50, net: -50 });
    });

    it('ignores wplata', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [{ type: 'wplata', date: '2024-01-15', amount: 1000 }],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('ignores wyplata', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [{ type: 'wyplata', date: '2024-01-15', amount: 500 }],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('computes mixed zarobek and strata', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [
          { type: 'zarobek', date: '2024-01-15', amount: 200 },
          { type: 'strata', date: '2024-01-20', amount: 50 },
        ],
      });
      assert.deepStrictEqual(result, { income: 200, expense: 50, net: 150 });
    });

    it('ignores gielda ops with missing date', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [{ type: 'zarobek', amount: 100 }],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('ignores gielda ops outside month', () => {
      const result = compute({
        source: { id: 'g1', _profileType: 'gielda' },
        mKey: '2024-01',
        transactions: [],
        gieldaOps: [{ type: 'zarobek', date: '2024-02-15', amount: 100 }],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });
  });

  describe('edge cases', () => {
    it('handles zero amounts', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 0 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 0 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0 });
    });

    it('handles negative amounts', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: -100 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: -50 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: -100, expense: -50, net: -50 });
    });

    it('handles fractional amounts', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100.50 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 49.99 },
        ],
        gieldaOps: [],
      });
      assert.deepStrictEqual(result, { income: 100.50, expense: 49.99, net: 50.51 });
    });

    it('propagates NaN from missing amount', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: undefined },
        ],
        gieldaOps: [],
      });
      assert.ok(Number.isNaN(result.income));
      assert.ok(Number.isNaN(result.net));
    });

    it('propagates Infinity', () => {
      const result = compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: Infinity },
        ],
        gieldaOps: [],
      });
      assert.strictEqual(result.income, Infinity);
      assert.strictEqual(result.net, Infinity);
    });

    it('does not mutate inputs', () => {
      const transactions = [
        { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
      ];
      const gieldaOps = [
        { type: 'zarobek', date: '2024-01-15', amount: 50 },
      ];
      const originalTx = JSON.stringify(transactions);
      const originalGielda = JSON.stringify(gieldaOps);
      compute({
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: transactions,
        gieldaOps: gieldaOps,
      });
      assert.strictEqual(JSON.stringify(transactions), originalTx);
      assert.strictEqual(JSON.stringify(gieldaOps), originalGielda);
    });

    it('produces same output for same inputs', () => {
      const inputs = {
        source: { id: 's1', _profileType: 'regular' },
        mKey: '2024-01',
        transactions: [{ type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 }],
        gieldaOps: [],
      };
      assert.deepStrictEqual(compute(inputs), compute(inputs));
    });
  });
});
