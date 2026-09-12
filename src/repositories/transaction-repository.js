/**
 * Stage 1.4+ — Transaction Repository
 *
 * CRUD operations for transactions.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_transactions';

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
      errors.push('Transaction must be an object');
      return errors;
    }
    if (!input.id) errors.push('id is required');
    if (!input.accountId) errors.push('accountId is required');
    if (typeof input.amount !== 'number' || input.amount <= 0) errors.push('amount must be a positive number');
    if (!input.type) errors.push('type is required');
    if (!['income', 'expense', 'transfer'].includes(input.type)) errors.push('type must be income, expense, or transfer');
    if (!input.date) errors.push('date is required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.push('date must be in YYYY-MM-DD format');
    if (!Array.isArray(input.tags)) errors.push('tags must be an array');
    if (typeof input.notes !== 'string') errors.push('notes must be a string');
    if (!input.metadata || typeof input.metadata !== 'object') errors.push('metadata must be an object');
    return errors;
  }

  function normalize(transaction) {
    return {
      id: transaction.id,
      userId: transaction.userId || null,
      accountId: transaction.accountId,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId || null,
      description: typeof transaction.description === 'string' ? transaction.description : '',
      date: transaction.date,
      tags: Array.isArray(transaction.tags) ? transaction.tags : [],
      notes: typeof transaction.notes === 'string' ? transaction.notes : '',
      metadata: transaction.metadata && typeof transaction.metadata === 'object' ? transaction.metadata : {},
      createdAt: transaction.createdAt || now(),
      updatedAt: transaction.updatedAt || now()
    };
  }

  function getAllRaw() {
    if (!window.StorageAdapter || typeof window.StorageAdapter.get !== 'function') {
      return Promise.resolve([]);
    }
    return window.StorageAdapter.get(STORAGE_KEY).then(function(data) {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (data.transactions && Array.isArray(data.transactions)) return data.transactions;
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

  function findByMonth(monthKey) {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(t) {
        return t.date && t.date.indexOf(monthKey) === 0 && !(t.metadata && t.metadata.excluded);
      }).map(normalize);
    });
  }

  function save(transaction) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(transaction);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(transaction);

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
      return { unsubscribe: function() {} };
    }

    return window.StorageAdapter.listen(STORAGE_KEY, function(data) {
      var normalized = [];
      if (data) {
        if (Array.isArray(data)) {
          normalized = data.map(normalize);
        } else if (data.transactions && Array.isArray(data.transactions)) {
          normalized = data.transactions.map(normalize);
        }
      }
      callback(normalized);
    });
  }

  window.TransactionRepository = {
    loadAll: loadAll,
    findById: findById,
    findByMonth: findByMonth,
    save: save,
    remove: remove,
    listen: listen
  };

})();
