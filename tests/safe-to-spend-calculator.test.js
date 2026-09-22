/**
 * Stage 1.4 — Safe-to-Spend Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 *
 * Frozen MVP-1 contract (G1.3):
 *   input:  { freeFunds, goalsReq, daysLeft }
 *   output: { safeTotal, perDay }
 *   formula: safeTotal = freeFunds - goalsReq
 *            perDay = safeTotal / max(1, daysLeft)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/safe-to-spend/safe-to-spend-calculator.js');

describe('SafeToSpendCalculator', () => {
  describe('compute()', () => {
    it('zero input returns zeros with clamped daysLeft', () => {
      const result = compute({});
      assert.strictEqual(result.safeTotal, 0);
      assert.strictEqual(result.perDay, 0);
    });

    it('normal positive case', () => {
      const result = compute({
        freeFunds: 1000,
        goalsReq: 100,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 900);
      assert.strictEqual(result.perDay, 900 / 30);
    });

    it('negative safe total', () => {
      const result = compute({
        freeFunds: 100,
        goalsReq: 200,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, -100);
      assert.strictEqual(result.perDay, -100 / 30);
    });

    it('zero goalsReq', () => {
      const result = compute({
        freeFunds: 1000,
        goalsReq: 0,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 1000);
      assert.strictEqual(result.perDay, 1000 / 30);
    });

    it('daysLeft = 0 is clamped to 1', () => {
      const result = compute({
        freeFunds: 1000,
        goalsReq: 0,
        daysLeft: 0,
      });
      assert.strictEqual(result.safeTotal, 1000);
      assert.strictEqual(result.perDay, 1000);
    });

    it('negative daysLeft is clamped to 1', () => {
      const result = compute({
        freeFunds: 1000,
        goalsReq: 200,
        daysLeft: -5,
      });
      assert.strictEqual(result.safeTotal, 800);
      assert.strictEqual(result.perDay, 800);
    });

    it('daysLeft = 1', () => {
      const result = compute({
        freeFunds: 1000,
        goalsReq: 200,
        daysLeft: 1,
      });
      assert.strictEqual(result.safeTotal, 800);
      assert.strictEqual(result.perDay, 800);
    });

    it('fractional values preserve exact arithmetic', () => {
      const result = compute({
        freeFunds: 100.50,
        goalsReq: 10.10,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 100.50 - 10.10);
      assert.strictEqual(result.perDay, (100.50 - 10.10) / 30);
    });

    it('does not mutate input object', () => {
      const input = { freeFunds: 1000, goalsReq: 100, daysLeft: 30 };
      const original = JSON.stringify(input);
      compute(input);
      assert.strictEqual(JSON.stringify(input), original);
    });

    it('same input produces same output', () => {
      const input = { freeFunds: 1000, goalsReq: 100, daysLeft: 30 };
      const r1 = compute(input);
      const r2 = compute(input);
      assert.deepStrictEqual(r1, r2);
    });

    it('returns exact object shape', () => {
      const result = compute({
        freeFunds: 1000,
        goalsReq: 100,
        daysLeft: 30,
      });
      assert.ok('safeTotal' in result);
      assert.ok('perDay' in result);
      assert.strictEqual(Object.keys(result).length, 2);
    });

    describe('invalid inputs — contract fallback behavior', () => {
      it('treats undefined as 0 via || 0 fallback', () => {
        const result = compute({});
        assert.strictEqual(result.safeTotal, 0);
        assert.strictEqual(result.perDay, 0);
      });

      it('treats null as 0 via || 0 fallback', () => {
        const result = compute({ freeFunds: null, goalsReq: null, daysLeft: null });
        assert.strictEqual(result.safeTotal, 0);
        assert.strictEqual(result.perDay, 0);
      });

      it('treats empty string as 0 via || 0 fallback', () => {
        const result = compute({ freeFunds: '', goalsReq: '', daysLeft: '' });
        assert.strictEqual(result.safeTotal, 0);
        assert.strictEqual(result.perDay, 0);
      });

      it('treats NaN as 0 via || 0 fallback', () => {
        const result = compute({ freeFunds: NaN, goalsReq: NaN, daysLeft: NaN });
        assert.strictEqual(result.safeTotal, 0);
        assert.strictEqual(result.perDay, 0);
      });

      it('preserves negative numbers', () => {
        const result = compute({ freeFunds: -100, goalsReq: 50, daysLeft: 30 });
        assert.strictEqual(result.safeTotal, -150);
        assert.strictEqual(result.perDay, -150 / 30);
      });

      it('preserves Infinity', () => {
        const result = compute({ freeFunds: Infinity, goalsReq: 0, daysLeft: 30 });
        assert.strictEqual(result.safeTotal, Infinity);
        assert.strictEqual(result.perDay, Infinity / 30);
      });

      it('preserves negative Infinity', () => {
        const result = compute({ freeFunds: -Infinity, goalsReq: 0, daysLeft: 30 });
        assert.strictEqual(result.safeTotal, -Infinity);
        assert.strictEqual(result.perDay, -Infinity / 30);
      });

      it('coerces numeric strings via JavaScript arithmetic operators', () => {
        const result = compute({ freeFunds: '100', goalsReq: '30', daysLeft: '30' });
        assert.strictEqual(result.safeTotal, 70);
        assert.strictEqual(result.perDay, 70 / 30);
      });

      it('produces NaN when non-numeric string participates in arithmetic', () => {
        const result = compute({ freeFunds: 'abc', goalsReq: 0, daysLeft: 30 });
        assert.ok(Number.isNaN(result.safeTotal), 'non-numeric string coerces to NaN in subtraction');
        assert.ok(Number.isNaN(result.perDay), 'NaN / number = NaN');
      });
    });
  });
});
