/**
 * Stage 1.5W — Recurring To Monthly Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the recurring to
 * monthly calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/recurring/recurring-to-monthly-calculator.js');

describe('RecurringToMonthlyCalculator', () => {
  describe('weekly frequency', () => {
    it('multiplies weekly amount by 4.33', () => {
      assert.strictEqual(compute({ rule: { freq: 'weekly', amount: 100 } }), 433);
    });

    it('handles fractional weekly amount', () => {
      assert.strictEqual(compute({ rule: { freq: 'weekly', amount: 50.5 } }), 218.665);
    });

    it('handles zero weekly amount', () => {
      assert.strictEqual(compute({ rule: { freq: 'weekly', amount: 0 } }), 0);
    });

    it('handles negative weekly amount', () => {
      assert.strictEqual(compute({ rule: { freq: 'weekly', amount: -100 } }), -433);
    });
  });

  describe('yearly frequency', () => {
    it('divides yearly amount by 12', () => {
      assert.strictEqual(compute({ rule: { freq: 'yearly', amount: 1200 } }), 100);
    });

    it('handles fractional yearly amount', () => {
      assert.strictEqual(compute({ rule: { freq: 'yearly', amount: 99.99 } }), 8.3325);
    });

    it('handles zero yearly amount', () => {
      assert.strictEqual(compute({ rule: { freq: 'yearly', amount: 0 } }), 0);
    });

    it('handles negative yearly amount', () => {
      assert.strictEqual(compute({ rule: { freq: 'yearly', amount: -1200 } }), -100);
    });
  });

  describe('monthly and other frequencies', () => {
    it('returns amount unchanged for monthly', () => {
      assert.strictEqual(compute({ rule: { freq: 'monthly', amount: 100 } }), 100);
    });

    it('returns amount unchanged for unknown frequency', () => {
      assert.strictEqual(compute({ rule: { freq: 'daily', amount: 100 } }), 100);
    });

    it('returns amount unchanged for missing frequency', () => {
      assert.strictEqual(compute({ rule: { amount: 100 } }), 100);
    });

    it('returns amount unchanged for null frequency', () => {
      assert.strictEqual(compute({ rule: { freq: null, amount: 100 } }), 100);
    });

    it('returns amount unchanged for empty string frequency', () => {
      assert.strictEqual(compute({ rule: { freq: '', amount: 100 } }), 100);
    });
  });

  describe('amount edge cases', () => {
    it('handles NaN amount', () => {
      assert.ok(Number.isNaN(compute({ rule: { freq: 'weekly', amount: NaN } })));
    });

    it('handles Infinity amount with weekly', () => {
      assert.strictEqual(compute({ rule: { freq: 'weekly', amount: Infinity } }), Infinity);
    });

    it('handles -Infinity amount with yearly', () => {
      assert.strictEqual(compute({ rule: { freq: 'yearly', amount: -Infinity } }), -Infinity);
    });

    it('handles missing amount', () => {
      assert.ok(Number.isNaN(compute({ rule: { freq: 'weekly' } })));
    });

    it('handles very large finite amount', () => {
      const result = compute({ rule: { freq: 'weekly', amount: 1e15 } });
      assert.strictEqual(result, 4.33e15);
    });
  });

  describe('purity and immutability', () => {
    it('does not mutate rule object', () => {
      const rule = { freq: 'weekly', amount: 100 };
      const original = JSON.stringify(rule);
      compute({ rule });
      assert.strictEqual(JSON.stringify(rule), original);
    });

    it('does not mutate rule properties', () => {
      const rule = { freq: 'weekly', amount: 100 };
      const originalFreq = rule.freq;
      const originalAmount = rule.amount;
      compute({ rule });
      assert.strictEqual(rule.freq, originalFreq);
      assert.strictEqual(rule.amount, originalAmount);
    });

    it('returns a number for valid input', () => {
      const result = compute({ rule: { freq: 'weekly', amount: 100 } });
      assert.strictEqual(typeof result, 'number');
    });
  });
});
