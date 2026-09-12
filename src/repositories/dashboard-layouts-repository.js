/**
 * Stage 1.1B/1.2 — Dashboard Layouts Repository
 *
 * Persistence coordinator for dashboard layouts.
 * Uses Storage Adapter for persistence operations.
 * Does NOT read from global cache or DOM.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  function getFirebaseKey(tab) {
    return 'settings/layouts/' + tab;
  }

  function saveTab(tab, showToast) {
    if (!window.StorageAdapter || typeof window.StorageAdapter.set !== 'function') {
      console.warn('[DashboardLayoutsRepo] StorageAdapter not available');
      return Promise.resolve();
    }

    const layout = window.DashboardLayoutsState ? window.DashboardLayoutsState.getTab(tab) : null;
    if (!layout) {
      console.warn('[DashboardLayoutsRepo] No layout for tab: ' + tab);
      return Promise.resolve();
    }

    const key = getFirebaseKey(tab);

    return window.StorageAdapter.set(key, layout)
      .then(() => {
        if (showToast && window.toast) {
          window.toast('Zapisano układ!');
        }
      })
      .catch(err => {
        console.error('[DashboardLayoutsRepo] Error saving tab ' + tab + ':', err);
        if (window.toast) {
          window.toast('Nie udało się zapisać układu (' + tab + '): ' + (err && err.message ? err.message : err), 'error');
        }
      });
  }

  function removeLegacy() {
    if (!window.StorageAdapter || typeof window.StorageAdapter.remove !== 'function') {
      return Promise.resolve();
    }

    const legacyKey = 'finapp_dashboard_layouts';
    return window.StorageAdapter.remove(legacyKey).catch(err => {
      console.warn('[DashboardLayoutsRepo] Could not remove legacy layout:', err);
    });
  }

  window.DashboardLayoutsRepository = {
    saveTab,
    removeLegacy,
    getFirebaseKey,
  };

})();
