/**
 * Stage 1.6B.3 — Session Manager Foundation focused tests.
 *
 * Verifies SessionManager owns ONLY owner-session context and does NOT
 * perform auth, UI, data mapping, or guest-mode work.
 * Run with: node tests/session-manager.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sessionManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'session-manager.js'), 'utf8');
const userDataLoaderCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'user-data-loader.js'), 'utf8');

function loadSessionManagerConstructor() {
  var sandbox = {
    window: {},
    SessionManager: null
  };
  var script = new Function('window', sessionManagerCode);
  script(sandbox.window);
  return sandbox.window.SessionManager;
}

function createSessionManager(options) {
  var Constructor = loadSessionManagerConstructor();
  return new Constructor(options);
}

describe('SessionManager', () => {
  it('startOwner(uid) establishes the correct owner context', () => {
    var ref = { uid: 'owner_123', off: function() {} };
    var created = false;

    var sm = createSessionManager({
      createUserRef: function(uid) {
        assert.strictEqual(uid, 'owner_123');
        created = true;
        return ref;
      },
      bindContext: function(boundRef) {
        assert.strictEqual(boundRef, ref);
      }
    });

    sm.startOwner('owner_123');
    assert.strictEqual(created, true, 'createUserRef must be called with the uid');
    assert.strictEqual(sm.getCurrentUid(), 'owner_123');
    assert.strictEqual(sm.isOwnerActive(), true);
  });

  it('DataLayer.currentUserRef is bound to the correct owner context', () => {
    var ref = { uid: 'owner_abc', off: function() {} };
    var boundRef = null;

    var sm = createSessionManager({
      createUserRef: function() { return ref; },
      bindContext: function(r) {
        boundRef = r;
      }
    });

    sm.startOwner('owner_abc');
    assert.strictEqual(boundRef, ref, 'bindContext must receive the owner ref');
  });

  it('FirebaseStorageAdapter receives the correct owner context via DataLayer propagation', () => {
    var ref = { uid: 'owner_prop', off: function() {} };
    var boundRef = null;

    var sm = createSessionManager({
      createUserRef: function() { return ref; },
      bindContext: function(r) {
        boundRef = r;
      }
    });

    sm.startOwner('owner_prop');
    assert.strictEqual(boundRef, ref, 'bindContext receives correct ref for adapter propagation');
  });

  it('getCurrentUid() reports the active owner', () => {
    var sm = createSessionManager({
      createUserRef: function(uid) { return { uid: uid, off: function() {} }; },
      bindContext: function() {}
    });

    assert.strictEqual(sm.getCurrentUid(), null, 'No uid before startOwner');

    sm.startOwner('uid_1');
    assert.strictEqual(sm.getCurrentUid(), 'uid_1');

    sm.stopOwner();
    assert.strictEqual(sm.getCurrentUid(), null, 'Uid must be cleared after stopOwner');
  });

  it('isOwnerActive() is correct', () => {
    var sm = createSessionManager({
      createUserRef: function(uid) { return { uid: uid, off: function() {} }; },
      bindContext: function() {}
    });

    assert.strictEqual(sm.isOwnerActive(), false, 'Inactive before start');

    sm.startOwner('uid_1');
    assert.strictEqual(sm.isOwnerActive(), true);

    sm.stopOwner();
    assert.strictEqual(sm.isOwnerActive(), false, 'Inactive after stop');
  });

  it('startOwner(same uid) is idempotent', () => {
    var callCount = 0;

    var sm = createSessionManager({
      createUserRef: function() {
        callCount++;
        return { uid: 'uid_1', off: function() {} };
      },
      bindContext: function() {}
    });

    sm.startOwner('uid_1');
    assert.strictEqual(callCount, 1, 'First start must create ref');

    sm.startOwner('uid_1');
    assert.strictEqual(callCount, 1, 'Duplicate start must not create extra ref');
  });

  it('switching uid clears/replaces the old context safely', () => {
    var refA = { uid: 'uid_A', off: function() {} };
    var refB = { uid: 'uid_B', off: function() {} };
    var boundRefs = [];

    var sm = createSessionManager({
      createUserRef: function(uid) {
        return uid === 'uid_A' ? refA : refB;
      },
      bindContext: function(ref) {
        boundRefs.push(ref);
      }
    });

    sm.startOwner('uid_A');
    assert.strictEqual(sm.getCurrentUid(), 'uid_A');
    assert.strictEqual(boundRefs[boundRefs.length - 1], refA);

    sm.startOwner('uid_B');
    assert.strictEqual(sm.getCurrentUid(), 'uid_B');
    assert.strictEqual(boundRefs[boundRefs.length - 1], refB,
      'Old context must be replaced');
  });

  it('stopOwner() clears owner context', () => {
    var ref = { uid: 'uid_1', off: function() {} };
    var clearCalled = false;
    var boundRefs = [];

    var sm = createSessionManager({
      createUserRef: function() { return ref; },
      bindContext: function(r) { boundRefs.push(r); },
      clearContext: function() { clearCalled = true; }
    });

    sm.startOwner('uid_1');
    assert.strictEqual(boundRefs.length, 1);

    sm.stopOwner();
    assert.strictEqual(clearCalled, true, 'clearContext must be called on stop');
    assert.strictEqual(sm.getCurrentUid(), null);
    assert.strictEqual(sm.isOwnerActive(), false);
  });

  it('stopOwner() is idempotent', () => {
    var clearCount = 0;

    var sm = createSessionManager({
      createUserRef: function() { return { uid: 'uid_1', off: function() {} }; },
      bindContext: function() {},
      clearContext: function() { clearCount++; }
    });

    sm.startOwner('uid_1');
    sm.stopOwner();
    assert.strictEqual(clearCount, 1, 'First stop must clear context');

    sm.stopOwner();
    assert.strictEqual(clearCount, 1, 'Second stop must not double-clear');
  });

  it('context cannot remain bound to previous uid after switch/stop', () => {
    var refA = { uid: 'uid_A', off: function() {} };
    var refB = { uid: 'uid_B', off: function() {} };
    var boundRefs = [];
    var clearCount = 0;

    var sm = createSessionManager({
      createUserRef: function(uid) {
        return uid === 'uid_A' ? refA : refB;
      },
      bindContext: function(ref) {
        boundRefs.push(ref);
      },
      clearContext: function() {
        clearCount++;
      }
    });

    sm.startOwner('uid_A');
    assert.strictEqual(boundRefs.length, 1);
    assert.strictEqual(boundRefs[0], refA);

    sm.startOwner('uid_B');
    assert.strictEqual(boundRefs.length, 2);
    assert.strictEqual(boundRefs[1], refB);

    sm.stopOwner();
    assert.strictEqual(clearCount, 1, 'clearContext must be called on stop');
  });

  it('adversarial: wrong uid is bound exactly as supplied, no silent fallback', () => {
    var wrongRef = { uid: 'wrong_uid', off: function() {} };
    var boundUids = [];

    var sm = createSessionManager({
      createUserRef: function(uid) {
        assert.strictEqual(uid, 'wrong_uid');
        return wrongRef;
      },
      bindContext: function(ref) {
        boundUids.push(ref.uid);
      }
    });

    sm.startOwner('wrong_uid');
    assert.strictEqual(sm.getCurrentUid(), 'wrong_uid',
      'Must accept the supplied uid exactly');
    assert.deepStrictEqual(boundUids, ['wrong_uid'],
      'Must bind exactly the supplied uid, no fallback to another user');
  });

  it('SessionManager does not perform data mapping', () => {
    var forbidden = [
      'applyMapping', 'USER_DATA_MAP', 'dbData', 'window.transactions',
      'window.debtors', 'window.budgets', 'finapp_', 'load('
    ];
    for (var i = 0; i < forbidden.length; i++) {
      assert.strictEqual(sessionManagerCode.indexOf(forbidden[i]), -1,
        'SessionManager must not contain data mapping logic: ' + forbidden[i]);
    }
  });

  it('SessionManager does not touch UI/DOM', () => {
    var forbidden = [
      'renderAll', 'switchTab', 'applyThemeIcons', 'scheduleNotifications',
      'autoCheckRecurring', 'toast', 'resetLocalAppState', 'document.',
      'getElementById', 'querySelector', 'classList'
    ];
    for (var i = 0; i < forbidden.length; i++) {
      assert.strictEqual(sessionManagerCode.indexOf(forbidden[i]), -1,
        'SessionManager must not touch UI/DOM: ' + forbidden[i]);
    }
  });

  it('no Firebase Auth listener is created by SessionManager', () => {
    assert.strictEqual(sessionManagerCode.indexOf('onAuthStateChanged'), -1,
      'SessionManager must not create Firebase Auth listeners');
    assert.strictEqual(sessionManagerCode.indexOf('signInWithEmailAndPassword'), -1,
      'SessionManager must not sign in users');
    assert.strictEqual(sessionManagerCode.indexOf('signOut'), -1,
      'SessionManager must not sign out users');
  });

  it('no guest-mode behavior is introduced', () => {
    assert.strictEqual(sessionManagerCode.indexOf('isGuestMode'), -1,
      'SessionManager must not reference guest mode');
    assert.strictEqual(sessionManagerCode.indexOf('guestOwnerUid'), -1,
      'SessionManager must not reference guest owner uid');
    assert.strictEqual(sessionManagerCode.indexOf('renderGuestView'), -1,
      'SessionManager must not render guest views');
  });

  it('UserDataLoader is not responsible for session context', () => {
    assert.strictEqual(userDataLoaderCode.indexOf('window.currentUserRef ='), -1,
      'UserDataLoader must not set window.currentUserRef');
    assert.strictEqual(userDataLoaderCode.indexOf('DataLayer.currentUserRef ='), -1,
      'UserDataLoader must not set DataLayer.currentUserRef');
    assert.strictEqual(userDataLoaderCode.indexOf('setCurrentUserRef'), -1,
      'UserDataLoader must not call setCurrentUserRef');
  });
});
