/**
 * Stage 1.4+ — Goal Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/goal-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'goal-repository.js'), 'utf8');

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
    GoalRepository: null,
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

describe('GoalRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.GoalRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all goals from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', [
        { id: 'goal-1', name: 'Wakacje', target: 3000, current: 500, deadline: '2027-06-01' }
      ]);

      var result = await window.GoalRepository.loadAll();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].target, 3000);
    });
  });

  describe('findById()', () => {
    it('returns goal when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', [
        { id: 'goal-1', name: 'Wakacje', target: 3000, current: 500, deadline: '2027-06-01' }
      ]);

      var result = await window.GoalRepository.findById('goal-1');
      assert.ok(result);
      assert.strictEqual(result.name, 'Wakacje');
    });

    it('returns null when not found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', []);

      var result = await window.GoalRepository.findById('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('save()', () => {
    it('persists new goal', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', []);

      var goal = {
        id: 'goal-new',
        name: 'Nowy Cel',
        target: 5000,
        current: 0,
        deadline: '2027-12-31',
        icon: '🎯',
        color: '#FF0000'
      };

      var result = await window.GoalRepository.save(goal);
      assert.ok(result.id);
      assert.strictEqual(result.name, 'Nowy Cel');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
    });

    it('throws on negative target', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.GoalRepository.save({ name: 'Test', target: -100, current: 0 }); },
        /target must be a positive number/
      );
    });

    it('throws on negative current', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.GoalRepository.save({ name: 'Test', target: 100, current: -10 }); },
        /current must be a non-negative number/
      );
    });
  });

  describe('remove()', () => {
    it('removes goal by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', [
        { id: 'goal-1', name: 'Wakacje', target: 3000, current: 500, deadline: '2027-06-01' },
        { id: 'goal-2', name: 'Nowy Laptop', target: 5000, current: 0 }
      ]);

      await window.GoalRepository.remove('goal-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].id, 'goal-2');
    });
  });

  describe('updateProgress()', () => {
    it('updates goal current amount', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', [
        { id: 'goal-1', name: 'Wakacje', target: 3000, current: 500, deadline: '2027-06-01' }
      ]);

      var result = await window.GoalRepository.updateProgress('goal-1', 1000);
      assert.strictEqual(result.current, 1000);
      assert.ok(result.updatedAt);
    });

    it('throws on nonexistent goal', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', []);

      await assert.rejects(
        function() { return window.GoalRepository.updateProgress('nonexistent', 100); },
        /Goal not found/
      );
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', [
        { id: 'goal-1', name: 'Wakacje', target: 3000, current: 500, deadline: '2027-06-01' }
      ]);

      var received = [];
      var unsubscribe = window.GoalRepository.listen(function(data) {
        received.push(data);
      });

      await Promise.resolve();
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0][0].id, 'goal-1');
      unsubscribe();
    });

    it('receives updates when data changes', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_goals', []);

      var received = [];
      var unsubscribe = window.GoalRepository.listen(function(data) {
        received.push(data);
      });

      mock.trigger('finapp_goals', [
        { id: 'goal-1', name: 'Wakacje', target: 3000, current: 500, deadline: '2027-06-01' }
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
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'goal-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
