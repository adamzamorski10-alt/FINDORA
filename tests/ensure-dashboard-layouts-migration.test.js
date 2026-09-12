/**
 * Stage 1.6B.5A — Dashboard Layout Initialization Migration tests.
 *
 * Verifies that ensureDashboardLayouts() uses explicit rootData
 * as its primary source instead of dbData.settings.layouts.
 *
 * Run with: node tests/ensure-dashboard-layouts-migration.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'dashboard-layouts-state.js'), 'utf8');

// Shared test-scope variables that ensureDashboardLayouts closes over
let DEFAULT_LAYOUTS;
let SK;
let dbData;
let load;
let saveDashboardLayoutTab;
let DataLayer;
let currentUserRef;
let DashboardLayoutsState;

function extractEnsureDashboardLayouts() {
  const match = indexHtml.match(/function ensureDashboardLayouts\(rootData\) \{[\s\S]*?^\}/m);
  if (!match) {
    throw new Error('Could not extract ensureDashboardLayouts from index.html');
  }
  return match[0];
}

function createMockStorageAdapter() {
  const calls = [];
  return {
    get: function(key) {
      calls.push({ method: 'get', key });
      return Promise.resolve(null);
    },
    set: function(key, data) {
      calls.push({ method: 'set', key, data: JSON.parse(JSON.stringify(data)) });
      return Promise.resolve();
    },
    update: function(key, values) {
      calls.push({ method: 'update', key, values: JSON.parse(JSON.stringify(values)) });
      return Promise.resolve();
    },
    updateMany: function(updates) {
      calls.push({ method: 'updateMany', updates: JSON.parse(JSON.stringify(updates)) });
      return Promise.resolve();
    },
    remove: function(key) {
      calls.push({ method: 'remove', key });
      return Promise.resolve();
    },
    listen: function(path, callback, errCallback) {
      calls.push({ method: 'listen', path });
      return function unsubscribe() {};
    },
    listenRoot: function(callback, errCallback) {
      calls.push({ method: 'listenRoot' });
      return function unsubscribe() {};
    },
    calls,
  };
}

function setupWindow(mockStorage) {
  DEFAULT_LAYOUTS = {
    home: ['net_worth', 'safe_to_spend'],
    stats: ['kpi_row'],
    report: ['monthly_summary'],
  };
  global.DEFAULT_LAYOUTS = DEFAULT_LAYOUTS;

  SK = {
    dashboardLayouts: 'finapp_dashboard_layouts'
  };
  global.SK = SK;

  dbData = {};
  global.dbData = dbData;

  load = function(key, fb) {
    return dbData[key] !== undefined ? dbData[key] : fb;
  };
  global.load = load;

  currentUserRef = { child: function() { return {}; } };
  global.currentUserRef = currentUserRef;

  DataLayer = {
    save: function(key, data, options) {
      return Promise.resolve();
    },
    remove: function(key) {
      DataLayer._removeCalls = DataLayer._removeCalls || [];
      DataLayer._removeCalls.push(key);
      return Promise.resolve();
    },
  };
  global.DataLayer = DataLayer;

  const window = {
    DEFAULT_LAYOUTS,
    WIDGET_REGISTRY: {
      net_worth: { tab: 'home', title: 'Net Worth' },
      safe_to_spend: { tab: 'home', title: 'Safe to Spend' },
      kpi_row: { tab: 'stats', title: 'KPI' },
      monthly_summary: { tab: 'report', title: 'Monthly' },
    },
    DataLayer,
    currentUserRef: currentUserRef,
    StorageAdapter: null,
    StorageAdapterContract: {
      create: function(adapter, name) {
        const required = ['get', 'set', 'update', 'updateMany', 'remove', 'listen', 'listenRoot'];
        const missing = required.filter(method => typeof adapter[method] !== 'function');
        if (missing.length > 0) {
          throw new Error('[StorageAdapterContract] ' + (name || 'anonymous') + ' missing methods: ' + missing.join(', '));
        }
        return adapter;
      }
    },
    setActiveStorageAdapter: function(adapter, name) {
      window.StorageAdapterContract.create(adapter, name);
      window.StorageAdapter = adapter;
    },
    getActiveStorageAdapter: function() {
      if (!window.StorageAdapter) {
        throw new Error('[StorageAdapter] No active adapter configured.');
      }
      return window.StorageAdapter;
    },
    toast: function(msg) {},
    console: console,
  };

  window.DashboardLayoutsRepository = {
    saveTab: function(tab, showToast) {
      return mockStorage.set('settings/layouts/' + tab, { order: [], hidden: [] });
    }
  };

  global.WIDGET_REGISTRY = window.WIDGET_REGISTRY;

  const stateScript = new Function('window', stateCode);
  stateScript(window);
  DashboardLayoutsState = window.DashboardLayoutsState;
  global.DashboardLayoutsState = DashboardLayoutsState;

  saveDashboardLayoutTab = function(tab, showToast) {
    if (!window.currentUserRef) {
      return;
    }
    const promise = window.DashboardLayoutsRepository.saveTab(tab, showToast);
    if (!showToast) return;
    if (promise && typeof promise.then === 'function') {
      promise.then(() => window.toast('Zapisano układ!')).catch(() => {});
    }
  };
  global.saveDashboardLayoutTab = saveDashboardLayoutTab;

  if (mockStorage) {
    window.setActiveStorageAdapter(mockStorage, 'test');
  }

  return window;
}

function createEnsureDashboardLayouts() {
  const fnCode = extractEnsureDashboardLayouts();
  return new Function('window', fnCode + '\nreturn ensureDashboardLayouts;');
}

describe('Dashboard Layout Initialization Migration', () => {
  it('initializes from rootData.settings.layouts when provided', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
          stats: { order: ['kpi_row'], hidden: [] },
          report: { order: ['monthly_summary'], hidden: [] },
        }
      }
    };

    ensure(rootData);

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts, rootData.settings.layouts);
  });

  it('does not use stale dbData.settings.layouts when rootData is provided', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };

    dbData = {
      settings: {
        layouts: {
          home: { order: ['safe_to_spend'], hidden: [] },
        }
      }
    };

    ensure(rootData);

    // ensureDashboardLayouts merges saved layouts with DEFAULT_LAYOUTS,
    // adding missing tabs. The rootData home layout must be preserved,
    // and the other tabs must come from DEFAULT_LAYOUTS (not stale dbData).
    assert.deepStrictEqual(window.DashboardLayoutsState.layouts, {
      home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
      stats: { order: ['kpi_row'], hidden: [] },
      report: { order: ['monthly_summary'], hidden: [] },
    });
    assert.ok(window.DashboardLayoutsState.layouts.home.order[0] === 'net_worth',
      'rootData order must be preserved for home tab');
  });

  it('falls back to legacy finapp_dashboard_layouts when settings.layouts is missing', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: null
    };

    dbData = {
      finapp_dashboard_layouts: {
        home: { order: ['net_worth'], hidden: [] },
      }
    };

    ensure(rootData);

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts, {
      home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
      stats: { order: ['kpi_row'], hidden: [] },
      report: { order: ['monthly_summary'], hidden: [] },
    });
  });

  it('produces default layouts when both current and legacy are missing', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = { settings: null };
    dbData = {};

    ensure(rootData);

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts, {
      home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
      stats: { order: ['kpi_row'], hidden: [] },
      report: { order: ['monthly_summary'], hidden: [] },
    });
  });

  it('does not reinitialize on repeated calls after initialization', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };

    ensure(rootData);
    ensure(rootData);
    ensure(rootData);

    const saveCalls = mock.calls.filter(c => c.method === 'set');
    assert.strictEqual(saveCalls.length, 0, 'must not save again after initialization');
  });

  it('performs legacy migration when only legacy layouts exist', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = { settings: null };
    dbData = {
      finapp_dashboard_layouts: {
        home: { order: ['net_worth'], hidden: [] },
      }
    };

    ensure(rootData);

    // Legacy migration calls DataLayer.remove(SK.dashboardLayouts)
    // which is tracked separately from the StorageAdapter mock calls.
    assert.ok(DataLayer._removeCalls && DataLayer._removeCalls.includes('finapp_dashboard_layouts'),
      'must remove legacy key via DataLayer');

    const setCalls = mock.calls.filter(c => c.method === 'set');
    assert.ok(setCalls.length > 0, 'must save migrated layouts');
  });

  it('existing synchronous callers remain behaviorally valid after initialization', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };

    ensure(rootData);

    const result1 = ensure(undefined);
    const result2 = ensure(null);
    const result3 = ensure({ settings: null });

    assert.strictEqual(result1, undefined, 'must return undefined when already initialized');
    assert.strictEqual(result2, undefined, 'must return undefined when already initialized');
    assert.strictEqual(result3, undefined, 'must return undefined when already initialized');

    const calls = mock.calls.filter(c => c.method === 'set' || c.method === 'remove');
    assert.strictEqual(calls.length, 0, 'must not perform writes on repeated calls');
  });

  it('pre-init no-argument call cannot block later rootData initialization', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    dbData = {};
    ensure();

    const layoutsAfterPreInit = window.DashboardLayoutsState.layouts;
    assert.ok(layoutsAfterPreInit, 'should initialize with defaults from no-arg call');
    assert.ok(!window.DashboardLayoutsState.isAuthoritative(), 'pre-init call must not be authoritative');

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
        }
      }
    };
    ensure(rootData);

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts, {
      home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
      stats: { order: ['kpi_row'], hidden: [] },
      report: { order: ['monthly_summary'], hidden: [] },
    });
    assert.ok(window.DashboardLayoutsState.isAuthoritative(), 'must be authoritative after rootData init');
  });

  it('stale dbData cannot override supplied rootData', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };

    dbData = {
      settings: {
        layouts: {
          home: { order: ['safe_to_spend'], hidden: [] },
        }
      }
    };

    ensure(rootData);
    assert.ok(window.DashboardLayoutsState.isAuthoritative(), 'must be authoritative after rootData init');
    assert.deepStrictEqual(window.DashboardLayoutsState.layouts.home.order[0], 'net_worth',
      'rootData order must be preserved over stale dbData');
  });

  it('A → B session switch does not leak layouts', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootDataA = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };
    ensure(rootDataA);
    assert.deepStrictEqual(window.DashboardLayoutsState.layouts.home.order, ['net_worth', 'safe_to_spend']);

    window.DashboardLayoutsState.reset();

    const rootDataB = {
      settings: {
        layouts: {
          home: { order: ['safe_to_spend'], hidden: [] },
        }
      }
    };
    ensure(rootDataB);

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts.home.order, ['safe_to_spend', 'net_worth']);
  });

  it('A → B → A rapid switch does not leak layouts', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootDataA = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };

    ensure(rootDataA);
    window.DashboardLayoutsState.reset();

    const rootDataB = {
      settings: {
        layouts: {
          home: { order: ['safe_to_spend'], hidden: [] },
        }
      }
    };
    ensure(rootDataB);
    window.DashboardLayoutsState.reset();

    ensure(rootDataA);
    assert.deepStrictEqual(window.DashboardLayoutsState.layouts.home.order, ['net_worth', 'safe_to_spend']);
  });

  it('initialization does not mutate or alias rootData', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(mock);
    const fn = createEnsureDashboardLayouts();
    const ensure = fn(window);

    const rootData = {
      settings: {
        layouts: {
          home: { order: ['net_worth'], hidden: [] },
        }
      }
    };

    const originalOrder = rootData.settings.layouts.home.order.slice();
    ensure(rootData);

    assert.deepStrictEqual(rootData.settings.layouts.home.order, originalOrder,
      'rootData must not be mutated');
  });
});
