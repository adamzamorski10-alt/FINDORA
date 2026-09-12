/**
 * Stage 1.4+ — Account Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/account-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'account-repository.js'), 'utf8');

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
    AccountRepository: null,
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

describe('AccountRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.AccountRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all accounts from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'acc-1', name: 'Konto', type: 'bank', icon: '🏦', color: '#4A90D9', archived: false },
        { id: 'acc-2', name: 'Skarbonka', type: 'cash', icon: '💰', color: '#50C878', archived: false }
      ];
      mock.adapter.set('finapp_accounts', existing);

      var result = await window.AccountRepository.loadAll();
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'acc-1');
    });
  });

  describe('findById()', () => {
    it('returns account when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'acc-1', name: 'Konto', type: 'bank', icon: '🏦', color: '#4A90D9', archived: false }
      ];
      mock.adapter.set('finapp_accounts', existing);

      var result = await window.AccountRepository.findById('acc-1');
      assert.ok(result);
      assert.strictEqual(result.id, 'acc-1');
      assert.strictEqual(result.name, 'Konto');
    });

    it('returns null when not found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_accounts', []);

      var result = await window.AccountRepository.findById('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('findActive()', () => {
    it('returns only non-archived accounts', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'acc-1', name: 'Konto', type: 'bank', archived: false },
        { id: 'acc-2', name: 'Old', type: 'bank', archived: true },
        { id: 'acc-3', name: 'Savings', type: 'savings', archived: false }
      ];
      mock.adapter.set('finapp_accounts', existing);

      var result = await window.AccountRepository.findActive();
      assert.strictEqual(result.length, 2);
      assert.ok(result.every(function(a) { return !a.archived; }));
    });
  });

  describe('save()', () => {
    it('persists new account', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_accounts', []);

      var account = {
        id: 'acc-new',
        name: 'Nowe Konto',
        type: 'bank',
        icon: '🏦',
        color: '#4A90D9'
      };

      var result = await window.AccountRepository.save(account);
      assert.ok(result.id);
      assert.strictEqual(result.name, 'Nowe Konto');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.ok(saveCall);
      assert.strictEqual(saveCall.key, 'finapp_accounts');
      assert.strictEqual(saveCall.data.length, 1);
    });

    it('updates existing account', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'acc-1', name: 'Konto', type: 'bank', icon: '🏦', color: '#4A90D9', archived: false }
      ];
      mock.adapter.set('finapp_accounts', existing);

      var updated = {
        id: 'acc-1',
        name: 'Updated Konto',
        type: 'bank',
        icon: '🏦',
        color: '#FF0000'
      };

      var result = await window.AccountRepository.save(updated);
      assert.strictEqual(result.name, 'Updated Konto');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].name, 'Updated Konto');
    });

    it('throws on validation error', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.AccountRepository.save({}); },
        /Validation failed/
      );
    });

    it('throws on invalid type', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.AccountRepository.save({ name: 'Test', type: 'invalid' }); },
        /type must be/
      );
    });
  });

  describe('remove()', () => {
    it('removes account by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'acc-1', name: 'Konto', type: 'bank', archived: false },
        { id: 'acc-2', name: 'Skarbonka', type: 'cash', archived: false }
      ];
      mock.adapter.set('finapp_accounts', existing);

      await window.AccountRepository.remove('acc-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].id, 'acc-2');
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'acc-1', name: 'Konto', type: 'bank', icon: '🏦', color: '#4A90D9', archived: false }
      ];
      mock.adapter.set('finapp_accounts', existing);

      var received = [];
      var unsubscribe = window.AccountRepository.listen(function(data) {
        received.push(data);
      });

      await Promise.resolve();
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0][0].id, 'acc-1');
      unsubscribe();
    });

    it('receives updates when data changes', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_accounts', []);

      var received = [];
      var unsubscribe = window.AccountRepository.listen(function(data) {
        received.push(data);
      });

      mock.trigger('finapp_accounts', [
        { id: 'acc-1', name: 'Konto', type: 'bank', icon: '🏦', color: '#4A90D9', archived: false }
      ]);

      await Promise.resolve();
      assert.strictEqual(received.length, 2);
      assert.strictEqual(received[1][0].id, 'acc-1');
      unsubscribe();
    });
  });

  describe('seedDefaults()', () => {
    it('seeds default accounts when empty', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_accounts', []);

      var result = await window.AccountRepository.seedDefaults();

      var setCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.ok(setCall);
      assert.strictEqual(setCall.key, 'finapp_accounts');
      assert.strictEqual(setCall.data.length, 4);
    });

    it('does not seed when accounts exist', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_accounts', [{ id: 'acc-1', name: 'Existing', type: 'bank' }]);

      var result = await window.AccountRepository.seedDefaults();

      var setCalls = mock.calls.filter(function(c) { return c.method === 'set'; });
      assert.strictEqual(setCalls.length, 1); // only the initial setup
    });
  });

  describe('repository isolation', () => {
    it('does not reference DataLayer, dbData, or Firebase', () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'account-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
