/**
 * Stage 1.2B — Listener lifecycle tests.
 *
 * Verifies that FirebaseStorageAdapter correctly tracks and cleans up
 * listeners when currentUserRef changes, under the listen() contract:
 *   - callback receives plain JS value
 *   - initial callback is asynchronous
 *   - unsubscribe prevents future callbacks
 *
 * Run with: node tests/listener-lifecycle.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'firebase-storage-adapter.js'), 'utf8');

function createMockFirebase() {
  const data = {};
  const listeners = {};

  function child(path) {
    return {
      get: function() {
        return { val: function() { return data[path] !== undefined ? data[path] : null; } };
      },
      set: function(value) {
        data[path] = value;
        return Promise.resolve();
      },
      update: function(values) {
        if (data[path] && typeof data[path] === 'object' && !Array.isArray(data[path])) {
          data[path] = Object.assign({}, data[path], values);
        } else {
          data[path] = values;
        }
        return Promise.resolve();
      },
      remove: function() {
        delete data[path];
        return Promise.resolve();
      },
      on: function(event, callback, errCallback) {
        if (!listeners[path]) listeners[path] = [];
        listeners[path].push({ callback: callback, errCallback: errCallback });

        const value = data[path] !== undefined ? data[path] : null;
        callback({ val: function() { return value; } });

        return function unsubscribe() {
          if (listeners[path]) {
            listeners[path] = listeners[path].filter(function(l) {
              return l.callback !== callback;
            });
          }
        };
      },
      off: function(event, callback, errCallback) {
        if (listeners[path]) {
          listeners[path] = listeners[path].filter(function(l) {
            return l.callback !== callback;
          });
        }
      },
      once: function(event) {
        const value = data[path] !== undefined ? data[path] : null;
        return Promise.resolve({ val: function() { return value; } });
      }
    };
  }

  function trigger(path, value) {
    data[path] = value;
    if (listeners[path]) {
      listeners[path].forEach(function(l) {
        l.callback({ val: function() { return value; } });
      });
    }
  }

  function getListenerCount(path) {
    return listeners[path] ? listeners[path].length : 0;
  }

  function reset() {
    for (const key in data) delete data[key];
    for (const key in listeners) delete listeners[key];
  }

  return { child: child, trigger: trigger, getListenerCount: getListenerCount, reset: reset };
}

function setupAdapter(mockFirebase) {
  const window = {
    FirebaseStorageAdapter: null,
    db: { ref: function(path) { return mockFirebase.child(path); } },
    console: console,
  };

  const script = new Function('window', adapterCode);
  script(window);

  return window;
}

describe('Listener Lifecycle', () => {
  it('Test A: subscribe user A, change to user B, A callback no longer fires', async () => {
    const mock = createMockFirebase();
    const window = setupAdapter(mock);

    const userRefA = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefA);
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let receivedA = null;
    const unsubA = window.FirebaseStorageAdapter.listen('test', function(value) {
      receivedA = value;
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
    assert.deepStrictEqual(receivedA, { a: 1 });

    // Switch to user B
    const userRefB = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefB);
    await window.FirebaseStorageAdapter.set('test', { b: 2 });

    let receivedB = null;
    const unsubB = window.FirebaseStorageAdapter.listen('test', function(value) {
      receivedB = value;
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
    assert.deepStrictEqual(receivedB, { b: 2 });

    // Trigger on user A's ref should not fire listener A
    mock.trigger('test', { a: 99 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(receivedA, { a: 1 }, 'Old listener must not fire after user change');

    unsubA();
    unsubB();
    mock.reset();
  });

  it('Test B: subscribe A, subscribe B, unsubscribe A, B continues', async () => {
    const mock = createMockFirebase();
    const window = setupAdapter(mock);

    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let received1 = null;
    let received2 = null;
    const unsub1 = window.FirebaseStorageAdapter.listen('test', function(value) {
      received1 = value;
    });
    const unsub2 = window.FirebaseStorageAdapter.listen('test', function(value) {
      received2 = value;
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
    assert.deepStrictEqual(received1, { a: 1 });
    assert.deepStrictEqual(received2, { a: 1 });

    mock.trigger('test', { a: 2 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(received1, { a: 2 });
    assert.deepStrictEqual(received2, { a: 2 });

    unsub1();
    mock.trigger('test', { a: 3 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(received1, { a: 2 }, 'Unsubscribed listener must not fire');
    assert.deepStrictEqual(received2, { a: 3 }, 'Active listener must still work');

    mock.reset();
  });

  it('Test C: subscribe, setCurrentUserRef(null), old listener stops', async () => {
    const mock = createMockFirebase();
    const window = setupAdapter(mock);

    const userRef = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRef);
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let received = null;
    const unsub = window.FirebaseStorageAdapter.listen('test', function(value) {
      received = value;
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
    assert.deepStrictEqual(received, { a: 1 });

    // Set to null — should unsubscribe all listeners
    window.FirebaseStorageAdapter.setCurrentUserRef(null);

    mock.trigger('test', { a: 99 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(received, { a: 1 }, 'Listener must not fire after user ref is null');

    unsub();
    mock.reset();
  });

  it('Test D: setCurrentUserRef(A), subscribe, setCurrentUserRef(B), subscribe', async () => {
    const mock = createMockFirebase();
    const window = setupAdapter(mock);

    const userRefA = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefA);

    let receivedA = null;
    const unsubA = window.FirebaseStorageAdapter.listen('test', function(value) {
      receivedA = value;
    });

    // Switch to B
    const userRefB = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefB);

    let receivedB = null;
    const unsubB = window.FirebaseStorageAdapter.listen('test', function(value) {
      receivedB = value;
    });

    // Trigger on shared mock ref - B will fire because mock doesn't distinguish users
    mock.trigger('test', { a: 99 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(receivedA, null, 'Old listener must not fire after user change');
    assert.deepStrictEqual(receivedB, { a: 99 }, 'New listener fires on shared mock ref');

    // Unsub B and verify
    unsubB();
    mock.trigger('test', { b: 2 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(receivedB, { a: 99 }, 'Unsubscribed listener must not fire');

    unsubA();
    mock.reset();
  });

  it('no double listeners after repeated user changes', async () => {
    const mock = createMockFirebase();
    const window = setupAdapter(mock);

    const userRefA = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefA);
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    window.FirebaseStorageAdapter.listen('test', function() {});
    assert.strictEqual(mock.getListenerCount('test'), 1);

    // Change to B
    const userRefB = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefB);
    assert.strictEqual(mock.getListenerCount('test'), 0, 'Old listeners should be cleaned up');

    window.FirebaseStorageAdapter.listen('test', function() {});
    assert.strictEqual(mock.getListenerCount('test'), 1);

    // Change back to A
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefA);
    assert.strictEqual(mock.getListenerCount('test'), 0, 'Old listeners should be cleaned up again');

    mock.reset();
  });

  it('guest mode: owner listener cleaned up when switching to guest', async () => {
    const mock = createMockFirebase();
    const window = setupAdapter(mock);

    const ownerRef = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(ownerRef);
    await window.FirebaseStorageAdapter.set('transactions', [{ id: 1 }]);

    let ownerReceived = null;
    const unsubOwner = window.FirebaseStorageAdapter.listen('transactions', function(value) {
      ownerReceived = value;
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
    assert.deepStrictEqual(ownerReceived, [{ id: 1 }]);

    // Switch to guest mode
    const guestRef = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(guestRef);
    await window.FirebaseStorageAdapter.set('debtors', [{ id: 'd1' }]);

    let guestReceived = null;
    const unsubGuest = window.FirebaseStorageAdapter.listen('debtors', function(value) {
      guestReceived = value;
    });

    await new Promise(function(resolve) { setTimeout(resolve, 0); });
    assert.deepStrictEqual(guestReceived, [{ id: 'd1' }]);

    // Trigger on owner path should not fire owner listener
    mock.trigger('transactions', [{ id: 2 }]);
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(ownerReceived, [{ id: 1 }], 'Owner listener must not fire in guest mode');

    // Trigger on guest path should fire guest listener
    mock.trigger('debtors', [{ id: 'd2' }]);
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(guestReceived, [{ id: 'd2' }], 'Guest listener must still work');

    unsubOwner();
    unsubGuest();
    mock.reset();
  });
});
