const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const INDEX_PATH = path.join(__dirname, '..', 'index.html');
const indexSrc = fs.readFileSync(INDEX_PATH, 'utf8');

function extractFn(name) {
  const pattern = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}', 'm');
  const m = indexSrc.match(pattern);
  if (!m) throw new Error(name + ' not found');
  return m[0];
}

function createMockWindow() {
  return {
    _vintedPrices: null,
    _vintedMeta: null,
    dbData: {},
    WIDGET_REGISTRY: {},
    DEFAULT_LAYOUTS: {},
    SK: {},
    lucide: null,
    toast: () => {},
    escH: (s) => s,
    fmt: (n) => String(n),
    DashboardLayoutsState: { initialize: () => {}, layouts: null, reset: () => {} },
    AppState: { setDashboardLayouts: () => {} },
  };
}

function createRenderVintedPriceBlock() {
  const fnCode = extractFn('renderVintedPriceBlock');
  return new Function('window', `
    with (window) {
      ${fnCode}
      return renderVintedPriceBlock;
    }
  `);
}

function createResetLocalAppState() {
  const fnCode = extractFn('resetLocalAppState');
  return new Function('window', `
    with (window) {
      ${fnCode}
      return resetLocalAppState;
    }
  `);
}

describe('Vinted Meta Migration', () => {
  it('uses _vintedMeta for rendered meta timestamp when no price data', () => {
    const win = createMockWindow();
    win._vintedMeta = { loadedAt: '2024-06-15T10:30:00Z', file: 'test.json' };
    win.getVintedPriceData = () => null;

    const fn = createRenderVintedPriceBlock();
    const render = fn(win);
    const html = render('p1', 'Product 1');

    assert.ok(html.includes('Dane z:'), 'must render meta timestamp when _vintedMeta is set and no data');
    assert.ok(html.includes('brak danych') || html.includes('Brak danych'),
      'must show no-data message');
  });

  it('does not read dbData[SK_VINTED_META] when _vintedMeta is set', () => {
    const win = createMockWindow();
    win._vintedMeta = { loadedAt: '2024-06-15T10:30:00Z', file: 'meta_from_global.json' };
    win.dbData = { finapp_vinted_meta: { loadedAt: '2023-01-01T00:00:00Z', file: 'meta_from_dbdata.json' } };

    win.getVintedPriceData = () => null;

    const fn = createRenderVintedPriceBlock();
    const render = fn(win);
    const html = render('p1', 'Product 1');

    assert.ok(!html.includes('meta_from_dbdata.json'),
      'must not use dbData[SK_VINTED_META]');
  });

  it('shows brak danych when _vintedMeta is null and no price data', () => {
    const win = createMockWindow();
    win._vintedMeta = null;
    win.getVintedPriceData = () => null;

    const fn = createRenderVintedPriceBlock();
    const render = fn(win);
    const html = render('p1', 'Product 1');

    assert.ok(html.includes('brak danych') || html.includes('Brak danych'),
      'must show no-data message when no prices');
  });

  it('pre-load behavior: renderVintedPriceBlock before UserDataLoader returns no-data', () => {
    const win = createMockWindow();
    win._vintedMeta = undefined;
    win.getVintedPriceData = () => null;

    const fn = createRenderVintedPriceBlock();
    const render = fn(win);
    const html = render('p1', 'Product 1');

    assert.ok(html.includes('brak danych') || html.includes('Brak danych'),
      'must gracefully handle pre-load state');
  });
});

describe('Session Isolation — Vinted Meta', () => {
  it('resetLocalAppState clears _vintedMeta', () => {
    const win = createMockWindow();
    win._vintedMeta = { loadedAt: Date.now(), file: 'leak.json' };
    win.transactions = []; win.debtors = []; win.budgets = []; win.goals = [];
    win.reminders = []; win.transfers = []; win.incomeSources = [];
    win.txTemplates = []; win.recurringTx = []; win.creditors = [];
    win.autoSaveRules = []; win.ruleTargets = {};
    win.stronyProducts = []; win.resaleProducts = []; win.resaleSales = [];
    win.resaleTasks = []; win.resaleShipments = []; win.gieldaOps = [];
    win.stronyClients = []; win.initialLoadDone = false;
    win.dashboardSortable = null;
    win.DashboardLayoutsState = { reset: () => {} };
    win.exitDashboardEditMode = () => {};
    win.renderAll = () => {};

    const fn = createResetLocalAppState();
    const reset = fn(win);
    reset();

    assert.strictEqual(win._vintedMeta, null, '_vintedMeta must be cleared on reset');
  });
});
