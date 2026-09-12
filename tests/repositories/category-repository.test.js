/**
 * Stage 1.4+ — Category Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/category-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'category-repository.js'), 'utf8');

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
    CategoryRepository: null,
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

describe('CategoryRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.CategoryRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all categories from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'cat-1', name: 'Jedzenie', type: 'expense', icon: '🍔', color: '#FF6B6B', isSystem: true },
        { id: 'cat-2', name: 'Wynagrodzenie', type: 'income', icon: '💰', color: '#00B894', isSystem: true }
      ];
      mock.adapter.set('finapp_categories', existing);

      var result = await window.CategoryRepository.loadAll();
      assert.strictEqual(result.length, 2);
    });
  });

  describe('findById()', () => {
    it('returns category when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', [
        { id: 'cat-1', name: 'Jedzenie', type: 'expense', icon: '🍔', color: '#FF6B6B', isSystem: true }
      ]);

      var result = await window.CategoryRepository.findById('cat-1');
      assert.ok(result);
      assert.strictEqual(result.name, 'Jedzenie');
    });

    it('returns null when not found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', []);

      var result = await window.CategoryRepository.findById('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('findByType()', () => {
    it('filters by type', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', [
        { id: 'cat-1', name: 'Jedzenie', type: 'expense', isSystem: true },
        { id: 'cat-2', name: 'Wynagrodzenie', type: 'income', isSystem: true }
      ]);

      var result = await window.CategoryRepository.findByType('expense');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'expense');
    });
  });

  describe('findSystem()', () => {
    it('returns only system categories', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', [
        { id: 'cat-1', name: 'Jedzenie', type: 'expense', isSystem: true },
        { id: 'cat-2', name: 'Custom', type: 'expense', isSystem: false }
      ]);

      var result = await window.CategoryRepository.findSystem();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].isSystem, true);
    });
  });

  describe('findUser()', () => {
    it('returns only user categories', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', [
        { id: 'cat-1', name: 'Jedzenie', type: 'expense', isSystem: true },
        { id: 'cat-2', name: 'Custom', type: 'expense', isSystem: false }
      ]);

      var result = await window.CategoryRepository.findUser();
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].isSystem, false);
    });
  });

  describe('save()', () => {
    it('persists new category', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', []);

      var category = {
        id: 'cat-new',
        name: 'Nowa',
        type: 'expense',
        icon: '🛒',
        color: '#FF0000'
      };

      var result = await window.CategoryRepository.save(category);
      assert.ok(result.id);
      assert.strictEqual(result.name, 'Nowa');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
    });

    it('throws on invalid type', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.CategoryRepository.save({ name: 'Test', type: 'invalid' }); },
        /type must be/
      );
    });
  });

  describe('remove()', () => {
    it('removes user category', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', [
        { id: 'cat-user', name: 'Custom', type: 'expense', isSystem: false }
      ]);

      await window.CategoryRepository.remove('cat-user');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 0);
    });

    it('throws on removing system category', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', [
        { id: 'cat-1', name: 'Jedzenie', type: 'expense', isSystem: true }
      ]);

      await assert.rejects(
        function() { return window.CategoryRepository.remove('cat-1'); },
        /Cannot remove system category/
      );
    });
  });

  describe('seedDefaults()', () => {
    it('seeds default categories when empty', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_categories', []);

      var result = await window.CategoryRepository.seedDefaults();

      var setCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.ok(setCall);
      assert.strictEqual(setCall.data.length, 10);
    });
  });

  describe('repository isolation', () => {
    it('does not reference DataLayer, dbData, or Firebase', () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'category-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
