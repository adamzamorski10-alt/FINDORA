/**
 * Stage 1.1B — Dashboard Layouts State
 *
 * SINGLE SOURCE OF TRUTH for dashboard layouts.
 * NO Firebase knowledge — pure state management.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  const DEFAULT_LAYOUTS = window.DEFAULT_LAYOUTS || {
    home: ['net_worth', 'safe_to_spend', 'recent_transactions', 'budget_progress', 'goals_progress'],
    stats: ['kpi_row', 'expense_breakdown', 'trends'],
    report: ['monthly_summary', 'top_categories'],
  };

  let layouts = null; // { home: { order: [], hidden: [] }, ... } | null
  let editTab = null;
  let addModalTab = null;
  let sortableInstance = null;
  let authoritative = false;

  function cloneDefaults() {
    const out = {};
    Object.keys(DEFAULT_LAYOUTS).forEach(tab => {
      out[tab] = { order: [...DEFAULT_LAYOUTS[tab]], hidden: [] };
    });
    return out;
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

  function mergeWithSaved(saved) {
    const result = cloneDefaults();
    if (!saved) return result;
    Object.keys(result).forEach(tab => {
      const savedTab = saved[tab];
      if (!savedTab) return;
      const allIds = Object.keys(window.WIDGET_REGISTRY || {}).filter(id => {
        const w = window.WIDGET_REGISTRY[id];
        return w && w.tab === tab;
      });
      const savedOrder = Array.isArray(savedTab.order) ? savedTab.order.filter(id => allIds.includes(id)) : [];
      const savedHidden = Array.isArray(savedTab.hidden) ? savedTab.hidden.filter(id => allIds.includes(id)) : [];
      const missing = allIds.filter(id => !savedOrder.includes(id) && !savedHidden.includes(id));
      result[tab] = { order: [...savedOrder, ...missing], hidden: savedHidden };
    });
    return result;
  }

  window.DashboardLayoutsState = {
    get layouts() {
      return layouts ? deepClone(layouts) : null;
    },

    get editTab() {
      return editTab;
    },

    get addModalTab() {
      return addModalTab;
    },

    get sortableInstance() {
      return sortableInstance;
    },

    isAuthoritative() {
      return authoritative;
    },

    setAuthoritative(value) {
      authoritative = !!value;
    },

    ensureDefaults() {
      if (layouts) return layouts;
      layouts = cloneDefaults();
      return layouts;
    },

    mergeWithSaved,

    initialize(savedLayouts) {
      layouts = mergeWithSaved(savedLayouts);
      if (window.AppState) {
        window.AppState.setDashboardLayouts(layouts);
      }
      return layouts;
    },

    setLayouts(newLayouts) {
      layouts = deepClone(newLayouts);
      if (window.AppState) {
        window.AppState.setDashboardLayouts(layouts);
      }
    },

    setEditTab(tab) {
      editTab = tab;
      if (window.AppState) {
        window.AppState.setDashboardEditTab(tab);
      }
    },

    setAddModalTab(tab) {
      addModalTab = tab;
      if (window.AppState) {
        window.AppState.setDashboardAddModalTab(tab);
      }
    },

    setSortableInstance(instance) {
      sortableInstance = instance;
      if (window.AppState) {
        window.AppState.setDashboardSortable(instance);
      }
    },

    getTab(tab) {
      if (!layouts) return null;
      const tabLayout = layouts[tab];
      return tabLayout ? deepClone(tabLayout) : null;
    },

    updateTab(tab, updater) {
      if (!layouts) layouts = cloneDefaults();
      if (!layouts[tab]) layouts[tab] = { order: [], hidden: [] };
      layouts[tab] = deepClone(updater(layouts[tab]));
      if (window.AppState) {
        window.AppState.setDashboardLayouts(layouts);
      }
      return deepClone(layouts[tab]);
    },

    reset() {
      layouts = null;
      editTab = null;
      addModalTab = null;
      sortableInstance = null;
      authoritative = false;
    },
  };

})();
