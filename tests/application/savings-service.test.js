/**
 * Stage 1.4+ — Savings Service tests.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function createMockSavingsRuleRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function findById(id) {
    calls.push({ method: 'findById', id });
    var found = data.find(function(r) { return r.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function findBySource(sourceId) {
    calls.push({ method: 'findBySource', sourceId });
    return Promise.resolve(data.filter(function(r) { return r.sourceId === sourceId; }));
  }

  function findActive() {
    calls.push({ method: 'findActive' });
    return Promise.resolve(data.filter(function(r) { return r.active; }));
  }

  function save(rule) {
    calls.push({ method: 'save', rule: JSON.parse(JSON.stringify(rule)) });
    var index = data.findIndex(function(r) { return r.id === rule.id; });
    if (index >= 0) { data[index] = rule; } else { data.push(rule); }
    return Promise.resolve(JSON.parse(JSON.stringify(rule)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(r) { return r.id !== id; });
    return Promise.resolve();
  }

  return { loadAll: loadAll, findById: findById, findBySource: findBySource, findActive: findActive, save: save, remove: remove, calls: calls, setData: function(d) { data = d; } };
}

function createMockGoalRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function findById(id) {
    calls.push({ method: 'findById', id });
    var found = data.find(function(g) { return g.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function save(goal) {
    calls.push({ method: 'save', goal: JSON.parse(JSON.stringify(goal)) });
    data.push(goal);
    return Promise.resolve(JSON.parse(JSON.stringify(goal)));
  }

  function updateProgress(id, newAmount) {
    calls.push({ method: 'updateProgress', id, newAmount });
    var goal = data.find(function(g) { return g.id === id; });
    if (!goal) return Promise.reject(new Error('Goal not found: ' + id));
    goal.current = newAmount;
    return Promise.resolve(JSON.parse(JSON.stringify(goal)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(g) { return g.id !== id; });
    return Promise.resolve();
  }

  return { loadAll: loadAll, findById: findById, save: save, updateProgress: updateProgress, remove: remove, calls: calls, setData: function(d) { data = d; } };
}

function createMockTransactionService() {
  var data = [];
  var calls = [];

  function add(tx) {
    calls.push({ method: 'add', tx: JSON.parse(JSON.stringify(tx)) });
    var saved = { ...tx, id: tx.id || 'tx-' + Date.now() };
    data.push(saved);
    return Promise.resolve(saved);
  }

  return { add: add, calls: calls, setData: function(d) { data = d; } };
}

function setupService(savingsRepo, goalRepo, txService) {
  var window = { SavingsService: null };
  var SavingsService = require('../../src/application/savings/savings-service.js');
  window.SavingsService = { create: SavingsService.create };
  var service = window.SavingsService.create(savingsRepo, goalRepo, txService);
  return { service: service, window: window };
}

describe('SavingsService', () => {
  describe('getAll()', () => {
    it('returns all rules', async () => {
      var savingsRepo = createMockSavingsRuleRepository();
      var goalRepo = createMockGoalRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(savingsRepo, goalRepo, txService);
      savingsRepo.setData([{ id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }]);

      var result = await service.getAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('getActive()', () => {
    it('returns only active rules', async () => {
      var savingsRepo = createMockSavingsRuleRepository();
      var goalRepo = createMockGoalRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(savingsRepo, goalRepo, txService);
      savingsRepo.setData([
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true },
        { id: 'rule-2', sourceId: 'src-1', percentage: 30, destinationGoalId: 'goal-2', active: false }
      ]);

      var result = await service.getActive();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('applyRules()', () => {
    it('creates transactions for active rules', async () => {
      var savingsRepo = createMockSavingsRuleRepository();
      var goalRepo = createMockGoalRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(savingsRepo, goalRepo, txService);
      goalRepo.setData([{ id: 'goal-1', name: 'Vacation', target: 3000, current: 500 }]);
      savingsRepo.setData([
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }
      ]);

      var result = await service.applyRules(1000, 'src-1', '2026-09-01');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].amount, 200);
    });
  });

  describe('add()', () => {
    it('creates new rule', async () => {
      var savingsRepo = createMockSavingsRuleRepository();
      var goalRepo = createMockGoalRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(savingsRepo, goalRepo, txService);

      var result = await service.add({ sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1' });
      assert.ok(result.id);
      assert.strictEqual(result.active, true);
    });
  });

  describe('remove()', () => {
    it('removes rule', async () => {
      var savingsRepo = createMockSavingsRuleRepository();
      var goalRepo = createMockGoalRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(savingsRepo, goalRepo, txService);
      savingsRepo.setData([{ id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }]);

      await service.remove('rule-1');
      assert.strictEqual(savingsRepo.calls.filter(function(c) { return c.method === 'remove'; }).length, 1);
    });
  });
});
