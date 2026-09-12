/**
 * Stage 1.4+ — Transfer Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/transfer-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'transfer-repository.js'), 'utf8');

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
    TransferRepository: null,
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

describe('TransferRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.TransferRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all transfers from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transfers', [
        { id: 'tr-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, date: '2026-09-01' }
      ]);

      var result = await window.TransferRepository.loadAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('findById()', () => {
    it('returns transfer when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transfers', [
        { id: 'tr-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, date: '2026-09-01' }
      ]);

      var result = await window.TransferRepository.findById('tr-1');
      assert.ok(result);
      assert.strictEqual(result.fromAccountId, 'acc-1');
    });
  });

  describe('save()', () => {
    it('persists new transfer', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transfers', []);

      var transfer = {
        id: 'tr-new',
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 100,
        description: 'Przelew'
      };

      var result = await window.TransferRepository.save(transfer);
      assert.ok(result.id);
      assert.strictEqual(result.amount, 100);
    });

    it('throws on same from/to account', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.TransferRepository.save({ fromAccountId: 'acc-1', toAccountId: 'acc-1', amount: 100 }); },
        /fromAccountId must differ/
      );
    });
  });

  describe('remove()', () => {
    it('removes transfer by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transfers', [
        { id: 'tr-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, date: '2026-09-01' }
      ]);

      await window.TransferRepository.remove('tr-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 0);
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transfers', [
        { id: 'tr-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, date: '2026-09-01' }
      ]);

      var received = [];
      var unsubscribe = window.TransferRepository.listen(function(data) {
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
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'transfer-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
