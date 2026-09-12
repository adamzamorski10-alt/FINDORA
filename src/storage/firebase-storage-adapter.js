/**
 * Stage 1.2B — Firebase Storage Adapter
 *
 * Firebase Realtime Database implementation of the Storage Adapter contract.
 * Does NOT contain business logic, UI knowledge, or domain references.
 *
 * Tracks its own listeners to prevent leaks on user change.
 */

(function() {
  'use strict';

  let currentUserRef = null;
  const activeListeners = {};

  function setCurrentUserRef(ref) {
    // Unsubscribe all tracked listeners from the old ref
    Object.keys(activeListeners).forEach(function(path) {
      const listeners = activeListeners[path];
      listeners.forEach(function(entry) {
        try { entry.ref.off('value', entry.callback, entry.errCallback); } catch (_) {}
      });
      delete activeListeners[path];
    });

    currentUserRef = ref;
  }

  function getCurrentUserRef() {
    return currentUserRef;
  }

  function get(path) {
    if (!currentUserRef) {
      return Promise.resolve(null);
    }
    try {
      return currentUserRef.child(path).once('value').then(function(snapshot) {
        return snapshot.val();
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function set(path, value) {
    if (!currentUserRef) {
      return Promise.resolve();
    }
    try {
      return currentUserRef.child(path).set(value);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function update(path, values) {
    if (!currentUserRef) {
      return Promise.resolve();
    }
    try {
      return currentUserRef.child(path).update(values);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function updateMany(updates) {
    if (!currentUserRef) {
      return Promise.resolve();
    }
    try {
      return currentUserRef.update(updates);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function remove(path) {
    if (!currentUserRef) {
      return Promise.resolve();
    }
    try {
      return currentUserRef.child(path).remove();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function listen(path, callback, errCallback) {
    if (!currentUserRef) {
      if (typeof errCallback === 'function') {
        errCallback(new Error('No current user ref'));
      }
      return function unsubscribe() {};
    }
    if (typeof path !== 'string' || path === '') {
      if (typeof errCallback === 'function') {
        errCallback(new Error('Empty path is not supported'));
      }
      return function unsubscribe() {};
    }
    try {
      const ref = currentUserRef.child(path);
      const onValue = function(snapshot) {
        Promise.resolve().then(function() {
          try { callback(snapshot.val()); } catch (_) {}
        });
      };
      const onError = typeof errCallback === 'function' ? errCallback : null;

      ref.on('value', onValue, onError);

      if (!activeListeners[path]) {
        activeListeners[path] = [];
      }
      activeListeners[path].push({
        ref: ref,
        callback: onValue,
        errCallback: onError
      });

      return function unsubscribe() {
        try { ref.off('value', onValue, onError); } catch (_) {}
        if (activeListeners[path]) {
          activeListeners[path] = activeListeners[path].filter(function(e) {
            return e.callback !== onValue;
          });
        }
      };
    } catch (err) {
      if (typeof errCallback === 'function') {
        errCallback(err);
      }
      return function unsubscribe() {};
    }
  }

  function listenRoot(callback, errCallback) {
    if (!currentUserRef) {
      if (typeof errCallback === 'function') {
        errCallback(new Error('No current user ref'));
      }
      return function unsubscribe() {};
    }
    try {
      const ref = currentUserRef;
      const onValue = function(snapshot) {
        Promise.resolve().then(function() {
          try { callback(snapshot.val()); } catch (_) {}
        });
      };
      const onError = typeof errCallback === 'function' ? errCallback : null;

      ref.on('value', onValue, onError);

      if (!activeListeners.__root__) {
        activeListeners.__root__ = [];
      }
      activeListeners.__root__.push({
        ref: ref,
        callback: onValue,
        errCallback: onError
      });

      return function unsubscribe() {
        try { ref.off('value', onValue, onError); } catch (_) {}
        if (activeListeners.__root__) {
          activeListeners.__root__ = activeListeners.__root__.filter(function(e) {
            return e.callback !== onValue;
          });
        }
      };
    } catch (err) {
      if (typeof errCallback === 'function') {
        errCallback(err);
      }
      return function unsubscribe() {};
    }
  }

  window.FirebaseStorageAdapter = {
    setCurrentUserRef: setCurrentUserRef,
    getCurrentUserRef: getCurrentUserRef,
    get: get,
    set: set,
    update: update,
    updateMany: updateMany,
    remove: remove,
    listen: listen,
    listenRoot: listenRoot
  };

})();
