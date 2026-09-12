/**
 * Stage 1.4+ — Transfer Repository
 *
 * CRUD operations for transfers.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_transfers';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('Transfer must be an object');
      return errors;
    }
    if (!input.fromAccountId) errors.push('fromAccountId is required');
    if (!input.toAccountId) errors.push('toAccountId is required');
    if (input.fromAccountId === input.toAccountId) errors.push('fromAccountId must differ from toAccountId');
    if (typeof input.amount !== 'number' || input.amount <= 0) errors.push('amount must be a positive number');
    return errors;
  }

  function normalize(transfer) {
    return {
      id: transfer.id,
      userId: transfer.userId || null,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: transfer.amount || 0,
      description: typeof transfer.description === 'string' ? transfer.description : '',
      date: transfer.date || now().split('T')[0],
      createdAt: transfer.createdAt || now()
    };
  }

  function getAllRaw() {
    if (!window.StorageAdapter || typeof window.StorageAdapter.get !== 'function') {
      return Promise.resolve([]);
    }
    return window.StorageAdapter.get(STORAGE_KEY).then(function(data) {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      return [];
    });
  }

  function loadAll() {
    return getAllRaw().then(function(raw) {
      return raw.map(normalize);
    });
  }

  function findById(id) {
    return getAllRaw().then(function(raw) {
      var found = raw.find(function(t) { return t.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function save(transfer) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(transfer);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(transfer);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(t) { return t.id === normalized.id; });
      if (index >= 0) {
        raw[index] = normalized;
      } else {
        raw.push(normalized);
      }
      return window.StorageAdapter.set(STORAGE_KEY, raw);
    }).then(function() {
      return normalized;
    });
  }

  function remove(id) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    return getAllRaw().then(function(raw) {
      var filtered = raw.filter(function(t) { return t.id !== id; });
      return window.StorageAdapter.set(STORAGE_KEY, filtered);
    });
  }

  function listen(callback) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.listen !== 'function') {
      return function() {};
    }

    return window.StorageAdapter.listen(STORAGE_KEY, function(data) {
      var normalized = [];
      if (data && Array.isArray(data)) {
        normalized = data.map(normalize);
      }
      callback(normalized);
    });
  }

  window.TransferRepository = {
    loadAll: loadAll,
    findById: findById,
    save: save,
    remove: remove,
    listen: listen
  };

})();
