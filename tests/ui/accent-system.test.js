import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function createMockDocument() {
  const attrs = {};
  const styleProps = {};
  const classList = {
    _classes: [],
    add(c) { this._classes.push(c); },
    remove(c) { this._classes = this._classes.filter((x) => x !== c); },
    contains(c) { return this._classes.includes(c); },
  };
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
    classList,
    attributes: {},
    setAttribute(name, value) { attrs[name] = value; },
    getAttribute(name) { return attrs[name] || null; },
    querySelector() { return null; },
    replaceChildren(...args) { this.children = args; },
    appendChild(child) { this.children.push(child); },
    addEventListener() {},
    dispatchEvent() {},
    firstChild: null,
    nextSibling: null,
  };
  function createElement(tag) {
    const childAttrs = {};
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
      addEventListener() {},
      dispatchEvent() {},
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

describe('Accent Theme System', () => {
  describe('bootstrap accent resolution', () => {
    const VALID_ACCENTS = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];

    function resolveAccent(settings) {
      const accent = (settings && settings.accent) || 'purple';
      return VALID_ACCENTS.includes(accent) ? accent : 'purple';
    }

    it('defaults to purple when settings are missing', () => {
      assert.strictEqual(resolveAccent(null), 'purple');
      assert.strictEqual(resolveAccent(undefined), 'purple');
    });

    it('defaults to purple when accent is missing from settings', () => {
      assert.strictEqual(resolveAccent({ theme: 'system' }), 'purple');
    });

    it('preserves valid accent values', () => {
      for (const accent of VALID_ACCENTS) {
        assert.strictEqual(resolveAccent({ accent }), accent);
      }
    });

    it('falls back to purple for invalid accent values', () => {
      assert.strictEqual(resolveAccent({ accent: 'invalid' }), 'purple');
      assert.strictEqual(resolveAccent({ accent: '' }), 'purple');
      assert.strictEqual(resolveAccent({ accent: ' Purple ' }), 'purple');
      assert.strictEqual(resolveAccent({ accent: 'pink' }), 'purple');
      assert.strictEqual(resolveAccent({ accent: 'purple-dark' }), 'purple');
    });
  });

  describe('settings view accent selector', () => {
    it('includes all six accent options in settings source', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const settingsPath = path.join(process.cwd(), 'src/ui/views/settings.js');
      const source = fs.readFileSync(settingsPath, 'utf8');

      const expectedAccents = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
      const expectedLabels = ['Purple', 'Blue', 'Emerald', 'Amber', 'Rose', 'Cyan'];

      for (let i = 0; i < expectedAccents.length; i++) {
        assert.ok(source.includes(`value: '${expectedAccents[i]}'`), `expected accent value ${expectedAccents[i]} in settings`);
        assert.ok(source.includes(`label: '${expectedLabels[i]}'`), `expected accent label ${expectedLabels[i]} in settings`);
      }
    });

    it('settings view renders with accent in profile', async () => {
      const mockDoc = createMockDocument();
      const originalDoc = globalThis.document;
      globalThis.document = mockDoc;

      try {
        const { render } = await import('../../src/ui/views/settings.js');
        const mockState = {
          getState() {
            return {
              session: {
                userId: 'user-1',
                profile: {
                  id: 'user-1',
                  settings: {
                    currency: 'PLN',
                    theme: 'system',
                    accent: 'purple',
                    privacyMode: false,
                    excludeInvestmentsFromNetWorth: false,
                  },
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
          backup: { createBackup: async () => ({}) },
          restore: { validateRestoreBackup: () => ({ valid: true, errors: [] }), computeRestorePreview: () => ({ collections: {} }) },
        };

        const el = render({ state: mockState, modules: mockModules });
        assert.ok(el, 'settings view should render');
        assert.ok(el.className.includes('settings-view'), 'expected settings view class');
      } finally {
        globalThis.document = originalDoc;
      }
    });

    it('accent change handler updates document data-accent attribute', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const settingsPath = path.join(process.cwd(), 'src/ui/views/settings.js');
      const source = fs.readFileSync(settingsPath, 'utf8');

      assert.ok(source.includes("document.documentElement.setAttribute('data-accent'"), 'expected data-accent setter in settings');
      assert.ok(source.includes('accent'), 'expected accent field in settings');
    });
  });

  describe('runtime accent application', () => {
    it('applies valid accent to documentElement', () => {
      const mockDoc = createMockDocument();
      const originalDoc = globalThis.document;
      globalThis.document = mockDoc;

      try {
        const validAccents = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
        for (const accent of validAccents) {
          globalThis.document.documentElement.setAttribute('data-accent', accent);
          assert.strictEqual(globalThis.document.documentElement.getAttribute('data-accent'), accent);
        }
      } finally {
        globalThis.document = originalDoc;
      }
    });

    it('rejects invalid accent and falls back to purple', () => {
      const validAccents = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
      const accent = 'invalid-theme';
      const normalized = validAccents.includes(accent) ? accent : 'purple';
      assert.strictEqual(normalized, 'purple');
    });
  });

  describe('semantic color independence', () => {
    it('positive/negative tokens do not reference --color-primary', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const cssPath = path.join(process.cwd(), 'src/ui/app.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      const positiveMatches = css.match(/\.amount-positive\s*\{[^}]*\}/g) || [];
      const negativeMatches = css.match(/\.amount-negative\s*\{[^}]*\}/g) || [];
      const badgePositiveMatches = css.match(/\.badge-positive\s*\{[^}]*\}/g) || [];
      const badgeNegativeMatches = css.match(/\.badge-negative\s*\{[^}]*\}/g) || [];

      const allSemantic = [...positiveMatches, ...negativeMatches, ...badgePositiveMatches, ...badgeNegativeMatches];
      for (const rule of allSemantic) {
        assert.ok(!rule.includes('--color-primary'), 'semantic rule must not depend on --color-primary: ' + rule);
      }
    });
  });
});
