/**
 * Stage 1.2D — Owner bootstrap integration test.
 *
 * Reproduces the C-1 bug: owner mode must initialize the active StorageAdapter
 * context so that adapter-based persistence operations actually work.
 *
 * Run with: node tests/owner-bootstrap.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storageAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'storage-adapter.js'), 'utf8');
const firebaseAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'firebase-storage-adapter.js'), 'utf8');
const compositionRootCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'composition-root.js'), 'utf8');
const dataLayerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'data-layer.js'), 'utf8');

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
    for (const key in listeners) delete listeners[key];
  }

  return { child: child, trigger: trigger, reset: reset, getData: function() { return data; } };
}

function setupOwnerBootstrap() {
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
  const script = new Function('window', dataLayerCode);
  script(window);

  return { window: window, mock: mock };
}

describe('Owner Bootstrap Integration', () => {
  it('owner mode initializes adapter context via DataLayer.currentUserRef', async () => {
    const { window, mock } = setupOwnerBootstrap();

    // Simulate owner login: startOwnerListener equivalent
    const ownerUid = 'owner_123';
    const ownerRef = mock.child('users/' + ownerUid);
    window.currentUserRef = ownerRef;

    // THE FIX: sync owner context to DataLayer, which propagates to adapter
    if (window.DataLayer && typeof window.DataLayer.currentUserRef !== 'undefined') {
      window.DataLayer.currentUserRef = ownerRef;
    }

    // Verify adapter context is set
    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), ownerRef,
      'FirebaseStorageAdapter.currentUserRef should be set to owner ref');

    // Verify adapter operations work
    await window.FirebaseStorageAdapter.set('test', { a: 1 });
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.deepStrictEqual(result, { a: 1 }, 'Adapter get() should return stored value');

    // Verify DataLayer operations delegate to adapter
    await window.save('dl_key', { b: 2 });
    const dlResult = await window.readOnce('dl_key');
    assert.deepStrictEqual(dlResult.val(), { b: 2 }, 'DataLayer readOnce() should return adapter value');

    mock.reset();
  });

  it('owner mode updateMany uses active adapter', async () => {
    const { window, mock } = setupOwnerBootstrap();

    const ownerUid = 'owner_456';
    const ownerRef = mock.child('users/' + ownerUid);
    window.currentUserRef = ownerRef;
    if (window.DataLayer && typeof window.DataLayer.currentUserRef !== 'undefined') {
      window.DataLayer.currentUserRef = ownerRef;
    }

    await window.updateUserPaths({
      'path/a': { a: 10 },
      'path/b': { b: 20 }
    });

    assert.deepStrictEqual(mock.getData()['users/' + ownerUid + '/path/a'], { a: 10 });
    assert.deepStrictEqual(mock.getData()['users/' + ownerUid + '/path/b'], { b: 20 });

    mock.reset();
  });

  it('owner logout clears adapter context', async () => {
    const { window, mock } = setupOwnerBootstrap();

    const ownerRef = mock.child('users/owner');
    window.currentUserRef = ownerRef;
    if (window.DataLayer && typeof window.DataLayer.currentUserRef !== 'undefined') {
      window.DataLayer.currentUserRef = ownerRef;
    }

    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), ownerRef);

    // Simulate logout
    window.currentUserRef = null;
    if (window.DataLayer && typeof window.DataLayer.currentUserRef !== 'undefined') {
      window.DataLayer.currentUserRef = null;
    }

    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), null,
      'Adapter context should be cleared on logout');

    // Verify adapter operations are no-ops after logout
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.strictEqual(result, null, 'Adapter get() should return null when no user ref');

    mock.reset();
  });

  it('detects missing DataLayer.currentUserRef setter in owner mode', async () => {
    // This test documents the C-1 bug: if DataLayer.currentUserRef is NOT set
    // in owner mode, the adapter never gets the owner context.
    const { window, mock } = setupOwnerBootstrap();

    const ownerRef = mock.child('users/owner');
    window.currentUserRef = ownerRef;
    // NOT setting DataLayer.currentUserRef — simulating the bug

    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), null,
      'Without DataLayer.currentUserRef setter, adapter context remains null (C-1 bug)');

    // This is why owner mode persistence was broken
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.strictEqual(result, null, 'Adapter operations are no-ops without context');

    mock.reset();
  });

  it('guest mode initializes adapter context correctly', async () => {
    const { window, mock } = setupOwnerBootstrap();

    const guestOwnerUid = 'guest_owner_789';
    const guestRef = mock.child('users/' + guestOwnerUid);

    // Simulate guest mode entry
    window.DataLayer.currentUserRef = guestRef;

    assert.strictEqual(window.FirebaseStorageAdapter.getCurrentUserRef(), guestRef,
      'Guest mode should set adapter context');

    await window.FirebaseStorageAdapter.set('debtors', [{ id: 'd1' }]);
    const result = await window.FirebaseStorageAdapter.get('debtors');
    assert.deepStrictEqual(result, [{ id: 'd1' }]);

    mock.reset();
  });
});
