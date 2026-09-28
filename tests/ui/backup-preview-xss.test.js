import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function findElement(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children || []) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function createMockDocument() {
  const attrs = {};
  const styleProps = {};
  const el = {
    tagName: 'DIV',
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
    classList: {
      _classes: [],
      add(c) { this._classes.push(c); },
      remove(c) { this._classes = this._classes.filter((x) => x !== c); },
      contains(c) { return this._classes.includes(c); },
    },
    setAttribute(name, value) { attrs[name] = value; },
    getAttribute(name) { return attrs[name] || null; },
    querySelector(selector) {
      if (selector === 'input[type="file"]') {
        return findElement(el, c => c.tagName === 'INPUT' && c.type === 'file');
      }
      return null;
    },
    replaceChildren(...args) { this.children = args; },
    appendChild(child) { this.children.push(child); },
    addEventListener() {},
    dispatchEvent() {},
    firstChild: null,
    nextSibling: null,
  };
  function createElement(tag) {
    const childAttrs = {};
    const childListeners = {};
    const childStyleProps = {};
    const child = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      children: [],
      style: {
        setProperty(name, value) { childStyleProps[name] = value; },
        getPropertyValue(name) { return childStyleProps[name] || ''; },
        removeProperty(name) { delete childStyleProps[name]; },
        backgroundColor: '',
        display: '',
      },
      dataset: {},
      classList: { _classes: [], add(c) { this._classes.push(c); }, remove(c) { this._classes = this._classes.filter((x) => x !== c); }, contains(c) { return this._classes.includes(c); } },
      setAttribute(name, value) { childAttrs[name] = value; },
      getAttribute(name) { return childAttrs[name] || null; },
      querySelector() { return null; },
      replaceChildren(...args) { this.children = args; },
      appendChild(child) { this.children.push(child); },
      addEventListener(event, handler) {
        if (!childListeners[event]) childListeners[event] = [];
        childListeners[event].push(handler);
      },
      dispatchEvent() {},
      getEventListener(event) {
        return childListeners[event] ? childListeners[event][0] : null;
      },
    };
    Object.defineProperty(child, 'className', {
      get() { return child.classList._classes.join(' '); },
      set(value) { child.classList._classes = value.split(' ').filter(Boolean); },
    });
    return child;
  }
  return {
    documentElement: el,
    createElement,
  };
}

describe('Backup Preview XSS Prevention', () => {
  it('renders malicious userId as text, not executable markup', async () => {
    const mockDoc = createMockDocument();
    const originalDoc = globalThis.document;
    globalThis.document = mockDoc;

    try {
      const { render } = await import('../../src/ui/views/settings.js');
      const maliciousUserId = '<script>alert("xss")</script>';
      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: '2024-01-01T00:00:00Z',
        userId: maliciousUserId,
        data: {
          profile: [{ id: 'user-1', settings: {} }],
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
        },
      };

      const mockState = {
        getState() {
          return {
            session: {
              userId: 'user-1',
              profile: {
                id: 'user-1',
                settings: { currency: 'PLN', theme: 'system', accent: 'purple', privacyMode: false, excludeInvestmentsFromNetWorth: false },
              },
            },
            operations: {},
            categoryForm: { name: '', type: 'expense', icon: 'circle', color: '#888888' },
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        user: { updateProfile: async () => ({}) },
        category: { createCategory: async () => {} },
        backup: { createBackup: async () => (envelope) },
        restore: {
          validateRestoreBackup: () => ({ valid: true, errors: [] }),
          computeRestorePreview: () => ({ collections: { accounts: { backup: 0, current: 0 } } }),
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el, 'settings view should render');

      const importInput = findElement(el, c => c.tagName === 'INPUT' && c.type === 'file');
      assert.ok(importInput, 'import input should exist in rendered tree');

      const changeHandler = importInput.getEventListener('change');
      assert.ok(changeHandler, 'change handler should be registered on import input');

      const file = { text: async () => JSON.stringify(envelope) };
      await changeHandler({ target: { files: [file] } });

      assert.ok(!el.innerHTML.includes('<script>'), 'script tag must not be present in rendered HTML');
      assert.ok(!el.innerHTML.includes('onerror='), 'event handler attribute must not be present');
    } finally {
      globalThis.document = originalDoc;
    }
  });

  it('renders malicious createdAt as text, not executable markup', async () => {
    const mockDoc = createMockDocument();
    const originalDoc = globalThis.document;
    globalThis.document = mockDoc;

    try {
      const { render } = await import('../../src/ui/views/settings.js');
      const maliciousCreatedAt = '2024-01-01T00:00:00Z<img src=x onerror=alert(1)>';
      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: maliciousCreatedAt,
        userId: 'user-1',
        data: {
          profile: [{ id: 'user-1', settings: {} }],
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
        },
      };

      const mockState = {
        getState() {
          return {
            session: {
              userId: 'user-1',
              profile: {
                id: 'user-1',
                settings: { currency: 'PLN', theme: 'system', accent: 'purple', privacyMode: false, excludeInvestmentsFromNetWorth: false },
              },
            },
            operations: {},
            categoryForm: { name: '', type: 'expense', icon: 'circle', color: '#888888' },
          };
        },
        subscribe() { return () => {}; },
        dispatch() {},
      };
      const mockModules = {
        user: { updateProfile: async () => ({}) },
        category: { createCategory: async () => {} },
        backup: { createBackup: async () => (envelope) },
        restore: {
          validateRestoreBackup: () => ({ valid: true, errors: [] }),
          computeRestorePreview: () => ({ collections: { accounts: { backup: 0, current: 0 } } }),
        },
      };

      const el = render({ state: mockState, modules: mockModules });
      assert.ok(el, 'settings view should render');

      const importInput = findElement(el, c => c.tagName === 'INPUT' && c.type === 'file');
      assert.ok(importInput, 'import input should exist');

      const changeHandler = importInput.getEventListener('change');
      assert.ok(changeHandler, 'change handler should be registered');

      const file = { text: async () => JSON.stringify(envelope) };
      await changeHandler({ target: { files: [file] } });

      assert.ok(!el.innerHTML.includes('onerror='), 'event handler attribute must not be present');
      assert.ok(!el.innerHTML.includes('<img'), 'injected img tag must not be present');
    } finally {
      globalThis.document = originalDoc;
    }
  });
});
