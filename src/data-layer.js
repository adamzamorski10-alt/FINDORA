/**
 * Stage 1.2B — Data Layer
 *
 * Persistence facade for backward compatibility.
 * Delegates async operations to active Storage Adapter.
 * All state is stored on `window` for backward compatibility
 * with existing inline scripts and event handlers.
 */

(function() {
  'use strict';

  if (!window.firebase || !window.firebase.database) {
    console.warn('[DataLayer] Firebase not available yet');
    return;
  }

  window.db = window.firebase.database();

  window.dbData = {};
  window.initialLoadDone = false;
  window._resaleShippingToastShown = false;

  window.currentUserRef = null;
  window.currentUid = null;

  window.SK = {
    transactions:    'finapp_transactions',
    debtors:         'finapp_debtors',
    budgets:         'finapp_budgets',
    goals:           'finapp_goals',
    reminders:       'finapp_reminders',
    transfers:       'finapp_transfers',
    incomeSources:   'finapp_income_sources',
    templates:       'finapp_templates',
    recurring:       'finapp_recurring',
    creditors:       'finapp_creditors',
    autoSaveRules:   'finapp_autosave_rules',
    ruleTargets:     'finapp_rule_targets',
    stronyProducts:  'finapp_strony_products',
    resaleProducts:  'finapp_resale_products',
    resaleSales:     'finapp_resale_sales',
    resaleTasks:     'finapp_resale_tasks',
    resaleShipments: 'finapp_resale_shipments',
    resaleEvents:    'finapp_resale_events',
    incomeProfiles:  'incomeProfiles',
    resaleSettings:  'finapp_resale_settings',
    gieldaOps:       'finapp_gielda_ops',
    stronyClients:   'finapp_strony_clients',
    dashboardLayouts:'finapp_dashboard_layouts'
  };

  window.load = function(key, fb) {
    return window.dbData[key] !== undefined ? window.dbData[key] : fb;
  };

  window._stripUndefinedDeep = function(value) {
    if (Array.isArray(value)) return value.map(window._stripUndefinedDeep);
    if (value && typeof value === 'object') {
      const out = {};
      for (const k in value) {
        if (value[k] === undefined) continue;
        out[k] = window._stripUndefinedDeep(value[k]);
      }
      return out;
    }
    return value;
  };

  function getActiveStorage() {
    if (typeof window.getActiveStorageAdapter === 'function') {
      try {
        return window.getActiveStorageAdapter();
      } catch (e) {
        return null;
      }
    }
    return window.StorageAdapter || null;
  }

  window.save = function(key, data, options) {
    options = options || {};
    if (!window.currentUserRef) {
      console.warn('save() pominięty — brak zalogowanego użytkownika, klucz:', key);
      return Promise.resolve();
    }
    const storage = getActiveStorage();
    if (!storage) {
      console.warn('save() pominięty — brak aktywnego StorageAdapter, klucz:', key);
      return Promise.resolve();
    }
    try {
      const clean = window._stripUndefinedDeep(data);
      const result = storage.set(key, clean);
      if (result && typeof result.catch === 'function') {
        result.catch(function(err) {
          if (!options.silent) {
            console.error('Firebase save error for key "' + key + '":', err);
            if (typeof window.toast === 'function') {
              window.toast('Nie udało się zapisać w bazie (' + key + '): ' + (err && err.message ? err.message : err), 'error');
            }
          }
        });
      }
      return result || Promise.resolve();
    } catch (err) {
      if (!options.silent) {
        console.error('Firebase save threw synchronously for key "' + key + '":', err);
        if (typeof window.toast === 'function') {
          window.toast('Błąd zapisu (' + key + '): ' + (err && err.message ? err.message : err), 'error');
        }
      }
      return Promise.reject(err);
    }
  };

  window.remove = function(key) {
    if (!window.currentUserRef) {
      console.warn('remove() pominięty — brak zalogowanego użytkownika, klucz:', key);
      return Promise.resolve();
    }
    const storage = getActiveStorage();
    if (!storage) {
      console.warn('remove() pominięty — brak aktywnego StorageAdapter, klucz:', key);
      return Promise.resolve();
    }
    try {
      const result = storage.remove(key);
      if (result && typeof result.catch === 'function') {
        result.catch(function(err) {
          console.error('Firebase remove error for key "' + key + '":', err);
          if (typeof window.toast === 'function') {
            window.toast('Nie udało się usunąć (' + key + '): ' + (err && err.message ? err.message : err), 'error');
          }
        });
      }
      return result || Promise.resolve();
    } catch (err) {
      console.error('Firebase remove threw synchronously for key "' + key + '":', err);
      if (typeof window.toast === 'function') {
        window.toast('Błąd usuwania (' + key + '): ' + (err && err.message ? err.message : err), 'error');
      }
      return Promise.reject(err);
    }
  };

  window.readOnce = function(path) {
    if (!window.currentUserRef) {
      console.warn('readOnce() pominięty — brak zalogowanego użytkownika, ścieżka:', path);
      return Promise.resolve({ val: function() { return null; } });
    }
    const storage = getActiveStorage();
    if (!storage) {
      console.warn('readOnce() pominięty — brak aktywnego StorageAdapter, ścieżka:', path);
      return Promise.resolve({ val: function() { return null; } });
    }
    try {
      return storage.get(path).then(function(value) {
        return { val: function() { return value; } };
      });
    } catch (err) {
      console.error('Firebase readOnce error for path "' + path + '":', err);
      return Promise.reject(err);
    }
  };

  window.onValue = function(path, callback, errCallback) {
    if (!window.currentUserRef) {
      console.warn('onValue() pominięty — brak zalogowanego użytkownika, ścieżka:', path);
      return function() {};
    }
    const storage = getActiveStorage();
    if (!storage) {
      console.warn('onValue() pominięty — brak aktywnego StorageAdapter, ścieżka:', path);
      return function() {};
    }
    try {
      return storage.listen(path, callback, errCallback);
    } catch (err) {
      console.error('Firebase onValue error for path "' + path + '":', err);
      if (errCallback) errCallback(err);
      return function() {};
    }
  };

  window.updateUserPaths = function(updates) {
    if (!window.currentUserRef) {
      console.warn('updateUserPaths() pominięty — brak zalogowanego użytkownika');
      return Promise.resolve();
    }
    const storage = getActiveStorage();
    if (!storage) {
      console.warn('updateUserPaths() pominięty — brak aktywnego StorageAdapter');
      return Promise.resolve();
    }
    try {
      const result = storage.updateMany(updates);
      if (result && typeof result.catch === 'function') {
        result.catch(function(err) {
          console.error('Firebase updateUserPaths error:', err);
          if (typeof window.toast === 'function') {
            window.toast('Nie udało się zaktualizować danych: ' + (err && err.message ? err.message : err), 'error');
          }
        });
      }
      return result || Promise.resolve();
    } catch (err) {
      console.error('Firebase updateUserPaths threw synchronously:', err);
      if (typeof window.toast === 'function') {
        window.toast('Błąd aktualizacji danych: ' + (err && err.message ? err.message : err), 'error');
      }
      return Promise.reject(err);
    }
  };

  window.DataLayer = {
    db: window.db,
    SK: window.SK,
    load: window.load,
    save: window.save,
    remove: window.remove,
    readOnce: window.readOnce,
    onValue: window.onValue,
    updateUserPaths: window.updateUserPaths,
    stripUndefinedDeep: window._stripUndefinedDeep,
    get dbData() { return window.dbData; },
    set dbData(v) { window.dbData = v; },
    get currentUserRef() { return window.currentUserRef; },
    set currentUserRef(v) {
      window.currentUserRef = v;
      if (window.FirebaseStorageAdapter && window.FirebaseStorageAdapter.setCurrentUserRef) {
        window.FirebaseStorageAdapter.setCurrentUserRef(v);
      }
    },
    get currentUid() { return window.currentUid; },
    set currentUid(v) { window.currentUid = v; }
  };

})();
