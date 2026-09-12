/**
 * Stage 1.4+ — Person Repository
 *
 * CRUD operations for people (debtors/creditors).
 * Uses Storage Adapter for persistence.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'finapp_people';

  function now() {
    return new Date().toISOString();
  }

  function validate(input) {
    var errors = [];
    if (!input || typeof input !== 'object') {
      errors.push('Person must be an object');
      return errors;
    }
    if (!input.name || typeof input.name !== 'string') errors.push('name must be a non-empty string');
    if (!input.type) errors.push('type is required');
    if (!['debtor', 'creditor'].includes(input.type)) {
      errors.push('type must be debtor or creditor');
    }
    return errors;
  }

  function normalize(person) {
    return {
      id: person.id,
      userId: person.userId || null,
      name: person.name || '',
      type: person.type || 'debtor',
      balances: person.balances || { total: 0, paid: 0, remaining: 0 },
      debts: Array.isArray(person.debts) ? person.debts : [],
      repayments: Array.isArray(person.repayments) ? person.repayments : [],
      createdAt: person.createdAt || now(),
      updatedAt: person.updatedAt || now()
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
      var found = raw.find(function(p) { return p.id === id; });
      return found ? normalize(found) : null;
    });
  }

  function findByType(type) {
    return getAllRaw().then(function(raw) {
      return raw.filter(function(p) { return p.type === type; }).map(normalize);
    });
  }

  function save(person) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    var errors = validate(person);
    if (errors.length > 0) {
      return Promise.reject(new Error('Validation failed: ' + errors.join(', ')));
    }

    var normalized = normalize(person);

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(p) { return p.id === normalized.id; });
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
      var filtered = raw.filter(function(p) { return p.id !== id; });
      return window.StorageAdapter.set(STORAGE_KEY, filtered);
    });
  }

  function addDebt(personId, debt) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(p) { return p.id === personId; });
      if (index < 0) {
        return Promise.reject(new Error('Person not found: ' + personId));
      }

      var newDebt = {
        id: debt.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
        amount: debt.amount || 0,
        description: typeof debt.description === 'string' ? debt.description : '',
        date: debt.date || now().split('T')[0],
        repaid: 0,
        createdAt: now()
      };

      raw[index].debts = raw[index].debts || [];
      raw[index].debts.push(newDebt);
      raw[index].updatedAt = now();

      return window.StorageAdapter.set(STORAGE_KEY, raw).then(function() {
        return normalize(raw[index]);
      });
    });
  }

  function addRepayment(personId, repayment) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      return Promise.reject(new Error('StorageAdapter not available'));
    }

    return getAllRaw().then(function(raw) {
      var index = raw.findIndex(function(p) { return p.id === personId; });
      if (index < 0) {
        return Promise.reject(new Error('Person not found: ' + personId));
      }

      var newRepayment = {
        id: repayment.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
        amount: repayment.amount || 0,
        date: repayment.date || now().split('T')[0],
        description: typeof repayment.description === 'string' ? repayment.description : '',
        createdAt: now()
      };

      raw[index].repayments = raw[index].repayments || [];
      raw[index].repayments.push(newRepayment);
      raw[index].updatedAt = now();

      return window.StorageAdapter.set(STORAGE_KEY, raw).then(function() {
        return normalize(raw[index]);
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

  window.PersonRepository = {
    loadAll: loadAll,
    findById: findById,
    findByType: findByType,
    save: save,
    remove: remove,
    addDebt: addDebt,
    addRepayment: addRepayment,
    listen: listen
  };

})();
