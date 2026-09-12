/**
 * Stage 1.4+ — Category Repository
 *
 * CRUD operations for categories.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_categories';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('Category must be an object');
      return errors;
    }
    if (!input.name || typeof input.name !== 'string') errors.push('name must be a non-empty string');
    if (!input.type) errors.push('type is required');
    if (!['income', 'expense'].includes(input.type)) {
      errors.push('type must be income or expense');
    }
    return errors;
  }

  function normalize(category) {
    return {
      id: category.id,
      userId: category.userId || null,
      name: category.name || '',
      type: category.type || 'expense',
      icon: category.icon || '📦',
      color: category.color || '#888888',
      parentId: category.parentId || null,
      isSystem: !!category.isSystem,
      createdAt: category.createdAt || now(),
      updatedAt: category.updatedAt || now()
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
      var found = raw.find(function(c) { return c.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function findByType(type) {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(c) { return c.type === type; }).map(normalize);
    });
  }

  function findSystem() {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(c) { return c.isSystem; }).map(normalize);
    });
  }

  function findUser() {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(c) { return !c.isSystem; }).map(normalize);
    });
  }

  function save(category) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(category);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(category);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(c) { return c.id === normalized.id; });
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
      var existing = raw.find(function(c) { return c.id === id; });
      if (existing && existing.isSystem) {
        return Promise.reject(new Error('Cannot remove system category'));
      }
      var filtered = raw.filter(function(c) { return c.id !== id; });
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

  var DEFAULTS = [
    { id: 'cat-food', name: 'Jedzenie', type: 'expense', icon: '🍔', color: '#FF6B6B', isSystem: true },
    { id: 'cat-transport', name: 'Transport', type: 'expense', icon: '🚗', color: '#4ECDC4', isSystem: true },
    { id: 'cat-housing', name: 'Mieszkanie', type: 'expense', icon: '🏠', color: '#45B7D1', isSystem: true },
    { id: 'cat-entertainment', name: 'Rozrywka', type: 'expense', icon: '🎬', color: '#96CEB4', isSystem: true },
    { id: 'cat-health', name: 'Zdrowie', type: 'expense', icon: '💊', color: '#FFEAA7', isSystem: true },
    { id: 'cat-other-expense', name: 'Inne', type: 'expense', icon: '📦', color: '#DDA0DD', isSystem: true },
    { id: 'cat-salary', name: 'Wynagrodzenie', type: 'income', icon: '💰', color: '#00B894', isSystem: true },
    { id: 'cat-freelance', name: 'Freelance', type: 'income', icon: '💻', color: '#6C5CE7', isSystem: true },
    { id: 'cat-investments', name: 'Inwestycje', type: 'income', icon: '📈', color: '#FDCB6E', isSystem: true },
    { id: 'cat-other-income', name: 'Inne', type: 'income', icon: '💵', color: '#E17055', isSystem: true }
  ];

  function seedDefaults() {
    return loadAll().then(function(categories) {
      if (categories.length === 0) {
        var defaults = DEFAULTS.map(function(c) {
          return normalize({
            id: c.id,
            name: c.name,
            type: c.type,
            icon: c.icon,
            color: c.color,
            isSystem: c.isSystem
          });
        });
        return window.StorageAdapter.set(STORAGE_KEY, defaults).then(function() {
          return defaults;
        });
      }
      return categories;
    });
  }

  window.CategoryRepository = {
    loadAll: loadAll,
    findById: findById,
    findByType: findByType,
    findSystem: findSystem,
    findUser: findUser,
    save: save,
    remove: remove,
    listen: listen,
    seedDefaults: seedDefaults,
    DEFAULTS: DEFAULTS
  };

})();
