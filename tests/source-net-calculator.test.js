/**
 * Stage 1.5G — Source Net Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/income/source-net-calculator.js');

function createMockCalculator() {
  return {
    compute(inputs) {
      const inc = (inputs.transactions || [])
        .filter(t => t.type === 'income' && t._sourceId === inputs.source.id && t.date && t.date.startsWith(inputs.mKey))
        .reduce((s, t) => s + t.amount, 0);
      const exp = (inputs.transactions || [])
        .filter(t => t.type === 'expense' && t._sourceId === inputs.source.id && !t._transfer && !t._autoSave && t.date && t.date.startsWith(inputs.mKey))
        .reduce((s, t) => s + t.amount, 0);
      if (inputs.source._profileType === 'gielda') {
        const ops = (inputs.gieldaOps || []).filter(o => o.date && o.date.startsWith(inputs.mKey));
        const earn = ops.filter(o => o.type === 'zarobek').reduce((s, o) => s + o.amount, 0);
        const loss = ops.filter(o => o.type === 'strata').reduce((s, o) => s + o.amount, 0);
        return { income: earn, expense: loss, net: earn - loss };
      }
      return { income: inc, expense: exp, net: inc - exp };
    }
  };
}

describe('SourceNetCalculator', () => {
  describe('compute()', () => {
    const regularSource = { id: 's1', _profileType: 'regular' };
    const gieldaSource = { id: 'g1', _profileType: 'gielda' };
    const mKey = '2026-03';
    const calculator = createMockCalculator();

    describe('regular sources', () => {
      it('returns 0 for empty transactions', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 0);
      });

      it('returns positive net for income only', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 100);
      });

      it('returns negative net for expense only', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 50, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, -50);
      });

      it('computes net for income + expense', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
            { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 70);
      });

      it('ignores transactions for other sources', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's2', date: '2026-03-01', amount: 100 },
            { type: 'income', _sourceId: 's1', date: '2026-03-02', amount: 50 },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 50);
      });

      it('ignores transactions for unrelated month', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-02-01', amount: 100 },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 0);
      });

      it('ignores transactions with missing date', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', amount: 100 },
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 50 },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 50);
      });

      it('excludes _transfer expenses', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 30, _transfer: true, _autoSave: false },
            { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 20, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, -20);
      });

      it('excludes _autoSave expenses', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'expense', _sourceId: 's1', date: '2026-03-01', amount: 30, _transfer: false, _autoSave: true },
            { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 20, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, -20);
      });

      it('handles zero amounts', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 0 },
            { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 0, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 0);
      });

      it('handles negative amounts', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: -50 },
            { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 30, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, -80);
      });

      it('handles fractional amounts', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100.5 },
            { type: 'expense', _sourceId: 's1', date: '2026-03-02', amount: 49.99, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 50.51);
      });

      it('sums multiple matching transactions', () => {
        const result = compute({
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
            { type: 'income', _sourceId: 's1', date: '2026-03-02', amount: 200 },
            { type: 'expense', _sourceId: 's1', date: '2026-03-03', amount: 50, _transfer: false, _autoSave: false },
          ],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 250);
      });
    });

    describe('gielda sources', () => {
      it('returns 0 for empty gieldaOps', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(result, 0);
      });

      it('returns positive for zarobek only', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [
            { type: 'zarobek', date: '2026-03-01', amount: 100 },
          ],
          calculator,
        });
        assert.strictEqual(result, 100);
      });

      it('returns negative for strata only', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [
            { type: 'strata', date: '2026-03-01', amount: 50 },
          ],
          calculator,
        });
        assert.strictEqual(result, -50);
      });

      it('computes net for zarobek + strata', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [
            { type: 'zarobek', date: '2026-03-01', amount: 100 },
            { type: 'strata', date: '2026-03-02', amount: 30 },
          ],
          calculator,
        });
        assert.strictEqual(result, 70);
      });

      it('ignores operations for unrelated month', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [
            { type: 'zarobek', date: '2026-02-01', amount: 100 },
          ],
          calculator,
        });
        assert.strictEqual(result, 0);
      });

      it('ignores operations with missing date', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [
            { type: 'zarobek', amount: 100 },
            { type: 'zarobek', date: '2026-03-01', amount: 50 },
          ],
          calculator,
        });
        assert.strictEqual(result, 50);
      });

      it('ignores unrelated operation types', () => {
        const result = compute({
          source: gieldaSource,
          mKey: mKey,
          transactions: [],
          gieldaOps: [
            { type: 'inny', date: '2026-03-01', amount: 100 },
            { type: 'zarobek', date: '2026-03-02', amount: 50 },
          ],
          calculator,
        });
        assert.strictEqual(result, 50);
      });
    });

    describe('purity', () => {
      it('produces same output for same inputs', () => {
        const inputs = {
          source: regularSource,
          mKey: mKey,
          transactions: [
            { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
          ],
          gieldaOps: [],
          calculator,
        };
        const r1 = compute(inputs);
        const r2 = compute(inputs);
        assert.strictEqual(r1, r2);
      });

      it('does not mutate input transactions', () => {
        const transactions = [
          { type: 'income', _sourceId: 's1', date: '2026-03-01', amount: 100 },
        ];
        const original = JSON.stringify(transactions);
        compute({
          source: regularSource,
          mKey: mKey,
          transactions: transactions,
          gieldaOps: [],
          calculator,
        });
        assert.strictEqual(JSON.stringify(transactions), original);
      });

      it('does not mutate input gieldaOps', () => {
        const gieldaOps = [
          { type: 'zarobek', date: '2026-03-01', amount: 100 },
        ];
        const original = JSON.stringify(gieldaOps);
        compute({
          source: gieldaSource,
          mKey: mKey,
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
            source: regularSource,
            mKey: mKey,
            transactions: [],
            gieldaOps: [],
          });
        }, /SourceMonthlyEarningsCalculator not available|window is not defined/);
      });
    });
  });
});
