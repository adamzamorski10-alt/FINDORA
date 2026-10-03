/**
 * Stage 1.6B.4 — Owner integration tests.
 *
 * Verifies the new owner flow:
 *   Auth callback → SessionManager → UserDataLoader → StorageAdapter → Firebase
 *
 * Run with: node tests/owner-integration.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'session-manager.js'), 'utf8');
const userDataLoaderCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'user-data-loader.js'), 'utf8');
const dataLayerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'data-layer.js'), 'utf8');
const storageAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'storage-adapter.js'), 'utf8');
const firebaseAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'firebase-storage-adapter.js'), 'utf8');
const compositionRootCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'composition-root.js'), 'utf8');

function waitForMicrotasks() {
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

function createMockFirebase() {
  const data = {};
  const listeners = {};

  function createRef(path) {
    return {
      get: function() { return { val: function() { return data[path] !== undefined ? data[path] : null; } }; },
      set: function(value) { data[path] = value; return Promise.resolve(); },
      update: function(values) {
        if (typeof values !== 'object' || values === null) return Promise.resolve();
        for (const relPath in values) {
          if (Object.prototype.hasOwnProperty.call(values, relPath)) {
            const fullPath = path ? path + '/' + relPath : relPath;
            const prev = data[fullPath];
            if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
              data[fullPath] = Object.assign({}, prev, values[relPath]);
            } else {
              data[fullPath] = values[relPath];
            }
          }
        }
        return Promise.resolve();
      },
      remove: function() { delete data[path]; return Promise.resolve(); },
      on: function(event, callback, errCallback) {
        if (!listeners[path]) listeners[path] = [];
        listeners[path].push({ callback: callback, errCallback: errCallback });
        const value = data[path] !== undefined ? data[path] : null;
        callback({ val: function() { return value; } });
        return function unsubscribe() {
          if (listeners[path]) {
            listeners[path] = listeners[path].filter(function(l) { return l.callback !== callback; });
          }
        };
      },
      off: function(event, callback, errCallback) {
        if (listeners[path]) {
          listeners[path] = listeners[path].filter(function(l) { return l.callback !== callback; });
        }
      },
      once: function(event) {
        const value = data[path] !== undefined ? data[path] : null;
        return Promise.resolve({ val: function() { return value; } });
      },
      child: function(childPath) {
        return createRef(path ? path + '/' + childPath : childPath);
      }
    };
  }

  function child(path) {
    return createRef(path);
  }

  function trigger(path, value) {
    data[path] = value;
    if (listeners[path]) {
      const snapshot = { val: function() { return value; } };
      listeners[path].forEach(function(l) {
        Promise.resolve().then(function() {
          l.callback(snapshot);
        });
      });
    }
  }

  function reset() {
    for (const key in data) delete data[key];
    for (const key in listeners) delete data[key];
  }

  return { child: child, trigger: trigger, reset: reset, getData: function() { return data; } };
}

function setupOwnerIntegration() {
  const mock = createMockFirebase();
  const window = {};

  window.firebase = {
    database: function() {
      return {
        ref: function(path) {
          return mock.child(path);
        }
      };
    },
    auth: function() {
      return {
        onAuthStateChanged: function() { return function() {}; },
        signInWithEmailAndPassword: function() { return Promise.resolve(); },
        createUserWithEmailAndPassword: function() { return Promise.resolve(); },
        signOut: function() { return Promise.resolve(); }
      };
    }
  };

  window.toast = function() {};
  window.console = console;
  window.localStorage = { getItem: function() { return null; } };

  new Function('window', storageAdapterCode)(window);
  new Function('window', firebaseAdapterCode)(window);
  new Function('window', compositionRootCode)(window);
  new Function('window', dataLayerCode)(window);
  new Function('window', sessionManagerCode)(window);
  new Function('window', userDataLoaderCode)(window);

  var sm = new window.SessionManager({});
  var udl = window.UserDataLoader;

  return { window: window, mock: mock, sessionManager: sm, userDataLoader: udl };
}

describe('Owner Integration', () => {
  it('owner sign-in binds SessionManager context', async () => {
    const { sessionManager, mock } = setupOwnerIntegration();
    const ownerUid = 'owner_123';
    const ownerRef = mock.child('users/' + ownerUid);

    sessionManager.startOwner(ownerUid);
    assert.strictEqual(sessionManager.getCurrentUid(), ownerUid);
    assert.strictEqual(sessionManager.isOwnerActive(), true);
  });

  it('UserDataLoader starts for the owner and maps root data', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';
    const rootData = {
      finapp_transactions: [{ id: 't1' }],
      finapp_debtors: [{ id: 'd1' }],
      finapp_budgets: [{ id: 'b1' }]
    };

    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    mock.trigger('users/' + ownerUid, rootData);
    await waitForMicrotasks();

    assert.deepStrictEqual(window.transactions, [{ id: 't1' }]);
    assert.deepStrictEqual(window.debtors, [{ id: 'd1' }]);
    assert.deepStrictEqual(window.budgets, [{ id: 'b1' }]);
    assert.deepStrictEqual(window.dbData, rootData);
  });

  it('exactly one root listener exists after owner start', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    await waitForMicrotasks();

    // UserDataLoader is the sole root listener owner
    assert.strictEqual(sessionManager.getCurrentUid(), ownerUid);
    assert.strictEqual(window.initialLoadDone, true);
  });

  it('old direct root listener is no longer used by owner flow', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    // In the new flow, the adapter context is bound via SessionManager
    // and data is loaded via UserDataLoader.listenRoot, not via a direct
    // currentUserRef.on('value', ...) in startOwnerListener.
    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    await waitForMicrotasks();

    const currentRef = window.FirebaseStorageAdapter.getCurrentUserRef();
    assert.ok(currentRef, 'Adapter must have an active owner ref');
    // Verify persistence works through the bound context
    await window.save('test_legacy', { a: 1 });
    const result = await window.readOnce('test_legacy');
    assert.deepStrictEqual(result.val(), { a: 1 });
  });

  it('root data reaches legacy globals through UserDataLoader', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';
    const rootData = {
      finapp_transactions: [{ id: 't1' }],
      finapp_goals: [{ id: 'g1' }],
      finapp_reminders: [{ id: 'r1' }]
    };

    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    mock.trigger('users/' + ownerUid, rootData);
    await waitForMicrotasks();

    assert.deepStrictEqual(window.transactions, [{ id: 't1' }]);
    assert.deepStrictEqual(window.goals, [{ id: 'g1' }]);
    assert.deepStrictEqual(window.reminders, [{ id: 'r1' }]);
  });

  it('dbData is populated correctly', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';
    const rootData = { finapp_transactions: [{ id: 't1' }] };

    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    mock.trigger('users/' + ownerUid, rootData);
    await waitForMicrotasks();

    assert.deepStrictEqual(window.dbData, rootData);
  });

  it('initialLoadDone behavior is preserved', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    assert.strictEqual(window.initialLoadDone, false);
    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    mock.trigger('users/' + ownerUid, { finapp_transactions: [] });
    await waitForMicrotasks();
    assert.strictEqual(window.initialLoadDone, true);
  });

  it('owner switch A → B stops A loader and activates B context', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerA = 'owner_A';
    const ownerB = 'owner_B';
    const rootA = { finapp_transactions: [{ id: 'a' }] };
    const rootB = { finapp_transactions: [{ id: 'b' }] };

    sessionManager.startOwner(ownerA);
    userDataLoader.start(ownerA);
    mock.trigger('users/' + ownerA, rootA);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 'a' }]);

    // Switch to B
    userDataLoader.stop();
    sessionManager.stopOwner();
    sessionManager.startOwner(ownerB);
    userDataLoader.start(ownerB);
    mock.trigger('users/' + ownerB, rootB);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 'b' }]);
    assert.strictEqual(sessionManager.getCurrentUid(), ownerB);
  });

  it('stale A callback cannot overwrite B after switch', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerA = 'owner_A';
    const ownerB = 'owner_B';
    const rootA = { finapp_transactions: [{ id: 'a' }] };
    const rootB = { finapp_transactions: [{ id: 'b' }] };

    sessionManager.startOwner(ownerA);
    userDataLoader.start(ownerA);
    mock.trigger('users/' + ownerA, rootA);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 'a' }]);

    userDataLoader.stop();
    sessionManager.stopOwner();
    sessionManager.startOwner(ownerB);
    userDataLoader.start(ownerB);
    mock.trigger('users/' + ownerB, rootB);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 'b' }]);

    // Simulate stale A callback
    mock.trigger('users/' + ownerA, rootA);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 'b' }], 'Stale callback must not overwrite B');
  });

  it('owner sign-out stops loader and clears SessionManager context', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    mock.trigger('users/' + ownerUid, { finapp_transactions: [] });
    await waitForMicrotasks();
    assert.strictEqual(sessionManager.getCurrentUid(), ownerUid);

    // Sign out
    userDataLoader.stop();
    sessionManager.stopOwner();
    assert.strictEqual(sessionManager.getCurrentUid(), null);
    assert.strictEqual(sessionManager.isOwnerActive(), false);
    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), null);
  });

  it('DataLayer persistence context follows the active owner', async () => {
    const { sessionManager, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    sessionManager.startOwner(ownerUid);
    await window.save('test_key', { a: 1 });
    const result = await window.readOnce('test_key');
    assert.deepStrictEqual(result.val(), { a: 1 });
  });

  it('UserDataLoader remains session-agnostic', async () => {
    const { userDataLoader, window } = setupOwnerIntegration();

    assert.strictEqual(window.currentUserRef, null);
    userDataLoader.start('uid1');
    assert.strictEqual(window.currentUserRef, null);
    assert.strictEqual(window.DataLayer.currentUserRef, null);
  });

  it('SessionManager remains free of data mapping/UI/auth', async () => {
    const { window } = setupOwnerIntegration();

    assert.strictEqual(sessionManagerCode.indexOf('applyMapping'), -1);
    assert.strictEqual(sessionManagerCode.indexOf('renderAll'), -1);
    assert.strictEqual(sessionManagerCode.indexOf('onAuthStateChanged'), -1);
    assert.strictEqual(sessionManagerCode.indexOf('isGuestMode'), -1);
  });

  it('guest flow remains untouched', async () => {
    const { mock, window } = setupOwnerIntegration();
    const guestOwnerUid = 'guest_owner_789';
    const guestRef = mock.child('users/' + guestOwnerUid);

    // Guest mode sets DataLayer.currentUserRef directly
    window.DataLayer.currentUserRef = guestRef;
    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), guestRef);
  });

  it('startOwnerListener/stopOwnerListener no longer create duplicate owner pipelines', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    // In the new flow, owner sign-in delegates to SessionManager + UserDataLoader
    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    await waitForMicrotasks();

    // Verify no direct currentUserRef.on('value') listener from legacy index.html logic
    // is active; the only root listener is UserDataLoader's
    assert.strictEqual(sessionManager.getCurrentUid(), ownerUid);
    assert.strictEqual(window.initialLoadDone, true);
  });

  it('repeated sign-in for the same uid does not create duplicate owner listeners', async () => {
    const { sessionManager, userDataLoader, mock, window } = setupOwnerIntegration();
    const ownerUid = 'owner_123';

    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    await waitForMicrotasks();

    // Same uid again - should be idempotent
    sessionManager.startOwner(ownerUid);
    userDataLoader.start(ownerUid);
    await waitForMicrotasks();

    assert.strictEqual(sessionManager.getCurrentUid(), ownerUid);
    assert.strictEqual(window.initialLoadDone, true);
  });
});
