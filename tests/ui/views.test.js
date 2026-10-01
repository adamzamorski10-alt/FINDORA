import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function createMockDocument() {
  const elements = [];
  let bodyChildren = [];
  function findInTree(node, predicate) {
    if (predicate(node)) return node;
    const children = node.children || [];
    for (const child of children) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
    return null;
  }

  function createElement(tag) {
    const styleProps = {};
    const classList = {
      _classes: [],
      add(c) { this._classes.push(c); },
      remove(c) { this._classes = this._classes.filter((x) => x !== c); },
      contains(c) { return this._classes.includes(c); },
    };
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      children: [],
      style: {
        setProperty(name, value) { styleProps[name] = value; },
        getPropertyValue(name) { return styleProps[name] || ''; },
        removeProperty(name) { delete styleProps[name]; },
        backgroundColor: '',
        display: '',
      },
      dataset: {},
      classList,
      setAttribute(name, value) {
        this.attributes = this.attributes || {};
        this.attributes[name] = value;
      },
      getAttribute(name) {
        return this.attributes && this.attributes[name];
      },
      querySelector(selector) {
        if (selector.startsWith('.') && !selector.includes(' ')) {
          const className = selector.slice(1);
          return findInTree(this, (c) => c.classList && c.classList.contains(className)) || null;
        }
        if (selector === 'button[type="submit"]') {
          return findInTree(this, (c) => c.type === 'submit') || null;
        }
        return null;
      },
      replaceChildren(...args) {
        this.children = args;
      },
      appendChild(child) {
        this.children.push(child);
      },
      remove() {
        const parent = this.parent;
        if (parent) {
          const idx = parent.children.indexOf(this);
          if (idx >= 0) parent.children.splice(idx, 1);
        }
      },
      focus() {},
      addEventListener(event, handler) {
        if (!this._listeners) this._listeners = {};
        this._listeners[event] = handler;
      },
      dispatchEvent(event) {
        const handler = this._listeners && this._listeners[event.type];
        if (handler) handler(event);
      },
    };
    Object.defineProperty(el, 'className', {
      get() { return classList._classes.join(' '); },
      set(value) { classList._classes = value.split(' ').filter(Boolean); },
    });
    elements.push(el);
    return el;
  }

  const body = createElement('body');
  body.children = bodyChildren;

  const documentEl = createElement('document');
  documentEl.body = body;
  documentEl.createElement = createElement;

  return { createElement, document: documentEl, body };
}

globalThis.document = createMockDocument().document;

import { render as renderDashboard } from '../../src/ui/views/dashboard.js';
import { render as renderAccounts } from '../../src/ui/views/accounts.js';
import { render as renderTransactions } from '../../src/ui/views/transactions.js';
import { render as renderBudgets } from '../../src/ui/views/budgets.js';
import { render as renderGoals } from '../../src/ui/views/goals.js';
import { render as renderReports } from '../../src/ui/views/reports.js';
import { render as renderSettings } from '../../src/ui/views/settings.js';
import { init } from '../../src/ui/i18n.js';

await init('en');

