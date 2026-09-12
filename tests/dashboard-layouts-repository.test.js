/**
 * Stage 1.2 — Dashboard Layouts Repository tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/dashboard-layouts-repository.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'repositories', 'dashboard-layouts-repository.js'), 'utf8');

function createMockStorageAdapter() {
  const calls = [];
  const adapter = {
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
  };
  return { adapter, calls };
}

function setupRepository(mock, stateLayouts) {
  const window = {
    DashboardLayoutsRepository: null,
    DashboardLayoutsState: {
      getTab: function(tab) {
        if (!stateLayouts || !stateLayouts[tab]) return null;
        return JSON.parse(JSON.stringify(stateLayouts[tab]));
      },
    },
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

  const script = new Function('window', repoCode);
  script(window);

  window.setActiveStorageAdapter(mock.adapter, 'test');

  return window;
}

describe('DashboardLayoutsRepository', () => {
  describe('saveTab()', () => {
    it('reads layout from DashboardLayoutsState and saves via StorageAdapter', async () => {
      const mock = createMockStorageAdapter();
      const stateLayouts = {
        home: { order: ['net_worth', 'safe_to_spend'], hidden: [] },
      };
      const window = setupRepository(mock, stateLayouts);

      await window.DashboardLayoutsRepository.saveTab('home', true);

      const saveCall = mock.calls.find(c => c.method === 'set');
      assert.ok(saveCall);
      assert.strictEqual(saveCall.key, 'settings/layouts/home');
      assert.deepStrictEqual(saveCall.data, { order: ['net_worth', 'safe_to_spend'], hidden: [] });
    });

    it('does not read from dbData or DataLayer', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, { home: { order: ['a'], hidden: [] } });
      window.dbData = { settings: { layouts: { home: { order: ['b'], hidden: [] } } } };
      window.DataLayer = { save: function() { throw new Error('Should not use DataLayer'); } };

      await window.DashboardLayoutsRepository.saveTab('home', true);

      const saveCall = mock.calls.find(c => c.method === 'set');
      assert.ok(saveCall);
      assert.deepStrictEqual(saveCall.data, { order: ['a'], hidden: [] });
    });

    it('returns early when no layout for tab in State', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, {});

      await window.DashboardLayoutsRepository.saveTab('nonexistent', true);

      assert.strictEqual(mock.calls.length, 0);
    });

    it('returns early when StorageAdapter not available', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, { home: { order: ['a'], hidden: [] } });
      window.StorageAdapter = null;

      await window.DashboardLayoutsRepository.saveTab('home', true);

      assert.strictEqual(mock.calls.length, 0);
    });

    it('shows toast when showToast=true', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, { home: { order: ['a'], hidden: [] } });
      const toasts = [];
      window.toast = function(msg) { toasts.push(msg); };

      await window.DashboardLayoutsRepository.saveTab('home', true);

      assert.ok(toasts.some(t => t.includes('Zapisano układ')));
    });

    it('silences toast when showToast=false', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, { home: { order: ['a'], hidden: [] } });
      const toasts = [];
      window.toast = function(msg) { toasts.push(msg); };

      await window.DashboardLayoutsRepository.saveTab('home', false);

      assert.strictEqual(toasts.length, 0);
    });

    it('logs error on save failure', async () => {
      const mock = createMockStorageAdapter();
      mock.adapter.set = function() {
        return Promise.reject(new Error('save failed'));
      };
      const window = setupRepository(mock, { home: { order: ['a'], hidden: [] } });
      const errors = [];
      const originalError = console.error;
      console.error = function(...args) { errors.push(args.join(' ')); };

      await window.DashboardLayoutsRepository.saveTab('home', true);

      console.error = originalError;
      assert.ok(errors.some(e => e.includes('Error saving tab')));
    });
  });

  describe('removeLegacy()', () => {
    it('removes legacy layout key via StorageAdapter.remove()', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, {});

      await window.DashboardLayoutsRepository.removeLegacy();

      const removeCall = mock.calls.find(c => c.method === 'remove');
      assert.ok(removeCall);
      assert.strictEqual(removeCall.key, 'finapp_dashboard_layouts');
    });

    it('returns early when StorageAdapter not available', async () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, {});
      window.StorageAdapter = null;

      await window.DashboardLayoutsRepository.removeLegacy();

      assert.strictEqual(mock.calls.length, 0);
    });

    it('logs warning on remove failure', async () => {
      const mock = createMockStorageAdapter();
      mock.adapter.remove = function() {
        return Promise.reject(new Error('remove failed'));
      };
      const window = setupRepository(mock, {});
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = function(...args) { warnings.push(args.join(' ')); };

      await window.DashboardLayoutsRepository.removeLegacy();

      console.warn = originalWarn;
      assert.ok(warnings.some(w => w.includes('Could not remove legacy layout')));
    });
  });

  describe('getFirebaseKey()', () => {
    it('returns correct Firebase key for tab', () => {
      const mock = createMockStorageAdapter();
      const window = setupRepository(mock, {});

      assert.strictEqual(window.DashboardLayoutsRepository.getFirebaseKey('home'), 'settings/layouts/home');
      assert.strictEqual(window.DashboardLayoutsRepository.getFirebaseKey('stats'), 'settings/layouts/stats');
    });
  });

  describe('repository isolation', () => {
    it('does not reference DataLayer, dbData, load, renderAll, or Firebase-specific APIs', () => {
      const repoScript = repoCode;
      const lines = repoScript.split('\n');
      const codeLines = lines.filter(l => {
        const trimmed = l.trim();
        return trimmed.length > 0 && !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && trimmed !== '*/';
      });
      const codeBlock = codeLines.join('\n');
      assert.ok(!codeBlock.includes('DataLayer'), 'repository must not reference DataLayer');
      assert.ok(!codeBlock.includes('dbData'), 'repository must not reference dbData');
      assert.ok(!codeBlock.includes('window.load'), 'repository must not reference window.load');
      assert.ok(!codeBlock.includes('renderAll'), 'repository must not reference renderAll');
      assert.ok(!codeBlock.includes('firebase'), 'repository must not reference firebase');
      assert.ok(!codeBlock.includes('.child('), 'repository must not reference Firebase child');
      assert.ok(!codeBlock.includes('.ref('), 'repository must not reference Firebase ref');
      assert.ok(!codeBlock.includes('currentUserRef'), 'repository must not reference currentUserRef');
    });
  });
});
