/**
 * Stage 1.6+ — IndexedDB Storage Adapter
 *
 * Local-first persistence using native IndexedDB.
 * Implements StorageAdapter contract.
 * Does NOT contain business logic, UI knowledge, or domain references.
 */

(function() {
  'use strict';

  var dbName = 'finora';
  var storeName = 'data';
  var db = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) {
        return resolve(db);
      }
      var request = indexedDB.open(dbName, 1);
      request.onerror = function() {
        reject(request.error);
      };
      request.onsuccess = function() {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = function(event) {
        var database = event.target.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      };
    });
  }

  function get(key) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var request = store.get(key);
        request.onerror = function() { reject(request.error); };
        request.onsuccess = function() { resolve(request.result); };
      });
    });
  }

  function set(key, value) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var request = store.put(value, key);
        request.onerror = function() { reject(request.error); };
        request.onsuccess = function() { resolve(); };
      });
    });
  }

  function update(key, values) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var getRequest = store.get(key);
        getRequest.onerror = function() { reject(getRequest.error); };
        getRequest.onsuccess = function() {
          var existing = getRequest.result;
          var updated = typeof values === 'function' ? values(existing) : Object.assign({}, existing, values);
          var putRequest = store.put(updated, key);
          putRequest.onerror = function() { reject(putRequest.error); };
          putRequest.onsuccess = function() { resolve(); };
        };
      });
    });
  }

  function updateMany(updates) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var pending = Object.keys(updates).length;
        if (pending === 0) {
          return resolve();
        }
        function checkDone() {
          pending--;
          if (pending <= 0) {
            tx.oncomplete = null;
            resolve();
          }
        }
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { reject(tx.error); };
        for (var key in updates) {
          if (Object.prototype.hasOwnProperty.call(updates, key)) {
            (function(k) {
              var getRequest = store.get(k);
              getRequest.onerror = function() { reject(getRequest.error); };
              getRequest.onsuccess = function() {
                var existing = getRequest.result;
                var updater = updates[k];
                var updated = typeof updater === 'function' ? updater(existing) : Object.assign({}, existing, updater);
                var putRequest = store.put(updated, k);
                putRequest.onerror = function() { reject(putRequest.error); };
                putRequest.onsuccess = checkDone;
              };
            })(key);
          }
        }
      });
    });
  }

  function remove(key) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        var request = store.delete(key);
        request.onerror = function() { reject(request.error); };
        request.onsuccess = function() { resolve(); };
      });
    });
  }

  function listen(path, callback, errCallback) {
    return openDB().then(function(database) {
      var bc = null;
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('finora-sync');
      }
      function onError(err) {
        if (typeof errCallback === 'function') {
          errCallback(err);
        }
      }
      function readAndCallback() {
        return get(path).then(function(data) {
          callback(data);
        }).catch(onError);
      }
      readAndCallback();
      if (bc) {
        bc.onmessage = function(event) {
          if (event.data && event.data.path === path) {
            readAndCallback();
          }
        };
      }
      return {
        unsubscribe: function() {
          if (bc) {
            bc.close();
          }
        }
      };
    });
  }

  function listenRoot(callback, errCallback) {
    return openDB().then(function(database) {
      var bc = null;
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('finora-sync');
      }
      function onError(err) {
        if (typeof errCallback === 'function') {
          errCallback(err);
        }
      }
      function readAllAndCallback() {
        return new Promise(function(resolve, reject) {
          var tx = database.transaction(storeName, 'readonly');
          var store = tx.objectStore(storeName);
          var keysRequest = store.getAllKeys();
          keysRequest.onerror = function() { reject(keysRequest.error); };
          keysRequest.onsuccess = function() {
            var keys = keysRequest.result;
            var result = {};
            var pending = keys.length;
            if (pending === 0) {
              callback(result);
              return resolve();
            }
            for (var i = 0; i < keys.length; i++) {
              (function(key) {
                var getRequest = store.get(key);
                getRequest.onerror = function() {
                  pending--;
                  if (pending <= 0) resolve();
                };
                getRequest.onsuccess = function() {
                  result[key] = getRequest.result;
                  pending--;
                  if (pending <= 0) {
                    callback(result);
                    resolve();
                  }
                };
              })(keys[i]);
            }
          };
        }).catch(onError);
      }
      readAllAndCallback();
      if (bc) {
        bc.onmessage = function() {
          readAllAndCallback();
        };
      }
      return {
        unsubscribe: function() {
          if (bc) {
            bc.close();
          }
        }
      };
    });
  }

  function notifyChange(path) {
    if (typeof BroadcastChannel !== 'undefined') {
      var bc = new BroadcastChannel('finora-sync');
      bc.postMessage({ path: path });
    }
  }

  window.IndexedDBStorageAdapter = {
    init: openDB,
    get: get,
    set: set,
    update: update,
    updateMany: updateMany,
    remove: remove,
    listen: listen,
    listenRoot: listenRoot,
    notifyChange: notifyChange
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init: openDB,
      get: get,
      set: set,
      update: update,
      updateMany: updateMany,
      remove: remove,
      listen: listen,
      listenRoot: listenRoot,
      notifyChange: notifyChange
    };
  }
})();
