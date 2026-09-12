/**
 * Stage 1.1B — Application State
 *
 * Centralized application state container.
 * NO Firebase knowledge — pure state management.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  const state = {
    dashboard: {
      layouts: null,
      editTab: null,
      addModalTab: null,
      sortable: null,
    },
    ui: {
      activeTab: 'home',
      privacyMode: false,
      theme: 'light',
      activeMoneyPlace: 'konto',
    },
    session: {
      currentUid: null,
      isGuestMode: false,
      guestOwnerUid: null,
      guestDebtorId: null,
      guestAccessCode: null,
      guestDebtorRef: null,
    },
  };

  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, payload) {
    if (listeners[event]) {
      listeners[event].forEach(cb => {
        try { cb(payload); } catch (e) { console.error('[AppState] listener error:', e); }
      });
    }
  }

  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const out = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        out[key] = deepClone(obj[key]);
      }
    }
    return out;
  }

  window.AppState = {
    get dashboard() {
      return deepClone(state.dashboard);
    },

    get ui() {
      return deepClone(state.ui);
    },

    get session() {
      return deepClone(state.session);
    },

    setDashboardLayouts(layouts) {
      state.dashboard.layouts = deepClone(layouts);
      emit('dashboard:changed', state.dashboard.layouts);
    },

    setDashboardEditTab(tab) {
      state.dashboard.editTab = tab;
      emit('dashboard:editTabChanged', tab);
    },

    setDashboardAddModalTab(tab) {
      state.dashboard.addModalTab = tab;
      emit('dashboard:addModalTabChanged', tab);
    },

    setDashboardSortable(sortable) {
      state.dashboard.sortable = sortable;
    },

    setActiveTab(tab) {
      state.ui.activeTab = tab;
      emit('ui:activeTabChanged', tab);
    },

    setPrivacyMode(enabled) {
      state.ui.privacyMode = enabled;
      emit('ui:privacyModeChanged', enabled);
    },

    setTheme(theme) {
      state.ui.theme = theme;
      emit('ui:themeChanged', theme);
    },

    setActiveMoneyPlace(place) {
      state.ui.activeMoneyPlace = place;
      emit('ui:activeMoneyPlaceChanged', place);
    },

    setSession(uid, isGuest, ownerUid, debtorId, accessCode) {
      state.session.currentUid = uid;
      state.session.isGuestMode = isGuest;
      state.session.guestOwnerUid = ownerUid;
      state.session.guestDebtorId = debtorId;
      state.session.guestAccessCode = accessCode;
      state.session.guestDebtorRef = null;
      emit('session:changed', deepClone(state.session));
    },

    clearSession() {
      state.session.currentUid = null;
      state.session.isGuestMode = false;
      state.session.guestOwnerUid = null;
      state.session.guestDebtorId = null;
      state.session.guestAccessCode = null;
      state.session.guestDebtorRef = null;
      emit('session:cleared', deepClone(state.session));
    },

    reset() {
      state.dashboard.layouts = null;
      state.dashboard.editTab = null;
      state.dashboard.addModalTab = null;
      state.dashboard.sortable = null;
      state.ui.activeTab = 'home';
      state.ui.privacyMode = false;
      state.ui.theme = 'light';
      state.ui.activeMoneyPlace = 'konto';
      emit('app:reset', deepClone(state));
    },

    on,
    off,
  };

})();
