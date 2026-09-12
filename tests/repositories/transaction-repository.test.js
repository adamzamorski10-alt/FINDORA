/**
 * Stage 1.4+ — Transaction Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/transaction-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'transaction-repository.js'), 'utf8');

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
    TransactionRepository: null,
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

describe('TransactionRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.TransactionRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all transactions from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} },
        { id: 'tx-2', amount: 50, type: 'expense', accountId: 'acc-1', date: '2026-09-02', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      var result = await window.TransactionRepository.loadAll();
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'tx-1');
      assert.strictEqual(result[1].id, 'tx-2');
    });

    it('normalizes transactions on load', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var legacy = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: undefined, notes: undefined }
      ];
      mock.adapter.set('finapp_transactions', legacy);

      var result = await window.TransactionRepository.loadAll();
      assert.deepStrictEqual(result[0].tags, []);
      assert.strictEqual(result[0].notes, '');
      assert.ok(result[0].metadata);
    });
  });

  describe('findById()', () => {
    it('returns transaction when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      var result = await window.TransactionRepository.findById('tx-1');
      assert.ok(result);
      assert.strictEqual(result.id, 'tx-1');
    });

    it('returns null when not found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transactions', []);

      var result = await window.TransactionRepository.findById('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('findByMonth()', () => {
    it('filters transactions by month', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} },
        { id: 'tx-2', amount: 50, type: 'expense', accountId: 'acc-1', date: '2026-08-01', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      var result = await window.TransactionRepository.findByMonth('2026-09');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'tx-1');
    });

    it('excludes transactions with metadata.excluded', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: { excluded: true } },
        { id: 'tx-2', amount: 50, type: 'expense', accountId: 'acc-1', date: '2026-09-02', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      var result = await window.TransactionRepository.findByMonth('2026-09');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'tx-2');
    });
  });

  describe('save()', () => {
    it('persists new transaction', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transactions', []);

      var tx = {
        id: 'tx-new',
        amount: 100,
        type: 'income',
        accountId: 'acc-1',
        date: '2026-09-01',
        tags: [],
        notes: '',
        metadata: {}
      };

      var result = await window.TransactionRepository.save(tx);
      assert.ok(result);
      assert.strictEqual(result.id, 'tx-new');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.ok(saveCall);
      assert.strictEqual(saveCall.key, 'finapp_transactions');
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].id, 'tx-new');
    });

    it('updates existing transaction', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      var updated = {
        id: 'tx-1',
        amount: 200,
        type: 'expense',
        accountId: 'acc-2',
        date: '2026-09-02',
        tags: ['food'],
        notes: 'Updated',
        metadata: {}
      };

      var result = await window.TransactionRepository.save(updated);
      assert.strictEqual(result.amount, 200);
      assert.strictEqual(result.type, 'expense');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].amount, 200);
    });

    it('throws on validation error', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.TransactionRepository.save({ amount: 100 }); },
        /Validation failed/
      );
    });

    it('throws on negative amount', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.TransactionRepository.save({ id: 'tx-1', amount: -10, type: 'expense', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }); },
        /amount must be a positive number/
      );
    });
  });

  describe('remove()', () => {
    it('removes transaction by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} },
        { id: 'tx-2', amount: 50, type: 'expense', accountId: 'acc-1', date: '2026-09-02', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      await window.TransactionRepository.remove('tx-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 1);
      assert.strictEqual(saveCall.data[0].id, 'tx-2');
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var existing = [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ];
      mock.adapter.set('finapp_transactions', existing);

      var received = [];
      var unsubscribe = window.TransactionRepository.listen(function(data) {
        received.push(data);
      });

      await Promise.resolve();
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0][0].id, 'tx-1');
      unsubscribe();
    });

    it('receives updates when data changes', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transactions', []);

      var received = [];
      var unsubscribe = window.TransactionRepository.listen(function(data) {
        received.push(data);
      });

      mock.trigger('finapp_transactions', [
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ]);

      await Promise.resolve();
      assert.strictEqual(received.length, 2);
      assert.strictEqual(received[1][0].id, 'tx-1');
      unsubscribe();
    });

    it('returns unsubscribe function', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_transactions', []);

      var unsubscribe = window.TransactionRepository.listen(function() {});
      assert.strictEqual(typeof unsubscribe, 'function');
      unsubscribe();
    });
  });

  describe('repository isolation', () => {
    it('does not reference DataLayer, dbData, or Firebase', () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'transaction-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
