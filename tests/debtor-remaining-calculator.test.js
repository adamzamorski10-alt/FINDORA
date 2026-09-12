/**
 * Stage 1.5T — Debtor Remaining Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the debtor remaining
 * calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute, computeGeneralRepaid } = require('../src/domain/debts/debtor-remaining-calculator.js');

describe('DebtorRemainingCalculator', () => {
  describe('computeGeneralRepaid', () => {
    it('returns 0 for empty repayments', () => {
      const result = computeGeneralRepaid({ debtor: { repayments: [] } });
      assert.strictEqual(result, 0);
    });

    it('returns 0 when repayments is missing', () => {
      const result = computeGeneralRepaid({ debtor: {} });
      assert.strictEqual(result, 0);
    });

    it('sums all repayment amounts', () => {
      const result = computeGeneralRepaid({
        debtor: {
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
      const result = computeGeneralRepaid({
        debtor: { repayments: [{ amount: 0 }] },
      });
      assert.strictEqual(result, 0);
    });

    it('handles negative repayment amount', () => {
      const result = computeGeneralRepaid({
        debtor: { repayments: [{ amount: -50 }] },
      });
      assert.strictEqual(result, -50);
    });

    it('handles fractional repayment amount', () => {
      const result = computeGeneralRepaid({
        debtor: { repayments: [{ amount: 49.99 }] },
      });
      assert.strictEqual(result, 49.99);
    });

    it('handles NaN repayment amount', () => {
      const result = computeGeneralRepaid({
        debtor: { repayments: [{ amount: NaN }] },
      });
      assert.ok(Number.isNaN(result));
    });

    it('handles Infinity repayment amount', () => {
      const result = computeGeneralRepaid({
        debtor: { repayments: [{ amount: Infinity }] },
      });
      assert.strictEqual(result, Infinity);
    });

    it('handles missing amount in repayment', () => {
      const result = computeGeneralRepaid({
        debtor: { repayments: [{ amount: undefined }] },
      });
      assert.ok(Number.isNaN(result));
    });
  });

  describe('compute', () => {
    it('returns 0 for debtor with no debts', () => {
      const result = compute({
        debtor: {
          debts: [],
          repayments: [],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('returns active sum when no repayments', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
            { paid: false, amount: 50 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(result, 150);
    });

    it('subtracts general repaid from active sum', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
            { paid: false, amount: 50 },
          ],
          repayments: [
            { amount: 75 },
          ],
        },
      });
      assert.strictEqual(result, 75);
    });

    it('clamps to 0 when general repaid exceeds active sum', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments: [
            { amount: 150 },
          ],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('excludes paid debts from active sum', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
            { paid: true, amount: 50 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(result, 100);
    });

    it('handles missing debts with TypeError', () => {
      assert.throws(() => {
        compute({
          debtor: {
            repayments: [],
          },
        });
      }, /Cannot read properties of undefined/);
    });

    it('handles missing repayments', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
          ],
        },
      });
      assert.strictEqual(result, 100);
    });

    it('handles zero debt amount', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 0 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('clamps negative result to 0 via Math.max(0, ...)', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: -50 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(result, 0);
    });

    it('handles fractional debt amount', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 49.99 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(result, 49.99);
    });

    it('handles NaN debt amount', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: NaN },
          ],
          repayments: [],
        },
      });
      assert.ok(Number.isNaN(result));
    });

    it('handles Infinity debt amount', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: Infinity },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(result, Infinity);
    });

    it('handles missing amount in debt', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false },
          ],
          repayments: [],
        },
      });
      assert.ok(Number.isNaN(result));
    });

    it('handles non-boolean paid values truthy/falsy', () => {
      const resultTruthy = compute({
        debtor: {
          debts: [
            { paid: 1, amount: 100 },
            { paid: 0, amount: 50 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(resultTruthy, 50);
    });

    it('does not mutate debtor object', () => {
      const debtor = {
        debts: [
          { paid: false, amount: 100 },
        ],
        repayments: [],
      };
      const original = JSON.stringify(debtor);
      compute({ debtor });
      assert.strictEqual(JSON.stringify(debtor), original);
    });

    it('does not mutate debts array', () => {
      const debts = [
        { paid: false, amount: 100 },
      ];
      const original = JSON.stringify(debts);
      compute({
        debtor: {
          debts,
          repayments: [],
        },
      });
      assert.strictEqual(JSON.stringify(debts), original);
    });

    it('does not mutate repayments array', () => {
      const repayments = [
        { amount: 50 },
      ];
      const original = JSON.stringify(repayments);
      compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments,
        },
      });
      assert.strictEqual(JSON.stringify(repayments), original);
    });

    it('returns a number', () => {
      const result = compute({
        debtor: {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments: [],
        },
      });
      assert.strictEqual(typeof result, 'number');
    });
  });
});
