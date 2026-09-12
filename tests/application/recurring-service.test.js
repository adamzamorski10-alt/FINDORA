/**
 * Stage 1.4+ — Recurring Service tests.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

function createMockRecurringRuleRepository() {
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

  function updateLastBooked(id, date) {
    calls.push({ method: 'updateLastBooked', id, date });
    var rule = data.find(function(r) { return r.id === id; });
    if (!rule) return Promise.reject(new Error('Recurring rule not found: ' + id));
    rule.lastBooked = date;
    return Promise.resolve(JSON.parse(JSON.stringify(rule)));
  }

  return { loadAll: loadAll, findById: findById, findActive: findActive, save: save, remove: remove, updateLastBooked: updateLastBooked, calls: calls, setData: function(d) { data = d; } };
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

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(t) { return t.id !== id; });
    return Promise.resolve();
  }

  return { add: add, remove: remove, calls: calls, setData: function(d) { data = d; } };
}

function setupService(ruleRepo, txService) {
  var window = { RecurringService: null };
  var RecurringService = require('../../src/application/recurring/recurring-service.js');
  window.RecurringService = { create: RecurringService.create };
  var service = window.RecurringService.create(ruleRepo, txService);
  return { service: service, window: window };
}

describe('RecurringService', () => {
  describe('getAll()', () => {
    it('returns all rules', async () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);
      ruleRepo.setData([{ id: 'r1', name: 'Netflix', type: 'expense', amount: 30, accountId: 'acc-1', frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01', active: true }]);

      var result = await service.getAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('getActive()', () => {
    it('returns only active rules', async () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);
      ruleRepo.setData([
        { id: 'r1', name: 'Netflix', type: 'expense', amount: 30, accountId: 'acc-1', frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01', active: true },
        { id: 'r2', name: 'Old', type: 'expense', amount: 10, accountId: 'acc-1', frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01', active: false }
      ]);

      var result = await service.getActive();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('isDue()', () => {
    it('returns true for due rule', () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);

      var result = service.isDue({ frequency: 'monthly', dayOfMonth: 1, lastBooked: '2026-08-01', startDate: '2026-01-01' });
      assert.strictEqual(result, true);
    });
  });

  describe('book()', () => {
    it('creates transaction for due rule', async () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);
      ruleRepo.setData([
        { id: 'r1', name: 'Netflix', type: 'expense', amount: 30, accountId: 'acc-1', frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01', active: true, lastBooked: '2026-08-01' }
      ]);

      var result = await service.book('r1');
      assert.ok(result);
      assert.strictEqual(result.amount, 30);
      assert.strictEqual(result.tags.join(), 'recurring');
    });

    it('throws on nonexistent rule', async () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);

      await assert.rejects(function() { return service.book('nonexistent'); }, /Recurring rule not found/);
    });
  });

  describe('add()', () => {
    it('creates new rule', async () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);

      var result = await service.add({ name: 'Netflix', type: 'expense', amount: 30, accountId: 'acc-1', frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01' });
      assert.ok(result.id);
      assert.strictEqual(result.active, true);
    });
  });

  describe('remove()', () => {
    it('removes rule', async () => {
      var ruleRepo = createMockRecurringRuleRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(ruleRepo, txService);
      ruleRepo.setData([{ id: 'r1', name: 'Netflix', type: 'expense', amount: 30, accountId: 'acc-1', frequency: 'monthly', dayOfMonth: 1, startDate: '2026-01-01', active: true }]);

      await service.remove('r1');
      assert.strictEqual(ruleRepo.calls.filter(function(c) { return c.method === 'remove'; }).length, 1);
    });
  });
});
