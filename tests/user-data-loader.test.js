/**
 * Stage 1.6B.2D — UserDataLoader focused tests.
 *
 * Verifies root data loading, extraction, lifecycle, and stale-callback
 * protection without requiring Firebase runtime.
 * Run with: node tests/user-data-loader.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const userDataLoaderCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'user-data-loader.js'), 'utf8');

function waitForMicrotasks() {
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

function createMockStorage() {
  var activeCallbacks = [];
  var allCallbacks = [];
  var rootValue = null;

  return {
    listenRoot: function(callback) {
      activeCallbacks.push(callback);
      allCallbacks.push(callback);
      setTimeout(function() {
        if (activeCallbacks.indexOf(callback) >= 0) {
          callback(rootValue);
        }
      }, 0);
      return function unsubscribe() {
        var idx = activeCallbacks.indexOf(callback);
        if (idx >= 0) activeCallbacks.splice(idx, 1);
      };
    },
    setRootValue: function(value) {
      rootValue = value;
      setTimeout(function() {
        activeCallbacks.forEach(function(cb) { cb(rootValue); });
      }, 0);
    },
    getActiveCount: function() { return activeCallbacks.length; },
    getAllCallbacks: function() { return allCallbacks.slice(); },
    reset: function() {
      activeCallbacks.length = 0;
      allCallbacks.length = 0;
      rootValue = null;
    }
  };
}

function setupUserDataLoader(mockStorage) {
  var calls = {};
  var lastSetRef = null;
  var window = {
    UserDataLoader: null,
    StorageAdapter: mockStorage,
    DataLayer: { currentUserRef: null },
    FirebaseStorageAdapter: {
      setCurrentUserRef: function(ref) { lastSetRef = ref; }
    },
    db: { ref: function() { return {}; } },
    _vintedPrices: null
  };

  [
    'ensureIncomeProfilesExist', 'ensureResaleDataDefaults', 'ensureDashboardLayouts',
    'switchTab', 'renderAll', 'applyThemeIcons', 'scheduleNotifications', 'autoCheckRecurring',
    'toast', 'resetLocalAppState'
  ].forEach(function(fn) {
    calls[fn] = 0;
    window[fn] = function() { calls[fn]++; };
  });

  var script = new Function('window', userDataLoaderCode);
  script(window);

  return {
    window: window,
    calls: calls,
    mockStorage: mockStorage,
    getLastSetRef: function() { return lastSetRef; }
  };
}

function createFullRootData(overrides) {
  return Object.assign({
    finapp_transactions: [{ id: 't1' }],
    finapp_debtors: [{ id: 'd1' }],
    finapp_budgets: [{ id: 'b1' }],
    finapp_goals: [{ id: 'g1' }],
    finapp_reminders: [{ id: 'r1' }],
    finapp_transfers: [{ id: 'tr1' }],
    finapp_income_sources: [{ id: 'i1' }],
    finapp_templates: [{ id: 'tp1' }],
    finapp_recurring: [{ id: 'rc1' }],
    finapp_creditors: [{ id: 'c1' }],
    finapp_autosave_rules: [{ id: 'a1' }],
    finapp_rule_targets: { needs: 40, wants: 30, savings: 30 },
    finapp_strony_products: [{ id: 'sp1' }],
    finapp_resale_products: [{ id: 'rp1' }],
    finapp_resale_sales: [{ id: 'rs1' }],
    finapp_resale_tasks: [{ id: 'rt1' }],
    finapp_resale_shipments: [{ id: 'rsh1' }],
    finapp_resale_events: [{ id: 're1' }],
    finapp_resale_settings: { staleThresholdDays: 60, defaultMinStockAlert: 5, shipPerKg: 70, platformCommissions: { vinted: 5, allegro: 15 } },
    finapp_gielda_ops: [{ id: 'go1' }],
    finapp_strony_clients: [{ id: 'sc1' }],
    finapp_vinted_prices: [{ productId: 'p1', price: 100 }],
    settings: { layouts: { home: { order: [] } } }
  }, overrides);
}

describe('UserDataLoader', () => {
  it('extracts all required legacy fields from root data', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.initialLoadDone = false;

    var rootData = createFullRootData();
    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue(rootData);
    await waitForMicrotasks();

    assert.deepStrictEqual(window.transactions, [{ id: 't1' }]);
    assert.deepStrictEqual(window.debtors, [{ id: 'd1' }]);
    assert.deepStrictEqual(window.budgets, [{ id: 'b1' }]);
    assert.deepStrictEqual(window.goals, [{ id: 'g1' }]);
    assert.deepStrictEqual(window.reminders, [{ id: 'r1' }]);
    assert.deepStrictEqual(window.transfers, [{ id: 'tr1' }]);
    assert.deepStrictEqual(window.incomeSources, [{ id: 'i1' }]);
    assert.deepStrictEqual(window.txTemplates, [{ id: 'tp1' }]);
    assert.deepStrictEqual(window.recurringTx, [{ id: 'rc1' }]);
    assert.deepStrictEqual(window.creditors, [{ id: 'c1' }]);
    assert.deepStrictEqual(window.autoSaveRules, [{ id: 'a1' }]);
    assert.deepStrictEqual(window.ruleTargets, { needs: 40, wants: 30, savings: 30 });
    assert.deepStrictEqual(window.stronyProducts, [{ id: 'sp1' }]);
    assert.deepStrictEqual(window.resaleProducts, [{ id: 'rp1' }]);
    assert.deepStrictEqual(window.resaleSales, [{ id: 'rs1' }]);
    assert.deepStrictEqual(window.resaleTasks, [{ id: 'rt1' }]);
    assert.deepStrictEqual(window.resaleShipments, [{ id: 'rsh1' }]);
    assert.deepStrictEqual(window.resaleEvents, [{ id: 're1' }]);
    assert.deepStrictEqual(window.gieldaOps, [{ id: 'go1' }]);
    assert.deepStrictEqual(window.stronyClients, [{ id: 'sc1' }]);
    assert.deepStrictEqual(window._vintedPrices, [{ productId: 'p1', price: 100 }]);
    assert.deepStrictEqual(window.dbData, rootData);
  });

  it('uses existing defaults for missing collections', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.initialLoadDone = false;

    var rootData = { finapp_transactions: [{ id: 't1' }] };
    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue(rootData);
    await waitForMicrotasks();

    assert.deepStrictEqual(window.transactions, [{ id: 't1' }]);
    assert.deepStrictEqual(window.debtors, []);
    assert.deepStrictEqual(window.budgets, []);
    assert.deepStrictEqual(window.goals, []);
    assert.deepStrictEqual(window.reminders, []);
    assert.deepStrictEqual(window.transfers, []);
    assert.deepStrictEqual(window.incomeSources, []);
    assert.deepStrictEqual(window.txTemplates, []);
    assert.deepStrictEqual(window.recurringTx, []);
    assert.deepStrictEqual(window.creditors, []);
    assert.deepStrictEqual(window.autoSaveRules, []);
    assert.deepStrictEqual(window.ruleTargets, { needs: 50, wants: 30, savings: 20 });
    assert.deepStrictEqual(window.stronyProducts, []);
    assert.deepStrictEqual(window.resaleProducts, []);
    assert.deepStrictEqual(window.resaleSales, []);
    assert.deepStrictEqual(window.resaleTasks, []);
    assert.deepStrictEqual(window.resaleShipments, []);
    assert.deepStrictEqual(window.resaleEvents, []);
    assert.deepStrictEqual(window.gieldaOps, []);
    assert.deepStrictEqual(window.stronyClients, []);
    assert.deepStrictEqual(window.resaleSettings, { staleThresholdDays: 30, defaultMinStockAlert: 2, shipPerKg: 65, platformCommissions: { vinted: 0, allegro: 10, olx: 0, ebay: 10, facebook: 0, inne: 0 } });
    assert.deepStrictEqual(window._vintedPrices, null);
  });

  it('sets initialLoadDone after successful load', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.initialLoadDone = false;

    assert.strictEqual(window.initialLoadDone, false);
    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [] });
    await waitForMicrotasks();
    assert.strictEqual(window.initialLoadDone, true);
  });

  it('start() is idempotent for the same uid', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;

    window.UserDataLoader.start('uid1');
    assert.strictEqual(mockStorage.getActiveCount(), 1, 'First start must attach listener');

    window.UserDataLoader.start('uid1');
    assert.strictEqual(mockStorage.getActiveCount(), 1, 'Duplicate start must not attach extra listener');
  });

  it('stop() synchronously unsubscribes the listener', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;

    window.UserDataLoader.start('uid1');
    assert.strictEqual(mockStorage.getActiveCount(), 1);

    window.UserDataLoader.stop();
    assert.strictEqual(mockStorage.getActiveCount(), 0, 'stop() must remove listener immediately');
  });

  it('user switch stops old listener and starts new one', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;

    window.UserDataLoader.start('uid1');
    assert.strictEqual(mockStorage.getActiveCount(), 1);

    window.UserDataLoader.start('uid2');
    assert.strictEqual(mockStorage.getActiveCount(), 1, 'Old listener must be removed on user switch');
  });

  it('stale callback from old listener cannot overwrite new user state', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.initialLoadDone = false;

    var uid1Data = { finapp_transactions: [{ id: 't1' }] };
    var uid2Data = { finapp_transactions: [{ id: 't2' }] };

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue(uid1Data);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 't1' }], 'Initial state must be uid1');

    window.UserDataLoader.start('uid2');
    mockStorage.setRootValue(uid2Data);
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 't2' }], 'State must reflect uid2 after switch');

    var allCallbacks = mockStorage.getAllCallbacks();
    assert.ok(allCallbacks.length >= 2, 'Mock must track all callbacks');

    allCallbacks[0](uid1Data);
    await waitForMicrotasks();

    assert.deepStrictEqual(window.transactions, [{ id: 't2' }], 'Stale callback must not overwrite new user state');
  });

  it('supports start/stop/restart lifecycle', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [{ id: 't1' }] });
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 't1' }]);
    assert.strictEqual(window.initialLoadDone, true);

    window.UserDataLoader.stop();
    assert.strictEqual(mockStorage.getActiveCount(), 0);

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [{ id: 't2' }] });
    await waitForMicrotasks();
    assert.deepStrictEqual(window.transactions, [{ id: 't2' }]);
    assert.strictEqual(window.initialLoadDone, true);
  });

  it('does not invoke migration or UI functions', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    var calls = setup.calls;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [] });
    await waitForMicrotasks();

    assert.strictEqual(calls.ensureIncomeProfilesExist, 0);
    assert.strictEqual(calls.ensureResaleDataDefaults, 0);
    assert.strictEqual(calls.ensureDashboardLayouts, 0);
    assert.strictEqual(calls.switchTab, 0);
    assert.strictEqual(calls.renderAll, 0);
    assert.strictEqual(calls.applyThemeIcons, 0);
    assert.strictEqual(calls.scheduleNotifications, 0);
    assert.strictEqual(calls.autoCheckRecurring, 0);
    assert.strictEqual(calls.toast, 0);
    assert.strictEqual(calls.resetLocalAppState, 0);
  });

  it('does not set window.currentUserRef', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;

    assert.strictEqual(window.currentUserRef, undefined, 'currentUserRef must not exist before start');
    window.UserDataLoader.start('uid1');
    assert.strictEqual(window.currentUserRef, undefined, 'UserDataLoader must not set window.currentUserRef');
  });

  it('does not set DataLayer.currentUserRef', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;

    assert.strictEqual(window.DataLayer.currentUserRef, null, 'DataLayer.currentUserRef must start null');
    window.UserDataLoader.start('uid1');
    assert.strictEqual(window.DataLayer.currentUserRef, null, 'UserDataLoader must not set DataLayer.currentUserRef');
  });

  it('does not call FirebaseStorageAdapter.setCurrentUserRef', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;

    window.UserDataLoader.start('uid1');
    assert.strictEqual(setup.getLastSetRef(), null, 'UserDataLoader must not call setCurrentUserRef');
  });

  it('updates _vintedPrices when field is present', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window._vintedPrices = null;
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_vinted_prices: [{ productId: 'v1', price: 100 }] });
    await waitForMicrotasks();

    assert.deepStrictEqual(window._vintedPrices, [{ productId: 'v1', price: 100 }]);
  });

  it('preserves existing _vintedPrices when field is missing', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window._vintedPrices = 'previous';
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [] });
    await waitForMicrotasks();

    assert.strictEqual(window._vintedPrices, 'previous', '_vintedPrices must be preserved when field is missing');
  });

  it('maps finapp_vinted_meta to _vintedMeta when present', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window._vintedMeta = null;
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_vinted_meta: { loadedAt: 1700000000000, file: 'test.json' } });
    await waitForMicrotasks();

    assert.deepStrictEqual(window._vintedMeta, { loadedAt: 1700000000000, file: 'test.json' });
  });

  it('sets _vintedMeta to default null when field is missing', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window._vintedMeta = 'previous';
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [] });
    await waitForMicrotasks();

    assert.strictEqual(window._vintedMeta, null, '_vintedMeta must default to null when field is missing');
  });

  it('maps finapp_active_money_place to activeMoneyPlace when present', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.activeMoneyPlace = undefined;
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_active_money_place: 'skarbonka' });
    await waitForMicrotasks();

    assert.strictEqual(window.activeMoneyPlace, 'skarbonka');
  });

  it('defaults activeMoneyPlace to konto when field is missing', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.activeMoneyPlace = 'previous';
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_transactions: [] });
    await waitForMicrotasks();

    assert.strictEqual(window.activeMoneyPlace, 'konto', 'activeMoneyPlace must default to konto');
  });

  it('updates activeMoneyPlace on subsequent root sync', async () => {
    var mockStorage = createMockStorage();
    var setup = setupUserDataLoader(mockStorage);
    var window = setup.window;
    window.initialLoadDone = false;

    window.UserDataLoader.start('uid1');
    mockStorage.setRootValue({ finapp_active_money_place: 'konto' });
    await waitForMicrotasks();
    assert.strictEqual(window.activeMoneyPlace, 'konto');

    mockStorage.setRootValue({ finapp_active_money_place: 'skarbonka' });
    await waitForMicrotasks();
    assert.strictEqual(window.activeMoneyPlace, 'skarbonka', 'activeMoneyPlace must update on root sync');
  });
});
