/**
 * Stage 1.6B.2C — Root listener contract tests.
 *
 * Verifies listenRoot() on both FirebaseStorageAdapter and MockStorageAdapter.
 * Run with: node tests/root-listener.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const firebaseAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'firebase-storage-adapter.js'), 'utf8');
const mockAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'mock-storage-adapter.js'), 'utf8');

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

  function createRootUserRef() {
    return {
      child: function(path) { return child(path); },
      on: function(event, callback, errCallback) {
        if (!listeners['']) listeners[''] = [];
        listeners[''].push({ callback: callback, errCallback: errCallback });

        const value = data[''] !== undefined ? data[''] : null;
        callback({ val: function() { return value; } });

        return function unsubscribe() {
          if (listeners['']) {
            listeners[''] = listeners[''].filter(function(l) {
              return l.callback !== callback;
            });
          }
        };
      },
      off: function(event, callback, errCallback) {
        if (listeners['']) {
          listeners[''] = listeners[''].filter(function(l) {
            return l.callback !== callback;
          });
        }
      }
    };
  }

  return { child: child, trigger: trigger, getListenerCount: getListenerCount, reset: reset, createRootUserRef: createRootUserRef };
}

function setupFirebaseAdapter(mockFirebase) {
  const window = {
    FirebaseStorageAdapter: null,
    db: { ref: function(path) { return mockFirebase.child(path); } },
    console: console,
  };

  const script = new Function('window', firebaseAdapterCode);
  script(window);

  return window;
}

function setupMockAdapter() {
  const window = {};

  const script = new Function('window', mockAdapterCode);
  script(window);

  return window;
}

describe('FirebaseStorageAdapter.listenRoot', () => {
  it('callback receives plain JS value, not DataSnapshot', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(mock.createRootUserRef());
    mock.trigger('', { a: 1 });

    let received = null;
    await new Promise(function(resolve) {
      window.FirebaseStorageAdapter.listenRoot(function(value) {
        received = value;
        resolve();
      });
    });

    assert.deepStrictEqual(received, { a: 1 });
    assert.strictEqual(typeof received.val, 'undefined', 'Value must not be a DataSnapshot');
    mock.reset();
  });

  it('initial callback is asynchronous', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(mock.createRootUserRef());
    mock.trigger('', { a: 1 });

    let received = null;
    window.FirebaseStorageAdapter.listenRoot(function(value) {
      received = value;
    });

    assert.strictEqual(received, null, 'Callback must not fire synchronously');
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(received, { a: 1 });
    mock.reset();
  });

  it('unsubscribe prevents later callbacks', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(mock.createRootUserRef());
    mock.trigger('', { a: 1 });

    let count = 0;
    const unsub = window.FirebaseStorageAdapter.listenRoot(function() {
      count++;
    });

    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(count, 1, 'Initial callback fires on subscribe');

    mock.trigger('', { a: 2 });
    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(count, 2, 'Callback fires on root change');

    unsub();
    mock.trigger('', { a: 3 });
    await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(count, 2, 'Unsubscribed listener does not fire');
    mock.reset();
  });

  it('multiple root listeners remain isolated', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(mock.createRootUserRef());
    mock.trigger('', { a: 1 });

    let received1 = null;
    let received2 = null;
    const unsub1 = window.FirebaseStorageAdapter.listenRoot(function(value) {
      received1 = value;
    });
    const unsub2 = window.FirebaseStorageAdapter.listenRoot(function(value) {
      received2 = value;
    });

    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(received1, { a: 1 });
    assert.deepStrictEqual(received2, { a: 1 });

    mock.trigger('', { a: 2 });
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(received1, { a: 2 });
    assert.deepStrictEqual(received2, { a: 2 });

    unsub1();
    mock.trigger('', { a: 3 });
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(received1, { a: 2 }, 'Unsubscribed listener must stop');
    assert.deepStrictEqual(received2, { a: 3 }, 'Active listener must still work');

    mock.reset();
  });

  it('registration failure uses errCallback', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(null);

    let errCalled = false;
    const unsub = window.FirebaseStorageAdapter.listenRoot(function() {}, function(err) {
      errCalled = true;
      assert.ok(err instanceof Error);
    });

    assert.strictEqual(errCalled, true, 'errCallback must be called when no currentUserRef');
    assert.strictEqual(typeof unsub, 'function');
    mock.reset();
  });

  it('root listener does not alter listen(path) behavior', async () => {
    const mock = createMockFirebase();
    const window = setupFirebaseAdapter(mock);
    window.FirebaseStorageAdapter.setCurrentUserRef(mock.createRootUserRef());
    mock.trigger('', { test: { a: 1 } });
    await window.FirebaseStorageAdapter.set('test', { a: 1 });

    let rootReceived = null;
    let pathReceived = null;
    const unsubRoot = window.FirebaseStorageAdapter.listenRoot(function(value) {
      rootReceived = value;
    });
    const unsubPath = window.FirebaseStorageAdapter.listen('test', function(value) {
      pathReceived = value;
    });

    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(rootReceived, { test: { a: 1 } });
    assert.deepStrictEqual(pathReceived, { a: 1 });

    mock.trigger('', { test: { a: 2 } });
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(rootReceived, { test: { a: 2 } });

    mock.trigger('test', { a: 3 });
    await new Promise(r => setTimeout(r, 0));
    assert.deepStrictEqual(pathReceived, { a: 3 });
    assert.deepStrictEqual(rootReceived, { test: { a: 2 } }, 'Root listener must not be affected by path trigger');

    unsubRoot();
    unsubPath();
    mock.reset();
  });
});

describe('MockStorageAdapter.listenRoot', () => {
  it('callback receives plain JS value, not snapshot', async () => {
    const window = setupMockAdapter();

    let received = null;
    await new Promise(function(resolve) {
      window.MockStorageAdapter.listenRoot(function(value) {
        received = value;
        resolve();
      });
    });

    assert.deepStrictEqual(received, null);
    assert.ok(!received || typeof received.val === 'undefined', 'Value must not be a snapshot');
  });

  it('callback receives plain JS value on trigger', async () => {
    const window = setupMockAdapter();

    let received = null;
    await new Promise(function(resolve) {
      window.MockStorageAdapter.listenRoot(function(value) {
        received = value;
        resolve();
      });
    });

    assert.deepStrictEqual(received, null);

    window.MockStorageAdapter.triggerRoot({ a: 1 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received, { a: 1 });
  });

  it('initial callback is asynchronous', async () => {
    const window = setupMockAdapter();
    window.MockStorageAdapter.triggerRoot({ a: 1 });

    let received = null;
    window.MockStorageAdapter.listenRoot(function(value) {
      received = value;
    });

    assert.strictEqual(received, null, 'Callback must not fire synchronously');
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received, { a: 1 });
  });

  it('unsubscribe prevents later callbacks', async () => {
    const window = setupMockAdapter();
    window.MockStorageAdapter.triggerRoot({ a: 1 });

    let count = 0;
    const unsub = window.MockStorageAdapter.listenRoot(function() {
      count++;
    });

    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 1, 'Initial callback fires on subscribe');

    window.MockStorageAdapter.triggerRoot({ a: 2 });
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 2, 'Callback fires on root change');

    unsub();
    window.MockStorageAdapter.triggerRoot({ a: 3 });
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 2, 'Unsubscribed listener does not fire');
  });

  it('multiple root listeners remain isolated', async () => {
    const window = setupMockAdapter();
    window.MockStorageAdapter.triggerRoot({ a: 1 });

    let received1 = null;
    let received2 = null;
    const unsub1 = window.MockStorageAdapter.listenRoot(function(value) {
      received1 = value;
    });
    const unsub2 = window.MockStorageAdapter.listenRoot(function(value) {
      received2 = value;
    });

    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received1, { a: 1 });
    assert.deepStrictEqual(received2, { a: 1 });

    window.MockStorageAdapter.triggerRoot({ a: 2 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received1, { a: 2 });
    assert.deepStrictEqual(received2, { a: 2 });

    unsub1();
    window.MockStorageAdapter.triggerRoot({ a: 3 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received1, { a: 2 }, 'Unsubscribed listener must stop');
    assert.deepStrictEqual(received2, { a: 3 }, 'Active listener must still work');
  });

  it('registration returns unsubscribe function', async () => {
    const window = setupMockAdapter();

    const unsub = window.MockStorageAdapter.listenRoot(function() {}, function(err) {
      assert.fail('errCallback must not be called on successful registration');
    });

    assert.strictEqual(typeof unsub, 'function');
  });

  it('root listener does not alter listen(path) behavior', async () => {
    const window = setupMockAdapter();
    window.MockStorageAdapter.set('test', { a: 1 });

    let rootReceived = null;
    let pathReceived = null;
    const unsubRoot = window.MockStorageAdapter.listenRoot(function(value) {
      rootReceived = value;
    });
    const unsubPath = window.MockStorageAdapter.listen('test', function(value) {
      pathReceived = value;
    });

    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(rootReceived, null);
    assert.deepStrictEqual(pathReceived, { a: 1 });

    window.MockStorageAdapter.trigger('test', { a: 2 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(rootReceived, null);
    assert.deepStrictEqual(pathReceived, { a: 2 });

    window.MockStorageAdapter.triggerRoot({ test: { a: 2 } });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(rootReceived, { test: { a: 2 } });
    assert.deepStrictEqual(pathReceived, { a: 2 }, 'Path listener must not be affected by root trigger');

    unsubRoot();
    unsubPath();
  });
});
