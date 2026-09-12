/**
 * Stage 1.4+ — Goal Repository
 *
 * CRUD operations for goals.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_goals';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('Goal must be an object');
      return errors;
    }
    if (!input.name || typeof input.name !== 'string') errors.push('name must be a non-empty string');
    if (typeof input.target !== 'number' || input.target <= 0) errors.push('target must be a positive number');
    if (typeof input.current !== 'number' || input.current < 0) errors.push('current must be a non-negative number');
    return errors;
  }

  function normalize(goal) {
    return {
      id: goal.id,
      userId: goal.userId || null,
      name: goal.name || '',
      target: goal.target || 0,
      current: goal.current || 0,
      deadline: goal.deadline || null,
      icon: goal.icon || '🎯',
      color: goal.color || '#888888',
      createdAt: goal.createdAt || now(),
      updatedAt: goal.updatedAt || now()
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
      var found = raw.find(function(g) { return g.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function save(goal) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(goal);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(goal);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(g) { return g.id === normalized.id; });
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
      var filtered = raw.filter(function(g) { return g.id !== id; });
      return window.StorageAdapter.set(STORAGE_KEY, filtered);
    });
  }

  function updateProgress(id, newAmount) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(g) { return g.id === id; });
      if (index < 0) {
        return Promise.reject(new Error('Goal not found: ' + id));
      }
      var updated = normalize({
        ...raw[index],
        current: newAmount,
        updatedAt: now()
      });
      raw[index] = updated;
      return window.StorageAdapter.set(STORAGE_KEY, raw).then(function() {
        return updated;
      });
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

  window.GoalRepository = {
    loadAll: loadAll,
    findById: findById,
    save: save,
    remove: remove,
    updateProgress: updateProgress,
    listen: listen
  };

})();
