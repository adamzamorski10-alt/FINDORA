/**
 * Stage 1.2B — Firebase Storage Adapter tests.
 *
 * Tests Firebase adapter with mocked Firebase RTDB.
 * Run with: node tests/firebase-storage-adapter.test.js
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
        return {
          val: function() {
            return data[path] !== undefined ? data[path] : null;
          }
        };
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
        if (!listeners[path]) {
          listeners[path] = [];
        }
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

  function reset() {
    for (const key in data) {
      delete data[key];
    }
    for (const key in listeners) {
      delete listeners[key];
    }
  }

  return { child: child, trigger: trigger, reset: reset };
}

function setupFirebaseAdapter(mockFirebase) {
  const window = {
    FirebaseStorageAdapter: null,
    db: {
      ref: function(path) {
        return mockFirebase.child(path);
      }
    },
    console: console,
  };

  const script = new Function('window', adapterCode);
  script(window);

  return window;
}

describe('FirebaseStorageAdapter', () => {
  it('get returns value from Firebase path', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    const userRef = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRef);

    await window.FirebaseStorageAdapter.set('test', { a: 1 });
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.deepStrictEqual(result, { a: 1 });
    mock.reset();
  });

  it('get returns null for missing path', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });

    const result = await window.FirebaseStorageAdapter.get('nonexistent');
    assert.strictEqual(result, null);
    mock.reset();
  });

  it('set writes value to Firebase path', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });

    await window.FirebaseStorageAdapter.set('test', { b: 2 });
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.deepStrictEqual(result, { b: 2 });
    mock.reset();
  });

  it('update merges values at Firebase path', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });

    await window.FirebaseStorageAdapter.set('test', { a: 1, b: 2 });
    await window.FirebaseStorageAdapter.update('test', { b: 3, c: 4 });
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.deepStrictEqual(result, { a: 1, b: 3, c: 4 });
    mock.reset();
  });

  it('updateMany performs atomic multi-path update', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    const userRef = { 
      child: function(path) { return mock.child(path); },
      update: function() { return Promise.resolve(); }
    };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRef);

    const updateCalls = [];
    const originalUpdate = userRef.update.bind(userRef);
    userRef.update = function(updates) {
      updateCalls.push(updates);
      return originalUpdate(updates);
    };

    await window.FirebaseStorageAdapter.updateMany({
      'incomeProfiles/a': { id: 'a' },
      'incomeProfiles/b': { id: 'b' }
    });

    assert.strictEqual(updateCalls.length, 1, 'updateMany must perform exactly one atomic update');
    assert.deepStrictEqual(updateCalls[0], {
      'incomeProfiles/a': { id: 'a' },
      'incomeProfiles/b': { id: 'b' }
    });
    mock.reset();
  });

  it('remove deletes value at Firebase path', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });

    await window.FirebaseStorageAdapter.set('test', { a: 1 });
    await window.FirebaseStorageAdapter.remove('test');
    const result = await window.FirebaseStorageAdapter.get('test');
    assert.strictEqual(result, null);
    mock.reset();
  });

  it('listen subscribes and receives current value', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let received = null;
    await new Promise(function(resolve) {
      window.FirebaseStorageAdapter.listen('test', function(value) {
        received = value;
        resolve();
      });
    });
    assert.deepStrictEqual(received, { a: 1 });
    mock.reset();
  });

  it('listen triggers callback on value change', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let received = null;
    const unsub = window.FirebaseStorageAdapter.listen('test', function(value) {
      received = value;
    });

    mock.trigger('test', { a: 2 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(received, { a: 2 });

    unsub();
    mock.reset();
  });

  it('returns no-op unsubscribe when no currentUserRef', function() {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(null);

    const unsub = window.FirebaseStorageAdapter.listen('test', function() {});
    assert.strictEqual(typeof unsub, 'function');
    unsub();
    mock.reset();
  });

  it('returns no-op unsubscribe on error', function() {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    const errorRef = {
      child: function() {
        throw new Error('Firebase error');
      }
    };
    window.FirebaseStorageAdapter.setCurrentUserRef(errorRef);

    const unsub = window.FirebaseStorageAdapter.listen('test', function() {}, function(err) {
      assert.ok(err instanceof Error);
    });
    assert.strictEqual(typeof unsub, 'function');
    mock.reset();
  });

  it('returns early when no currentUserRef', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(null);

    const getResult = await window.FirebaseStorageAdapter.get('test');
    assert.strictEqual(getResult, null);

    const setResult = await window.FirebaseStorageAdapter.set('test', { a: 1 });
    assert.strictEqual(setResult, undefined);

    const updateResult = await window.FirebaseStorageAdapter.update('test', {});
    assert.strictEqual(updateResult, undefined);

    const updateManyResult = await window.FirebaseStorageAdapter.updateMany({});
    assert.strictEqual(updateManyResult, undefined);

    const removeResult = await window.FirebaseStorageAdapter.remove('test');
    assert.strictEqual(removeResult, undefined);

    mock.reset();
  });

  it('unsubscribes old listeners when currentUserRef changes', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);

    const userRefA = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefA);
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let receivedA = null;
    const unsubA = window.FirebaseStorageAdapter.listen('test', function(value) {
      receivedA = value;
    });

    await new Promise(function(resolve) {
      // resolve after initial callback
      setTimeout(resolve, 0);
    });
    assert.deepStrictEqual(receivedA, { a: 1 });

    const userRefB = { child: function(path) { return mock.child(path); } };
    window.FirebaseStorageAdapter.setCurrentUserRef(userRefB);
    await window.FirebaseStorageAdapter.set('test', { b: 2 });

    let receivedB = null;
    const unsubB = window.FirebaseStorageAdapter.listen('test', function(value) {
      receivedB = value;
    });

    await new Promise(function(resolve) {
      setTimeout(resolve, 0);
    });
    assert.deepStrictEqual(receivedB, { b: 2 });

    mock.trigger('test', { a: 99 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(receivedA, { a: 1 }, 'Old listener must not fire after user change');
    assert.deepStrictEqual(receivedB, { a: 99 }, 'New listener fires on shared mock ref');

    unsubB();
    mock.trigger('test', { b: 2 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(receivedB, { a: 99 }, 'Unsubscribed listener must not fire');

    mock.reset();
  });

  it('multiple listeners on same path work independently', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
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

    await new Promise(function(resolve) {
      setTimeout(resolve, 0);
    });
    assert.deepStrictEqual(received1, { a: 1 });
    assert.deepStrictEqual(received2, { a: 1 });

    mock.trigger('test', { a: 2 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(received1, { a: 2 });
    assert.deepStrictEqual(received2, { a: 2 });

    unsub1();
    mock.trigger('test', { a: 3 });
    await new Promise(function(r) { setTimeout(r, 0); });
    assert.deepStrictEqual(received1, { a: 2 }, 'Unsubscribed listener must stop');
    assert.deepStrictEqual(received2, { a: 3 }, 'Active listener must still work');

    mock.reset();
  });

  it('listen callback receives plain value, not DataSnapshot', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let received = null;
    await new Promise(function(resolve) {
      window.FirebaseStorageAdapter.listen('test', function(value) {
        received = value;
        resolve();
      });
    });

    assert.deepStrictEqual(received, { a: 1 });
    assert.strictEqual(typeof received.val, 'undefined', 'Value must not be a DataSnapshot');
    mock.reset();
  });

  it('listen rejects empty path', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });

    let errCalled = false;
    const unsub = window.FirebaseStorageAdapter.listen('', function() {}, function(err) {
      errCalled = true;
      assert.ok(err instanceof Error);
    });

    assert.strictEqual(errCalled, true, 'errCallback must be called for empty path');
    assert.strictEqual(typeof unsub, 'function');
    mock.reset();
  });

  it('listen initial callback is asynchronous', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let received = null;
    window.FirebaseStorageAdapter.listen('test', function(value) {
      received = value;
    });

    assert.strictEqual(received, null, 'Callback must not fire synchronously');
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(received, { a: 1 });
    mock.reset();
  });

  it('listen unsubscribe prevents later callbacks', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let count = 0;
    const unsub = window.FirebaseStorageAdapter.listen('test', function() {
      count++;
    });

    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(count, 1, 'Initial callback fires on subscribe');

    mock.trigger('test', { a: 2 });
    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(count, 2, 'Callback fires on value change');

    unsub();
    mock.trigger('test', { a: 3 });
    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(count, 2, 'Unsubscribed listener does not fire');
    mock.reset();
  });

  it('multiple listeners remain isolated', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef({ child: function(path) { return mock.child(path); } });
    await window.FirebaseStorageAdapter.set('path/a', { a: 1 });
    await window.FirebaseStorageAdapter.set('path/b', { b: 2 });

    let receivedA = null;
    let receivedB = null;
    const unsubA = window.FirebaseStorageAdapter.listen('path/a', function(value) {
      receivedA = value;
    });
    const unsubB = window.FirebaseStorageAdapter.listen('path/b', function(value) {
      receivedB = value;
    });

    await new Promise(function(resolve) {
      setTimeout(resolve, 0);
    });
    assert.deepStrictEqual(receivedA, { a: 1 });
    assert.deepStrictEqual(receivedB, { b: 2 });

    mock.trigger('path/a', { a: 99 });
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(receivedA, { a: 99 });
    assert.deepStrictEqual(receivedB, { b: 2 }, 'Listener B must not be affected by changes to A');

    unsubA();
    mock.trigger('path/a', { a: 100 });
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(receivedA, { a: 99 }, 'Unsubscribed listener A must not fire');
    assert.deepStrictEqual(receivedB, { b: 2 }, 'Listener B must still be unaffected');

    mock.reset();
  });
});
