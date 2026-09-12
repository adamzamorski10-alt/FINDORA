/**
 * Stage 1.4+ — Budget Service tests.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function createMockBudgetRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function findById(id) {
    calls.push({ method: 'findById', id });
    var found = data.find(function(b) { return b.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function findByCategory(categoryId) {
    calls.push({ method: 'findByCategory', categoryId });
    var found = data.find(function(b) { return b.categoryId === categoryId; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function save(budget) {
    calls.push({ method: 'save', budget: JSON.parse(JSON.stringify(budget)) });
    var index = data.findIndex(function(b) { return b.id === budget.id; });
    if (index >= 0) { data[index] = budget; } else { data.push(budget); }
    return Promise.resolve(JSON.parse(JSON.stringify(budget)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(b) { return b.id !== id; });
    return Promise.resolve();
  }

  return { loadAll: loadAll, findById: findById, findByCategory: findByCategory, save: save, remove: remove, calls: calls, setData: function(d) { data = d; } };
}

function createMockTransactionRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function findById(id) {
    calls.push({ method: 'findById', id });
    var found = data.find(function(t) { return t.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function findByMonth(monthKey) {
    calls.push({ method: 'findByMonth', monthKey });
    return Promise.resolve(data.filter(function(t) { return t.date && t.date.indexOf(monthKey) === 0; }));
  }

  function save(tx) {
    calls.push({ method: 'save', tx: JSON.parse(JSON.stringify(tx)) });
    data.push(tx);
    return Promise.resolve(JSON.parse(JSON.stringify(tx)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(t) { return t.id !== id; });
    return Promise.resolve();
  }

  return { loadAll: loadAll, findById: findById, findByMonth: findByMonth, save: save, remove: remove, calls: calls, setData: function(d) { data = d; } };
}

function setupService(budgetRepo, txRepo) {
  var window = { BudgetService: null };
  var BudgetService = require('../../src/application/budget/budget-service.js');
  window.BudgetService = { create: BudgetService.create };
  var service = window.BudgetService.create(budgetRepo, txRepo);
  return { service: service, window: window };
}

describe('BudgetService', () => {
  describe('getAll()', () => {
    it('returns all budgets', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);
      budgetRepo.setData([
        { id: 'b1', categoryId: 'cat-1', limit: 500, period: 'monthly' }
      ]);

      var result = await service.getAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('getProgress()', () => {
    it('computes budget progress', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);
      budgetRepo.setData([
        { id: 'b1', categoryId: 'cat-food', limit: 500, period: 'monthly' }
      ]);
      txRepo.setData([
        { id: 'tx-1', type: 'expense', categoryId: 'cat-food', amount: 200, date: '2026-09-01' }
      ]);

      var result = await service.getProgress('b1', '2026-09');
      assert.strictEqual(result.spent, 200);
      assert.strictEqual(result.remaining, 300);
      assert.strictEqual(result.overBudget, false);
    });

    it('flags over budget', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);
      budgetRepo.setData([
        { id: 'b1', categoryId: 'cat-food', limit: 100, period: 'monthly' }
      ]);
      txRepo.setData([
        { id: 'tx-1', type: 'expense', categoryId: 'cat-food', amount: 150, date: '2026-09-01' }
      ]);

      var result = await service.getProgress('b1', '2026-09');
      assert.strictEqual(result.overBudget, true);
    });
  });

  describe('add()', () => {
    it('creates new budget', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);

      var result = await service.add({ categoryId: 'cat-food', limit: 500, period: 'monthly' });
      assert.ok(result.id);
      assert.strictEqual(result.limit, 500);
    });
  });

  describe('update()', () => {
    it('updates existing budget', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);
      budgetRepo.setData([{ id: 'b1', categoryId: 'cat-food', limit: 500, period: 'monthly' }]);

      var result = await service.update('b1', { limit: 600 });
      assert.strictEqual(result.limit, 600);
    });

    it('throws on nonexistent budget', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);

      await assert.rejects(function() { return service.update('nonexistent', { limit: 600 }); }, /Budget not found/);
    });
  });

  describe('remove()', () => {
    it('removes budget', async () => {
      var budgetRepo = createMockBudgetRepository();
      var txRepo = createMockTransactionRepository();
      var { service } = setupService(budgetRepo, txRepo);
      budgetRepo.setData([{ id: 'b1', categoryId: 'cat-food', limit: 500, period: 'monthly' }]);

      await service.remove('b1');
      var removeCall = budgetRepo.calls.find(function(c) { return c.method === 'remove'; });
      assert.ok(removeCall);
    });
  });
});
