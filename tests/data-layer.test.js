/**
 * Stage 1.2B — Data Layer adapter tests.
 *
 * Tests the extracted persistence primitives with a mock Firebase.
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/data-layer.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dataLayerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'data-layer.js'), 'utf8');

function createMockFirebase() {
  const calls = [];
  const userData = {};

  const mockRef = {
    child: function(key) {
      calls.push({ method: 'child', key: key });
      return {
        set: function(value) {
          calls.push({ method: 'set', key: key, value: JSON.parse(JSON.stringify(value)) });
          userData[key] = JSON.parse(JSON.stringify(value));
          return Promise.resolve();
        },
        on: function(event, callback) {
          calls.push({ method: 'on', event: event, key: key });
          return function() {};
        },
        off: function() {
          calls.push({ method: 'off', key: key });
        },
        remove: function() {
          calls.push({ method: 'remove', key: key });
          return Promise.resolve();
        },
        once: function(event) {
          calls.push({ method: 'once', event: event, key: key });
          return Promise.resolve({ val: function() { return JSON.parse(JSON.stringify(userData)); } });
        }
      };
    },
    update: function(data) {
      calls.push({ method: 'update', data: JSON.parse(JSON.stringify(data)) });
      Object.assign(userData, JSON.parse(JSON.stringify(data)));
      return Promise.resolve();
    },
    once: function(event) {
      calls.push({ method: 'once', event: event });
      return Promise.resolve({ val: function() { return JSON.parse(JSON.stringify(userData)); } });
    },
    ref: function(path) {
      calls.push({ method: 'ref', path: path });
      return mockRef;
    }
  };

  const mockDatabase = function() {
    calls.push({ method: 'database' });
    return mockRef;
  };

  const mockFirebase = {
    database: mockDatabase,
    auth: function() {
      return {
        onAuthStateChanged: function(callback) {
          calls.push({ method: 'onAuthStateChanged' });
          return function() {};
        },
        signInWithEmailAndPassword: function() { return Promise.resolve(); },
        createUserWithEmailAndPassword: function() { return Promise.resolve(); },
        signOut: function() { return Promise.resolve(); }
      };
    }
  };

  return {
    firebase: mockFirebase,
    calls: calls,
    userData: userData,
    mockRef: mockRef
  };
}

function createMockStorageAdapter() {
  const calls = [];
  const adapter = {
    get: function(path) {
      calls.push({ method: 'get', path: path });
      return Promise.resolve(null);
    },
    set: function(key, data) {
      calls.push({ method: 'set', key: key, data: JSON.parse(JSON.stringify(data)) });
      return Promise.resolve();
    },
    update: function(path, values) {
      calls.push({ method: 'update', path: path, values: JSON.parse(JSON.stringify(values)) });
      return Promise.resolve();
    },
    updateMany: function(updates) {
      calls.push({ method: 'updateMany', updates: JSON.parse(JSON.stringify(updates)) });
      return Promise.resolve();
    },
    remove: function(key) {
      calls.push({ method: 'remove', key: key });
      return Promise.resolve();
    },
    listen: function(path, callback, errCallback) {
      calls.push({ method: 'listen', path: path });
      return function() {};
    }
  };
  return { adapter, calls };
}

function setupDataLayer(mock, storageMock) {
  const window = {
    firebase: mock.firebase,
    toast: function(msg) { /* no-op in tests */ },
    console: console,
    localStorage: {
      getItem: function() { return null; }
    },
    StorageAdapterContract: {
      create: function(adapter, name) {
        const required = ['get', 'set', 'update', 'updateMany', 'remove', 'listen'];
        const missing = required.filter(method => typeof adapter[method] !== 'function');
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
    }
  };

  if (storageMock) {
    window.setActiveStorageAdapter(storageMock.adapter, 'test');
  }

  const script = new Function('window', dataLayerCode);
  script(window);

  return window;
}

