/**
 * Stage 1.1 — Dashboard Layouts State tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/dashboard-layouts-state.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dashStateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'dashboard-layouts-state.js'), 'utf8');

function setupDashboardState() {
  const window = {
    DashboardLayoutsState: null,
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
    AppState: {
      setDashboardLayouts: function() {},
      setDashboardEditTab: function() {},
      setDashboardAddModalTab: function() {},
      setDashboardSortable: function() {},
    },
    toast: function(msg) {},
    console: console,
  };

  const script = new Function('window', dashStateCode);
  script(window);

  return window;
}

describe('DashboardLayoutsState', () => {
  it('initializes with null layouts', () => {
    const window = setupDashboardState();
    assert.strictEqual(window.DashboardLayoutsState.layouts, null);
  });

  it('ensures default layouts when null', () => {
    const window = setupDashboardState();
    const layouts = window.DashboardLayoutsState.ensureDefaults();
    assert.ok(layouts);
    assert.ok(layouts.home);
    assert.ok(layouts.stats);
    assert.ok(layouts.report);
  });

  it('returns existing layouts if already set', () => {
    const window = setupDashboardState();
    window.DashboardLayoutsState.setLayouts({ home: { order: ['a'], hidden: [] } });
    const layouts = window.DashboardLayoutsState.ensureDefaults();
    assert.deepStrictEqual(layouts, { home: { order: ['a'], hidden: [] } });
  });

  it('merges saved layouts with defaults', () => {
    const window = setupDashboardState();
    const saved = {
      home: { order: ['net_worth'], hidden: ['safe_to_spend'] },
    };
    const merged = window.DashboardLayoutsState.mergeWithSaved(saved);
    assert.ok(Array.isArray(merged.home.order));
    assert.ok(Array.isArray(merged.home.hidden));
    assert.ok(merged.home.order.includes('net_worth'));
  });

  it('filters invalid widget IDs from saved layouts', () => {
    const window = setupDashboardState();
    const saved = {
      home: { order: ['nonexistent', 'net_worth'], hidden: ['invalid'] },
    };
    const merged = window.DashboardLayoutsState.mergeWithSaved(saved);
    assert.ok(!merged.home.order.includes('nonexistent'));
    assert.ok(!merged.home.hidden.includes('invalid'));
  });

  it('sets and gets edit tab', () => {
    const window = setupDashboardState();
    window.DashboardLayoutsState.setEditTab('home');
    assert.strictEqual(window.DashboardLayoutsState.editTab, 'home');
  });

  it('sets and gets add modal tab', () => {
    const window = setupDashboardState();
    window.DashboardLayoutsState.setAddModalTab('stats');
    assert.strictEqual(window.DashboardLayoutsState.addModalTab, 'stats');
  });

  it('sets sortable instance', () => {
    const window = setupDashboardState();
    const fakeSortable = { destroy: () => {} };
    window.DashboardLayoutsState.setSortableInstance(fakeSortable);
    assert.strictEqual(window.DashboardLayoutsState.sortableInstance, fakeSortable);
  });

  it('updates tab with updater function', () => {
    const window = setupDashboardState();
    window.DashboardLayoutsState.ensureDefaults();
    const updated = window.DashboardLayoutsState.updateTab('home', prev => ({
      ...prev,
      order: [...prev.order, 'new_widget'],
    }));
    assert.ok(updated.order.includes('new_widget'));
  });

  it('creates tab if missing during update', () => {
    const window = setupDashboardState();
    window.DashboardLayoutsState.ensureDefaults();
    const updated = window.DashboardLayoutsState.updateTab('nonexistent', prev => ({
      order: ['a'],
      hidden: [],
    }));
    assert.deepStrictEqual(updated, { order: ['a'], hidden: [] });
  });

  it('resets state', () => {
    const window = setupDashboardState();
    window.DashboardLayoutsState.setLayouts({ home: { order: [], hidden: [] } });
    window.DashboardLayoutsState.setEditTab('home');
    window.DashboardLayoutsState.setAddModalTab('stats');
    window.DashboardLayoutsState.reset();
    assert.strictEqual(window.DashboardLayoutsState.layouts, null);
    assert.strictEqual(window.DashboardLayoutsState.editTab, null);
    assert.strictEqual(window.DashboardLayoutsState.addModalTab, null);
    assert.strictEqual(window.DashboardLayoutsState.sortableInstance, null);
  });

  it('syncs with AppState when layouts change', () => {
    const window = setupDashboardState();
    let appStateLayouts = null;
    window.AppState.setDashboardLayouts = function(layouts) {
      appStateLayouts = layouts;
    };
    const layouts = { home: { order: ['a'], hidden: [] } };
    window.DashboardLayoutsState.setLayouts(layouts);
    assert.deepStrictEqual(appStateLayouts, layouts);
  });

  it('syncs with AppState when edit tab changes', () => {
    const window = setupDashboardState();
    let appStateTab = null;
    window.AppState.setDashboardEditTab = function(tab) {
      appStateTab = tab;
    };
    window.DashboardLayoutsState.setEditTab('home');
    assert.strictEqual(appStateTab, 'home');
  });
});
