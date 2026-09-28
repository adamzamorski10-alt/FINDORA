/**
 * Stage 4.1 — UI Bootstrap
 *
 * Creates the AppKernel, initializes persistence, bootstraps profile,
 * loads accounts, and hands off to the shell.
 */

import { createAppKernel } from '../application/app-kernel.js';
import { createShell } from './shell.js';
import { IndexedDBStorageAdapter } from '../infrastructure/storage/indexeddb-storage-adapter.js';

const DEV_USER_ID = 'dev-user';
const DEV_OPENING_BALANCE_CATEGORY_ID = 'system-opening-balance';

function resolveDatabaseName() {
  const search = document.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    const dbParam = params.get('db');
    if (dbParam && dbParam.trim() !== '') {
      return dbParam.trim();
    }
  }
  return 'finora';
}

async function bootstrap() {
  const dbName = resolveDatabaseName();
  const storageAdapter = new IndexedDBStorageAdapter(dbName);
  await storageAdapter.init();

  const kernel = createAppKernel({
    storageAdapter,
    userId: DEV_USER_ID,
    openingBalanceCategoryId: DEV_OPENING_BALANCE_CATEGORY_ID,
  });

  const appEl = document.getElementById('app');
  if (!appEl) {
    throw new Error('VALIDATION_FAILED');
  }

  kernel.state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'initializing' });
  kernel.state.dispatch({ type: 'SET_USER_ID', userId: DEV_USER_ID });
  kernel.state.dispatch({ type: 'SET_PROFILE_LOADING', loading: true });
  kernel.state.dispatch({ type: 'SET_ACCOUNTS_LOADING', loading: true });
  kernel.state.dispatch({ type: 'SET_TRANSACTIONS_LOADING', loading: true });
  kernel.state.dispatch({ type: 'SET_BUDGETS_LOADING', loading: true });
  kernel.state.dispatch({ type: 'SET_GOALS_LOADING', loading: true });

  try {
    let profile;
    try {
      profile = await kernel.modules.user.getProfile({ userId: DEV_USER_ID });
    } catch (e) {
      if (e.message === 'NOT_FOUND') {
        profile = await kernel.modules.user.createProfile({
          userId: DEV_USER_ID,
          settings: {
            currency: 'PLN',
            theme: 'system',
            accent: 'purple',
            privacyMode: false,
            excludeInvestmentsFromNetWorth: false,
          },
        });
      } else {
        throw e;
      }
    }

    kernel.state.dispatch({ type: 'SET_USER_PROFILE', profile });

    const accent = (profile.settings && profile.settings.accent) || 'purple';
    const validAccents = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
    const normalizedAccent = validAccents.includes(accent) ? accent : 'purple';
    document.documentElement.setAttribute('data-accent', normalizedAccent);

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    kernel.state.dispatch({ type: 'SET_MONTH_KEY', monthKey: currentMonthKey });

    try {
      await kernel.modules.category.seedSystemCategories({ userId: DEV_USER_ID });
    } catch (e) {
      kernel.state.dispatch({ type: 'SET_INITIALIZATION_ERROR', error: e.message });
      kernel.state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'error' });
      return kernel;
    }

    try {
      const accounts = await kernel.modules.account.getActiveAccounts({ userId: DEV_USER_ID });
      kernel.state.dispatch({ type: 'SET_ACCOUNTS', accounts });
    } catch (e) {
      kernel.state.dispatch({ type: 'SET_ACCOUNTS_ERROR', error: e.message });
    } finally {
      kernel.state.dispatch({ type: 'SET_ACCOUNTS_LOADING', loading: false });
    }

    try {
      const transactions = await kernel.modules.transaction.getTransactionsByMonth({
        userId: DEV_USER_ID,
        monthKey: kernel.state.getState().ui.monthKey || new Date().toISOString().slice(0, 7),
      });
      kernel.state.dispatch({ type: 'SET_TRANSACTIONS', transactions });
    } catch (e) {
      kernel.state.dispatch({ type: 'SET_TRANSACTIONS_ERROR', error: e.message });
    } finally {
      kernel.state.dispatch({ type: 'SET_TRANSACTIONS_LOADING', loading: false });
    }

    try {
      const budgets = await kernel.modules.budget.getBudgets({ userId: DEV_USER_ID });
      kernel.state.dispatch({ type: 'SET_BUDGETS', budgets });
    } catch (e) {
      kernel.state.dispatch({ type: 'SET_BUDGETS_ERROR', error: e.message });
    } finally {
      kernel.state.dispatch({ type: 'SET_BUDGETS_LOADING', loading: false });
    }

    try {
      const goals = await kernel.modules.goal.getActiveGoals({ userId: DEV_USER_ID });
      kernel.state.dispatch({ type: 'SET_GOALS', goals });
    } catch (e) {
      kernel.state.dispatch({ type: 'SET_GOALS_ERROR', error: e.message });
    } finally {
      kernel.state.dispatch({ type: 'SET_GOALS_LOADING', loading: false });
    }
  } catch (e) {
    kernel.state.dispatch({ type: 'SET_INITIALIZATION_ERROR', error: e.message });
    kernel.state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'error' });
    return kernel;
  }

  const shell = createShell({ state: kernel.state, modules: kernel.modules, root: appEl });
  shell.mount();

  return kernel;
}

bootstrap().catch((error) => {
  console.error('[Bootstrap] Failed to initialize application:', error);
  const initializingEl = document.getElementById('app-lifecycle-initializing');
  if (initializingEl) {
    initializingEl.style.display = 'none';
  }
  const readyEl = document.getElementById('app-lifecycle-ready');
  if (readyEl) {
    readyEl.style.display = 'none';
  }
  const errorEl = document.getElementById('app-lifecycle-error');
  if (errorEl) {
    errorEl.style.display = 'flex';
    const messageEl = document.getElementById('app-error-message');
    if (messageEl) {
      messageEl.textContent = error.message || String(error);
    }
  }
});
