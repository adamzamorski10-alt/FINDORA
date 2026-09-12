/**
 * Stage 1.4+ — Savings Rule Repository
 *
 * CRUD operations for savings rules.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_savings_rules';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('SavingsRule must be an object');
      return errors;
    }
    if (!input.sourceId) errors.push('sourceId is required');
    if (typeof input.percentage !== 'number' || input.percentage < 0 || input.percentage > 100) {
      errors.push('percentage must be between 0 and 100');
    }
    if (!input.destinationGoalId) errors.push('destinationGoalId is required');
    return errors;
  }

  function normalize(rule) {
    return {
      id: rule.id,
      userId: rule.userId || null,
      sourceId: rule.sourceId,
      percentage: rule.percentage || 0,
      destinationGoalId: rule.destinationGoalId,
      label: typeof rule.label === 'string' ? rule.label : '',
      active: rule.active !== false,
      createdAt: rule.createdAt || now(),
      updatedAt: rule.updatedAt || now()
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
      var found = raw.find(function(r) { return r.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function findBySource(sourceId) {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(r) { return r.sourceId === sourceId; }).map(normalize);
    });
  }

  function findActive() {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(r) { return r.active; }).map(normalize);
    });
  }

  function save(rule) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(rule);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(rule);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(r) { return r.id === normalized.id; });
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
      var filtered = raw.filter(function(r) { return r.id !== id; });
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

  window.SavingsRuleRepository = {
    loadAll: loadAll,
    findById: findById,
    findBySource: findBySource,
    findActive: findActive,
    save: save,
    remove: remove,
    listen: listen
  };

})();
