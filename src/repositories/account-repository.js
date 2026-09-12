/**
 * Stage 1.4+ — Account Repository
 *
 * CRUD operations for accounts.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_accounts';

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('Account must be an object');
      return errors;
    }
    if (!input.name || typeof input.name !== 'string') errors.push('name must be a non-empty string');
    if (!input.type) errors.push('type is required');
    if (!['cash', 'bank', 'savings', 'investment'].includes(input.type)) {
      errors.push('type must be cash, bank, savings, or investment');
    }
    return errors;
  }

  function normalize(account) {
    return {
      id: account.id,
      userId: account.userId || null,
      name: account.name || '',
      type: account.type || 'bank',
      icon: account.icon || '🏦',
      color: account.color || '#888888',
      archived: !!account.archived,
      createdAt: account.createdAt || now(),
      updatedAt: account.updatedAt || now()
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
      var found = raw.find(function(a) { return a.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function findActive() {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(a) { return !a.archived; }).map(normalize);
    });
  }

  function save(account) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(account);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(account);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(a) { return a.id === normalized.id; });
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
      var filtered = raw.filter(function(a) { return a.id !== id; });
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
    { id: 'acc-default-konto', name: 'Konto', type: 'bank', icon: '🏦', color: '#4A90D9', archived: false },
    { id: 'acc-default-skarbonka', name: 'Skarbonka', type: 'cash', icon: '💰', color: '#50C878', archived: false },
    { id: 'acc-default-gielda', name: 'Giełda', type: 'investment', icon: '📈', color: '#FFD700', archived: false },
    { id: 'acc-default-inne', name: 'Inne', type: 'cash', icon: '💼', color: '#888888', archived: false }
  ];

  function seedDefaults() {
    return loadAll().then(function(accounts) {
      if (accounts.length === 0) {
        var defaults = DEFAULTS.map(function(a) {
          return normalize({
            id: a.id,
            name: a.name,
            type: a.type,
            icon: a.icon,
            color: a.color,
            archived: a.archived
          });
        });
        return window.StorageAdapter.set(STORAGE_KEY, defaults).then(function() {
          return defaults;
        });
      }
      return accounts;
    });
  }

  window.AccountRepository = {
    loadAll: loadAll,
    findById: findById,
    findActive: findActive,
    save: save,
    remove: remove,
    listen: listen,
    seedDefaults: seedDefaults,
    DEFAULTS: DEFAULTS
  };

})();
