import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppKernel } from '../../src/application/app-kernel.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';
import { createApplicationState } from '../../src/state/application-state-factory.js';
import { setLocale } from '../../src/ui/i18n.js';
import { render as renderDashboard } from '../../src/ui/views/dashboard.js';
import { render as renderAccounts } from '../../src/ui/views/accounts.js';
import { render as renderTransactions } from '../../src/ui/views/transactions.js';
import { render as renderBudgets } from '../../src/ui/views/budgets.js';
import { render as renderReports } from '../../src/ui/views/reports.js';

function createMockDocument() {
  const elements = [];
  function findInTree(node, predicate) {
    if (predicate(node)) return node;
    const children = node.children || [];
    for (const child of children) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
    return null;
  }
  function findAllInTree(node, predicate) {
    const results = [];
    if (predicate(node)) results.push(node);
    const children = node.children || [];
    for (const child of children) {
      results.push(...findAllInTree(child, predicate));
    }
    return results;
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
      querySelectorAll(selector) {
        if (selector.startsWith('.') && !selector.includes(' ')) {
          const className = selector.slice(1);
          return findAllInTree(this, (c) => c.classList && c.classList.contains(className));
        }
        return [];
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
  const documentEl = createElement('document');
  documentEl.body = body;
  documentEl.createElement = createElement;

  return { createElement, document: documentEl, body };
}

globalThis.document = createMockDocument().document;

const DEV_USER_ID = 'user-cross-screen';
const OPENING_BALANCE_CATEGORY_ID = 'system-opening-balance';
const SAVINGS_CATEGORY_ID = 'cat-savings';
const FIXED_MONTH = '2024-09';
const FIXED_DATE = '2024-09-15';

async function createKernel(storage) {
  const kernel = createAppKernel({
    storageAdapter: storage,
    userId: DEV_USER_ID,
    openingBalanceCategoryId: OPENING_BALANCE_CATEGORY_ID,
  });

  const now = new Date().toISOString();
  await kernel.persistence.categoryRepository.save({
    id: OPENING_BALANCE_CATEGORY_ID,
    userId: DEV_USER_ID,
    name: 'Opening Balance',
    type: 'expense',
    icon: 'circle',
    color: '#888888',
    parentId: null,
    isSystem: true,
    systemRole: 'opening-balance',
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  await kernel.persistence.categoryRepository.save({
    id: SAVINGS_CATEGORY_ID,
    userId: DEV_USER_ID,
    name: 'Savings',
    type: 'expense',
    icon: 'piggy-bank',
    color: '#00FF00',
    parentId: null,
    isSystem: true,
    systemRole: 'savings',
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  let profile;
  try {
    profile = await kernel.modules.user.getProfile({ userId: DEV_USER_ID });
  } catch (e) {
    if (e.message === 'NOT_FOUND') {
      profile = await kernel.modules.user.createProfile({
        userId: DEV_USER_ID,
        settings: {
          currency: 'PLN',
          theme: 'system',
          accent: 'purple',
          privacyMode: false,
          excludeInvestmentsFromNetWorth: false,
        },
      });
    } else {
      throw e;
    }
  }

  return kernel;
}

function findText(node, text) {
  if (node.textContent === text) return true;
  if (node.children) {
    for (const child of node.children) {
      if (findText(child, text)) return true;
    }
  }
  return false;
}

function waitForAsync(ms = 150) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildViewModules(modules) {
  return {
    reporting: modules.reporting,
    account: modules.account,
    budget: modules.budget,
    goal: modules.goal,
    category: modules.category,
    safeToSpend: modules.safeToSpend,
    transaction: modules.transaction,
    backup: modules.backup,
    restore: modules.restore,
    user: modules.user,
  };
}

describe('Cross-Screen Mutation Propagation', () => {
  it('TEST A — transaction creation propagates to Dashboard, Reports, Budgets, and Transactions', async () => {
    await setLocale('en');
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    const expenseCategory = await modules.category.createCategory({
      userId: DEV_USER_ID,
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
    });

    await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 1000,
      type: 'income',
      categoryId: null,
      description: 'Salary',
      date: FIXED_DATE,
    });

    await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 200,
      type: 'expense',
      categoryId: expenseCategory.id,
      description: 'Groceries',
      date: FIXED_DATE,
    });

    await modules.budget.createBudget({
      userId: DEV_USER_ID,
      categoryId: expenseCategory.id,
      amount: 500,
    });

    const accounts = await modules.account.getActiveAccounts({ userId: DEV_USER_ID });
    const transactions = await modules.transaction.getTransactionsByMonth({ userId: DEV_USER_ID, monthKey: FIXED_MONTH });
    const budgets = await modules.budget.getBudgets({ userId: DEV_USER_ID });
    const goals = await modules.goal.getActiveGoals({ userId: DEV_USER_ID });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    state.dispatch({ type: 'SET_TRANSACTIONS', transactions });
    state.dispatch({ type: 'SET_BUDGETS', budgets });
    state.dispatch({ type: 'SET_GOALS', goals });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);

    const dashboardEl = renderDashboard({ state, modules: viewModules });
    const reportsEl = renderReports({ state, modules: viewModules });
    const budgetsEl = renderBudgets({ state, modules: viewModules });
    const transactionsEl = renderTransactions({ state, modules: viewModules });

    await waitForAsync();

    assert.ok(findText(dashboardEl, 'Total Balance'));
    assert.ok(findText(dashboardEl, 'Income'));
    assert.ok(findText(dashboardEl, 'Expenses'));
    assert.ok(findText(dashboardEl, 'Safe to Spend'));

    assert.ok(findText(reportsEl, 'Income'));
    assert.ok(findText(reportsEl, 'Expenses'));
    assert.ok(findText(reportsEl, 'Cash Flow Trend'));

    assert.ok(findText(budgetsEl, 'Food'));
    assert.ok(findText(budgetsEl, '200.00'), 'budget spent should reflect expense transaction');

    assert.ok(findText(transactionsEl, 'Salary'));
    assert.ok(findText(transactionsEl, 'Groceries'));
  });

  it('TEST B — transaction edit propagates to dependent screens', async () => {
    await setLocale('en');
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    const expenseCategory = await modules.category.createCategory({
      userId: DEV_USER_ID,
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
    });

    const tx = await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 200,
      type: 'expense',
      categoryId: expenseCategory.id,
      description: 'Groceries',
      date: FIXED_DATE,
    });

    await modules.budget.createBudget({
      userId: DEV_USER_ID,
      categoryId: expenseCategory.id,
      amount: 500,
    });

    const updated = await modules.transaction.updateTransaction({
      transactionId: tx.id,
      updates: { amount: 300 },
    });
    assert.strictEqual(updated.amount, 300);

    const accounts = await modules.account.getActiveAccounts({ userId: DEV_USER_ID });
    const transactions = await modules.transaction.getTransactionsByMonth({ userId: DEV_USER_ID, monthKey: FIXED_MONTH });
    const budgets = await modules.budget.getBudgets({ userId: DEV_USER_ID });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    state.dispatch({ type: 'SET_TRANSACTIONS', transactions });
    state.dispatch({ type: 'SET_BUDGETS', budgets });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);
    const budgetsEl = renderBudgets({ state, modules: viewModules });
    await waitForAsync();

    assert.ok(findText(budgetsEl, '300.00'), 'budget spent should reflect updated transaction amount');
  });

  it('TEST C — transaction category change updates budget and reports', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    const oldCategory = await modules.category.createCategory({
      userId: DEV_USER_ID,
      name: 'OldCat',
      type: 'expense',
      icon: 'circle',
      color: '#888888',
    });

    const newCategory = await modules.category.createCategory({
      userId: DEV_USER_ID,
      name: 'NewCat',
      type: 'expense',
      icon: 'circle',
      color: '#888888',
    });

    const tx = await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 200,
      type: 'expense',
      categoryId: oldCategory.id,
      description: 'Test',
      date: FIXED_DATE,
    });

    await modules.budget.createBudget({
      userId: DEV_USER_ID,
      categoryId: oldCategory.id,
      amount: 500,
    });

    await modules.budget.createBudget({
      userId: DEV_USER_ID,
      categoryId: newCategory.id,
      amount: 500,
    });

    await modules.transaction.updateTransaction({
      transactionId: tx.id,
      updates: { categoryId: newCategory.id },
    });

    const accounts = await modules.account.getActiveAccounts({ userId: DEV_USER_ID });
    const transactions = await modules.transaction.getTransactionsByMonth({ userId: DEV_USER_ID, monthKey: FIXED_MONTH });
    const budgets = await modules.budget.getBudgets({ userId: DEV_USER_ID });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    state.dispatch({ type: 'SET_TRANSACTIONS', transactions });
    state.dispatch({ type: 'SET_BUDGETS', budgets });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);
    const budgetsEl = renderBudgets({ state, modules: viewModules });
    await waitForAsync();

    assert.ok(findText(budgetsEl, 'NewCat'), 'new category budget should receive the expense');
  });

  it('TEST D — transaction account change updates balances', async () => {
    await setLocale('en');
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const accountA = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Account A',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    const accountB = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Account B',
      type: 'bank',
      icon: 'landmark',
      color: '#FF0000',
    });

    const tx = await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: accountA.id,
      amount: 500,
      type: 'income',
      categoryId: null,
      description: 'Transfer',
      date: FIXED_DATE,
    });

    await modules.transaction.updateTransaction({
      transactionId: tx.id,
      updates: { accountId: accountB.id },
    });

    const accounts = await modules.account.getActiveAccounts({ userId: DEV_USER_ID });
    const transactions = await modules.transaction.getTransactionsByMonth({ userId: DEV_USER_ID, monthKey: FIXED_MONTH });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    state.dispatch({ type: 'SET_TRANSACTIONS', transactions });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);
    const accountsEl = renderAccounts({ state, modules: viewModules });
    await waitForAsync();

    assert.ok(findText(accountsEl, 'Account A'));
    assert.ok(findText(accountsEl, 'Account B'));
    assert.ok(findText(accountsEl, '0.00'), 'Account A should have zero balance after transfer');
  });

  it('TEST E — transaction archive removes it from all derived calculations', async () => {
    await setLocale('en');
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    const expenseCategory = await modules.category.createCategory({
      userId: DEV_USER_ID,
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
    });

    const tx = await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 200,
      type: 'expense',
      categoryId: expenseCategory.id,
      description: 'Groceries',
      date: FIXED_DATE,
    });

    await modules.budget.createBudget({
      userId: DEV_USER_ID,
      categoryId: expenseCategory.id,
      amount: 500,
    });

    await modules.transaction.archiveTransaction({ transactionId: tx.id });

    const accounts = await modules.account.getActiveAccounts({ userId: DEV_USER_ID });
    const transactions = await modules.transaction.getTransactionsByMonth({ userId: DEV_USER_ID, monthKey: FIXED_MONTH });
    const budgets = await modules.budget.getBudgets({ userId: DEV_USER_ID });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    state.dispatch({ type: 'SET_TRANSACTIONS', transactions });
    state.dispatch({ type: 'SET_BUDGETS', budgets });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);
    const transactionsEl = renderTransactions({ state, modules: viewModules });
    const budgetsEl = renderBudgets({ state, modules: viewModules });
    await waitForAsync();

    assert.ok(!findText(transactionsEl, 'Groceries'), 'archived transaction should disappear from transactions view');
    assert.ok(findText(budgetsEl, '0.00'), 'budget spent should be zero after archive');
  });

  it('TEST F — budget archive removes it from active views', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const expenseCategory = await modules.category.createCategory({
      userId: DEV_USER_ID,
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
    });

    const budget = await modules.budget.createBudget({
      userId: DEV_USER_ID,
      categoryId: expenseCategory.id,
      amount: 500,
    });

    await modules.budget.archiveBudget({ budgetId: budget.id });

    const budgets = await modules.budget.getBudgets({ userId: DEV_USER_ID });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_BUDGETS', budgets });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);
    const budgetsEl = renderBudgets({ state, modules: viewModules });
    await waitForAsync();

    assert.ok(!findText(budgetsEl, 'Food'), 'archived budget should not appear in active budgets view');
  });

  it('TEST G — account archive prevents selection and preserves history', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules } = kernel;
    const state = createApplicationState();

    state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });

    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 100,
      type: 'income',
      categoryId: null,
      description: 'Salary',
      date: FIXED_DATE,
    });

    await modules.account.archiveAccount({ accountId: account.id });

    const accounts = await modules.account.getActiveAccounts({ userId: DEV_USER_ID });
    const profile = await modules.user.getProfile({ userId: DEV_USER_ID });

    state.dispatch({ type: 'SET_USER_PROFILE', profile });
    state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: FIXED_MONTH });

    const viewModules = buildViewModules(modules);
    const accountsEl = renderAccounts({ state, modules: viewModules });
    await waitForAsync();

    const nameEls = accountsEl.querySelectorAll('.account-list-item-name');
    const names = nameEls.map(el => el.textContent).filter(Boolean);
    assert.ok(!names.includes('Bank'), 'archived account should not appear in active accounts view');

    let thrown = false;
    try {
      await modules.transaction.createTransaction({
        userId: DEV_USER_ID,
        accountId: account.id,
        amount: 50,
        type: 'expense',
        categoryId: null,
        description: 'Should fail',
        date: FIXED_DATE,
      });
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
    }
    assert.ok(thrown, 'creating transaction against archived account should fail');
  });
});
