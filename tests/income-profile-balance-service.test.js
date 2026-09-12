/**
 * Stage 1.5K — Income Profile Balance Application Service Tests
 *
 * Verifies the application service correctly bridges legacy global state
 * to the domain calculator.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'application', 'income', 'income-profile-balance-service.js'), 'utf8');

function setupService(mocks) {
  const window = {
    transactions: mocks.transactions || [],
    IncomeProfileBalanceCalculator: mocks.IncomeProfileBalanceCalculator || null,
    GieldaBalanceService: mocks.GieldaBalanceService || null,
  };

  const module = { exports: {} };
  new Function('window', 'module', serviceCode)(window, module);
  return { service: module.exports, window: window };
}

describe('IncomeProfileBalanceService', () => {
  describe('regular profile', () => {
    it('delegates to calculator with correct explicit inputs', () => {
      const transactions = [
        { type: 'income', _sourceId: 's1', amount: 100 },
        { type: 'expense', _sourceId: 's1', amount: 30 },
      ];

      let capturedInput = null;
      const mockCalculator = {
        compute: function(input) {
          capturedInput = input;
          return 70;
        }
      };

      const { service } = setupService({
        transactions,
        IncomeProfileBalanceCalculator: mockCalculator,
      });

      const profile = { id: 's1', balance: 50 };
      const result = service.computeForProfile(profile);

      assert.ok(capturedInput, 'Calculator should be called');
      assert.strictEqual(capturedInput.profile, profile);
      assert.strictEqual(capturedInput.transactions.length, 2);
      assert.strictEqual(result, 70);
    });

    it('passes empty array when window.transactions is missing', () => {
      let capturedInput = null;
      const mockCalculator = {
        compute: function(input) {
          capturedInput = input;
          return 0;
        }
      };

      const { service } = setupService({
        IncomeProfileBalanceCalculator: mockCalculator,
      });

      service.computeForProfile({ id: 's1', balance: 100 });
      assert.strictEqual(capturedInput.transactions.length, 0);
    });
  });

  describe('gielda profile', () => {
    it('delegates to GieldaBalanceService and passes result as gieldaBalance', () => {
      let capturedInput = null;
      const mockCalculator = {
        compute: function(input) {
          capturedInput = input;
          return input.gieldaBalance;
        }
      };

      const mockGieldaService = {
        computeCurrent: function() { return 500; }
      };

      const { service } = setupService({
        IncomeProfileBalanceCalculator: mockCalculator,
        GieldaBalanceService: mockGieldaService,
      });

      const result = service.computeForProfile({ id: 'gielda' });
      assert.strictEqual(result, 500);
      assert.ok(capturedInput);
      assert.strictEqual(capturedInput.gieldaBalance, 500);
    });

    it('returns 0 when GieldaBalanceService is unavailable', () => {
      const mockCalculator = {
        compute: function(input) {
          return input.gieldaBalance;
        }
      };

      const { service } = setupService({
        IncomeProfileBalanceCalculator: mockCalculator,
        GieldaBalanceService: null,
      });

      const result = service.computeForProfile({ id: 'gielda' });
      assert.strictEqual(result, 0);
    });
  });

  describe('error handling', () => {
    it('throws when calculator is not available', () => {
      const { service } = setupService({});
      assert.throws(() => service.computeForProfile({ id: 's1' }), /IncomeProfileBalanceCalculator not available/);
    });
  });

  describe('falsy profile', () => {
    it('returns 0 for null profile without calling calculator', () => {
      let called = false;
      const mockCalculator = {
        compute: function() { called = true; return 999; }
      };

      const { service } = setupService({
        IncomeProfileBalanceCalculator: mockCalculator,
      });

      const result = service.computeForProfile(null);
      assert.strictEqual(result, 0);
      assert.strictEqual(called, false);
    });
  });
});
