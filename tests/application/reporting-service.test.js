/**
 * Stage 1.4+ — Reporting Service tests.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function createMockTransactionRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function setData(d) {
    data = d;
  }

  return { loadAll: loadAll, calls: calls, setData: setData };
}

function setupService(txRepo) {
  var window = { ReportingService: null };
  var ReportingService = require('../../src/application/reporting/reporting-service.js');
  window.ReportingService = { create: ReportingService.create };
  var service = window.ReportingService.create(txRepo, {});
  return { service: service, window: window };
}

describe('ReportingService', () => {
  describe('getMonthlySummary()', () => {
    it('computes income, expense, and net for month', async () => {
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(txRepo);
      txRepo.setData([
        { id: 'tx-1', type: 'income', amount: 5000, categoryId: 'cat-salary', date: '2026-09-01', metadata: {} },
        { id: 'tx-2', type: 'expense', amount: 2000, categoryId: 'cat-rent', date: '2026-09-02', metadata: {} },
        { id: 'tx-3', type: 'expense', amount: 500, categoryId: 'cat-food', date: '2026-09-03', metadata: {} },
        { id: 'tx-4', type: 'transfer', amount: 1000, date: '2026-09-04', metadata: {} }
      ]);

      var result = await service.getMonthlySummary('2026-09');
      assert.strictEqual(result.income, 5000);
      assert.strictEqual(result.expense, 2500);
      assert.strictEqual(result.net, 2500);
      assert.strictEqual(result.byCategory.expense['cat-rent'], 2000);
      assert.strictEqual(result.byCategory.expense['cat-food'], 500);
    });

    it('excludes transactions with metadata.excluded', async () => {
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(txRepo);
      txRepo.setData([
        { id: 'tx-1', type: 'expense', amount: 2000, categoryId: 'cat-rent', date: '2026-09-02', metadata: { excluded: true } },
        { id: 'tx-2', type: 'expense', amount: 500, categoryId: 'cat-food', date: '2026-09-03', metadata: {} }
      ]);

      var result = await service.getMonthlySummary('2026-09');
      assert.strictEqual(result.expense, 500);
    });
  });

  describe('getWealthTrend()', () => {
    it('computes trend for multiple months', async () => {
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(txRepo);
      txRepo.setData([
        { id: 'tx-1', type: 'income', amount: 5000, date: '2026-09-01', metadata: {} },
        { id: 'tx-2', type: 'expense', amount: 3000, date: '2026-09-02', metadata: {} }
      ]);

      var result = await service.getWealthTrend(['2026-09']);
      assert.strictEqual(result[0].monthKey, '2026-09');
      assert.strictEqual(result[0].income, 5000);
      assert.strictEqual(result[0].expense, 3000);
      assert.strictEqual(result[0].net, 2000);
    });
  });

  describe('getCategoryTrend()', () => {
    it('computes trend for category across months', async () => {
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(txRepo);
      txRepo.setData([
        { id: 'tx-1', type: 'expense', amount: 100, categoryId: 'cat-food', date: '2026-09-01', metadata: {} },
        { id: 'tx-2', type: 'expense', amount: 150, categoryId: 'cat-food', date: '2026-10-01', metadata: {} }
      ]);

      var result = await service.getCategoryTrend('cat-food', ['2026-09', '2026-10']);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].amount, -100);
      assert.strictEqual(result[1].amount, -150);
    });
  });
});
