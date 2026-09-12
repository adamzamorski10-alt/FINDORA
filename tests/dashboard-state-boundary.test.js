/**
 * Stage 1.2B — Integration / Contract tests for Dashboard State Boundary.
 *
 * Run with: node tests/dashboard-state-boundary.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'dashboard-layouts-state.js'), 'utf8');
const repoCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'repositories', 'dashboard-layouts-repository.js'), 'utf8');
const appStateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'application-state.js'), 'utf8');

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
    calls,
  };
}

function setupWindow(stateCode, repoCode, appStateCode, mockStorage) {
  const window = {
    DEFAULT_LAYOUTS: {
      home: ['net_worth', 'safe_to_spend'],
      stats: ['kpi_row'],
      report: ['monthly_summary'],
    },
    WIDGET_REGISTRY: {
      net_worth: { tab: 'home', title: 'Net Worth' },
      safe_to_spend: { tab: 'home', title: 'Safe to Spend' },
      kpi_row: { tab: 'stats', title: 'KPI' },
      monthly_summary: { tab: 'report', title: 'Monthly' },
    },
    AppState: null,
    DataLayer: {
      save: function(key, data, options) {
        return Promise.resolve();
      },
      remove: function(key) {
        return Promise.resolve();
      },
    },
    StorageAdapter: null,
    StorageAdapterContract: {
      create: function(adapter, name) {
        const required = ['get', 'set', 'update', 'updateMany', 'remove', 'listen'];
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

  const stateScript = new Function('window', stateCode);
  stateScript(window);

  const repoScript = new Function('window', repoCode);
  repoScript(window);

  const appScript = new Function('window', appStateCode);
  appScript(window);

  Object.defineProperty(window, 'dashboardLayouts', {
    get() { return window.DashboardLayoutsState ? window.DashboardLayoutsState.layouts : null; },
    set(v) { console.warn('[Compatibility] dashboardLayouts is read-only; use DashboardLayoutsState'); },
    configurable: true,
  });
  Object.defineProperty(window, 'dashboardEditTab', {
    get() { return window.DashboardLayoutsState ? window.DashboardLayoutsState.editTab : null; },
    set(v) { console.warn('[Compatibility] dashboardEditTab is read-only; use DashboardLayoutsState'); },
    configurable: true,
  });
  Object.defineProperty(window, 'dashboardSortable', {
    get() { return window.DashboardLayoutsState ? window.DashboardLayoutsState.sortableInstance : null; },
    set(v) { console.warn('[Compatibility] dashboardSortable is read-only; use DashboardLayoutsState'); },
    configurable: true,
  });
  Object.defineProperty(window, 'dashboardAddModalTab', {
    get() { return window.DashboardLayoutsState ? window.DashboardLayoutsState.addModalTab : null; },
    set(v) { console.warn('[Compatibility] dashboardAddModalTab is read-only; use DashboardLayoutsState'); },
    configurable: true,
  });

  if (mockStorage) {
    window.setActiveStorageAdapter(mockStorage, 'test');
  }

  return window;
}

describe('Dashboard State Boundary — Integration', () => {
  // Test 1 — State is source of truth
  it('Test 1: repository saves exactly what State holds, not dbData', async () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(stateCode, repoCode, appStateCode, mock);

    window.DashboardLayoutsState.initialize({
      home: { order: ['net_worth'], hidden: ['safe_to_spend'] },
    });

    await window.DashboardLayoutsRepository.saveTab('home', true);

    const saveCall = mock.calls.find(c => c.method === 'set');
    assert.ok(saveCall);
    assert.strictEqual(saveCall.key, 'settings/layouts/home');
    assert.deepStrictEqual(saveCall.data, { order: ['net_worth'], hidden: ['safe_to_spend'] });
  });

  // Test 2 — stale dbData
  it('Test 2: stale dbData does not affect saved layout', async () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(stateCode, repoCode, appStateCode, mock);

    window.DashboardLayoutsState.initialize({
      home: { order: ['net_worth'], hidden: [] },
    });

    window.dbData = { settings: { layouts: { home: { order: ['safe_to_spend'], hidden: [] } } } };

    await window.DashboardLayoutsRepository.saveTab('home', true);

    const saveCall = mock.calls.find(c => c.method === 'set');
    assert.ok(saveCall);
    assert.strictEqual(saveCall.key, 'settings/layouts/home');
    assert.ok(saveCall.data.order.includes('net_worth'), 'saved layout must come from State, not stale dbData');
    assert.deepStrictEqual(saveCall.data.order, ['net_worth', 'safe_to_spend']);
  });

  // Test 3 — global mutation attack
  it('Test 3: mutating compatibility global does not change State', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(stateCode, repoCode, appStateCode, mock);
    window.DashboardLayoutsState.initialize({
      home: { order: ['net_worth'], hidden: [] },
    });

    try {
      window.dashboardLayouts = { home: { order: ['hacked'], hidden: [] } };
    } catch (_) {}

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts.home, { order: ['net_worth', 'safe_to_spend'], hidden: [] });
  });

  // Test 4 — State mutation attack via AppState
  it('Test 4: mutating AppState.dashboard snapshot does not change internal state', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(stateCode, repoCode, appStateCode, mock);
    window.AppState.setDashboardLayouts({ home: { order: ['a'], hidden: [] } });

    const snapshot = window.AppState.dashboard;
    snapshot.layouts = { home: { order: ['mutated'], hidden: [] } };

    assert.deepStrictEqual(window.AppState.dashboard.layouts, { home: { order: ['a'], hidden: [] } });
  });

  // Test 5 — repository isolation
  it('Test 5: repository closure does not contain dbData, load, or renderAll', () => {
    const repoScript = repoCode;
    const lines = repoScript.split('\n');
    const codeLines = lines.filter(l => {
      const trimmed = l.trim();
      return trimmed.length > 0 && !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && trimmed !== '*/';
    });
    const codeBlock = codeLines.join('\n');
    assert.ok(!codeBlock.includes('dbData'), 'repository must not reference dbData');
    assert.ok(!codeBlock.includes('window.load'), 'repository must not reference window.load');
    assert.ok(!codeBlock.includes('renderAll'), 'repository must not reference renderAll');
  });

  // Test 6 — initialization
  it('Test 6: saved layouts flow directly into State without global intermediate', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(stateCode, repoCode, appStateCode, mock);
    const saved = {
      home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
      stats: { order: ['kpi_row'], hidden: [] },
      report: { order: ['monthly_summary'], hidden: [] },
    };

    window.DashboardLayoutsState.initialize(saved);

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts, saved);
    assert.deepStrictEqual(window.AppState.dashboard.layouts, saved);
  });

  // Test 7 — no direct global dashboard writes from business logic
  it('Test 7: State change is reflected in compatibility global without direct writes', () => {
    const mock = createMockStorageAdapter();
    const window = setupWindow(stateCode, repoCode, appStateCode, mock);
    window.DashboardLayoutsState.initialize({
      home: { order: ['net_worth'], hidden: [] },
    });

    window.DashboardLayoutsState.updateTab('home', prev => ({ ...prev, order: ['safe_to_spend'] }));

    assert.deepStrictEqual(window.DashboardLayoutsState.layouts.home, { order: ['safe_to_spend'], hidden: [] });
    assert.deepStrictEqual(window.dashboardLayouts.home, { order: ['safe_to_spend'], hidden: [] });
  });

  // Test 8 — active adapter must be real implementation, not contract namespace
  it('Test 8: active StorageAdapter must have persistence methods', () => {
    const window = setupWindow(stateCode, repoCode, appStateCode, null);
    // Without setting active adapter, StorageAdapter should be null
    assert.strictEqual(window.StorageAdapter, null, 'StorageAdapter should be null when no active adapter set');
    assert.throws(() => window.getActiveStorageAdapter(), /No active adapter configured/);
  });
});
