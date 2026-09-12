/**
 * Stage 1.5T — Debts Total Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the debts total
 * calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/debts/debts-total-calculator.js');

describe('DebtsTotalCalculator', () => {
  it('returns 0 for empty debtors array', () => {
    const result = compute({ debtors: [] });
    assert.strictEqual(result, 0);
  });

  it('returns remaining for single debtor', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 100);
  });

  it('sums remaining across multiple debtors', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments: [],
        },
        {
          debts: [
            { paid: false, amount: 200 },
          ],
          repayments: [
            { amount: 50 },
          ],
        },
      ],
    });
    assert.strictEqual(result, 250);
  });

  it('clamps each debtor remaining to 0', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments: [
            { amount: 150 },
          ],
        },
        {
          debts: [
            { paid: false, amount: 50 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 50);
  });

  it('handles debtor with no debts', () => {
    const result = compute({
      debtors: [
        {
          debts: [],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('handles debtor with missing repayments', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 100 },
          ],
        },
      ],
    });
    assert.strictEqual(result, 100);
  });

  it('handles mixed paid/unpaid debts', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 100 },
            { paid: true, amount: 50 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 100);
  });

  it('handles zero amounts', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 0 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('clamps negative result to 0 via Math.max(0, ...)', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: -50 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('handles fractional amounts', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 99.99 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, 99.99);
  });

  it('handles NaN debt amount', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: NaN },
          ],
          repayments: [],
        },
      ],
    });
    assert.ok(Number.isNaN(result));
  });

  it('handles Infinity debt amount', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: Infinity },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(result, Infinity);
  });

  it('does not mutate debtors array', () => {
    const debtors = [
      {
        debts: [
          { paid: false, amount: 100 },
        ],
        repayments: [],
      },
    ];
    const original = JSON.stringify(debtors);
    compute({ debtors });
    assert.strictEqual(JSON.stringify(debtors), original);
  });

  it('does not mutate debtor objects', () => {
    const debtor = {
      debts: [
        { paid: false, amount: 100 },
      ],
      repayments: [],
    };
    const original = JSON.stringify(debtor);
    compute({ debtors: [debtor] });
    assert.strictEqual(JSON.stringify(debtor), original);
  });

  it('returns a number', () => {
    const result = compute({
      debtors: [
        {
          debts: [
            { paid: false, amount: 100 },
          ],
          repayments: [],
        },
      ],
    });
    assert.strictEqual(typeof result, 'number');
  });
});
