/**
 * Stage 1.1 — Application State tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/application-state.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appStateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'application-state.js'), 'utf8');

function setupAppState() {
  const window = {
    AppState: null,
    toast: function(msg) {},
    console: console,
  };

  const script = new Function('window', appStateCode);
  script(window);

  return window;
}

describe('ApplicationState', () => {
  it('initializes with default dashboard state', () => {
    const window = setupAppState();
    assert.ok(window.AppState);
    assert.strictEqual(window.AppState.dashboard.layouts, null);
    assert.strictEqual(window.AppState.dashboard.editTab, null);
    assert.strictEqual(window.AppState.dashboard.addModalTab, null);
    assert.strictEqual(window.AppState.dashboard.sortable, null);
  });

  it('initializes with default UI state', () => {
    const window = setupAppState();
    assert.strictEqual(window.AppState.ui.activeTab, 'home');
    assert.strictEqual(window.AppState.ui.privacyMode, false);
    assert.strictEqual(window.AppState.ui.theme, 'light');
    assert.strictEqual(window.AppState.ui.activeMoneyPlace, 'konto');
  });

  it('initializes with empty session state', () => {
    const window = setupAppState();
    assert.strictEqual(window.AppState.session.currentUid, null);
    assert.strictEqual(window.AppState.session.isGuestMode, false);
    assert.strictEqual(window.AppState.session.guestOwnerUid, null);
    assert.strictEqual(window.AppState.session.guestDebtorId, null);
    assert.strictEqual(window.AppState.session.guestAccessCode, null);
    assert.strictEqual(window.AppState.session.guestDebtorRef, null);
  });

  it('sets dashboard layouts', () => {
    const window = setupAppState();
    const layouts = { home: { order: ['a', 'b'], hidden: [] } };
    window.AppState.setDashboardLayouts(layouts);
    assert.deepStrictEqual(window.AppState.dashboard.layouts, layouts);
  });

  it('prevents external mutation of dashboard layouts via getter', () => {
    const window = setupAppState();
    window.AppState.setDashboardLayouts({ home: { order: ['a'], hidden: [] } });
    const snapshot = window.AppState.dashboard;
    snapshot.layouts = { home: { order: ['mutated'], hidden: [] } };
    assert.deepStrictEqual(window.AppState.dashboard.layouts, { home: { order: ['a'], hidden: [] } });
  });

  it('prevents external mutation of UI state via getter', () => {
    const window = setupAppState();
    const snapshot = window.AppState.ui;
    snapshot.activeTab = 'mutated';
    assert.strictEqual(window.AppState.ui.activeTab, 'home');
  });

  it('sets dashboard edit tab', () => {
    const window = setupAppState();
    window.AppState.setDashboardEditTab('home');
    assert.strictEqual(window.AppState.dashboard.editTab, 'home');
  });

  it('sets session', () => {
    const window = setupAppState();
    window.AppState.setSession('uid-123', false, null, null, null);
    assert.strictEqual(window.AppState.session.currentUid, 'uid-123');
    assert.strictEqual(window.AppState.session.isGuestMode, false);
  });

  it('sets guest session', () => {
    const window = setupAppState();
    window.AppState.setSession(null, true, 'owner-uid', 'debt-1', 'code-1');
    assert.strictEqual(window.AppState.session.currentUid, null);
    assert.strictEqual(window.AppState.session.isGuestMode, true);
    assert.strictEqual(window.AppState.session.guestOwnerUid, 'owner-uid');
    assert.strictEqual(window.AppState.session.guestDebtorId, 'debt-1');
    assert.strictEqual(window.AppState.session.guestAccessCode, 'code-1');
  });

  it('clears session', () => {
    const window = setupAppState();
    window.AppState.setSession('uid-123', false, null, null, null);
    window.AppState.clearSession();
    assert.strictEqual(window.AppState.session.currentUid, null);
    assert.strictEqual(window.AppState.session.isGuestMode, false);
  });

  it('resets all state', () => {
    const window = setupAppState();
    window.AppState.setDashboardLayouts({ home: { order: [], hidden: [] } });
    window.AppState.setDashboardEditTab('home');
    window.AppState.setSession('uid-123', false, null, null, null);
    window.AppState.reset();
    assert.strictEqual(window.AppState.dashboard.layouts, null);
    assert.strictEqual(window.AppState.dashboard.editTab, null);
    assert.strictEqual(window.AppState.ui.activeTab, 'home');
    // Session is NOT reset by reset() — use clearSession() for that
    assert.strictEqual(window.AppState.session.currentUid, 'uid-123');
  });

  it('emits dashboard:changed event', () => {
    const window = setupAppState();
    let received = null;
    window.AppState.on('dashboard:changed', (layouts) => {
      received = layouts;
    });
    const layouts = { home: { order: ['a'], hidden: [] } };
    window.AppState.setDashboardLayouts(layouts);
    assert.deepStrictEqual(received, layouts);
  });

  it('emits session:changed event', () => {
    const window = setupAppState();
    let received = null;
    window.AppState.on('session:changed', (session) => {
      received = session;
    });
    window.AppState.setSession('uid-123', false, null, null, null);
    assert.strictEqual(received.currentUid, 'uid-123');
  });

  it('unsubscribes from events', () => {
    const window = setupAppState();
    let count = 0;
    const cb = () => { count++; };
    window.AppState.on('dashboard:changed', cb);
    window.AppState.setDashboardLayouts({});
    assert.strictEqual(count, 1);
    window.AppState.off('dashboard:changed', cb);
    window.AppState.setDashboardLayouts({});
    assert.strictEqual(count, 1);
  });

  it('handles listener errors gracefully', () => {
    const window = setupAppState();
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };

    window.AppState.on('dashboard:changed', () => {
      throw new Error('listener error');
    });

    window.AppState.setDashboardLayouts({});
    console.error = originalError;

    assert.ok(errors.some(e => e.includes('listener error')));
  });
});
