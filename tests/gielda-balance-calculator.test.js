/**
 * Stage 1.5I — Gielda Balance Domain Calculator Tests
 *
 * Pure unit tests for the domain calculator.
 * No Firebase, no DOM, no globals required.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('../src/domain/gielda/gielda-balance-calculator.js');

describe('GieldaBalanceCalculator', () => {
  describe('compute() — current balance', () => {
    it('returns 0 for empty operations', () => {
      assert.strictEqual(compute({ operations: [] }), 0);
    });

    it('returns amount for single wplata', () => {
      assert.strictEqual(compute({ operations: [{ type: 'wplata', amount: 100 }] }), 100);
    });

    it('sums multiple wplata', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100 },
        { type: 'wplata', amount: 50 },
      ] }), 150);
    });

    it('subtracts single wyplata', () => {
      assert.strictEqual(compute({ operations: [{ type: 'wyplata', amount: 100 }] }), -100);
    });

    it('sums multiple wyplata', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wyplata', amount: 100 },
        { type: 'wyplata', amount: 50 },
      ] }), -150);
    });

    it('adds single zarobek', () => {
      assert.strictEqual(compute({ operations: [{ type: 'zarobek', amount: 200 }] }), 200);
    });

    it('subtracts single strata', () => {
      assert.strictEqual(compute({ operations: [{ type: 'strata', amount: 150 }] }), -150);
    });

    it('computes mixed operation types', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 1000 },
        { type: 'wyplata', amount: 200 },
        { type: 'zarobek', amount: 300 },
        { type: 'strata', amount: 100 },
      ] }), 1000);
    });

    it('ignores unknown operation types', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100 },
        { type: 'unknown', amount: 50 },
        { type: 'zarobek', amount: 30 },
      ] }), 130);
    });

    it('handles negative amounts', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: -100 },
        { type: 'wyplata', amount: -50 },
      ] }), -50);
    });

    it('handles zero amounts', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 0 },
        { type: 'wyplata', amount: 0 },
        { type: 'zarobek', amount: 0 },
        { type: 'strata', amount: 0 },
      ] }), 0);
    });

    it('handles fractional amounts', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100.50 },
        { type: 'wyplata', amount: 49.99 },
        { type: 'zarobek', amount: 25.25 },
        { type: 'strata', amount: 10.10 },
      ] }), 65.66);
    });

    it('handles very large values', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 1000000 },
        { type: 'wyplata', amount: 250000 },
        { type: 'zarobek', amount: 500000 },
        { type: 'strata', amount: 100000 },
      ] }), 1150000);
    });
  });

  describe('compute() — as-of balance', () => {
    it('returns 0 for empty operations', () => {
      assert.strictEqual(compute({ operations: [], asOfDate: '2024-12-31' }), 0);
    });

    it('includes operation before cutoff', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100, date: '2024-01-15' },
      ], asOfDate: '2024-06-30' }), 100);
    });

    it('includes operation exactly on cutoff', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100, date: '2024-06-30' },
      ], asOfDate: '2024-06-30' }), 100);
    });

    it('excludes operation after cutoff', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100, date: '2024-07-01' },
      ], asOfDate: '2024-06-30' }), 0);
    });

    it('excludes future operation', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100, date: '2099-01-01' },
      ], asOfDate: '2024-06-30' }), 0);
    });

    it('excludes operation with missing date', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100 },
      ], asOfDate: '2024-06-30' }), 0);
    });

    it('handles mixed dated and undated operations', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 100, date: '2024-01-15' },
        { type: 'wplata', amount: 200 },
        { type: 'wyplata', amount: 50, date: '2024-03-10' },
      ], asOfDate: '2024-06-30' }), 50);
    });

    it('ignores unknown operation type with valid date', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'unknown', amount: 100, date: '2024-01-15' },
        { type: 'wplata', amount: 50, date: '2024-01-15' },
      ], asOfDate: '2024-06-30' }), 50);
    });

    it('handles all operation types before cutoff', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: 1000, date: '2024-01-01' },
        { type: 'wyplata', amount: 200, date: '2024-02-01' },
        { type: 'zarobek', amount: 300, date: '2024-03-01' },
        { type: 'strata', amount: 100, date: '2024-04-01' },
      ], asOfDate: '2024-12-31' }), 1000);
    });

    it('handles negative amounts with date cutoff', () => {
      assert.strictEqual(compute({ operations: [
        { type: 'wplata', amount: -100, date: '2024-01-15' },
        { type: 'wyplata', amount: -50, date: '2024-02-15' },
      ], asOfDate: '2024-06-30' }), -50);
    });
  });

  describe('compute() — purity', () => {
    it('does not mutate input operations', () => {
      const operations = [
        { type: 'wplata', amount: 100 },
        { type: 'wyplata', amount: 50 },
      ];
      const original = JSON.stringify(operations);
      compute({ operations: operations });
      assert.strictEqual(JSON.stringify(operations), original);
    });

    it('produces same output for same inputs', () => {
      const inputs = { operations: [
        { type: 'wplata', amount: 100 },
        { type: 'wyplata', amount: 30 },
      ] };
      assert.strictEqual(compute(inputs), compute(inputs));
    });
  });
});
