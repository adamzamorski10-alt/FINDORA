/**
 * Stage 1.5P — Month End Date Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/dates/month-end-date-calculator.js');

describe('MonthEndDateCalculator', () => {
  describe('normal months', () => {
    it('2026-01 → 2026-01-31', () => {
      assert.strictEqual(compute('2026-01'), '2026-01-31');
    });

    it('2026-02 → 2026-02-28', () => {
      assert.strictEqual(compute('2026-02'), '2026-02-28');
    });

    it('2024-02 → 2024-02-29', () => {
      assert.strictEqual(compute('2024-02'), '2024-02-29');
    });

    it('2026-04 → 2026-04-30', () => {
      assert.strictEqual(compute('2026-04'), '2026-04-30');
    });

    it('2026-06 → 2026-06-30', () => {
      assert.strictEqual(compute('2026-06'), '2026-06-30');
    });

    it('2026-09 → 2026-09-30', () => {
      assert.strictEqual(compute('2026-09'), '2026-09-30');
    });

    it('2026-12 → 2026-12-31', () => {
      assert.strictEqual(compute('2026-12'), '2026-12-31');
    });
  });

  describe('JavaScript Date normalization', () => {
    it('2026-13 → 2027-01-31', () => {
      assert.strictEqual(compute('2026-13'), '2027-01-31');
    });

    it('2026-00 → 2025-12-31', () => {
      assert.strictEqual(compute('2026-00'), '2025-12-31');
    });

    it('2026-1 → 2026-01-31', () => {
      assert.strictEqual(compute('2026-1'), '2026-01-31');
    });
  });

  describe('unusual inputs', () => {
    it('empty string → NaN-NaN-NaN', () => {
      assert.strictEqual(compute(''), 'NaN-NaN-NaN');
    });

    it('null throws TypeError', () => {
      assert.throws(() => compute(null), TypeError);
    });

    it('undefined throws TypeError', () => {
      assert.throws(() => compute(undefined), TypeError);
    });

    it('"abc" → NaN-NaN-NaN', () => {
      assert.strictEqual(compute('abc'), 'NaN-NaN-NaN');
    });

    it('"2026" → NaN-NaN-NaN', () => {
      assert.strictEqual(compute('2026'), 'NaN-NaN-NaN');
    });

    it('"2026-02-extra" → 2026-02-28', () => {
      assert.strictEqual(compute('2026-02-extra'), '2026-02-28');
    });
  });

  describe('input immutability', () => {
    it('does not mutate input string', () => {
      const input = '2026-03';
      compute(input);
      assert.strictEqual(input, '2026-03');
    });
  });

  describe('determinism', () => {
    it('produces same output for same input', () => {
      assert.strictEqual(compute('2026-03'), compute('2026-03'));
    });
  });
});
