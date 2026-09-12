/**
 * Stage 1.4+ — Budget Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/budget-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'budget-repository.js'), 'utf8');

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
    BudgetRepository: null,
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

describe('BudgetRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.BudgetRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all budgets from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', [
        { id: 'budget-1', categoryId: 'cat-1', limit: 500, period: 'monthly' }
      ]);

      var result = await window.BudgetRepository.loadAll();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].limit, 500);
    });
  });

  describe('findById()', () => {
    it('returns budget when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', [
        { id: 'budget-1', categoryId: 'cat-1', limit: 500, period: 'monthly' }
      ]);

      var result = await window.BudgetRepository.findById('budget-1');
      assert.ok(result);
      assert.strictEqual(result.categoryId, 'cat-1');
    });

    it('returns null when not found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', []);

      var result = await window.BudgetRepository.findById('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('findByCategory()', () => {
    it('returns budget for category', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', [
        { id: 'budget-1', categoryId: 'cat-food', limit: 500, period: 'monthly' }
      ]);

      var result = await window.BudgetRepository.findByCategory('cat-food');
      assert.ok(result);
      assert.strictEqual(result.limit, 500);
    });

    it('returns null when no budget for category', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', []);

      var result = await window.BudgetRepository.findByCategory('cat-food');
      assert.strictEqual(result, null);
    });
  });

  describe('save()', () => {
    it('persists new budget', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', []);

      var budget = {
        id: 'budget-new',
        categoryId: 'cat-food',
        limit: 500,
        period: 'monthly'
      };

      var result = await window.BudgetRepository.save(budget);
      assert.ok(result.id);

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
    });

    it('throws on invalid limit', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.BudgetRepository.save({ categoryId: 'cat-1', limit: -10, period: 'monthly' }); },
        /limit must be a positive number/
      );
    });
  });

  describe('remove()', () => {
    it('removes budget by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', [
        { id: 'budget-1', categoryId: 'cat-1', limit: 500, period: 'monthly' },
        { id: 'budget-2', categoryId: 'cat-2', limit: 300, period: 'monthly' }
      ]);

      await window.BudgetRepository.remove('budget-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].id, 'budget-2');
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', [
        { id: 'budget-1', categoryId: 'cat-1', limit: 500, period: 'monthly' }
      ]);

      var received = [];
      var unsubscribe = window.BudgetRepository.listen(function(data) {
        received.push(data);
      });

      await Promise.resolve();
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0][0].id, 'budget-1');
      unsubscribe();
    });

    it('receives updates when data changes', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_budgets', []);

      var received = [];
      var unsubscribe = window.BudgetRepository.listen(function(data) {
        received.push(data);
      });

      mock.trigger('finapp_budgets', [
        { id: 'budget-1', categoryId: 'cat-1', limit: 500, period: 'monthly' }
      ]);

      await Promise.resolve();
      assert.strictEqual(received.length, 2);
      unsubscribe();
    });
  });

  describe('repository isolation', () => {
    it('does not reference DataLayer, dbData, or Firebase', () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'budget-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
