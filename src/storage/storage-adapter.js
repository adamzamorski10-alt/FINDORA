/**
 * Stage 1.2B — Storage Adapter Contract
 *
 * Minimal persistence contract. Implementations must provide all methods.
 * Storage must not contain business logic, UI knowledge, or domain references.
 *
 * Architecture:
 *   StorageAdapterContract = contract/factory namespace (validateContract, create)
 *   StorageAdapter          = active implementation instance (set by composition root)
 *   FirebaseStorageAdapter  = concrete Firebase implementation
 *   MockStorageAdapter      = concrete in-memory implementation for tests
 *
 * listen(path, callback, errCallback?)
 *   path         - non-empty storage path; empty path is not supported
 *   callback     - receives the plain JavaScript value on initial load and
 *                  subsequent changes; initial callback is asynchronous
 *   errCallback  - optional; invoked when listener registration fails
 *   returns      - unsubscribe function that stops future callbacks
 *
 * listenRoot(callback, errCallback?)
 *   callback     - receives the plain JavaScript value for the entire
 *                  current-user object on initial load and subsequent changes;
 *                  initial callback is asynchronous
 *   errCallback  - optional; invoked when listener registration fails
 *   returns      - unsubscribe function that stops future callbacks
 */

(function() {
  'use strict';

  function validateContract(adapter, name) {
    const required = ['get', 'set', 'update', 'updateMany', 'remove', 'listen', 'listenRoot'];
    const missing = required.filter(method => typeof adapter[method] !== 'function');
    if (missing.length > 0) {
      throw new Error('[StorageAdapterContract] ' + (name || 'anonymous') + ' missing methods: ' + missing.join(', '));
    }
  }

  window.StorageAdapterContract = {
    validateContract,

    create(adapter, name) {
      validateContract(adapter, name || 'anonymous');
      return adapter;
    }
  };

  // Active adapter instance — set by composition root after validation.
  // Default: null (no active adapter until composition root runs).
  window.StorageAdapter = null;

  window.setActiveStorageAdapter = function(adapter, name) {
    if (!adapter || typeof adapter !== 'object') {
      throw new Error('[StorageAdapter] Cannot set active adapter to ' + String(adapter) + '. Expected a valid adapter object.');
    }
    validateContract(adapter, name || 'anonymous');
    window.StorageAdapter = adapter;
  };

  window.getActiveStorageAdapter = function() {
    if (!window.StorageAdapter) {
      throw new Error('[StorageAdapter] No active adapter configured. Call setActiveStorageAdapter() first.');
    }
    return window.StorageAdapter;
  };

})();
