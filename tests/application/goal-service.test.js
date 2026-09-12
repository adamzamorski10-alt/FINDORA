/**
 * Stage 1.4+ — Goal Service tests.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

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
    var index = data.findIndex(function(g) { return g.id === goal.id; });
    if (index >= 0) { data[index] = goal; } else { data.push(goal); }
    return Promise.resolve(JSON.parse(JSON.stringify(goal)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(g) { return g.id !== id; });
    return Promise.resolve();
  }

  function updateProgress(id, newAmount) {
    calls.push({ method: 'updateProgress', id, newAmount });
    var goal = data.find(function(g) { return g.id === id; });
    if (!goal) return Promise.reject(new Error('Goal not found: ' + id));
    goal.current = newAmount;
    goal.updatedAt = new Date().toISOString();
    return Promise.resolve(JSON.parse(JSON.stringify(goal)));
  }

  return { loadAll: loadAll, findById: findById, save: save, remove: remove, updateProgress: updateProgress, calls: calls, setData: function(d) { data = d; } };
}

function setupService(goalRepo) {
  global.window = { GoalService: null, GoalEtaCalculator: null, incomeSources: [] };
  var GoalService = require('../../src/application/goal/goal-service.js');
  global.window.GoalService = { create: GoalService.create };
  var service = global.window.GoalService.create(goalRepo);
  return { service: service, window: global.window };
}

describe('GoalService', () => {
  describe('getAll()', () => {
    it('returns all goals', async () => {
      var repo = createMockGoalRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'g1', name: 'Vacation', target: 3000, current: 500 }]);

      var result = await service.getAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('getEta()', () => {
    it('returns goal with calculator output when available', async () => {
      var repo = createMockGoalRepository();
      var { service, window } = setupService(repo);
      window.GoalEtaCalculator = { compute: function() { return { eta: '2027-06-01', monthsRemaining: 10, requiredMonthly: 250 }; } };
      repo.setData([{ id: 'g1', name: 'Vacation', target: 3000, current: 500 }]);

      var result = await service.getEta('g1');
      assert.strictEqual(result.eta, '2027-06-01');
    });

    it('throws on nonexistent goal', async () => {
      var repo = createMockGoalRepository();
      var { service } = setupService(repo);

      await assert.rejects(function() { return service.getEta('nonexistent'); }, /Goal not found/);
    });
  });

  describe('add()', () => {
    it('creates new goal', async () => {
      var repo = createMockGoalRepository();
      var { service } = setupService(repo);

      var result = await service.add({ name: 'Vacation', target: 3000 });
      assert.ok(result.id);
      assert.strictEqual(result.current, 0);
    });
  });

  describe('update()', () => {
    it('updates existing goal', async () => {
      var repo = createMockGoalRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'g1', name: 'Vacation', target: 3000, current: 500 }]);

      var result = await service.update('g1', { target: 5000 });
      assert.strictEqual(result.target, 5000);
    });
  });

  describe('remove()', () => {
    it('removes goal', async () => {
      var repo = createMockGoalRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'g1', name: 'Vacation', target: 3000, current: 500 }]);

      await service.remove('g1');
      assert.strictEqual(repo.calls.filter(function(c) { return c.method === 'remove'; }).length, 1);
    });
  });

  describe('updateProgress()', () => {
    it('updates goal progress', async () => {
      var repo = createMockGoalRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'g1', name: 'Vacation', target: 3000, current: 500 }]);

      var result = await service.updateProgress('g1', 1000);
      assert.strictEqual(result.current, 1000);
    });
  });
});
