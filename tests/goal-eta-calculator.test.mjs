/**
 * Stage 1.5A — Goal ETA Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/domain/goals/goal-eta-calculator.js';

describe('GoalEtaCalculator', () => {
  describe('compute()', () => {
    const baseGoal = { id: 'g1', target: 1000, current: 200 };

    it('returns null when goal is already reached', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 1000 },
        transactions: [],
        currentDate: new Date('2026-01-15'),
      });
      assert.strictEqual(result, null);
    });

    it('returns null when goal current exceeds target', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 1200 },
        transactions: [],
        currentDate: new Date('2026-01-15'),
      });
      assert.strictEqual(result, null);
    });

    it('returns unknown when no matching transactions', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g2', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-01-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, true);
    });

    it('computes ETA for normal positive deposit history', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-03-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 8);
    });

    it('returns unknown when average per month is zero', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 0, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, true);
    });

    it('returns unknown when average per month is negative', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: -100, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, true);
    });

    it('excludes transactions marked as excluded', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: true },
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 16);
    });

    it('ignores transactions for other goals', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g2', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 16);
    });

    it('ignores non-expense transactions', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'income', amount: 100, date: '2026-01-01', _excluded: false },
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 16);
    });

    it('handles single transaction', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 24);
    });

    it('handles fractional amounts', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 50.5, date: '2026-01-01', _excluded: false },
          { _goalId: 'g1', type: 'expense', amount: 49.5, date: '2026-02-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 24);
    });

    it('handles year boundary', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2025-01-01', _excluded: false },
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2025-12-01', _excluded: false },
        ],
        currentDate: new Date('2026-01-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 52);
    });

    it('handles month boundary with same month', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-03-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 8);
    });

    it('preserves exact ETA date construction', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 800, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.strictEqual(result.unknown, false);
      assert.strictEqual(result.monthsNeeded, 3);
      assert.strictEqual(result.etaDate.getMonth(), 5);
      assert.strictEqual(result.etaDate.getDate(), 1);
    });

    it('produces same output for same inputs', () => {
      const inputs = {
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      };
      const r1 = compute(inputs);
      const r2 = compute(inputs);
      assert.deepStrictEqual(r1, r2);
    });

    it('does not mutate input objects', () => {
      const transactions = [
        { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
      ];
      const original = JSON.stringify(transactions);
      compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: transactions,
        currentDate: new Date('2026-03-15'),
      });
      assert.strictEqual(JSON.stringify(transactions), original);
    });

    it('returns exact object shape for known result', () => {
      const result = compute({
        goal: { id: 'g1', target: 1000, current: 200 },
        transactions: [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
        ],
        currentDate: new Date('2026-03-15'),
      });
      assert.ok(result);
      assert.ok('monthsNeeded' in result);
      assert.ok('avgPerMonth' in result);
      assert.ok('etaDate' in result);
      assert.ok('unknown' in result);
      assert.strictEqual(result.unknown, false);
    });

    describe('time-independence', () => {
      it('uses the supplied currentDate explicitly', () => {
        const result = compute({
          goal: { id: 'g1', target: 1000, current: 200 },
          transactions: [
            { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
            { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-02-01', _excluded: false },
            { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-03-01', _excluded: false },
          ],
          currentDate: new Date('2026-03-15'),
        });
        assert.ok(result);
        assert.strictEqual(result.unknown, false);
        assert.strictEqual(result.monthsNeeded, 8);
      });

      it('changes result when currentDate changes', () => {
        const transactions = [
          { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
        ];
        const resultMarch = compute({
          goal: { id: 'g1', target: 1000, current: 200 },
          transactions: transactions,
          currentDate: new Date('2026-03-15'),
        });
        const resultApril = compute({
          goal: { id: 'g1', target: 1000, current: 200 },
          transactions: transactions,
          currentDate: new Date('2026-04-15'),
        });
        assert.ok(resultMarch);
        assert.ok(resultApril);
        assert.notStrictEqual(resultMarch.monthsNeeded, resultApril.monthsNeeded);
      });

      it('throws when currentDate is missing', () => {
        assert.throws(() => {
          compute({
            goal: { id: 'g1', target: 1000, current: 200 },
            transactions: [
              { _goalId: 'g1', type: 'expense', amount: 100, date: '2026-01-01', _excluded: false },
            ],
          });
        }, TypeError);
      });
    });
  });
});
