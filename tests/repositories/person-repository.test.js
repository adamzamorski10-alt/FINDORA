/**
 * Stage 1.4+ — Person Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/repositories/person-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'person-repository.js'), 'utf8');

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
    PersonRepository: null,
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

describe('PersonRepository', () => {
  describe('loadAll()', () => {
    it('returns empty array when no data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      var result = await window.PersonRepository.loadAll();
      assert.deepStrictEqual(result, []);
    });

    it('returns all people from storage', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'person-1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }
      ]);

      var result = await window.PersonRepository.loadAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('findById()', () => {
    it('returns person when found', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'person-1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }
      ]);

      var result = await window.PersonRepository.findById('person-1');
      assert.ok(result);
      assert.strictEqual(result.name, 'Jan');
    });
  });

  describe('findByType()', () => {
    it('filters by type', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'p1', name: 'Jan', type: 'debtor', debts: [], repayments: [] },
        { id: 'p2', name: 'Bank', type: 'creditor', debts: [], repayments: [] }
      ]);

      var result = await window.PersonRepository.findByType('debtor');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'debtor');
    });
  });

  describe('save()', () => {
    it('persists new person', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', []);

      var person = {
        id: 'person-new',
        name: 'Nowa Osoba',
        type: 'debtor'
      };

      var result = await window.PersonRepository.save(person);
      assert.ok(result.id);
      assert.strictEqual(result.name, 'Nowa Osoba');
    });

    it('throws on invalid type', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);

      await assert.rejects(
        function() { return window.PersonRepository.save({ name: 'Test', type: 'invalid' }); },
        /type must be/
      );
    });
  });

  describe('remove()', () => {
    it('removes person by id', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'person-1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }
      ]);

      await window.PersonRepository.remove('person-1');

      var saveCall = mock.calls.filter(function(c) { return c.method === 'set'; }).pop();
      assert.strictEqual(saveCall.data.length, 0);
    });
  });

  describe('addDebt()', () => {
    it('adds debt to person', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'person-1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }
      ]);

      var result = await window.PersonRepository.addDebt('person-1', { amount: 500, description: 'Pożyczka' });
      assert.ok(result.debts.length === 1);
      assert.strictEqual(result.debts[0].amount, 500);
    });

    it('throws on nonexistent person', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', []);

      await assert.rejects(
        function() { return window.PersonRepository.addDebt('nonexistent', { amount: 500 }); },
        /Person not found/
      );
    });
  });

  describe('addRepayment()', () => {
    it('adds repayment to person', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'person-1', name: 'Jan', type: 'debtor', debts: [{ id: 'debt-1', amount: 500, repaid: 0 }], repayments: [] }
      ]);

      var result = await window.PersonRepository.addRepayment('person-1', { amount: 200 });
      assert.ok(result.repayments.length === 1);
      assert.strictEqual(result.repayments[0].amount, 200);
    });

    it('throws on nonexistent person', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', []);

      await assert.rejects(
        function() { return window.PersonRepository.addRepayment('nonexistent', { amount: 200 }); },
        /Person not found/
      );
    });
  });

  describe('listen()', () => {
    it('receives initial data', async () => {
      var mock = createMockStorageAdapter();
      var window = setupRepository(mock);
      mock.adapter.set('finapp_people', [
        { id: 'person-1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }
      ]);

      var received = [];
      var unsubscribe = window.PersonRepository.listen(function(data) {
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
      var repoCodeStr = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'repositories', 'person-repository.js'), 'utf8');

      assert.ok(!repoCodeStr.includes('DataLayer'), 'Should not reference DataLayer');
      assert.ok(!repoCodeStr.includes('dbData'), 'Should not reference dbData');
      assert.ok(!repoCodeStr.includes('firebase'), 'Should not reference Firebase');
      assert.ok(!repoCodeStr.includes('currentUserRef'), 'Should not reference currentUserRef');
    });
  });
});