describe('DataLayer Adapter', () => {
  describe('initialization', () => {
    it('attaches db to window', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.ok(window.db);
      assert.ok(window.DataLayer.db);
    });

    it('attaches SK to window with all keys', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.ok(window.SK);
      assert.strictEqual(window.SK.transactions, 'finapp_transactions');
      assert.strictEqual(window.SK.debtors, 'finapp_debtors');
      assert.strictEqual(window.SK.dashboardLayouts, 'finapp_dashboard_layouts');
    });

    it('attaches load to window', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.ok(typeof window.load === 'function');
    });

    it('attaches save to window', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.ok(typeof window.save === 'function');
    });

    it('attaches stripUndefinedDeep to window', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.ok(typeof window._stripUndefinedDeep === 'function');
    });
  });

  describe('load()', () => {
    it('returns cached value when present', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      window.dbData = { finapp_transactions: [1, 2, 3] };
      assert.deepStrictEqual(window.load('finapp_transactions', []), [1, 2, 3]);
    });

    it('returns fallback when key is missing', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      window.dbData = {};
      assert.deepStrictEqual(window.load('finapp_transactions', []), []);
    });

    it('returns fallback when dbData is empty', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.deepStrictEqual(window.load('finapp_transactions', []), []);
    });
  });

  describe('stripUndefinedDeep()', () => {
    it('removes undefined from objects', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      const input = { a: 1, b: undefined, c: { d: undefined, e: 2 } };
      const result = window._stripUndefinedDeep(input);
      assert.deepStrictEqual(result, { a: 1, c: { e: 2 } });
    });

    it('preserves undefined in arrays (Firebase-native behavior)', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      const input = [1, undefined, { a: undefined, b: 2 }];
      const result = window._stripUndefinedDeep(input);
      assert.deepStrictEqual(result, [1, undefined, { b: 2 }]);
    });

    it('preserves null, numbers, strings, booleans', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      const input = { n: null, num: 42, str: 'hello', bool: true };
      const result = window._stripUndefinedDeep(input);
      assert.deepStrictEqual(result, input);
    });

    it('handles deeply nested structures', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      const input = { a: { b: { c: { d: undefined, e: { f: 'deep' } } } } };
      const result = window._stripUndefinedDeep(input);
      assert.deepStrictEqual(result, { a: { b: { c: { e: { f: 'deep' } } } } });
    });
  });

  describe('save()', () => {
    it('delegates to StorageAdapter.set() when ref exists', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const data = { id: 'test', amount: 100 };
      window.save('finapp_transactions', data);

      await new Promise(r => setTimeout(r, 50));

      const setCall = storageMock.calls.find(c => c.method === 'set' && c.key === 'finapp_transactions');
      assert.ok(setCall, 'Expected StorageAdapter.set() call');
      assert.deepStrictEqual(setCall.data, { id: 'test', amount: 100 });
    });

    it('strips undefined before writing', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const data = { id: 'test', note: undefined, amount: 100 };
      window.save('finapp_transactions', data);

      await new Promise(r => setTimeout(r, 50));

      const setCall = storageMock.calls.find(c => c.method === 'set' && c.key === 'finapp_transactions');
      assert.ok(setCall);
      assert.ok(!('note' in setCall.data));
      assert.strictEqual(setCall.data.amount, 100);
    });

    it('returns early when currentUserRef is null', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = null;

      const data = { id: 'test' };
      window.save('finapp_transactions', data);

      await new Promise(r => setTimeout(r, 50));

      const setCall = storageMock.calls.find(c => c.method === 'set');
      assert.ok(!setCall, 'Expected no StorageAdapter.set() call when currentUserRef is null');
    });

    it('logs error when StorageAdapter.set rejects', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.set = function() {
        return Promise.reject(new Error('Firebase error'));
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const consoleErrors = [];
      const originalError = console.error;
      console.error = function(...args) {
        consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      window.save('finapp_transactions', { id: 'test' });
      await new Promise(r => setTimeout(r, 50));

      console.error = originalError;

      assert.ok(consoleErrors.some(e => e.includes('Firebase save error')));
    });

    it('handles synchronous throw from StorageAdapter.set', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.set = function() {
        throw new Error('sync error');
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const consoleErrors = [];
      const originalError = console.error;
      console.error = function(...args) {
        consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      let threw = false;
      try {
        await window.save('finapp_transactions', { id: 'test' });
      } catch (e) {
        threw = true;
      }

      console.error = originalError;

      assert.ok(threw, 'Expected synchronous throw to propagate as rejected promise');
      assert.ok(consoleErrors.some(e => e.includes('Firebase save threw synchronously')));
    });
  });

  describe('remove()', () => {
    it('delegates to StorageAdapter.remove() when ref exists', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      await window.remove('finapp_dashboard_layouts');

      const removeCall = storageMock.calls.find(c => c.method === 'remove' && c.key === 'finapp_dashboard_layouts');
      assert.ok(removeCall, 'Expected StorageAdapter.remove() call');
    });

    it('returns early when currentUserRef is null', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = null;

      await window.remove('finapp_dashboard_layouts');

      const removeCall = storageMock.calls.find(c => c.method === 'remove');
      assert.ok(!removeCall, 'Expected no StorageAdapter.remove() call when currentUserRef is null');
    });

    it('logs error when StorageAdapter.remove rejects', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.remove = function() {
        return Promise.reject(new Error('remove error'));
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const consoleErrors = [];
      const originalError = console.error;
      console.error = function(...args) {
        consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      try {
        await window.remove('finapp_dashboard_layouts');
      } catch (_) {}
      await new Promise(r => setTimeout(r, 50));

      console.error = originalError;

      assert.ok(consoleErrors.some(e => e.includes('Firebase remove error')));
    });
  });

  describe('readOnce()', () => {
    it('delegates to StorageAdapter.get() and returns snapshot', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.get = function(path) {
        return Promise.resolve({ test: 'value' });
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const result = await window.readOnce('incomeProfiles');
      assert.ok(result);
      assert.deepStrictEqual(result.val(), { test: 'value' });
    });

    it('returns null snapshot when currentUserRef is null', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = null;

      const result = await window.readOnce('incomeProfiles');
      assert.ok(result);
      assert.strictEqual(result.val(), null);
    });

    it('propagates error when StorageAdapter.get rejects', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.get = function() {
        return Promise.reject(new Error('read error'));
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      let caught = null;
      try {
        await window.readOnce('incomeProfiles');
      } catch (err) {
        caught = err;
      }

      assert.ok(caught instanceof Error);
      assert.strictEqual(caught.message, 'read error');
    });
  });

  describe('onValue()', () => {
    it('delegates to StorageAdapter.listen()', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const callback = function() {};
      const unsub = window.onValue('finapp_debtors', callback);

      assert.strictEqual(typeof unsub, 'function');
      const listenCall = storageMock.calls.find(c => c.method === 'listen' && c.path === 'finapp_debtors');
      assert.ok(listenCall, 'Expected StorageAdapter.listen() call');
    });

    it('returns no-op when currentUserRef is null', () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = null;

      const unsub = window.onValue('finapp_debtors', function() {}, function() {});
      assert.strictEqual(typeof unsub, 'function');
      unsub();
    });

    it('calls errCallback on subscription error', () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.listen = function(path, callback, errCallback) {
        if (errCallback) errCallback(new Error('listen error'));
        return function() {};
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      let receivedError = null;
      window.onValue('finapp_debtors', function() {}, function(err) {
        receivedError = err;
      });

      assert.ok(receivedError instanceof Error);
      assert.strictEqual(receivedError.message, 'listen error');
    });
  });

  describe('updateUserPaths()', () => {
    it('delegates to StorageAdapter.updateMany()', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const updates = { 'incomeProfiles/strony': { id: 'strony', name: 'Strony' } };
      await window.updateUserPaths(updates);

      const updateManyCall = storageMock.calls.find(c => c.method === 'updateMany');
      assert.ok(updateManyCall, 'Expected StorageAdapter.updateMany() call');
      assert.deepStrictEqual(updateManyCall.updates, updates);
    });

    it('returns early when currentUserRef is null', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = null;

      await window.updateUserPaths({ 'incomeProfiles/strony': {} });

      const updateManyCall = storageMock.calls.find(c => c.method === 'updateMany');
      assert.ok(!updateManyCall, 'Expected no updateMany() call when currentUserRef is null');
    });

    it('logs error when StorageAdapter.updateMany rejects', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      storageMock.adapter.updateMany = function() {
        return Promise.reject(new Error('update error'));
      };
      const window = setupDataLayer(mock, storageMock);
      window.currentUserRef = mock.mockRef;

      const consoleErrors = [];
      const originalError = console.error;
      console.error = function(...args) {
        consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      window.updateUserPaths({ 'incomeProfiles/strony': {} });
      await new Promise(r => setTimeout(r, 50));

      console.error = originalError;

      assert.ok(consoleErrors.some(e => e.includes('Firebase updateUserPaths error')));
    });
  });

  describe('save() with options', () => {
    it('suppresses default toast when silent=true', async () => {
      const mock = createMockFirebase();
      const storageMock = createMockStorageAdapter();
      const window = setupDataLayer(mock, storageMock);

      const failingRef = {
        child: function(key) {
          return {
            set: function() {
              return Promise.reject(new Error('silent error'));
            }
          };
        }
      };
      window.currentUserRef = failingRef;

      const toasts = [];
      const originalToast = window.toast;
      window.toast = function(msg) { toasts.push(msg); };

      try {
        await window.save('finapp_transactions', { id: 'test' }, { silent: true });
      } catch (err) {
        // expected — silent still rejects, but without toast
      }

      window.toast = originalToast;

      assert.ok(toasts.length === 0, 'Expected no toasts when silent=true');
    });
  });

  describe('DataLayer API', () => {
    it('exposes DataLayer object with core methods', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      assert.ok(window.DataLayer);
      assert.ok(typeof window.DataLayer.save === 'function');
      assert.ok(typeof window.DataLayer.load === 'function');
      assert.ok(typeof window.DataLayer.stripUndefinedDeep === 'function');
    });

    it('allows reading dbData via DataLayer getter', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      window.dbData = { test: true };
      assert.deepStrictEqual(window.DataLayer.dbData, { test: true });
    });

    it('allows setting dbData via DataLayer setter', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      window.DataLayer.dbData = { foo: 'bar' };
      assert.deepStrictEqual(window.dbData, { foo: 'bar' });
      assert.deepStrictEqual(window.DataLayer.dbData, { foo: 'bar' });
    });
  });
});
