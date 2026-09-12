/**
 * Stage 1.4+ — Budget Repository
 *
 * CRUD operations for budgets.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_budgets';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('Budget must be an object');
      return errors;
    }
    if (!input.categoryId) errors.push('categoryId is required');
    if (typeof input.limit !== 'number' || input.limit <= 0) errors.push('limit must be a positive number');
    if (!input.period) errors.push('period is required');
    return errors;
  }

  function normalize(budget) {
    return {
      id: budget.id,
      userId: budget.userId || null,
      categoryId: budget.categoryId,
      limit: budget.limit || 0,
      period: budget.period || 'monthly',
      createdAt: budget.createdAt || now(),
      updatedAt: budget.updatedAt || now()
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
      var found = raw.find(function(b) { return b.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function findByCategory(categoryId) {
    return getAllRaw().then(function(raw) {
      var found = raw.find(function(b) { return b.categoryId === categoryId; });
      return found ? normalize(found) : null;
    });
  }

  function save(budget) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(budget);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(budget);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(b) { return b.id === normalized.id; });
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
      var filtered = raw.filter(function(b) { return b.id !== id; });
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

  window.BudgetRepository = {
    loadAll: loadAll,
    findById: findById,
    findByCategory: findByCategory,
    save: save,
    remove: remove,
    listen: listen
  };

})();
