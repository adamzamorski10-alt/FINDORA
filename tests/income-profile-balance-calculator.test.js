/**
 * Stage 1.5K — Income Profile Balance Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/income/income-profile-balance-calculator.js');

describe('IncomeProfileBalanceCalculator', () => {
  describe('falsy profile', () => {
    it('returns 0 for null profile', () => {
      assert.strictEqual(compute({ profile: null, transactions: [] }), 0);
    });

    it('returns 0 for undefined profile', () => {
      assert.strictEqual(compute({ profile: undefined, transactions: [] }), 0);
    });
  });

  describe('gielda profile', () => {
    it('returns explicit gieldaBalance', () => {
      assert.strictEqual(
        compute({ profile: { id: 'gielda' }, transactions: [], gieldaBalance: 150 }),
        150
      );
    });

    it('returns undefined when gieldaBalance is undefined', () => {
      assert.strictEqual(
        compute({ profile: { id: 'gielda' }, transactions: [] }),
        undefined
      );
    });

    it('returns null when gieldaBalance is null', () => {
      assert.strictEqual(
        compute({ profile: { id: 'gielda' }, transactions: [], gieldaBalance: null }),
        null
      );
    });

    it('returns NaN when gieldaBalance is NaN', () => {
      assert.ok(Number.isNaN(
        compute({ profile: { id: 'gielda' }, transactions: [], gieldaBalance: NaN })
      ));
    });

    it('returns Infinity when gieldaBalance is Infinity', () => {
      assert.strictEqual(
        compute({ profile: { id: 'gielda' }, transactions: [], gieldaBalance: Infinity }),
        Infinity
      );
    });

    it('returns negative Infinity when gieldaBalance is -Infinity', () => {
      assert.strictEqual(
        compute({ profile: { id: 'gielda' }, transactions: [], gieldaBalance: -Infinity }),
        -Infinity
      );
    });
  });

  describe('regular profile', () => {
    it('returns Number(profile.balance) || 0 when no transactions', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: 100 }, transactions: [] }), 100);
    });

    it('returns 0 when profile.balance is missing', () => {
      assert.strictEqual(compute({ profile: { id: 's1' }, transactions: [] }), 0);
    });

    it('returns 0 when profile.balance is null', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: null }, transactions: [] }), 0);
    });

    it('returns 0 when profile.balance is undefined', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: undefined }, transactions: [] }), 0);
    });

    it('returns 0 when profile.balance is empty string', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: '' }, transactions: [] }), 0);
    });

    it('returns 0 when profile.balance is NaN', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: NaN }, transactions: [] }), 0);
    });

    it('returns 0 when profile.balance is 0', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: 0 }, transactions: [] }), 0);
    });

    it('returns negative when profile.balance is negative', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: -50 }, transactions: [] }), -50);
    });

    it('returns fractional when profile.balance is fractional', () => {
      assert.strictEqual(compute({ profile: { id: 's1', balance: 99.99 }, transactions: [] }), 99.99);
    });
  });

  describe('transaction filtering', () => {
    const profile = { id: 's1', balance: 0 };

    it('adds income transaction amount', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [{ type: 'income', _sourceId: 's1', amount: 100 }],
        }),
        100
      );
    });

    it('subtracts expense transaction amount', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [{ type: 'expense', _sourceId: 's1', amount: 50 }],
        }),
        -50
      );
    });

    it('computes mixed income and expense', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [
            { type: 'income', _sourceId: 's1', amount: 100 },
            { type: 'expense', _sourceId: 's1', amount: 30 },
          ],
        }),
        70
      );
    });

    it('excludes transfer expense', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [
            { type: 'expense', _sourceId: 's1', amount: 50, _transfer: true },
            { type: 'expense', _sourceId: 's1', amount: 30 },
          ],
        }),
        -30
      );
    });

    it('includes _autoSave expense', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [
            { type: 'expense', _sourceId: 's1', amount: 50, _autoSave: true },
            { type: 'expense', _sourceId: 's1', amount: 30 },
          ],
        }),
        -80
      );
    });

    it('includes _excluded transaction', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [
            { type: 'income', _sourceId: 's1', amount: 100, _excluded: true },
          ],
        }),
        100
      );
    });

    it('ignores transactions for other sources', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [
            { type: 'income', _sourceId: 's2', amount: 100 },
          ],
        }),
        0
      );
    });

    it('treats unknown type as expense (subtracts)', () => {
      assert.strictEqual(
        compute({
          profile,
          transactions: [
            { type: 'unknown', _sourceId: 's1', amount: 100 },
          ],
        }),
        -100
      );
    });

    it('handles empty transactions', () => {
      assert.strictEqual(compute({ profile, transactions: [] }), 0);
    });

    it('handles undefined transactions', () => {
      assert.strictEqual(compute({ profile, transactions: undefined }), 0);
    });
  });

  describe('edge cases', () => {
    it('handles zero amount', () => {
      assert.strictEqual(
        compute({
          profile: { id: 's1', balance: 0 },
          transactions: [{ type: 'income', _sourceId: 's1', amount: 0 }],
        }),
        0
      );
    });

    it('handles negative amount in income transaction', () => {
      assert.strictEqual(
        compute({
          profile: { id: 's1', balance: 0 },
          transactions: [{ type: 'income', _sourceId: 's1', amount: -100 }],
        }),
        -100
      );
    });

    it('handles negative amount in expense transaction', () => {
      assert.strictEqual(
        compute({
          profile: { id: 's1', balance: 0 },
          transactions: [{ type: 'expense', _sourceId: 's1', amount: -50 }],
        }),
        50
      );
    });

    it('handles fractional amounts', () => {
      assert.strictEqual(
        compute({
          profile: { id: 's1', balance: 0 },
          transactions: [
            { type: 'income', _sourceId: 's1', amount: 100.50 },
            { type: 'expense', _sourceId: 's1', amount: 49.99 },
          ],
        }),
        50.51
      );
    });

    it('propagates NaN from missing amount', () => {
      const result = compute({
        profile: { id: 's1', balance: 0 },
        transactions: [{ type: 'income', _sourceId: 's1', amount: undefined }],
      });
      assert.ok(Number.isNaN(result));
    });

    it('propagates Infinity', () => {
      assert.strictEqual(
        compute({
          profile: { id: 's1', balance: 0 },
          transactions: [{ type: 'income', _sourceId: 's1', amount: Infinity }],
        }),
        Infinity
      );
    });

    it('sums multiple matching transactions', () => {
      assert.strictEqual(
        compute({
          profile: { id: 's1', balance: 0 },
          transactions: [
            { type: 'income', _sourceId: 's1', amount: 100 },
            { type: 'income', _sourceId: 's1', amount: 200 },
            { type: 'expense', _sourceId: 's1', amount: 50 },
          ],
        }),
        250
      );
    });
  });

  describe('input immutability', () => {
    it('does not mutate profile', () => {
      const profile = { id: 's1', balance: 100 };
      const original = JSON.stringify(profile);
      compute({ profile, transactions: [] });
      assert.strictEqual(JSON.stringify(profile), original);
    });

    it('does not mutate transactions', () => {
      const transactions = [{ type: 'income', _sourceId: 's1', amount: 100 }];
      const original = JSON.stringify(transactions);
      compute({ profile: { id: 's1', balance: 0 }, transactions });
      assert.strictEqual(JSON.stringify(transactions), original);
    });
  });
});
