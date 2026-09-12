/**
 * Stage 1.5J — Month Earn Stats Domain Calculator Tests
 *
 * Pure unit tests for the month earn stats calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/income/month-earn-stats-calculator.js');

function createMockCalculator() {
  return {
    compute(inputs) {
      const source = inputs.source;
      const mKey = inputs.mKey;
      const transactions = inputs.transactions || [];
      const gieldaOps = inputs.gieldaOps || [];

      if (source._profileType === 'gielda') {
        const ops = gieldaOps.filter(o => o.date && o.date.startsWith(mKey));
        const income = ops.filter(o => o.type === 'zarobek').reduce((s, o) => s + o.amount, 0);
        const expense = ops.filter(o => o.type === 'strata').reduce((s, o) => s + o.amount, 0);
        return { income, expense, net: income - expense };
      }

      const inc = transactions
        .filter(t => t.type === 'income' && t._sourceId === source.id && t.date && t.date.startsWith(mKey))
        .reduce((s, t) => s + t.amount, 0);

      const exp = transactions
        .filter(t => t.type === 'expense' && t._sourceId === source.id && !t._transfer && !t._autoSave && t.date && t.date.startsWith(mKey))
        .reduce((s, t) => s + t.amount, 0);

      return { income: inc, expense: exp, net: inc - exp };
    }
  };
}

describe('MonthEarnStatsCalculator', () => {
  const calculator = createMockCalculator();

  describe('empty incomeSources', () => {
    it('returns zeroed totals and empty bySource', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [],
        transactions: [],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0, bySource: [] });
    });
  });

  describe('single regular source', () => {
    it('returns income and expense for one source', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-20', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.income, 100);
      assert.deepStrictEqual(result.expense, 30);
      assert.deepStrictEqual(result.net, 70);
      assert.strictEqual(result.bySource.length, 1);
      assert.strictEqual(result.bySource[0].source.id, 's1');
    });
  });

  describe('multiple regular sources', () => {
    it('accumulates totals across sources', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [
          { id: 's1', _profileType: 'regular', name: 'Job' },
          { id: 's2', _profileType: 'regular', name: 'Freelance' },
        ],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'income', _sourceId: 's2', date: '2024-01-16', amount: 200 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-20', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.income, 300);
      assert.deepStrictEqual(result.expense, 30);
      assert.deepStrictEqual(result.net, 270);
      assert.strictEqual(result.bySource.length, 2);
    });
  });

  describe('gielda source', () => {
    it('handles gielda source correctly', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 'g1', _profileType: 'gielda', name: 'Stocks' }],
        transactions: [],
        gieldaOps: [
          { type: 'zarobek', date: '2024-01-15', amount: 100 },
          { type: 'strata', date: '2024-01-20', amount: 20 },
        ],
        calculator,
      });
      assert.deepStrictEqual(result.income, 100);
      assert.deepStrictEqual(result.expense, 20);
      assert.deepStrictEqual(result.net, 80);
      assert.strictEqual(result.bySource[0].source.id, 'g1');
    });
  });

  describe('mixed regular + gielda sources', () => {
    it('accumulates totals across mixed source types', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [
          { id: 's1', _profileType: 'regular', name: 'Job' },
          { id: 'g1', _profileType: 'gielda', name: 'Stocks' },
        ],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
        ],
        gieldaOps: [
          { type: 'zarobek', date: '2024-01-16', amount: 50 },
        ],
        calculator,
      });
      assert.deepStrictEqual(result.income, 150);
      assert.deepStrictEqual(result.expense, 0);
      assert.deepStrictEqual(result.net, 150);
      assert.strictEqual(result.bySource.length, 2);
    });
  });

  describe('multiple months', () => {
    it('isolates by month', () => {
      const jan = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'income', _sourceId: 's1', date: '2024-02-15', amount: 200 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(jan.income, 100);
      assert.deepStrictEqual(jan.net, 100);
    });
  });

  describe('totals', () => {
    it('net equals income minus expense', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [
          { id: 's1', _profileType: 'regular', name: 'A' },
          { id: 's2', _profileType: 'regular', name: 'B' },
        ],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'income', _sourceId: 's2', date: '2024-01-16', amount: 200 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-20', amount: 50 },
          { type: 'expense', _sourceId: 's2', date: '2024-01-21', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.strictEqual(result.net, result.income - result.expense);
    });
  });

  describe('bySource order', () => {
    it('preserves incomeSources order', () => {
      const sources = [
        { id: 's1', _profileType: 'regular', name: 'A' },
        { id: 's2', _profileType: 'regular', name: 'B' },
        { id: 's3', _profileType: 'regular', name: 'C' },
      ];
      const result = compute({
        mKey: '2024-01',
        incomeSources: sources,
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 10 },
          { type: 'income', _sourceId: 's2', date: '2024-01-16', amount: 20 },
          { type: 'income', _sourceId: 's3', date: '2024-01-17', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.strictEqual(result.bySource[0].source.id, 's1');
      assert.strictEqual(result.bySource[1].source.id, 's2');
      assert.strictEqual(result.bySource[2].source.id, 's3');
    });
  });

  describe('bySource shape', () => {
    it('includes source, income, expense, and net', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-20', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      const entry = result.bySource[0];
      assert.ok('source' in entry);
      assert.ok('income' in entry);
      assert.ok('expense' in entry);
      assert.ok('net' in entry);
      assert.strictEqual(typeof entry.source, 'object');
      assert.strictEqual(entry.net, entry.income - entry.expense);
    });
  });

  describe('source object identity', () => {
    it('preserves source object references', () => {
      const source = { id: 's1', _profileType: 'regular', name: 'Job' };
      const result = compute({
        mKey: '2024-01',
        incomeSources: [source],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.strictEqual(result.bySource[0].source, source);
    });
  });

  describe('transfers', () => {
    it('excludes transfer expenses', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 50, _transfer: true },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.bySource[0], { source: result.bySource[0].source, income: 0, expense: 30, net: -30 });
      assert.deepStrictEqual(result.expense, 30);
    });
  });

  describe('autosave', () => {
    it('excludes autosave expenses', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'expense', _sourceId: 's1', date: '2024-01-15', amount: 50, _autoSave: true },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: 30 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.expense, 30);
    });
  });

  describe('_excluded behavior', () => {
    it('includes _excluded transactions', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100, _excluded: true },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.income, 100);
    });
  });

  describe('missing dates', () => {
    it('excludes transactions with missing date', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', amount: 100 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.bySource[0].income, 0);
    });
  });

  describe('malformed dates', () => {
    it('excludes transactions with malformed date', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: 'not-a-date', amount: 100 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.bySource[0].income, 0);
    });
  });

  describe('negative amounts', () => {
    it('handles negative amounts', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: -100 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: -50 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.income, -100);
      assert.deepStrictEqual(result.expense, -50);
      assert.deepStrictEqual(result.net, -50);
    });
  });

  describe('fractional amounts', () => {
    it('handles fractional amounts', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100.50 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: 49.99 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.income, 100.50);
      assert.deepStrictEqual(result.expense, 49.99);
      assert.deepStrictEqual(result.net, 50.51);
    });
  });

  describe('zero', () => {
    it('handles zero amounts', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 0 },
          { type: 'expense', _sourceId: 's1', date: '2024-01-16', amount: 0 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result, { income: 0, expense: 0, net: 0, bySource: [{ source: result.bySource[0].source, income: 0, expense: 0, net: 0 }] });
    });
  });

  describe('missing amount', () => {
    it('propagates NaN from missing amount', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: undefined },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.ok(Number.isNaN(result.income));
      assert.ok(Number.isNaN(result.net));
    });
  });

  describe('unknown types', () => {
    it('ignores unknown transaction types', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'unknown', _sourceId: 's1', date: '2024-01-15', amount: 100 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.bySource[0].income, 0);
    });
  });

  describe('duplicate records', () => {
    it('sums duplicate transactions', () => {
      const result = compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular', name: 'Job' }],
        transactions: [
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
          { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
        ],
        gieldaOps: [],
        calculator,
      });
      assert.deepStrictEqual(result.bySource[0].income, 200);
    });
  });

  describe('input immutability', () => {
    it('does not mutate incomeSources', () => {
      const incomeSources = [{ id: 's1', _profileType: 'regular', name: 'Job' }];
      const original = JSON.stringify(incomeSources);
      compute({
        mKey: '2024-01',
        incomeSources: incomeSources,
        transactions: [],
        gieldaOps: [],
        calculator,
      });
      assert.strictEqual(JSON.stringify(incomeSources), original);
    });

    it('does not mutate transactions', () => {
      const transactions = [
        { type: 'income', _sourceId: 's1', date: '2024-01-15', amount: 100 },
      ];
      const original = JSON.stringify(transactions);
      compute({
        mKey: '2024-01',
        incomeSources: [{ id: 's1', _profileType: 'regular' }],
        transactions: transactions,
        gieldaOps: [],
        calculator,
      });
      assert.strictEqual(JSON.stringify(transactions), original);
    });

    it('does not mutate gieldaOps', () => {
      const gieldaOps = [
        { type: 'zarobek', date: '2024-01-15', amount: 100 },
      ];
      const original = JSON.stringify(gieldaOps);
      compute({
        mKey: '2024-01',
        incomeSources: [{ id: 'g1', _profileType: 'gielda' }],
        transactions: [],
        gieldaOps: gieldaOps,
        calculator,
      });
      assert.strictEqual(JSON.stringify(gieldaOps), original);
    });
  });

  describe('error handling', () => {
    it('throws when calculator is not provided and window has no calculator', () => {
      assert.throws(() => {
        compute({
          mKey: '2024-01',
          incomeSources: [{ id: 's1', _profileType: 'regular' }],
          transactions: [],
          gieldaOps: [],
        });
      }, /SourceMonthlyEarningsCalculator not available|window is not defined/);
    });
  });
});
