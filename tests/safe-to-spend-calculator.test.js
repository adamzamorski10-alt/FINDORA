/**
 * Stage 1.4 — Safe-to-Spend Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/safe-to-spend/safe-to-spend-calculator.js');

describe('SafeToSpendCalculator', () => {
  describe('compute()', () => {
    it('zero input returns zeros', () => {
      const result = compute({});
      assert.strictEqual(result.freeFunds, 0);
      assert.strictEqual(result.bills, 0);
      assert.strictEqual(result.goalsReq, 0);
      assert.strictEqual(result.daysLeft, 0);
      assert.strictEqual(result.safeTotal, 0);
      assert.strictEqual(result.perDay, 0 / 0); // 0/0 = NaN
    });

    it('normal positive case', () => {
      const result = compute({
        freeFunds: 1000,
        bills: 200,
        goalsReq: 100,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 700);
      assert.strictEqual(result.perDay, 700 / 30);
    });

    it('negative safe total', () => {
      const result = compute({
        freeFunds: 100,
        bills: 200,
        goalsReq: 100,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, -200);
      assert.strictEqual(result.perDay, -200 / 30);
    });

    it('no goals', () => {
      const result = compute({
        freeFunds: 1000,
        bills: 200,
        goalsReq: 0,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 800);
      assert.strictEqual(result.goalsReq, 0);
    });

    it('no recurring expenses', () => {
      const result = compute({
        freeFunds: 1000,
        bills: 0,
        goalsReq: 100,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 900);
      assert.strictEqual(result.bills, 0);
    });

    it('future goal deadline — goalsReq computed by caller', () => {
      const result = compute({
        freeFunds: 1000,
        bills: 0,
        goalsReq: 150,
        daysLeft: 30,
      });
      assert.strictEqual(result.safeTotal, 850);
    });

    it('zero days left', () => {
      const result = compute({
        freeFunds: 1000,
        bills: 0,
        goalsReq: 0,
        daysLeft: 0,
      });
      assert.strictEqual(result.safeTotal, 1000);
      assert.strictEqual(result.perDay, Infinity);
    });

    it('empty collections via defaults', () => {
      const result = compute({});
      assert.ok(result);
      assert.strictEqual(typeof result.daysLeft, 'number');
      assert.strictEqual(typeof result.perDay, 'number');
    });

    it('does not mutate input object', () => {
      const input = { freeFunds: 1000, bills: 200, goalsReq: 100, daysLeft: 30 };
      const original = JSON.stringify(input);
      compute(input);
      assert.strictEqual(JSON.stringify(input), original);
    });

    it('same input produces same output', () => {
      const input = { freeFunds: 1000, bills: 200, goalsReq: 100, daysLeft: 30 };
      const r1 = compute(input);
      const r2 = compute(input);
      assert.deepStrictEqual(r1, r2);
    });

    it('returns exact object shape', () => {
      const result = compute({
        freeFunds: 1000,
        bills: 200,
        goalsReq: 100,
        daysLeft: 30,
      });
      assert.ok('daysLeft' in result);
      assert.ok('freeFunds' in result);
      assert.ok('bills' in result);
      assert.ok('goalsReq' in result);
      assert.ok('safeTotal' in result);
      assert.ok('perDay' in result);
    });

    describe('fractional values', () => {
      it('preserves exact JavaScript floating-point arithmetic for fractional inputs', () => {
        const result = compute({
          freeFunds: 100.50,
          bills: 20.25,
          goalsReq: 10.10,
          daysLeft: 30,
        });
        assert.strictEqual(result.safeTotal, 100.50 - 20.25 - 10.10);
        assert.strictEqual(result.perDay, (100.50 - 20.25 - 10.10) / 30);
      });

      it('produces fractional per-day for typical financial values', () => {
        const result = compute({
          freeFunds: 1500,
          bills: 450.75,
          goalsReq: 200.25,
          daysLeft: 31,
        });
        assert.strictEqual(result.safeTotal, 1500 - 450.75 - 200.25);
        assert.strictEqual(result.perDay, (1500 - 450.75 - 200.25) / 31);
      });
    });

    describe('unusual / non-numeric inputs — documented contract behavior', () => {
      it('treats undefined as 0 via || 0 fallback', () => {
        const result = compute({});
        assert.strictEqual(result.freeFunds, 0);
        assert.strictEqual(result.bills, 0);
        assert.strictEqual(result.goalsReq, 0);
        assert.strictEqual(result.daysLeft, 0);
        assert.strictEqual(result.safeTotal, 0);
        assert.ok(Number.isNaN(result.perDay), '0/0 yields NaN');
      });

      it('treats null as 0 via || 0 fallback', () => {
        const result = compute({ freeFunds: null, bills: null, goalsReq: null, daysLeft: null });
        assert.strictEqual(result.freeFunds, 0);
        assert.strictEqual(result.safeTotal, 0);
      });

      it('treats empty string as 0 via || 0 fallback', () => {
        const result = compute({ freeFunds: '', bills: '', goalsReq: '', daysLeft: '' });
        assert.strictEqual(result.freeFunds, 0);
        assert.strictEqual(result.safeTotal, 0);
      });

      it('treats NaN as 0 via || 0 fallback', () => {
        const result = compute({ freeFunds: NaN, bills: NaN, goalsReq: NaN, daysLeft: NaN });
        assert.strictEqual(result.freeFunds, 0);
        assert.strictEqual(result.safeTotal, 0);
        assert.ok(Number.isNaN(result.perDay), '0/0 yields NaN');
      });

      it('preserves negative numbers', () => {
        const result = compute({ freeFunds: -100, bills: 50, goalsReq: 50, daysLeft: 30 });
        assert.strictEqual(result.freeFunds, -100);
        assert.strictEqual(result.safeTotal, -200);
        assert.strictEqual(result.perDay, -200 / 30);
      });

      it('preserves Infinity', () => {
        const result = compute({ freeFunds: Infinity, bills: 0, goalsReq: 0, daysLeft: 30 });
        assert.strictEqual(result.freeFunds, Infinity);
        assert.strictEqual(result.safeTotal, Infinity);
        assert.strictEqual(result.perDay, Infinity / 30);
      });

      it('preserves negative Infinity', () => {
        const result = compute({ freeFunds: -Infinity, bills: 0, goalsReq: 0, daysLeft: 30 });
        assert.strictEqual(result.freeFunds, -Infinity);
        assert.strictEqual(result.safeTotal, -Infinity);
        assert.strictEqual(result.perDay, -Infinity / 30);
      });

      it('coerces numeric strings via JavaScript arithmetic operators', () => {
        const result = compute({ freeFunds: '100', bills: '50', goalsReq: '30', daysLeft: '30' });
        assert.strictEqual(result.freeFunds, '100');
        assert.strictEqual(result.bills, '50');
        assert.strictEqual(result.goalsReq, '30');
        assert.strictEqual(result.daysLeft, '30');
        assert.strictEqual(result.safeTotal, 20);
        assert.strictEqual(result.perDay, 20 / 30);
      });

      it('produces NaN when non-numeric string participates in arithmetic', () => {
        const result = compute({ freeFunds: 'abc', bills: 0, goalsReq: 0, daysLeft: 30 });
        assert.strictEqual(result.freeFunds, 'abc');
        assert.ok(Number.isNaN(result.safeTotal), 'non-numeric string coerces to NaN in subtraction');
        assert.ok(Number.isNaN(result.perDay), 'NaN / number = NaN');
      });
    });
  });
});
