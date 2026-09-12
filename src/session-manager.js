/**
 * Stage 1.6B.3 — Session Manager Foundation
 *
 * Owns ONLY owner-session context. Does NOT own auth listeners, UI, guest
 * mode, data mapping, migrations, schema, notifications, or business logic.
 *
 * Lifecycle:
 *   startOwner(uid)  - binds owner context to the storage infrastructure
 *   stopOwner()      - clears owner context and ref
 *
 * SessionManager does NOT create Firebase Auth listeners. It receives an
 * already-authenticated owner uid from the caller.
 */

(function() {
  'use strict';

  function SessionManager(options) {
    options = options || {};
    var currentUid = null;
    var currentRef = null;

    function createUserRef(uid) {
      if (options.createUserRef) {
        return options.createUserRef(uid);
      }
      if (typeof window.db !== 'undefined' && typeof window.db.ref === 'function') {
        return window.db.ref('users/' + uid);
      }
      return null;
    }

    function bindContext(ref) {
      if (options.bindContext) {
        options.bindContext(ref);
        return;
      }
      if (typeof window.DataLayer !== 'undefined' && typeof window.DataLayer.currentUserRef !== 'undefined') {
        window.DataLayer.currentUserRef = ref;
      }
    }

    function clearContext() {
      if (options.clearContext) {
        options.clearContext();
        return;
      }
      if (typeof window.DataLayer !== 'undefined' && typeof window.DataLayer.currentUserRef !== 'undefined') {
        window.DataLayer.currentUserRef = null;
      }
    }

    return {
      startOwner: function(uid) {
        if (!uid) return;
        if (currentUid === uid) return;

        currentUid = uid;
        currentRef = createUserRef(uid);
        if (currentRef) {
          bindContext(currentRef);
        }
      },

      stopOwner: function() {
        if (!currentUid) return;

        currentRef = null;
        currentUid = null;
        clearContext();
      },

      getCurrentUid: function() {
        return currentUid;
      },

      isOwnerActive: function() {
        return currentUid !== null;
      }
    };
  }

  window.SessionManager = SessionManager;
})();
