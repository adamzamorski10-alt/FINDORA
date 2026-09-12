/**
 * Stage 1.4+ — Recurring Rule Repository
 *
 * CRUD operations for recurring rules.
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_recurring';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('RecurringRule must be an object');
      return errors;
    }
    if (!input.name || typeof input.name !== 'string') errors.push('name must be a non-empty string');
    if (!input.type) errors.push('type is required');
    if (!['income', 'expense'].includes(input.type)) errors.push('type must be income or expense');
    if (typeof input.amount !== 'number' || input.amount <= 0) errors.push('amount must be a positive number');
    if (!input.accountId) errors.push('accountId is required');
    if (!input.frequency) errors.push('frequency is required');
    if (!['monthly', 'weekly', 'yearly'].includes(input.frequency)) {
      errors.push('frequency must be monthly, weekly, or yearly');
    }
    if (input.frequency === 'monthly' && (!input.dayOfMonth || input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
      errors.push('dayOfMonth must be between 1 and 31 for monthly frequency');
    }
    if (!input.startDate) errors.push('startDate is required');
    return errors;
  }

  function normalize(rule) {
    return {
      id: rule.id,
      userId: rule.userId || null,
      name: rule.name || '',
      type: rule.type || 'expense',
      amount: rule.amount || 0,
      categoryId: rule.categoryId || null,
      accountId: rule.accountId,
      description: typeof rule.description === 'string' ? rule.description : '',
      frequency: rule.frequency || 'monthly',
      dayOfMonth: rule.dayOfMonth || null,
      startDate: rule.startDate,
      active: rule.active !== false,
      lastBooked: rule.lastBooked || null,
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

  function findActive() {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(r) { return r.active; }).map(normalize);
    });
  }

  function findDue(monthKey) {
    return getAllRaw().then(function(raw) {
      var active = raw.filter(function(r) { return r.active; });
      var due = [];
      for (var i = 0; i < active.length; i++) {
        var rule = active[i];
        var nextDate = computeNextDate(rule);
        if (nextDate && nextDate.indexOf(monthKey) === 0) {
          due.push(normalize(rule));
        }
      }
      return due;
    });
  }

  function computeNextDate(rule) {
    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth();
    var day = today.getDate();

    if (rule.frequency === 'monthly') {
      var targetDay = rule.dayOfMonth || 1;
      var date = new Date(year, month, targetDay);
      if (date < today) {
        date.setMonth(date.getMonth() + 1);
      }
      return date.toISOString().split('T')[0];
    }

    if (rule.frequency === 'weekly') {
      var start = new Date(rule.lastBooked || rule.startDate);
      var next = new Date(start);
      while (next < today) {
        next.setDate(next.getDate() + 7);
      }
      return next.toISOString().split('T')[0];
    }

    if (rule.frequency === 'yearly') {
      var start = new Date(rule.startDate);
      var next = new Date(year, start.getMonth(), start.getDate());
      if (next < today) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next.toISOString().split('T')[0];
    }

    return null;
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

  function updateLastBooked(id, date) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(r) { return r.id === id; });
      if (index < 0) {
        return Promise.reject(new Error('Recurring rule not found: ' + id));
      }
      var updated = normalize({
        ...raw[index],
        lastBooked: date
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

  window.RecurringRuleRepository = {
    loadAll: loadAll,
    findById: findById,
    findActive: findActive,
    findDue: findDue,
    save: save,
    remove: remove,
    updateLastBooked: updateLastBooked,
    listen: listen
  };

})();
