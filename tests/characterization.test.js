/**
 * Stage 1.0 — Characterization tests.
 *
 * These tests document CURRENT BEHAVIOR of the FINORA data layer.
 * They do NOT test desired future behavior.
 * All data is synthetic.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/characterization.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dataLayerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'data-layer.js'), 'utf8');

function createMockFirebase() {
  const mockRef = {
    child: function(key) {
      return {
        set: function(value) { return Promise.resolve(); },
        on: function(event, callback) { return function() {}; },
        off: function() {},
        remove: function() { return Promise.resolve(); }
      };
    },
    update: function() { return Promise.resolve(); },
    once: function(event) {
      return Promise.resolve({ val: function() { return {}; } });
    },
    ref: function(path) { return mockRef; }
  };

  const mockDatabase = function() {
    return mockRef;
  };

  return {
    firebase: {
      database: mockDatabase,
      auth: function() {
        return {
          onAuthStateChanged: function(callback) { return function() {}; },
          signInWithEmailAndPassword: function() { return Promise.resolve(); },
          createUserWithEmailAndPassword: function() { return Promise.resolve(); },
          signOut: function() { return Promise.resolve(); }
        };
      }
    }
  };
}

function setupDataLayer(mock) {
  const window = {
    firebase: mock.firebase,
    toast: function(msg) {},
    console: console,
    localStorage: { getItem: function() { return null; } },
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
    }
  };

  const mockAdapter = {
    get: function() { return Promise.resolve(null); },
    set: function() { return Promise.resolve(); },
    update: function() { return Promise.resolve(); },
    updateMany: function() { return Promise.resolve(); },
    remove: function() { return Promise.resolve(); },
    listen: function() { return function() {}; }
  };
  window.setActiveStorageAdapter(mockAdapter, 'test');

  const script = new Function('window', dataLayerCode);
  script(window);

  return window;
}

const {
  createTransaction,
  createDebtor,
  createBudget,
  createGoal,
  createReminder,
  createTransfer,
  createIncomeSource,
  createTemplate,
  createRecurring,
  createCreditor,
  createAutoSaveRule,
  createStronaProduct,
  createResaleProduct,
  createResaleSale,
  createResaleTask,
  createResaleShipment,
  createResaleEvent,
  createResaleSettings,
  createGieldaOp,
  createStronaClient,
  createIncomeProfile,
  createSettings,
  createSyntheticDataset
} = require('../fixtures/synthetic-data');

describe('Characterization — Data Layer Contracts', () => {
  describe('SK key completeness', () => {
    it('contains all expected collection keys', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const expectedKeys = [
        'transactions', 'debtors', 'budgets', 'goals', 'reminders',
        'transfers', 'incomeSources', 'templates', 'recurring', 'creditors',
        'autoSaveRules', 'ruleTargets', 'stronyProducts', 'resaleProducts',
        'resaleSales', 'resaleTasks', 'resaleShipments', 'resaleEvents',
        'resaleSettings', 'gieldaOps', 'stronyClients', 'incomeProfiles',
        'dashboardLayouts'
      ];

      for (const key of expectedKeys) {
        assert.ok(key in window.SK, `Missing SK key: ${key}`);
      }
    });

    it('SK values are non-empty strings', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      for (const [key, value] of Object.entries(window.SK)) {
        assert.ok(typeof value === 'string', `SK.${key} should be string, got ${typeof value}`);
        assert.ok(value.length > 0, `SK.${key} should be non-empty`);
      }
    });
  });

  describe('Transaction data shape', () => {
    it('preserves required fields after stripUndefinedDeep', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const tx = createTransaction({
        id: 'tx-1',
        type: 'expense',
        amount: 123.45,
        category: 'food',
        place: 'konto',
        desc: 'Zakupy',
        date: '2026-09-05',
        createdAt: Date.now()
      });

      const clean = window._stripUndefinedDeep(tx);

      assert.strictEqual(clean.id, 'tx-1');
      assert.strictEqual(clean.type, 'expense');
      assert.strictEqual(clean.amount, 123.45);
      assert.strictEqual(clean.category, 'food');
      assert.strictEqual(clean.place, 'konto');
      assert.strictEqual(clean.desc, 'Zakupy');
      assert.strictEqual(clean.date, '2026-09-05');
      assert.ok(typeof clean.createdAt === 'number');
    });

    it('preserves transfer flag fields', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const tx = createTransaction({
        _transfer: true,
        _autoSave: true,
        _goalId: 'goal-1',
        _debtId: 'debt-1'
      });

      const clean = window._stripUndefinedDeep(tx);
      assert.strictEqual(clean._transfer, true);
      assert.strictEqual(clean._autoSave, true);
      assert.strictEqual(clean._goalId, 'goal-1');
      assert.strictEqual(clean._debtId, 'debt-1');
    });
  });

  describe('Debtor data shape', () => {
    it('preserves nested debt structure', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const debtor = createDebtor({
        id: 'debt-1',
        name: 'Test Debtor',
        debts: [{
          id: 'd1',
          desc: 'Test debt',
          amount: 500,
          date: '2026-08-01',
          paid: false,
          history: [{ action: 'CREATE', author: 'System', timestamp: Date.now(), details: 'Created' }]
        }],
        shareSettings: { allowEdit: true, accessCode: 'xyz789' },
        activityLog: [{ id: 'al-1', action: 'add', details: 'Added' }]
      });

      const clean = window._stripUndefinedDeep(debtor);

      assert.strictEqual(clean.id, 'debt-1');
      assert.strictEqual(clean.name, 'Test Debtor');
      assert.ok(Array.isArray(clean.debts));
      assert.strictEqual(clean.debts[0].desc, 'Test debt');
      assert.strictEqual(clean.debts[0].amount, 500);
      assert.ok(Array.isArray(clean.debts[0].history));
      assert.strictEqual(clean.shareSettings.allowEdit, true);
      assert.strictEqual(clean.shareSettings.accessCode, 'xyz789');
      assert.ok(Array.isArray(clean.activityLog));
    });

    it('preserves repayment structure', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const debtor = createDebtor({
        debts: [{
          id: 'd1',
          repayments: [
            { id: 'r1', amount: 100, place: 'konto', date: '2026-08-15', note: 'Partial', author: 'Jan', createdAt: Date.now() }
          ]
        }]
      });

      const clean = window._stripUndefinedDeep(debtor);
      assert.ok(Array.isArray(clean.debts[0].repayments));
      assert.strictEqual(clean.debts[0].repayments[0].amount, 100);
      assert.strictEqual(clean.debts[0].repayments[0].place, 'konto');
    });
  });

  describe('Budget data shape', () => {
    it('preserves budget fields', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const budget = createBudget({ id: 'b1', category: 'food', limit: 1500 });
      const clean = window._stripUndefinedDeep(budget);

      assert.strictEqual(clean.id, 'b1');
      assert.strictEqual(clean.category, 'food');
      assert.strictEqual(clean.limit, 1500);
    });
  });

  describe('Goal data shape', () => {
    it('preserves goal fields including autoSave', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const goal = createGoal({
        id: 'g1',
        name: 'Laptop',
        target: 10000,
        current: 3500,
        deadline: '2026-12-31',
        autoSave: { enabled: true, rule: 'percent', pct: 10, sourcePlace: 'konto' }
      });

      const clean = window._stripUndefinedDeep(goal);
      assert.strictEqual(clean.id, 'g1');
      assert.strictEqual(clean.target, 10000);
      assert.strictEqual(clean.current, 3500);
      assert.ok(clean.autoSave);
      assert.strictEqual(clean.autoSave.enabled, true);
      assert.strictEqual(clean.autoSave.pct, 10);
    });
  });

  describe('Resale data shapes', () => {
    it('preserves product with stock fields', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const product = createResaleProduct({
        id: 'rp-1',
        name: 'Bluza',
        buyPrice: 50,
        minStockAlert: 2,
        listedAt: '2026-09-01',
        statusHistory: [{ status: 'listed', at: '2026-09-01' }],
        priceHistory: [{ price: 120, at: '2026-09-01' }]
      });

      const clean = window._stripUndefinedDeep(product);
      assert.strictEqual(clean.id, 'rp-1');
      assert.strictEqual(clean.buyPrice, 50);
      assert.strictEqual(clean.minStockAlert, 2);
      assert.ok(Array.isArray(clean.statusHistory));
      assert.ok(Array.isArray(clean.priceHistory));
    });

    it('preserves sale with status fields', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const sale = createResaleSale({
        id: 'rs-1',
        productId: 'rp-1',
        price: 120,
        status: 'to_ship',
        soldAt: Date.now(),
        shippedAt: null
      });

      const clean = window._stripUndefinedDeep(sale);
      assert.strictEqual(clean.id, 'rs-1');
      assert.strictEqual(clean.status, 'to_ship');
      assert.ok(clean.soldAt !== undefined);
      assert.strictEqual(clean.shippedAt, null);
    });

    it('preserves shipment with items array', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const shipment = createResaleShipment({
        id: 'sh-1',
        items: [{ productId: 'rp-1', qty: 2 }]
      });

      const clean = window._stripUndefinedDeep(shipment);
      assert.ok(Array.isArray(clean.items));
      assert.strictEqual(clean.items[0].productId, 'rp-1');
      assert.strictEqual(clean.items[0].qty, 2);
    });
  });

  describe('Income profiles shape', () => {
    it('preserves profile object structure', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const profile = createIncomeProfile({
        id: 'strony',
        name: 'Strony',
        balance: 30,
        modules: ['profits', 'projects', 'clients']
      });

      const clean = window._stripUndefinedDeep(profile);
      assert.strictEqual(clean.id, 'strony');
      assert.strictEqual(clean.name, 'Strony');
      assert.strictEqual(clean.balance, 30);
      assert.deepStrictEqual(clean.modules, ['profits', 'projects', 'clients']);
    });
  });

  describe('Settings shape', () => {
    it('preserves dashboard layouts structure', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const settings = createSettings({
        layouts: {
          home: { order: ['net_worth', 'safe_to_spend'], hidden: ['old_widget'] },
          stats: { order: ['kpi_row'], hidden: [] }
        }
      });

      const clean = window._stripUndefinedDeep(settings);
      assert.ok(clean.layouts);
      assert.ok(Array.isArray(clean.layouts.home.order));
      assert.ok(Array.isArray(clean.layouts.home.hidden));
      assert.strictEqual(clean.layouts.home.order[0], 'net_worth');
    });
  });

  describe('load() with synthetic dataset', () => {
    it('loads all collections from dbData', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      const dataset = createSyntheticDataset();

      window.dbData = dataset.data;

      assert.ok(Array.isArray(window.load('finapp_transactions', [])));
      assert.ok(Array.isArray(window.load('finapp_debtors', [])));
      assert.ok(Array.isArray(window.load('finapp_budgets', [])));
      assert.ok(Array.isArray(window.load('finapp_goals', [])));
      assert.ok(Array.isArray(window.load('finapp_reminders', [])));
      assert.ok(Array.isArray(window.load('finapp_transfers', [])));
      assert.ok(Array.isArray(window.load('finapp_income_sources', [])));
      assert.ok(Array.isArray(window.load('finapp_templates', [])));
      assert.ok(Array.isArray(window.load('finapp_recurring', [])));
      assert.ok(Array.isArray(window.load('finapp_creditors', [])));
      assert.ok(Array.isArray(window.load('finapp_autosave_rules', [])));
      assert.ok(typeof window.load('finapp_rule_targets', {}) === 'object');
      assert.ok(Array.isArray(window.load('finapp_strony_products', [])));
      assert.ok(Array.isArray(window.load('finapp_resale_products', [])));
      assert.ok(Array.isArray(window.load('finapp_resale_sales', [])));
      assert.ok(Array.isArray(window.load('finapp_resale_tasks', [])));
      assert.ok(Array.isArray(window.load('finapp_resale_shipments', [])));
      assert.ok(Array.isArray(window.load('finapp_resale_events', [])));
      assert.ok(typeof window.load('finapp_resale_settings', {}) === 'object');
      assert.ok(Array.isArray(window.load('finapp_gielda_ops', [])));
      assert.ok(Array.isArray(window.load('finapp_strony_clients', [])));
    });

    it('falls back to default for missing ruleTargets', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      window.dbData = {};

      const result = window.load('finapp_rule_targets', { needs: 50, wants: 30, savings: 20 });
      assert.deepStrictEqual(result, { needs: 50, wants: 30, savings: 20 });
    });
  });

  describe('save() sanitization contract', () => {
    it('does not mutate original data object', async () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);
      window.currentUserRef = mock.firebase.database();

      const original = { id: 'tx-1', note: undefined, amount: 100 };
      const originalKeys = Object.keys(original);
      const originalValues = Object.values(original);

      window.save('finapp_transactions', original);

      await new Promise(r => setTimeout(r, 50));

      assert.deepStrictEqual(Object.keys(original), originalKeys);
      assert.deepStrictEqual(Object.values(original), originalValues);
      assert.strictEqual(original.note, undefined);
    });
  });

  describe('DataLayer API surface', () => {
    it('exposes only expected public methods', () => {
      const mock = createMockFirebase();
      const window = setupDataLayer(mock);

      const api = Object.keys(window.DataLayer).sort();
      assert.deepStrictEqual(api, ['SK', 'currentUid', 'currentUserRef', 'db', 'dbData', 'load', 'onValue', 'readOnce', 'remove', 'save', 'stripUndefinedDeep', 'updateUserPaths']);
    });
  });
});
