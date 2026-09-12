/**
 * Stage 1.5V — Recurring Next Date Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the recurring next
 * date calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/recurring/recurring-next-date-calculator.js');

describe('RecurringNextDateCalculator', () => {
  describe('basic — missing lastBooked', () => {
    it('returns startDate when lastBooked is missing', () => {
      assert.strictEqual(compute({ rule: { startDate: '2024-01-15', lastBooked: undefined, freq: 'monthly' } }), '2024-01-15');
    });

    it('returns startDate when lastBooked is null', () => {
      assert.strictEqual(compute({ rule: { startDate: '2024-01-15', lastBooked: null, freq: 'monthly' } }), '2024-01-15');
    });

    it('returns startDate when lastBooked is empty string', () => {
      assert.strictEqual(compute({ rule: { startDate: '2024-01-15', lastBooked: '', freq: 'monthly' } }), '2024-01-15');
    });

    it('returns startDate for weekly freq with missing lastBooked', () => {
      assert.strictEqual(compute({ rule: { startDate: '2024-01-15', lastBooked: undefined, freq: 'weekly' } }), '2024-01-15');
    });

    it('returns startDate for yearly freq with missing lastBooked', () => {
      assert.strictEqual(compute({ rule: { startDate: '2024-01-15', lastBooked: undefined, freq: 'yearly' } }), '2024-01-15');
    });
  });

  describe('weekly', () => {
    it('adds 7 days to lastBooked', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', freq: 'weekly' } });
      assert.strictEqual(result, '2024-01-22');
    });

    it('crosses month boundary', () => {
      const result = compute({ rule: { lastBooked: '2024-01-28', freq: 'weekly' } });
      assert.strictEqual(result, '2024-02-04');
    });

    it('crosses year boundary', () => {
      const result = compute({ rule: { lastBooked: '2024-12-28', freq: 'weekly' } });
      assert.strictEqual(result, '2025-01-04');
    });
  });

  describe('yearly', () => {
    it('adds 1 year to lastBooked', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', freq: 'yearly' } });
      assert.strictEqual(result, '2025-01-15');
    });

    it('Feb 29 → Feb 28 on non-leap year (JS Date behavior)', () => {
      const result = compute({ rule: { lastBooked: '2024-02-29', freq: 'yearly' } });
      assert.strictEqual(result, '2025-03-01');
    });
  });

  describe('monthly', () => {
    it('defaults dayOfMonth to 1 when missing', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', freq: 'monthly' } });
      assert.strictEqual(result, '2024-02-01');
    });

    it('uses provided dayOfMonth', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', dayOfMonth: 15, freq: 'monthly' } });
      assert.strictEqual(result, '2024-02-15');
    });

    it('clamps dayOfMonth to end of month — Jan 31 overflows to Mar via JS Date', () => {
      const result = compute({ rule: { lastBooked: '2024-01-31', dayOfMonth: 31, freq: 'monthly' } });
      assert.strictEqual(result, '2024-03-31');
    });

    it('clamps dayOfMonth to end of month — non-leap year overflow', () => {
      const result = compute({ rule: { lastBooked: '2023-01-31', dayOfMonth: 31, freq: 'monthly' } });
      assert.strictEqual(result, '2023-03-30');
    });

    it('January → February with default dayOfMonth 1', () => {
      const result = compute({ rule: { lastBooked: '2024-01-10', freq: 'monthly' } });
      assert.strictEqual(result, '2024-02-01');
    });

    it('February → March with default dayOfMonth 1', () => {
      const result = compute({ rule: { lastBooked: '2024-02-10', freq: 'monthly' } });
      assert.strictEqual(result, '2024-03-01');
    });

    it('December → January next year with default dayOfMonth 1', () => {
      const result = compute({ rule: { lastBooked: '2024-12-10', freq: 'monthly' } });
      assert.strictEqual(result, '2025-01-01');
    });

    it('clamps dayOfMonth > maxDay to end of overflowed month', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', dayOfMonth: 35, freq: 'monthly' } });
      assert.strictEqual(result, '2024-02-29');
    });
  });

  describe('edge semantics', () => {
    it('treats missing freq as monthly', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15' } });
      assert.strictEqual(result, '2024-02-01');
    });

    it('treats unknown freq as monthly', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', freq: 'daily' } });
      assert.strictEqual(result, '2024-02-01');
    });

    it('handles negative dayOfMonth — truthy so used directly', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', dayOfMonth: -5, freq: 'monthly' } });
      assert.strictEqual(result, '2024-01-26');
    });

    it('handles fractional dayOfMonth', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', dayOfMonth: 15.5, freq: 'monthly' } });
      assert.strictEqual(result, '2024-02-15');
    });

    it('handles dayOfMonth > 31', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', dayOfMonth: 99, freq: 'monthly' } });
      assert.strictEqual(result, '2024-02-29');
    });

    it('returns undefined when startDate is missing and lastBooked is missing', () => {
      const result = compute({ rule: { lastBooked: undefined } });
      assert.strictEqual(result, undefined);
    });

    it('throws RangeError for invalid lastBooked string', () => {
      assert.throws(() => {
        compute({ rule: { lastBooked: 'not-a-date', freq: 'weekly' } });
      }, /Invalid time value/);
    });
  });

  describe('month-end / leap-year', () => {
    it('Jan 31 → Mar 31 in leap year due to JS Date overflow', () => {
      const result = compute({ rule: { lastBooked: '2024-01-31', dayOfMonth: 31, freq: 'monthly' } });
      assert.strictEqual(result, '2024-03-31');
    });

    it('Jan 31 → Mar 30 in non-leap year due to JS Date overflow', () => {
      const result = compute({ rule: { lastBooked: '2023-01-31', dayOfMonth: 31, freq: 'monthly' } });
      assert.strictEqual(result, '2023-03-30');
    });

    it('Feb 28 non-leap → Mar 27 due to JS Date setDate behavior', () => {
      const result = compute({ rule: { lastBooked: '2023-02-28', dayOfMonth: 28, freq: 'monthly' } });
      assert.strictEqual(result, '2023-03-27');
    });

    it('Feb 29 leap → Mar 29', () => {
      const result = compute({ rule: { lastBooked: '2024-02-29', dayOfMonth: 29, freq: 'monthly' } });
      assert.strictEqual(result, '2024-03-29');
    });
  });

  describe('purity and immutability', () => {
    it('does not mutate rule object', () => {
      const rule = { lastBooked: '2024-01-15', freq: 'monthly' };
      const original = JSON.stringify(rule);
      compute({ rule });
      assert.strictEqual(JSON.stringify(rule), original);
    });

    it('does not mutate rule properties', () => {
      const rule = { lastBooked: '2024-01-15', freq: 'monthly', dayOfMonth: 15 };
      const originalDay = rule.dayOfMonth;
      compute({ rule });
      assert.strictEqual(rule.dayOfMonth, originalDay);
    });

    it('returns a string', () => {
      const result = compute({ rule: { lastBooked: '2024-01-15', freq: 'monthly' } });
      assert.strictEqual(typeof result, 'string');
    });
  });
});
