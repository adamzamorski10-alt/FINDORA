/**
 * Stage 1.5U — Loan Remaining Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the loan remaining
 * calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute, computeRepaid } = require('../src/domain/loans/loan-remaining-calculator.js');

describe('LoanRemainingCalculator', () => {
  describe('computeRepaid', () => {
    it('returns 0 for empty repayments', () => {
      const result = computeRepaid({ loan: { repayments: [] } });
      assert.strictEqual(result, 0);
    });

    it('returns 0 when repayments is missing', () => {
      const result = computeRepaid({ loan: {} });
      assert.strictEqual(result, 0);
    });

    it('sums all repayment amounts', () => {
      const result = computeRepaid({
        loan: {
          repayments: [
            { amount: 100 },
            { amount: 50 },
            { amount: 25 },
          ],
        },
      });
      assert.strictEqual(result, 175);
    });

    it('handles zero repayment amount', () => {
      const result = computeRepaid({
        loan: { repayments: [{ amount: 0 }] },
      });
      assert.strictEqual(result, 0);
    });

    it('handles negative repayment amount', () => {
      const result = computeRepaid({
        loan: { repayments: [{ amount: -50 }] },
      });
      assert.strictEqual(result, -50);
    });

    it('handles fractional repayment amount', () => {
      const result = computeRepaid({
        loan: { repayments: [{ amount: 49.99 }] },
      });
      assert.strictEqual(result, 49.99);
    });

    it('handles NaN repayment amount', () => {
      const result = computeRepaid({
        loan: { repayments: [{ amount: NaN }] },
      });
      assert.ok(Number.isNaN(result));
    });

    it('handles Infinity repayment amount', () => {
      const result = computeRepaid({
        loan: { repayments: [{ amount: Infinity }] },
      });
      assert.strictEqual(result, Infinity);
    });

    it('handles missing amount in repayment', () => {
      const result = computeRepaid({
        loan: { repayments: [{ amount: undefined }] },
      });
      assert.ok(Number.isNaN(result));
    });
  });

  describe('compute', () => {
    it('returns amount when no repayments', () => {
      const result = compute({
        loan: {
          amount: 100,
          repayments: [],
        },
      });
      assert.strictEqual(result, 100);
    });

    it('returns 0 when fully repaid', () => {
      const result = compute({
        loan: {
          amount: 100,
          repayments: [
            { amount: 100 },
          ],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('returns partial remaining after partial repayment', () => {
      const result = compute({
        loan: {
          amount: 100,
          repayments: [
            { amount: 30 },
          ],
        },
      });
      assert.strictEqual(result, 70);
    });

    it('clamps to 0 when overpaid', () => {
      const result = compute({
        loan: {
          amount: 100,
          repayments: [
            { amount: 150 },
          ],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('handles missing repayments', () => {
      const result = compute({
        loan: {
          amount: 100,
        },
      });
      assert.strictEqual(result, 100);
    });

    it('handles missing amount', () => {
      const result = compute({
        loan: {
          repayments: [],
        },
      });
      assert.ok(Number.isNaN(result));
    });

    it('handles zero amount', () => {
      const result = compute({
        loan: {
          amount: 0,
          repayments: [],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('handles negative amount', () => {
      const result = compute({
        loan: {
          amount: -50,
          repayments: [],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('handles fractional amount', () => {
      const result = compute({
        loan: {
          amount: 100.5,
          repayments: [
            { amount: 50.25 },
          ],
        },
      });
      assert.strictEqual(result, 50.25);
    });

    it('handles NaN amount', () => {
      const result = compute({
        loan: {
          amount: NaN,
          repayments: [],
        },
      });
      assert.ok(Number.isNaN(result));
    });

    it('handles Infinity amount', () => {
      const result = compute({
        loan: {
          amount: Infinity,
          repayments: [],
        },
      });
      assert.strictEqual(result, Infinity);
    });

    it('does not filter by paid flag — compute itself ignores paid', () => {
      const result = compute({
        loan: {
          amount: 100,
          paid: true,
          repayments: [],
        },
      });
      assert.strictEqual(result, 100);
    });

    it('does not mutate loan object', () => {
      const loan = {
        amount: 100,
        repayments: [
          { amount: 50 },
        ],
      };
      const original = JSON.stringify(loan);
      compute({ loan });
      assert.strictEqual(JSON.stringify(loan), original);
    });

    it('does not mutate repayments array', () => {
      const repayments = [
        { amount: 50 },
      ];
      const original = JSON.stringify(repayments);
      compute({
        loan: {
          amount: 100,
          repayments,
        },
      });
      assert.strictEqual(JSON.stringify(repayments), original);
    });

    it('returns a number', () => {
      const result = compute({
        loan: {
          amount: 100,
          repayments: [],
        },
      });
      assert.strictEqual(typeof result, 'number');
    });
  });
});
