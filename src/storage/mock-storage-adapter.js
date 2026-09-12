/**
 * Stage 1.2B — Mock Storage Adapter
 *
 * In-memory implementation of the Storage Adapter contract for testing.
 * Does NOT simulate Firebase beyond the contract surface.
 *
 * Listener semantics: callbacks are fired asynchronously (microtask) to better
 * match Firebase's behavior and avoid masking race conditions.
 */

(function() {
  'use strict';

  const store = {};
  const listeners = {};

  function get(path) {
    return Promise.resolve(store[path] !== undefined ? store[path] : null);
  }

  function set(path, value) {
    store[path] = value;
    return Promise.resolve();
  }

  function update(path, values) {
    if (store[path] && typeof store[path] === 'object' && !Array.isArray(store[path])) {
      store[path] = Object.assign({}, store[path], values);
    } else {
      store[path] = values;
    }
    return Promise.resolve();
  }

  function updateMany(updates) {
    const snapshot = {};
    for (const path in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, path)) {
        snapshot[path] = store[path];
      }
    }
    const merged = {};
    for (const path in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, path)) {
        const prev = snapshot[path];
        if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
          merged[path] = Object.assign({}, prev, updates[path]);
        } else {
          merged[path] = updates[path];
        }
      }
    }
    Object.assign(store, merged);
    return Promise.resolve();
  }

  function remove(path) {
    delete store[path];
    return Promise.resolve();
  }

  function listen(path, callback, errCallback) {
    if (typeof path !== 'string' || path === '') {
      if (typeof errCallback === 'function') {
        errCallback(new Error('Empty path is not supported'));
      }
      return function unsubscribe() {};
    }
    if (!listeners[path]) {
      listeners[path] = [];
    }

    const wrappedCallback = function(value) {
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

  function listenRoot(callback, errCallback) {
    const rootKey = '__root__';
    if (!listeners[rootKey]) {
      listeners[rootKey] = [];
    }

    const wrappedCallback = function(value) {
      try { callback(value); } catch (_) {}
    };

    listeners[rootKey].push(wrappedCallback);

    get(rootKey).then(function(value) {
      wrappedCallback(value);
    }).catch(function(err) {
      if (typeof errCallback === 'function') {
        errCallback(err);
      }
    });

    return function unsubscribe() {
      if (listeners[rootKey]) {
        listeners[rootKey] = listeners[rootKey].filter(function(l) {
          return l !== wrappedCallback;
        });
      }
    };
  }

  function trigger(path, value) {
    store[path] = value;
    if (listeners[path]) {
      listeners[path].forEach(function(callback) {
        Promise.resolve().then(function() {
          callback(value);
        });
      });
    }
  }

  function triggerRoot(value) {
    store.__root__ = value;
    if (listeners.__root__) {
      listeners.__root__.forEach(function(callback) {
        Promise.resolve().then(function() {
          callback(value);
        });
      });
    }
  }

  function reset() {
    for (const key in store) {
      delete store[key];
    }
    for (const key in listeners) {
      delete listeners[key];
    }
  }

  window.MockStorageAdapter = {
    get: get,
    set: set,
    update: update,
    updateMany: updateMany,
    remove: remove,
    listen: listen,
    listenRoot: listenRoot,
    trigger: trigger,
    triggerRoot: triggerRoot,
    reset: reset
  };

})();
