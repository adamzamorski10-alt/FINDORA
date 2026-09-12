/**
 * Stage 1.4+ — Savings Rule Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/savings-rule-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'savings-rule-repository.js'), 'utf8');

function createMockStorageAdapter() {
  var calls = [];
  var store = {};
  var listeners = {};

  function get(key) {
    calls.push({ method: 'get', key });
    return Promise.resolve(store[key] !== undefined ? JSON.parse(JSON.stringify(store[key])) : null);
  }

  function set(key, value) {
    calls.push({ method: 'set', key, data: JSON.parse(JSON.stringify(value)) });
    store[key] = JSON.parse(JSON.stringify(value));
    return Promise.resolve();
  }

  function update(key, values) {
    calls.push({ method: 'update', key, values: JSON.parse(JSON.stringify(values)) });
    return Promise.resolve();
  }

  function updateMany(updates) {
    calls.push({ method: 'updateMany', updates: JSON.parse(JSON.stringify(updates)) });
    return Promise.resolve();
  }

  function remove(key) {
    calls.push({ method: 'remove', key });
    delete store[key];
    return Promise.resolve();
  }

  function listen(path, callback, errCallback) {
    calls.push({ method: 'listen', path });
    if (!listeners[path]) {
      listeners[path] = [];
    }
    var wrappedCallback = function(value) {
      try { callback(value); } catch (_) {}
    };
    listeners[path].push(wrappedCallback);
    get(path).then(function(value) {
      wrappedCallback(value);
    }).catch(function(err) {
      if (typeof errCallback === 'function') {
        errCallback(err);
      }
    });
    return function unsubscribe() {
      if (listeners[path]) {
        listeners[path] = listeners[path].filter(function(l) {
          return l !== wrappedCallback;
        });
      }
    };
  }

  function trigger(path, value) {
    store[path] = JSON.parse(JSON.stringify(value));
    if (listeners[path]) {
      listeners[path].forEach(function(callback) {
        Promise.resolve().then(function() {
          callback(value);
        });
      });
    }
  }

  function reset() {
    for (var key in store) {
      delete store[key];
    }
    for (var key in listeners) {
      delete listeners[key];
    }
  }

  var adapter = {
    get: get,
    set: set,
    update: update,
    updateMany: updateMany,
    remove: remove,
    listen: listen
  };

  return { adapter: adapter, calls: calls, trigger: trigger, reset: reset };
}

function setupRepository(mock) {
  var window = {
    SavingsRuleRepository: null,
    StorageAdapterContract: {
      create: function(adapter, name) {
        var required = ['get', 'set', 'update', 'updateMany', 'remove', 'listen'];
        var missing = required.filter(function(method) {
          return typeof adapter[method] !== 'function';
        });
        if (missing.length > 0) {
          throw new Error('[StorageAdapterContract] ' + (name || 'anonymous') + ' missing methods: ' + missing.join(', '));
        }
        return adapter;
      }
    },
    setActiveStorageAdapter: function(adapter, name) {
      window.StorageAdapterContract.create(adapter, name);
      window.StorageAdapter = adapter;
    },
    getActiveStorageAdapter: function() {
      if (!window.StorageAdapter) {
        throw new Error('[StorageAdapter] No active adapter configured.');
      }
      return window.StorageAdapter;
    },
    console: console
  };

  var script = new Function('window', repoCode);
  script(window);

  window.setActiveStorageAdapter(mock.adapter, 'test');

  return window;
}

describe('SavingsRuleRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.SavingsRuleRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all rules from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', [
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }
      ]);

      var result = await window.SavingsRuleRepository.loadAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('findById()', () => {
    it('returns rule when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', [
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }
      ]);

      var result = await window.SavingsRuleRepository.findById('rule-1');
      assert.ok(result);
      assert.strictEqual(result.percentage, 20);
    });
  });

  describe('findBySource()', () => {
    it('returns rules for source', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', [
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true },
        { id: 'rule-2', sourceId: 'src-2', percentage: 30, destinationGoalId: 'goal-2', active: true }
      ]);

      var result = await window.SavingsRuleRepository.findBySource('src-1');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].sourceId, 'src-1');
    });
  });

  describe('findActive()', () => {
    it('returns only active rules', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', [
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true },
        { id: 'rule-2', sourceId: 'src-1', percentage: 30, destinationGoalId: 'goal-2', active: false }
      ]);

      var result = await window.SavingsRuleRepository.findActive();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].active, true);
    });
  });

  describe('save()', () => {
    it('persists new rule', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', []);

      var rule = {
        id: 'rule-new',
        sourceId: 'src-1',
        percentage: 20,
        destinationGoalId: 'goal-1'
      };

      var result = await window.SavingsRuleRepository.save(rule);
      assert.ok(result.id);
      assert.strictEqual(result.percentage, 20);
    });

    it('throws on invalid percentage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.SavingsRuleRepository.save({ sourceId: 'src-1', percentage: 150, destinationGoalId: 'goal-1' }); },
        /percentage must be between/
      );
    });
  });

  describe('remove()', () => {
    it('removes rule by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', [
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }
      ]);

      await window.SavingsRuleRepository.remove('rule-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 0);
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_savings_rules', [
        { id: 'rule-1', sourceId: 'src-1', percentage: 20, destinationGoalId: 'goal-1', active: true }
      ]);

      var received = [];
      var unsubscribe = window.SavingsRuleRepository.listen(function(data) {
        received.push(data);
      });

      await Promise.resolve();
      assert.strictEqual(received.length, 1);
      unsubscribe();
    });
  });

  describe('repository isolation', () => {
    it('does not reference DataLayer, dbData, or Firebase', () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'savings-rule-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