describe('UI Views', () => {
  const views = [
    { name: 'dashboard', render: renderDashboard },
    { name: 'accounts', render: renderAccounts },
    { name: 'transactions', render: renderTransactions },
    { name: 'budgets', render: renderBudgets },
    { name: 'goals', render: renderGoals },
    { name: 'reports', render: renderReports },
    { name: 'settings', render: renderSettings },
  ];

  for (const view of views) {
    describe(view.name, () => {
      it('returns a DOM element with the view title', () => {
        const el = view.render();
        assert.ok(el);
        assert.ok(el.classList.contains('view-placeholder'));
        assert.ok(el.innerHTML.includes(view.name.charAt(0).toUpperCase() + view.name.slice(1)));
      });

      it('returns an element, not a string', () => {
        const el = view.render();
        assert.ok(el && typeof el === 'object');
      });
    });
  }

  describe('accounts view', () => {
    it('renders account balance elements when reporting module is available', async () => {
      const { render } = await import('../../src/ui/views/accounts.js');
      const mockState = {
        getState() {
          return {
            accounts: {
              loading: false,
              error: null,
              items: [
                { id: 'acc-1', name: 'Main', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false },
              ],
            },
            accountForm: { editingId: null, name: '', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: undefined },
            session: { userId: 'user-1' },
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        account: {
          archiveAccount: async () => {},
          getActiveAccounts: async () => [],
        },
        reporting: {
          getAccountBalance: async ({ accountId }) => {
            if (accountId === 'acc-1') return { accountId, balance: 1234.56 };
            return { accountId, balance: 0 };
          },
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      const list = el.querySelector('.account-list');
      assert.ok(list, 'expected account list');
      const item = list.querySelector('.account-list-item');
      assert.ok(item, 'expected account list item');
      const balanceEl = item.querySelector('.account-list-item-balance');
      assert.ok(balanceEl, 'expected balance element');
      await new Promise((resolve) => setTimeout(resolve, 50));
      const balanceText = balanceEl.textContent.trim();
      assert.ok(balanceText.includes('1,234.56') || balanceText.includes('1234.56'), `expected formatted balance, got: ${balanceText}`);
    });

    it('disables submit button during createAccount operation', async () => {
      const { render } = await import('../../src/ui/views/accounts.js');
      let resolveCreate;
      const createPromise = new Promise((resolve) => { resolveCreate = resolve; });
      const mockState = {
        getState() {
          return {
            accounts: { loading: false, error: null, items: [] },
            accountForm: { editingId: null, name: 'Test', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: undefined },
            session: { userId: 'user-1' },
            operations: mockState.operations || {},
          };
        },
        subscribe() { return () => {}; },
        dispatch(action) {
          if (action.type === 'OPERATION_START') {
            mockState.operations = { ...(mockState.operations || {}), [action.key]: { loading: true } };
          }
          if (action.type === 'OPERATION_STOP') {
            mockState.operations = { ...(mockState.operations || {}), [action.key]: undefined };
          }
        },
        operations: {},
      };
      const mockModules = {
        account: {
          createAccount: async () => {
            await createPromise;
            return { id: 'acc-1' };
          },
          getActiveAccounts: async () => [],
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      const addBtn = el.querySelector('.accounts-add-btn');
      assert.ok(addBtn, 'expected add account button');
      addBtn.dispatchEvent(new Event('click', { bubbles: true }));

      const backdrop = document.body.children[document.body.children.length - 1];
      assert.ok(backdrop, 'expected modal backdrop');
      const form = backdrop.querySelector('.account-form');
      assert.ok(form, 'expected account form in modal');
      const submitBtn = form.querySelector('button[type="submit"]');
      assert.ok(submitBtn);

      const event = new Event('submit', { bubbles: true });
      form.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.strictEqual(submitBtn.disabled, true);

      resolveCreate();
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.strictEqual(submitBtn.disabled, false);
    });

    it('ignores second createAccount submit while first is pending', async () => {
      const { render } = await import('../../src/ui/views/accounts.js');
      let resolveCreate;
      const createPromise = new Promise((resolve) => { resolveCreate = resolve; });
      const operations = {};
      const mockState = {
        getState() {
          return {
            accounts: { loading: false, error: null, items: [] },
            accountForm: { editingId: null, name: 'Test', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: undefined },
            session: { userId: 'user-1' },
            operations,
          };
        },
        subscribe() { return () => {}; },
        dispatch(action) {
          if (action.type === 'OPERATION_START') {
            operations[action.key] = { loading: true };
          }
          if (action.type === 'OPERATION_STOP') {
            delete operations[action.key];
          }
        },
      };
      let createCalls = 0;
      const mockModules = {
        account: {
          createAccount: async () => {
            createCalls++;
            await createPromise;
            return { id: 'acc-1' };
          },
          getActiveAccounts: async () => [],
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      const addBtn = el.querySelector('.accounts-add-btn');
      assert.ok(addBtn);
      addBtn.dispatchEvent(new Event('click', { bubbles: true }));

      const backdrop = document.body.children[document.body.children.length - 1];
      const form = backdrop.querySelector('.account-form');
      const submitBtn = form.querySelector('button[type="submit"]');

      const event1 = new Event('submit', { bubbles: true });
      form.dispatchEvent(event1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const event2 = new Event('submit', { bubbles: true });
      form.dispatchEvent(event2);
      await new Promise((resolve) => setTimeout(resolve, 10));

      resolveCreate();
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(createCalls, 1);
    });

    it('re-enables submit button after createAccount failure', async () => {
      const { render } = await import('../../src/ui/views/accounts.js');
      const mockState = {
        getState() {
          return {
            accounts: { loading: false, error: null, items: [] },
            accountForm: { editingId: null, name: 'Test', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: undefined },
            session: { userId: 'user-1' },
            operations: mockState.operations || {},
          };
        },
        subscribe() { return () => {}; },
        dispatch(action) {
          if (action.type === 'OPERATION_START') {
            mockState.operations = { ...(mockState.operations || {}), [action.key]: { loading: true } };
          }
          if (action.type === 'OPERATION_STOP') {
            mockState.operations = { ...(mockState.operations || {}), [action.key]: undefined };
          }
        },
        operations: {},
      };
      const mockModules = {
        account: {
          createAccount: async () => {
            throw new Error('STORAGE_UNAVAILABLE');
          },
          getActiveAccounts: async () => [],
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      const addBtn = el.querySelector('.accounts-add-btn');
      assert.ok(addBtn);
      addBtn.dispatchEvent(new Event('click', { bubbles: true }));

      const backdrop = document.body.children[document.body.children.length - 1];
      const form = backdrop.querySelector('.account-form');
      const submitBtn = form.querySelector('button[type="submit"]');

      const event = new Event('submit', { bubbles: true });
      form.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(submitBtn.disabled, false);
    });
  });

  describe('budgets view', () => {
    it('renders edit button for each budget', async () => {
      const { render } = await import('../../src/ui/views/budgets.js');
      const mockState = {
        getState() {
          return {
            budgets: {
              loading: false,
              error: null,
              items: [
                { id: 'budget-1', categoryId: 'cat-1', amount: 500, archived: false },
              ],
            },
            budgetForm: { editingId: null, categoryId: '', amount: '' },
            session: { userId: 'user-1' },
            ui: { monthKey: '2024-09' },
            operations: {},
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        category: {
          getCategories: async () => [
            { id: 'cat-1', name: 'Food', type: 'expense', systemRole: null, archived: false },
          ],
        },
        budget: {
          getBudgetProgress: async () => ({ spent: 0, remaining: 500, overBudget: false }),
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      function findButtonText(node, text) {
        if (node.textContent === text) return true;
        if (node.children) {
          for (const child of node.children) {
            if (findButtonText(child, text)) return true;
          }
        }
        return false;
      }
      assert.ok(findButtonText(el, '✎'));
    });
  });

  describe('goals view', () => {
    it('renders edit button for each goal', async () => {
      const { render } = await import('../../src/ui/views/goals.js');
      const mockState = {
        getState() {
          return {
            goals: {
              loading: false,
              error: null,
              items: [
                { id: 'goal-1', name: 'Vacation', target: 2000, current: 0, deadline: '2027-12-31', icon: '✈️', color: '#FF0000', archived: false },
              ],
            },
            goalForm: { editingId: null, name: '', target: '', deadline: '', icon: '🎯', color: '#FF0000' },
            accounts: { items: [] },
            session: { userId: 'user-1' },
            operations: {},
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        goal: {
          getActiveGoals: async () => [],
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      function findButtonText(node, text) {
        if (node.textContent === text) return true;
        if (node.children) {
          for (const child of node.children) {
            if (findButtonText(child, text)) return true;
          }
        }
        return false;
      }
      assert.ok(findButtonText(el, 'Edit'));
      assert.ok(findButtonText(el, 'Vacation'));
    });
  });

  describe('transactions view', () => {
    it('renders account name from accounts list', async () => {
      const { render } = await import('../../src/ui/views/transactions.js');
      const mockState = {
        getState() {
          return {
            transactions: {
              loading: false,
              error: null,
              items: [
                { id: 'tx-1', date: '2024-09-15', description: 'Test', type: 'expense', amount: 50, accountId: 'acc-1', categoryId: null, notes: '' },
              ],
            },
            transactionForm: { editingId: null, accountId: '', amount: '', type: 'expense', categoryId: '', description: '', date: '', notes: '' },
            accounts: {
              items: [
                { id: 'acc-1', name: 'Main Account', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false },
              ],
            },
            session: { userId: 'user-1' },
            operations: {},
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        category: {
          getCategories: async () => [],
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      function findText(node, text) {
        if (typeof node.textContent === 'string' && node.textContent.includes(text)) return true;
        if (node.children) {
          for (const child of node.children) {
            if (findText(child, text)) return true;
          }
        }
        return false;
      }
      assert.ok(findText(el, 'Main Account'));
    });
  });

  describe('dashboard view', () => {
    it('renders independent sections', async () => {
      const { render } = await import('../../src/ui/views/dashboard.js');
      const mockState = {
        getState() {
          return {
            session: { userId: 'user-1' },
            ui: { monthKey: '2024-09' },
            accounts: { items: [{ id: 'acc-1', name: 'Main' }] },
            transactions: { items: [{ id: 'tx-1', accountId: 'acc-1', type: 'income', amount: 1000, description: 'Test', date: '2024-09-01' }] },
            budgets: { items: [{ id: 'b-1', categoryId: 'cat-1', amount: 500 }] },
            goals: { items: [{ id: 'g-1', name: 'Goal', target: 1000, current: 200 }] },
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        reporting: {
          getMonthlySummary: async () => ({ monthKey: '2024-09', income: 1000, expense: 500, net: 500, transactionCount: 2 }),
          getMonthCategoryBreakdown: async () => ({ monthKey: '2024-09', byCategory: { food: { total: 300, count: 5 } } }),
          getAccountBalance: async () => ({ accountId: 'acc-1', balance: 5000 }),
        },
        account: {
          getActiveAccounts: async () => [{ id: 'acc-1', name: 'Main' }],
        },
        budget: {
          getBudgets: async () => [{ id: 'b-1', categoryId: 'cat-1', amount: 500 }],
          getBudgetProgress: async () => ({ spent: 400, remaining: 100, overBudget: false }),
        },
        goal: {
          getActiveGoals: async () => [{ id: 'g-1', name: 'Goal', target: 1000, current: 200 }],
        },
        category: {
          getCategories: async () => [{ id: 'cat-1', name: 'Food' }],
        },
        safeToSpend: {
          computeForCurrentState: async () => ({ safeTotal: 500, perDay: 20, freeFunds: 800, goalsReq: 300, daysLeft: 10 }),
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      function findText(node, text) {
        if (node.textContent === text) return true;
        if (node.children) {
          for (const child of node.children) {
            if (findText(child, text)) return true;
          }
        }
        return false;
      }
      assert.ok(findText(el, 'Dashboard'));
      assert.ok(findText(el, 'Total Balance'));
      assert.ok(findText(el, 'Income'));
      assert.ok(findText(el, 'Expenses'));
      assert.ok(findText(el, 'Safe to Spend'));
      assert.ok(findText(el, 'Cash Flow Trend'));
      assert.ok(findText(el, 'Recent Transactions'));
      assert.ok(findText(el, 'Budgets at Risk'));
      assert.ok(findText(el, 'Goals'));
    });
  });

  describe('settings view', () => {
    it('renders backup section without duplicate control elements', async () => {
      const { render } = await import('../../src/ui/views/settings.js');
      const mockState = {
        getState() {
          return {
            session: { userId: 'user-1', profile: { id: 'user-1', settings: { accent: 'purple' } } },
            operations: {},
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        user: {
          getProfile: async () => ({ id: 'user-1', settings: { accent: 'purple' } }),
          updateProfile: async () => ({}),
        },
        category: { createCategory: async () => ({}) },
        backup: { createBackup: async () => ({}) },
        restore: {
          validateRestoreBackup: () => ({ valid: true, errors: [] }),
          computeRestorePreview: () => ({ collections: {} }),
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);

      function findSection(node, title) {
        if (node.children) {
          for (const child of node.children) {
            if (child.classList && child.classList.contains('settings-section-title') && child.textContent === title) {
              return node;
            }
            const found = findSection(child, title);
            if (found) return found;
          }
        }
        return null;
      }

      const backupSection = findSection(el, 'Data & Backup');
      assert.ok(backupSection, 'expected backup section');

      const allChildren = backupSection.children || [];
      let errorCount = 0;
      let successCount = 0;
      let previewCount = 0;
      let dangerCount = 0;

      for (const child of allChildren) {
        const cn = child.className || '';
        if (cn.includes('error-message')) errorCount++;
        if (cn.includes('success-message')) successCount++;
        if (cn.includes('backup-preview')) previewCount++;
        if (cn.includes('btn-danger')) dangerCount++;
      }

      assert.strictEqual(errorCount, 1, 'expected exactly 1 error element');
      assert.strictEqual(successCount, 1, 'expected exactly 1 success element');
      assert.strictEqual(previewCount, 1, 'expected exactly 1 preview element');
      assert.strictEqual(dangerCount, 1, 'expected exactly 1 confirm button');
    });
  });

  describe('client-side amount validation', () => {
    it('rejects zero amount in transaction form', async () => {
      const { render } = await import('../../src/ui/views/transactions.js');
      const mockState = {
        getState() {
          return {
            transactions: { loading: false, error: null, items: [] },
            transactionForm: { editingId: null, accountId: 'acc-1', amount: '0', type: 'expense', categoryId: '', description: 'Test', date: '2024-09-15', notes: '' },
            accounts: { items: [{ id: 'acc-1', name: 'Main', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false }] },
            session: { userId: 'user-1' },
            operations: {},
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        category: { getCategories: async () => [] },
        transaction: {
          createTransaction: async () => ({ id: 'tx-1' }),
          getTransactionsByMonth: async () => [],
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      const addBtn = el.querySelector('.transactions-add-btn');
      assert.ok(addBtn, 'expected add transaction button');
      addBtn.dispatchEvent(new Event('click', { bubbles: true }));

      const backdrop = document.body.children[document.body.children.length - 1];
      assert.ok(backdrop, 'expected modal backdrop');
      const form = backdrop.querySelector('.transaction-form');
      assert.ok(form, 'expected transaction form in modal');
      let createCalled = false;
      const originalCreate = mockModules.transaction.createTransaction;
      mockModules.transaction.createTransaction = async (...args) => {
        createCalled = true;
        return originalCreate(...args);
      };
      const event = new Event('submit', { bubbles: true });
      form.dispatchEvent(event);
      assert.strictEqual(createCalled, false);
    });
  });

  describe('receivables view', () => {
    it('renders without crashing when receivable module is available', async () => {
      const { render } = await import('../../src/ui/views/receivables.js');
      const mockState = {
        getState() {
          return {
            session: { userId: 'user-1' },
            accounts: { items: [{ id: 'acc-1', name: 'Main', type: 'bank', archived: false }] },
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        receivable: {
          getPersons: async () => [],
          getReceivables: async () => [],
          getPerson: async () => null,
          getPersonHistory: async () => ({ person: null, receivables: [], transactions: [] }),
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el);
      assert.ok(el.classList.contains('receivables-view'));
    });
  });
});
