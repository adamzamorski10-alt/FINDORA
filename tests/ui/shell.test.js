import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { init } from '../../src/ui/i18n.js';

function createMockElement(tag = 'div') {
  const listeners = {};
  const children = [];
  const attributes = {};
  const element = {
    tagName: tag.toUpperCase(),
    style: {},
    dataset: {},
    innerHTML: '',
    children,
    attributes,
    classList: {
      _classes: [],
      add(c) { this._classes.push(c); },
      remove(c) { this._classes = this._classes.filter((x) => x !== c); },
      contains(c) { return this._classes.includes(c); },
    },
    setAttribute(name, value) {
      attributes[name] = value;
    },
    getAttribute(name) {
      return attributes[name];
    },
    querySelector(selector) {
      if (selector === '#app-main') return element.mainEl || element;
      if (selector.startsWith('#app-lifecycle-')) {
        const key = selector.replace('#app-lifecycle-', '');
        return element.lifecycleEls[key] || null;
      }
      if (selector === '.month-nav-btn') {
        return element.monthNavBtn || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.nav-link') return element.navLinks;
      return [];
    },
    addEventListener(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener(event, handler) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
    replaceChildren(...args) {
      children.length = 0;
      for (const child of args) {
        children.push(child);
      }
      this.innerHTML = children.map((c) => (typeof c === 'string' ? c : (c.innerHTML || ''))).join('');
    },
    appendChild(child) {
      children.push(child);
      this.innerHTML = children.map((c) => (typeof c === 'string' ? c : (c.innerHTML || ''))).join('');
    },
    get listeners() {
      return listeners;
    },
  };
  element.mainEl = element;
  element.lifecycleEls = {
    initializing: { style: {} },
    ready: { style: {} },
    error: { style: {} },
  };
  element.navLinks = [];
  element.monthNavBtn = { dataset: {}, closest: (selector) => {
    if (selector === '[data-action="prev-month"], [data-action="next-month"]') return element.monthNavBtn;
    return null;
  }};
  return element;
}

function createMockNavLink(tab) {
  const el = createMockElement('a');
  el.dataset.tab = tab;
  el.href = `#${tab}`;
  el.closest = (selector) => {
    if (selector === '.nav-link') return el;
    return null;
  };
  return el;
}

function createMockState(initialTab = 'dashboard', initialMonthKey = '2024-09') {
  const listeners = new Set();
  let currentSnapshot = {
    lifecycle: 'initial',
    ui: { activeTab: initialTab, monthKey: initialMonthKey },
    session: { profile: null },
    accounts: { items: [] },
    transactions: { items: [] },
    budgets: { items: [] },
    goals: { items: [] },
    people: { items: [] },
    receivables: { items: [] },
    incomeProfiles: { items: [] },
    resellingProducts: { items: [] },
    resellingOrders: { items: [] },
    resellingSales: { items: [] },
    resellingCosts: { items: [] },
    resellingTasks: { items: [] },
  };

  return {
    getState() {
      return currentSnapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      if (action.type === 'SET_LIFECYCLE') {
        currentSnapshot = { ...currentSnapshot, lifecycle: action.lifecycle };
      }
      if (action.type === 'SET_ACTIVE_TAB') {
        currentSnapshot = { ...currentSnapshot, ui: { ...currentSnapshot.ui, activeTab: action.tab } };
      }
      if (action.type === 'SET_MONTH_KEY') {
        currentSnapshot = { ...currentSnapshot, ui: { ...currentSnapshot.ui, monthKey: action.monthKey } };
      }
      if (action.type === 'SET_ACCOUNTS') {
        currentSnapshot = { ...currentSnapshot, accounts: { ...currentSnapshot.accounts, items: action.accounts } };
      }
      if (action.type === 'SET_TRANSACTIONS') {
        currentSnapshot = { ...currentSnapshot, transactions: { ...currentSnapshot.transactions, items: action.transactions } };
      }
      if (action.type === 'SET_BUDGETS') {
        currentSnapshot = { ...currentSnapshot, budgets: { ...currentSnapshot.budgets, items: action.budgets } };
      }
      if (action.type === 'SET_GOALS') {
        currentSnapshot = { ...currentSnapshot, goals: { ...currentSnapshot.goals, items: action.goals } };
      }
      if (action.type === 'SET_PEOPLE') {
        currentSnapshot = { ...currentSnapshot, people: { ...currentSnapshot.people, items: action.people } };
      }
      if (action.type === 'SET_RECEIVABLES') {
        currentSnapshot = { ...currentSnapshot, receivables: { ...currentSnapshot.receivables, items: action.receivables } };
      }
      if (action.type === 'SET_INCOME_PROFILES') {
        currentSnapshot = { ...currentSnapshot, incomeProfiles: { ...currentSnapshot.incomeProfiles, items: action.profiles } };
      }
      if (action.type === 'SET_RESELLING_PRODUCTS') {
        currentSnapshot = { ...currentSnapshot, resellingProducts: { ...currentSnapshot.resellingProducts, items: action.items } };
      }
      if (action.type === 'SET_RESELLING_ORDERS') {
        currentSnapshot = { ...currentSnapshot, resellingOrders: { ...currentSnapshot.resellingOrders, items: action.items } };
      }
      if (action.type === 'SET_RESELLING_SALES') {
        currentSnapshot = { ...currentSnapshot, resellingSales: { ...currentSnapshot.resellingSales, items: action.items } };
      }
      if (action.type === 'SET_RESELLING_COSTS') {
        currentSnapshot = { ...currentSnapshot, resellingCosts: { ...currentSnapshot.resellingCosts, items: action.items } };
      }
      if (action.type === 'SET_RESELLING_TASKS') {
        currentSnapshot = { ...currentSnapshot, resellingTasks: { ...currentSnapshot.resellingTasks, items: action.items } };
      }
      if (action.type === 'SET_USER_PROFILE') {
        currentSnapshot = { ...currentSnapshot, session: { ...currentSnapshot.session, profile: action.profile } };
      }
      for (const listener of listeners) {
        listener(currentSnapshot);
      }
    },
  };
}

function createMockDocument() {
  function createElement(tag) {
    const listeners = {};
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
      style: {},
      dataset: {},
      textContent: '',
      classList,
      setAttribute(name, value) {
        this.attributes = this.attributes || {};
        this.attributes[name] = value;
      },
      getAttribute(name) {
        return this.attributes && this.attributes[name];
      },
      replaceChildren(...args) {
        this.children = args;
        this.innerHTML = args.map((c) => (typeof c === 'string' ? c : (c.innerHTML || ''))).join('');
      },
      appendChild(child) {
        this.children.push(child);
        this.innerHTML = this.children.map((c) => (typeof c === 'string' ? c : (c.innerHTML || c.textContent || ''))).join('');
      },
      addEventListener(event, handler) {
        listeners[event] = handler;
      },
      removeEventListener(event, handler) {
        delete listeners[event];
      },
    };
    Object.defineProperty(el, 'className', {
      get() { return classList._classes.join(' '); },
      set(value) { classList._classes = value.split(' ').filter(Boolean); },
    });
    return el;
  }
  return { createElement };
}

globalThis.document = createMockDocument();

await init('en');

describe('Shell', () => {
  describe('navigation', () => {
    it('renders active navigation state for initial tab', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [
        createMockNavLink('dashboard'),
        createMockNavLink('accounts'),
        createMockNavLink('transactions'),
      ];
      const state = createMockState('dashboard');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const dashboardLink = root.navLinks[0];
      assert.strictEqual(dashboardLink.getAttribute('aria-current'), 'page');
      const accountsLink = root.navLinks[1];
      assert.strictEqual(accountsLink.getAttribute('aria-current'), 'false');
    });

    it('dispatches SET_ACTIVE_TAB when navigation is clicked', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      const accountsLink = createMockNavLink('accounts');
      root.navLinks = [accountsLink];
      const state = createMockState('dashboard');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const event = new Event('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: accountsLink });

      const clickHandlers = root.listeners.click || [];
      for (const handler of clickHandlers) {
        handler(event);
      }

      assert.strictEqual(state.getState().ui.activeTab, 'accounts');
    });

    it('renders correct view for active tab', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('budgets')];
      const state = createMockState('budgets');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl);
      assert.ok(mainEl.innerHTML.includes('Budgets'));
    });

    it('renders month navigation with current month label', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('dashboard')];
      const state = createMockState('dashboard', '2024-09');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl);
      assert.ok(mainEl.innerHTML.includes('September 2024'));
      assert.ok(mainEl.innerHTML.includes('data-action="prev-month"'));
      assert.ok(mainEl.innerHTML.includes('data-action="next-month"'));
    });

    it('dispatches SET_MONTH_KEY when next month is clicked', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('dashboard')];
      const state = createMockState('dashboard', '2024-09');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const event = new Event('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: root.monthNavBtn });
      root.monthNavBtn.dataset = { action: 'next-month' };

      const clickHandlers = root.listeners.click || [];
      for (const handler of clickHandlers) {
        handler(event);
      }

      assert.strictEqual(state.getState().ui.monthKey, '2024-10');
    });

    it('dispatches SET_MONTH_KEY when previous month is clicked', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('dashboard')];
      const state = createMockState('dashboard', '2024-09');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const event = new Event('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: root.monthNavBtn });
      root.monthNavBtn.dataset = { action: 'prev-month' };

      const clickHandlers = root.listeners.click || [];
      for (const handler of clickHandlers) {
        handler(event);
      }

      assert.strictEqual(state.getState().ui.monthKey, '2024-08');
    });
  });

  describe('lifecycle', () => {
    it('shows ready state when lifecycle becomes ready', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('dashboard')];
      const state = createMockState('dashboard');
      const shell = createShell({ state, modules: {}, root });

      const initializingEl = root.lifecycleEls.initializing;
      const readyEl = root.lifecycleEls.ready;

      shell.mount();

      assert.strictEqual(initializingEl.style.display, 'none');
      assert.strictEqual(readyEl.style.display, 'flex');
    });

    it('shows error state when lifecycle becomes error', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('dashboard')];
      const state = createMockState('dashboard');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'error' });

      const errorEl = root.lifecycleEls.error;
      assert.strictEqual(errorEl.style.display, 'flex');
    });
  });

  describe('invalid navigation', () => {
    it('renders unknown view placeholder for invalid tab', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('nonexistent')];
      const state = createMockState('nonexistent');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl.innerHTML.includes('Unknown view'));
    });
  });

  describe('data refresh', () => {
    it('re-renders accounts view when accounts items change', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('accounts')];
      const state = createMockState('accounts');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl.innerHTML.includes('Accounts'));

      state.dispatch({ type: 'SET_ACCOUNTS', accounts: [{ id: 'acc-1', name: 'Test', type: 'bank', icon: '🏦', color: '#0000FF' }] });
      assert.ok(mainEl.innerHTML.includes('Test'));
    });

    it('re-renders transactions view when transactions items change', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('transactions')];
      const state = createMockState('transactions');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl.innerHTML.includes('Transactions'));

      state.dispatch({ type: 'SET_TRANSACTIONS', transactions: [{ id: 'tx-1', description: 'Test tx', amount: 50 }] });
      assert.ok(mainEl.innerHTML.includes('Test tx'));
    });

    it('re-renders budgets view when budgets items change', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('budgets')];
      const state = createMockState('budgets');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl.innerHTML.includes('Budgets'));

      state.dispatch({ type: 'SET_BUDGETS', budgets: [{ id: 'budget-1', categoryId: 'cat-1', amount: 400 }] });
      assert.ok(mainEl.innerHTML.includes('400'));
    });

    it('re-renders goals view when goals items change', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('goals')];
      const state = createMockState('goals');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      assert.ok(mainEl.innerHTML.includes('Goals'));

      state.dispatch({ type: 'SET_GOALS', goals: [{ id: 'goal-1', name: 'Vacation', target: 2000 }] });
      assert.ok(mainEl.innerHTML.includes('Vacation'));
    });

    it('does not re-render when unrelated state changes on a non-active view', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('accounts')];
      const state = createMockState('accounts');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      const initialHtml = mainEl.innerHTML;

      state.dispatch({ type: 'SET_GOALS', goals: [{ id: 'goal-1', name: 'Vacation', target: 2000 }] });
      assert.strictEqual(mainEl.innerHTML, initialHtml);
    });

    it('does not cause render loop on repeated identical state notifications', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('accounts')];
      const state = createMockState('accounts');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      const mainEl = root.querySelector('#app-main');
      const initialHtml = mainEl.innerHTML;

      const sameAccounts = [];
      state.dispatch({ type: 'SET_ACCOUNTS', accounts: sameAccounts });
      const afterFirst = mainEl.innerHTML;

      state.dispatch({ type: 'SET_ACCOUNTS', accounts: sameAccounts });
      const afterSecond = mainEl.innerHTML;

      assert.notStrictEqual(afterFirst, initialHtml);
      assert.strictEqual(afterSecond, afterFirst);
    });

    it('preserves tab navigation after data refresh', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('accounts'), createMockNavLink('budgets')];
      const state = createMockState('accounts');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      state.dispatch({ type: 'SET_ACCOUNTS', accounts: [{ id: 'acc-1', name: 'Test', type: 'bank', icon: '🏦', color: '#0000FF' }] });
      assert.strictEqual(state.getState().ui.activeTab, 'accounts');

      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'budgets' });
      assert.strictEqual(state.getState().ui.activeTab, 'budgets');
      assert.ok(root.querySelector('#app-main').innerHTML.includes('Budgets'));
    });

    it('preserves month navigation after data refresh', async () => {
      const { createShell } = await import('../../src/ui/shell.js');
      const root = createMockElement('div');
      root.navLinks = [createMockNavLink('dashboard')];
      const state = createMockState('dashboard', '2024-09');
      const shell = createShell({ state, modules: {}, root });
      shell.mount();

      assert.ok(root.querySelector('#app-main').innerHTML.includes('September 2024'));

      state.dispatch({ type: 'SET_ACCOUNTS', accounts: [{ id: 'acc-1', name: 'Test', type: 'bank', icon: '🏦', color: '#0000FF' }] });
      assert.ok(root.querySelector('#app-main').innerHTML.includes('September 2024'));
    });
  });
});
