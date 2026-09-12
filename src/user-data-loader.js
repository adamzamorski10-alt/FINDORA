/**
 * Stage 1.6B.2D — User Data Loader
 *
 * Standalone module that owns root user-data loading, extraction, and listener
 * lifecycle. Does NOT own authentication, session selection, migrations, UI,
 * or DOM work.
 *
 * Lifecycle:
 *   start(uid)  - attaches exactly one root listener for the given uid
 *   stop()      - synchronously unsubscribes the listener
 *
 * Stale-callback protection:
 *   Uses a monotonically increasing sessionGeneration counter. Each start()
 *   increments the counter and captures the current generation in the callback
 *   closure. If a stale callback from a previous session fires, the generation
 *   mismatch causes it to return early.
 *
 * Session context:
 *   UserDataLoader does NOT own session context. It expects the caller to
 *   bind the StorageAdapter to the correct user before calling start().
 *   It does not set or clear window.currentUserRef, DataLayer.currentUserRef,
 *   or FirebaseStorageAdapter currentUserRef.
 */

(function() {
  'use strict';

  var RESALE_SETTINGS_DEFAULTS = {
    staleThresholdDays: 30,
    defaultMinStockAlert: 2,
    shipPerKg: 65,
    platformCommissions: { vinted: 0, allegro: 10, olx: 0, ebay: 10, facebook: 0, inne: 0 }
  };

  var USER_DATA_MAP = [
    { key: 'finapp_transactions',    global: 'transactions',     default: [] },
    { key: 'finapp_debtors',         global: 'debtors',          default: [] },
    { key: 'finapp_budgets',         global: 'budgets',          default: [] },
    { key: 'finapp_goals',           global: 'goals',            default: [] },
    { key: 'finapp_reminders',       global: 'reminders',        default: [] },
    { key: 'finapp_transfers',       global: 'transfers',        default: [] },
    { key: 'finapp_income_sources',  global: 'incomeSources',    default: [] },
    { key: 'finapp_templates',       global: 'txTemplates',      default: [] },
    { key: 'finapp_recurring',       global: 'recurringTx',      default: [] },
    { key: 'finapp_creditors',       global: 'creditors',        default: [] },
    { key: 'finapp_autosave_rules',  global: 'autoSaveRules',    default: [] },
    { key: 'finapp_rule_targets',    global: 'ruleTargets',      default: { needs:50, wants:30, savings:20 } },
    { key: 'finapp_strony_products', global: 'stronyProducts',   default: [] },
    { key: 'finapp_resale_products', global: 'resaleProducts',   default: [] },
    { key: 'finapp_resale_sales',    global: 'resaleSales',      default: [] },
    { key: 'finapp_resale_tasks',    global: 'resaleTasks',      default: [] },
    { key: 'finapp_resale_shipments',global: 'resaleShipments',  default: [] },
    { key: 'finapp_resale_events',   global: 'resaleEvents',     default: [] },
    { key: 'finapp_gielda_ops',      global: 'gieldaOps',        default: [] },
    { key: 'finapp_strony_clients',  global: 'stronyClients',    default: [] },
    { key: 'finapp_vinted_meta',     global: '_vintedMeta',      default: null },
    { key: 'finapp_active_money_place', global: 'activeMoneyPlace', default: 'konto' }
  ];

  var currentUid = null;
  var unsubscribe = null;
  var sessionGeneration = 0;

  function getStorage() {
    if (typeof window.getActiveStorageAdapter === 'function') {
      try { return window.getActiveStorageAdapter(); } catch (_) {}
    }
    return window.StorageAdapter || null;
  }

  function applyMapping(rootData) {
    window.dbData = rootData || {};

    var i;
    for (i = 0; i < USER_DATA_MAP.length; i++) {
      var mapping = USER_DATA_MAP[i];
      window[mapping.global] = window.dbData[mapping.key] !== undefined
        ? window.dbData[mapping.key]
        : mapping.default;
    }

    window.resaleSettings = Object.assign({}, RESALE_SETTINGS_DEFAULTS, window.dbData['finapp_resale_settings'] || {});
    if (window.dbData['finapp_vinted_prices']) {
      window._vintedPrices = window.dbData['finapp_vinted_prices'];
    }
  }

  function start(uid, onRootData, onError) {
    if (!uid) return;
    if (currentUid === uid) return;

    stop();

    currentUid = uid;
    sessionGeneration++;
    var myGeneration = sessionGeneration;

    var storage = getStorage();
    if (!storage || typeof storage.listenRoot !== 'function') {
      return;
    }

    var rootOnError = typeof onError === 'function' ? onError : null;

    unsubscribe = storage.listenRoot(
      (function(generation) {
        return function(rootData) {
          if (sessionGeneration !== generation) return;
          applyMapping(rootData);
          if (typeof onRootData === 'function') {
            onRootData(rootData);
          }
          window.initialLoadDone = true;
        };
      })(myGeneration),
      (function(generation) {
        return function(err) {
          if (sessionGeneration !== generation) return;
          console.error('[UserDataLoader] Listener error:', err);
          if (rootOnError) {
            rootOnError(err);
          }
        };
      })(myGeneration)
    );
  }

  function stop() {
    if (unsubscribe) {
      try { unsubscribe(); } catch (_) {}
      unsubscribe = null;
    }
    currentUid = null;
  }

  window.UserDataLoader = {
    start: start,
    stop: stop
  };
})();
