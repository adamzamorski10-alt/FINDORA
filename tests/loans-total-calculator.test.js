/**
 * Stage 1.5U — Loans Total Calculator Tests
 *
 * Legacy-Behavior Characterization/Mirror Tests for the loans total
 * calculator. No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/loans/loans-total-calculator.js');

describe('LoansTotalCalculator', () => {
  it('returns 0 for empty creditors array', () => {
    const result = compute({ creditors: [] });
    assert.strictEqual(result, 0);
  });

  it('returns remaining for single creditor with single loan', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 100);
  });

  it('sums remaining across multiple creditors', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [],
              paid: false,
            },
          ],
        },
        {
          loans: [
            {
              amount: 200,
              repayments: [
                { amount: 50 },
              ],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 250);
  });

  it('excludes paid loans', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [],
              paid: true,
            },
            {
              amount: 200,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 200);
  });

  it('includes paid: false loans', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 100);
  });

  it('handles truthy/falsy paid values', () => {
    const resultTruthy = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [],
              paid: 1,
            },
            {
              amount: 200,
              repayments: [],
              paid: 0,
            },
          ],
        },
      ],
    });
    assert.strictEqual(resultTruthy, 200);
  });

  it('clamps overpaid loans to 0', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [
                { amount: 150 },
              ],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('handles creditor with empty loans array', () => {
    const result = compute({
      creditors: [
        {
          loans: [],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('handles missing repayments', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 100);
  });

  it('handles zero amounts', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 0,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('handles negative amounts', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: -50,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 0);
  });

  it('handles fractional amounts', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100.5,
              repayments: [
                { amount: 50.25 },
              ],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, 50.25);
  });

  it('handles NaN amount', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: NaN,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.ok(Number.isNaN(result));
  });

  it('handles Infinity amount', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: Infinity,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(result, Infinity);
  });

  it('does not mutate creditors array', () => {
    const creditors = [
      {
        loans: [
          {
            amount: 100,
            repayments: [],
            paid: false,
          },
        ],
      },
    ];
    const original = JSON.stringify(creditors);
    compute({ creditors });
    assert.strictEqual(JSON.stringify(creditors), original);
  });

  it('does not mutate loan objects', () => {
    const loan = {
      amount: 100,
      repayments: [],
      paid: false,
    };
    const original = JSON.stringify(loan);
    compute({
      creditors: [
        {
          loans: [loan],
        },
      ],
    });
    assert.strictEqual(JSON.stringify(loan), original);
  });

  it('returns a number', () => {
    const result = compute({
      creditors: [
        {
          loans: [
            {
              amount: 100,
              repayments: [],
              paid: false,
            },
          ],
        },
      ],
    });
    assert.strictEqual(typeof result, 'number');
  });
});
