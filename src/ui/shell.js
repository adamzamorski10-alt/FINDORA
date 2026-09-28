/**
 * Stage 3.X — UI Shell
 *
 * Minimal shell that subscribes to Application State and renders
 * navigation + placeholder views. Does NOT contain business logic.
 */

import { render as renderDashboard } from './views/dashboard.js';
import { render as renderAccounts } from './views/accounts.js';
import { render as renderTransactions } from './views/transactions.js';
import { render as renderBudgets } from './views/budgets.js';
import { render as renderGoals } from './views/goals.js';
import { render as renderReports } from './views/reports.js';
import { render as renderSettings } from './views/settings.js';

const VIEWS = {
  dashboard: renderDashboard,
  accounts: renderAccounts,
  transactions: renderTransactions,
  budgets: renderBudgets,
  goals: renderGoals,
  reports: renderReports,
  settings: renderSettings,
};

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  accounts: 'Accounts',
  transactions: 'Transactions',
  budgets: 'Budgets',
  goals: 'Goals',
  reports: 'Reports',
  settings: 'Settings',
};

export function createShell({ state, modules, root }) {
  const mainEl = root.querySelector('#app-main');
  const navLinks = root.querySelectorAll('.nav-link');
  const lifecycleEls = {
    initializing: root.querySelector('#app-lifecycle-initializing'),
    ready: root.querySelector('#app-lifecycle-ready'),
    error: root.querySelector('#app-lifecycle-error'),
  };
  const topBarTitle = root.querySelector('.top-bar-title');
  const menuBtn = root.querySelector('.top-bar-menu-btn');
  const sidebar = root.querySelector('.sidebar');
  const sidebarOverlay = root.querySelector('.sidebar-overlay');
  const sidebarUserName = root.querySelector('#sidebar-user-name');
  const sidebarUserEmail = root.querySelector('#sidebar-user-email');
  const sidebarUserAvatar = root.querySelector('#sidebar-user-avatar');

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function getMonthLabel(monthKey) {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    return `${MONTH_NAMES[month - 1]} ${year}`;
  }

  function renderMonthNav() {
    const monthKey = state.getState().ui.monthKey || '';
    const label = getMonthLabel(monthKey);
    return `<div class="month-nav">
      <button class="month-nav-btn" data-action="prev-month" aria-label="Previous month">‹</button>
      <span class="month-nav-label">${label}</span>
      <button class="month-nav-btn" data-action="next-month" aria-label="Next month">›</button>
    </div>`;
  }

  function renderView(tab) {
    if (!mainEl) return;
    const viewModule = VIEWS[tab];
    if (!viewModule) {
      mainEl.innerHTML = `<div class="view-placeholder"><h2>Unknown view</h2><p>Navigation target "${tab}" is not implemented yet.</p></div>`;
      return;
    }
    mainEl.innerHTML = '';
    const monthNavEl = document.createElement('div');
    monthNavEl.innerHTML = renderMonthNav();
    mainEl.appendChild(monthNavEl);

    const viewEl = viewModule({ state, modules });
    if (viewEl && typeof viewEl.replaceChildren === 'function') {
      mainEl.appendChild(viewEl);
    } else if (typeof viewEl === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = viewEl;
      mainEl.appendChild(wrapper);
    }
  }

  function updateNavigation(activeTab) {
    if (!navLinks.length) return;
    navLinks.forEach((link) => {
      const isActive = link.dataset.tab === activeTab;
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function updateTopBarTitle(tab) {
    if (!topBarTitle) return;
    topBarTitle.textContent = PAGE_TITLES[tab] || 'Dashboard';
  }

  function updateSidebarUser(profile) {
    if (!profile) return;
    const name = profile.id || 'Guest';
    const email = '—';
    const avatar = (profile.id || '?').charAt(0).toUpperCase();
    if (sidebarUserName) sidebarUserName.textContent = name;
    if (sidebarUserEmail) sidebarUserEmail.textContent = email;
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = avatar;
  }

  function toggleMobileNav() {
    if (!sidebar || !sidebarOverlay || !menuBtn) return;
    const isOpen = sidebar.classList.contains('is-open');
    if (isOpen) {
      closeMobileNav();
    } else {
      sidebar.classList.add('is-open');
      sidebarOverlay.classList.add('is-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      sidebar.setAttribute('aria-hidden', 'false');
    }
  }

  function closeMobileNav() {
    if (!sidebar || !sidebarOverlay || !menuBtn) return;
    sidebar.classList.remove('is-open');
    sidebarOverlay.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', 'true');
  }

  function handleStateChange(snapshot) {
    const { lifecycle, ui, session, accounts, transactions, budgets, goals } = snapshot;

    if (lifecycle === 'initializing') {
      Object.values(lifecycleEls).forEach((el) => {
        if (el) el.style.display = 'none';
      });
      if (lifecycleEls.initializing) lifecycleEls.initializing.style.display = 'flex';
      return;
    }

    if (lifecycle === 'error') {
      Object.values(lifecycleEls).forEach((el) => {
        if (el) el.style.display = 'none';
      });
      if (lifecycleEls.error) lifecycleEls.error.style.display = 'flex';
      return;
    }

    if (lifecycle === 'ready') {
      Object.values(lifecycleEls).forEach((el) => {
        if (el) el.style.display = 'none';
      });
      if (lifecycleEls.ready) lifecycleEls.ready.style.display = 'flex';

      const activeTab = ui.activeTab || 'dashboard';
      const monthKey = ui.monthKey || '';
      const tabChanged = activeTab !== lastActiveTab;
      const monthChanged = monthKey !== lastMonthKey;
      const accountsChanged = accounts.items !== previousAccountsItems;
      const transactionsChanged = transactions.items !== previousTransactionsItems;
      const budgetsChanged = budgets.items !== previousBudgetsItems;
      const goalsChanged = goals.items !== previousGoalsItems;
      const profileChanged = session.profile !== previousProfile;

      const relevantDataChanged =
        (activeTab === 'accounts' && accountsChanged) ||
        (activeTab === 'transactions' && transactionsChanged) ||
        (activeTab === 'budgets' && budgetsChanged) ||
        (activeTab === 'goals' && goalsChanged) ||
        (activeTab === 'settings' && profileChanged) ||
        ((activeTab === 'dashboard' || activeTab === 'reports') &&
          (accountsChanged || transactionsChanged || budgetsChanged || goalsChanged));

      const shouldRender = tabChanged || monthChanged || relevantDataChanged;

      if (tabChanged) {
        lastActiveTab = activeTab;
      }
      if (monthChanged) {
        lastMonthKey = monthKey;
      }
      previousAccountsItems = accounts.items;
      previousTransactionsItems = transactions.items;
      previousBudgetsItems = budgets.items;
      previousGoalsItems = goals.items;
      previousProfile = session.profile;

      if (shouldRender) {
        updateNavigation(activeTab);
        updateTopBarTitle(activeTab);
        renderView(activeTab);
      }

      updateSidebarUser(session.profile);
    }
  }

  function handleNavClick(event) {
    const link = event.target.closest('.nav-link');
    if (!link) return;
    event.preventDefault();
    closeMobileNav();
    const tab = link.dataset.tab;
    if (!tab) return;
    state.dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }

  function handleMonthNavClick(event) {
    const btn = event.target.closest('[data-action="prev-month"], [data-action="next-month"]');
    if (!btn) return;

    const current = state.getState().ui.monthKey || new Date().toISOString().slice(0, 7);
    const [year, month] = current.split('-').map(Number);
    let newMonth = month;
    let newYear = year;

    if (btn.dataset.action === 'prev-month') {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    } else {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }

    const monthKey = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey });
  }

  function mount() {
    state.subscribe(handleStateChange);
    root.addEventListener('click', handleNavClick);
    root.addEventListener('click', handleMonthNavClick);
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMobileNav();
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', closeMobileNav);
    }

    const initialTab = state.getState().ui.activeTab || 'dashboard';
    state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'ready' });
    state.dispatch({ type: 'SET_ACTIVE_TAB', tab: initialTab });
    updateTopBarTitle(initialTab);
    updateSidebarUser(state.getState().session?.profile);
  }

  let lastActiveTab = null;
  let lastMonthKey = null;
  let previousAccountsItems = null;
  let previousTransactionsItems = null;
  let previousBudgetsItems = null;
  let previousGoalsItems = null;
  let previousProfile = null;

  return { mount };
}
