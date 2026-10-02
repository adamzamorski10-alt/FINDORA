import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationState } from '../../src/state/application-state-factory.js';

describe('ApplicationState', () => {
  describe('construction', () => {
    it('creates an independent state instance', () => {
      const stateA = createApplicationState();
      const stateB = createApplicationState();
      assert.ok(stateA);
      assert.ok(stateB);
      assert.notStrictEqual(stateA, stateB);
    });

    it('does not share internal state between instances', () => {
      const stateA = createApplicationState();
      const stateB = createApplicationState();
      stateA.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'ready' });
      const snapshotB = stateB.getState();
      assert.strictEqual(snapshotB.lifecycle, 'initial');
    });
  });

  describe('initial state', () => {
    it('returns correct initial state defaults', () => {
      const state = createApplicationState();
      const snapshot = state.getState();

      assert.strictEqual(snapshot.lifecycle, 'initial');
      assert.strictEqual(snapshot.initializationError, null);
      assert.strictEqual(snapshot.session.userId, null);
      assert.strictEqual(snapshot.session.profile, null);
      assert.strictEqual(snapshot.session.profileLoading, false);
      assert.strictEqual(snapshot.session.profileError, null);
      assert.strictEqual(snapshot.ui.activeTab, 'dashboard');
      assert.strictEqual(snapshot.ui.privacyMode, false);
      assert.strictEqual(snapshot.ui.theme, 'light');
      assert.strictEqual(snapshot.ui.currentView, null);
      assert.strictEqual(snapshot.ui.selectedAccountId, null);
      assert.strictEqual(snapshot.ui.selectedCategoryId, null);
      assert.strictEqual(snapshot.ui.selectedGoalId, null);
      assert.strictEqual(snapshot.ui.monthKey, null);
      assert.deepStrictEqual(snapshot.operations, {});
      assert.deepStrictEqual(snapshot.people, { loading: false, error: null, items: [] });
      assert.deepStrictEqual(snapshot.receivables, { loading: false, error: null, items: [] });
    });
  });

  describe('subscribe', () => {
    it('notifies subscriber on state change', () => {
      const state = createApplicationState();
      let received = null;
      state.subscribe((snapshot) => {
        received = snapshot;
      });
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'stats' });
      assert.strictEqual(received.ui.activeTab, 'stats');
    });

    it('returns unsubscribe function', () => {
      const state = createApplicationState();
      let count = 0;
      const cb = () => { count++; };
      const unsub = state.subscribe(cb);
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'stats' });
      assert.strictEqual(count, 1);
      unsub();
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'home' });
      assert.strictEqual(count, 1);
    });

    it('supports multiple subscribers', () => {
      const state = createApplicationState();
      const values = [];
      state.subscribe((s) => values.push(s.ui.activeTab));
      state.subscribe((s) => values.push(s.ui.activeTab));
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'stats' });
      assert.deepStrictEqual(values, ['stats', 'stats']);
    });

    it('notifies in deterministic subscription order', () => {
      const state = createApplicationState();
      const order = [];
      state.subscribe(() => order.push('first'));
      state.subscribe(() => order.push('second'));
      state.subscribe(() => order.push('third'));
      state.dispatch({ type: 'RESET' });
      assert.deepStrictEqual(order, ['first', 'second', 'third']);
    });

    it('handles listener errors without breaking other listeners', () => {
      const state = createApplicationState();
      const errors = [];
      const originalError = console.error;
      console.error = (...args) => { errors.push(args.join(' ')); };

      let received = null;
      state.subscribe(() => { received = 'ok'; });
      state.subscribe(() => { throw new Error('listener error'); });
      state.subscribe(() => { received = 'third'; });

      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'stats' });
      console.error = originalError;

      assert.ok(errors.some((e) => e.includes('listener error')));
      assert.strictEqual(received, 'third');
    });
  });

  describe('dispatch', () => {
    it('throws VALIDATION_FAILED for null action', () => {
      const state = createApplicationState();
      let thrown = false;
      try {
        state.dispatch(null);
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for action without type', () => {
      const state = createApplicationState();
      let thrown = false;
      try {
        state.dispatch({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for unknown action type', () => {
      const state = createApplicationState();
      let thrown = false;
      try {
        state.dispatch({ type: 'UNKNOWN_ACTION' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('does not mutate previous getState snapshots', () => {
      const state = createApplicationState();
      const before = state.getState();
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'stats' });
      assert.strictEqual(before.ui.activeTab, 'dashboard');
    });
  });

  describe('lifecycle', () => {
    it('transitions through lifecycle states', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'initializing' });
      assert.strictEqual(state.getState().lifecycle, 'initializing');
      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'ready' });
      assert.strictEqual(state.getState().lifecycle, 'ready');
      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'error' });
      assert.strictEqual(state.getState().lifecycle, 'error');
    });

    it('stores initialization error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_INITIALIZATION_ERROR', error: 'boom' });
      assert.strictEqual(state.getState().initializationError, 'boom');
    });
  });

  describe('session', () => {
    it('sets user id', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_USER_ID', userId: 'user-1' });
      assert.strictEqual(state.getState().session.userId, 'user-1');
    });

    it('sets user profile', () => {
      const state = createApplicationState();
      const profile = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
      state.dispatch({ type: 'SET_USER_PROFILE', profile });
      const snapshot = state.getState();
      assert.deepStrictEqual(snapshot.session.profile, profile);
      assert.strictEqual(snapshot.session.profileLoading, false);
      assert.strictEqual(snapshot.session.profileError, null);
    });

    it('clears user profile when null is provided', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_USER_PROFILE', profile: { id: 'user-1' } });
      state.dispatch({ type: 'SET_USER_PROFILE', profile: null });
      assert.strictEqual(state.getState().session.profile, null);
    });

    it('does not allow external mutation of cached profile', () => {
      const state = createApplicationState();
      const profile = { id: 'user-1', name: 'Alice' };
      state.dispatch({ type: 'SET_USER_PROFILE', profile });
      const snapshot = state.getState();
      snapshot.session.profile.name = 'mutated';
      assert.strictEqual(state.getState().session.profile.name, 'Alice');
    });

    it('tracks profile loading state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_PROFILE_LOADING', loading: true });
      assert.strictEqual(state.getState().session.profileLoading, true);
      state.dispatch({ type: 'SET_USER_PROFILE', profile: { id: 'user-1' } });
      assert.strictEqual(state.getState().session.profileLoading, false);
    });

    it('tracks profile error state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_PROFILE_ERROR', error: 'network' });
      assert.strictEqual(state.getState().session.profileLoading, false);
      assert.strictEqual(state.getState().session.profileError, 'network');
    });
  });

  describe('ui', () => {
    it('updates active tab', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'budget' });
      assert.strictEqual(state.getState().ui.activeTab, 'budget');
    });

    it('updates privacy mode', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_PRIVACY_MODE', enabled: true });
      assert.strictEqual(state.getState().ui.privacyMode, true);
    });

    it('updates theme', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_THEME', theme: 'dark' });
      assert.strictEqual(state.getState().ui.theme, 'dark');
    });

    it('updates current view', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_CURRENT_VIEW', view: 'account-detail' });
      assert.strictEqual(state.getState().ui.currentView, 'account-detail');
    });

    it('updates selected account id', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', accountId: 'acc-1' });
      assert.strictEqual(state.getState().ui.selectedAccountId, 'acc-1');
    });

    it('updates selected category id', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_SELECTED_CATEGORY_ID', categoryId: 'cat-1' });
      assert.strictEqual(state.getState().ui.selectedCategoryId, 'cat-1');
    });

    it('updates selected goal id', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_SELECTED_GOAL_ID', goalId: 'goal-1' });
      assert.strictEqual(state.getState().ui.selectedGoalId, 'goal-1');
    });

    it('updates month key filter', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_MONTH_KEY', monthKey: '2026-09' });
      assert.strictEqual(state.getState().ui.monthKey, '2026-09');
    });
  });

  describe('operations', () => {
    it('tracks pending operations', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'OPERATION_START', key: 'createAccount' });
      assert.strictEqual(state.getState().operations.createAccount.loading, true);
      assert.strictEqual(state.getState().operations.createAccount.error, null);
    });

    it('clears pending operations on stop', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'OPERATION_START', key: 'createAccount' });
      state.dispatch({ type: 'OPERATION_STOP', key: 'createAccount' });
      assert.strictEqual(state.getState().operations.createAccount, undefined);
    });

    it('stores operation error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'OPERATION_START', key: 'createAccount' });
      state.dispatch({ type: 'OPERATION_ERROR', key: 'createAccount', error: 'STORAGE_UNAVAILABLE' });
      const op = state.getState().operations.createAccount;
      assert.strictEqual(op.loading, false);
      assert.strictEqual(op.error, 'STORAGE_UNAVAILABLE');
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'ready' });
      state.dispatch({ type: 'SET_USER_ID', userId: 'user-1' });
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: 'stats' });
      state.dispatch({ type: 'SET_PRIVACY_MODE', enabled: true });
      state.dispatch({ type: 'OPERATION_START', key: 'op' });

      state.dispatch({ type: 'RESET' });
      const snapshot = state.getState();
      assert.strictEqual(snapshot.lifecycle, 'initial');
      assert.strictEqual(snapshot.session.userId, null);
      assert.strictEqual(snapshot.ui.activeTab, 'dashboard');
      assert.strictEqual(snapshot.ui.privacyMode, false);
      assert.strictEqual(snapshot.operations.op, undefined);
    });
  });

  describe('transactions', () => {
    it('has empty initial transactions slice', () => {
      const state = createApplicationState();
      const snapshot = state.getState();
      assert.deepStrictEqual(snapshot.transactions, { loading: false, error: null, items: [] });
      assert.deepStrictEqual(snapshot.transactionForm, {
        editingId: null,
        accountId: '',
        amount: '',
        type: 'expense',
        categoryId: '',
        description: '',
        date: '',
        notes: '',
      });
    });

    it('tracks transactions loading state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_TRANSACTIONS_LOADING', loading: true });
      assert.strictEqual(state.getState().transactions.loading, true);
      state.dispatch({ type: 'SET_TRANSACTIONS', transactions: [{ id: 'tx-1' }] });
      assert.strictEqual(state.getState().transactions.loading, false);
    });

    it('stores transactions', () => {
      const state = createApplicationState();
      const txs = [{ id: 'tx-1', amount: 10 }];
      state.dispatch({ type: 'SET_TRANSACTIONS', transactions: txs });
      assert.deepStrictEqual(state.getState().transactions.items, txs);
      assert.strictEqual(state.getState().transactions.error, null);
    });

    it('stores transactions error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_TRANSACTIONS_ERROR', error: 'network' });
      assert.strictEqual(state.getState().transactions.error, 'network');
      assert.strictEqual(state.getState().transactions.loading, false);
    });

    it('updates transaction form fields', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { amount: '50', type: 'income' } });
      const form = state.getState().transactionForm;
      assert.strictEqual(form.amount, '50');
      assert.strictEqual(form.type, 'income');
      assert.strictEqual(form.accountId, '');
    });

    it('resets transaction form', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { amount: '50', description: 'lunch' } });
      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
      const form = state.getState().transactionForm;
      assert.strictEqual(form.amount, '');
      assert.strictEqual(form.description, '');
      assert.strictEqual(form.type, 'expense');
    });
  });

  describe('budgets', () => {
    it('has empty initial budgets slice', () => {
      const state = createApplicationState();
      const snapshot = state.getState();
      assert.deepStrictEqual(snapshot.budgets, { loading: false, error: null, items: [] });
      assert.deepStrictEqual(snapshot.budgetForm, {
        editingId: null,
        categoryId: '',
        amount: '',
        period: 'monthly',
      });
    });

    it('tracks budgets loading state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_BUDGETS_LOADING', loading: true });
      assert.strictEqual(state.getState().budgets.loading, true);
      state.dispatch({ type: 'SET_BUDGETS', budgets: [{ id: 'b-1' }] });
      assert.strictEqual(state.getState().budgets.loading, false);
    });

    it('stores budgets', () => {
      const state = createApplicationState();
      const budgets = [{ id: 'b-1', amount: 500 }];
      state.dispatch({ type: 'SET_BUDGETS', budgets });
      assert.deepStrictEqual(state.getState().budgets.items, budgets);
      assert.strictEqual(state.getState().budgets.error, null);
    });

    it('stores budgets error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_BUDGETS_ERROR', error: 'network' });
      assert.strictEqual(state.getState().budgets.error, 'network');
      assert.strictEqual(state.getState().budgets.loading, false);
    });

    it('updates budget form fields', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_BUDGET_FORM', form: { amount: '500', period: 'weekly' } });
      const form = state.getState().budgetForm;
      assert.strictEqual(form.amount, '500');
      assert.strictEqual(form.period, 'weekly');
    });

    it('resets budget form', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_BUDGET_FORM', form: { amount: '500' } });
      state.dispatch({ type: 'RESET_BUDGET_FORM' });
      const form = state.getState().budgetForm;
      assert.strictEqual(form.amount, '');
      assert.strictEqual(form.period, 'monthly');
    });
  });

  describe('goals', () => {
    it('has empty initial goals slice', () => {
      const state = createApplicationState();
      const snapshot = state.getState();
      assert.deepStrictEqual(snapshot.goals, { loading: false, error: null, items: [] });
      assert.deepStrictEqual(snapshot.goalForm, {
        editingId: null,
        name: '',
        target: '',
        deadline: '',
        icon: '🎯',
        color: '#FF0000',
        priority: 'medium',
      });
    });

    it('tracks goals loading state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_GOALS_LOADING', loading: true });
      assert.strictEqual(state.getState().goals.loading, true);
      state.dispatch({ type: 'SET_GOALS', goals: [{ id: 'g-1' }] });
      assert.strictEqual(state.getState().goals.loading, false);
    });

    it('stores goals', () => {
      const state = createApplicationState();
      const goals = [{ id: 'g-1', name: 'Vacation', target: 1000 }];
      state.dispatch({ type: 'SET_GOALS', goals });
      assert.deepStrictEqual(state.getState().goals.items, goals);
      assert.strictEqual(state.getState().goals.error, null);
    });

    it('stores goals error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_GOALS_ERROR', error: 'network' });
      assert.strictEqual(state.getState().goals.error, 'network');
      assert.strictEqual(state.getState().goals.loading, false);
    });

    it('updates goal form fields', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_GOAL_FORM', form: { name: 'Trip', target: '2000' } });
      const form = state.getState().goalForm;
      assert.strictEqual(form.name, 'Trip');
      assert.strictEqual(form.target, '2000');
    });

    it('resets goal form', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_GOAL_FORM', form: { name: 'Trip', target: '2000' } });
      state.dispatch({ type: 'RESET_GOAL_FORM' });
      const form = state.getState().goalForm;
      assert.strictEqual(form.name, '');
      assert.strictEqual(form.target, '');
      assert.strictEqual(form.priority, 'medium');
    });

    it('tracks people loading state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_PEOPLE_LOADING', loading: true });
      assert.strictEqual(state.getState().people.loading, true);
      state.dispatch({ type: 'SET_PEOPLE', people: [{ id: 'person-1' }] });
      assert.strictEqual(state.getState().people.loading, false);
    });

    it('stores people', () => {
      const state = createApplicationState();
      const people = [{ id: 'person-1', name: 'Jan' }];
      state.dispatch({ type: 'SET_PEOPLE', people });
      assert.deepStrictEqual(state.getState().people.items, people);
      assert.strictEqual(state.getState().people.error, null);
    });

    it('stores people error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_PEOPLE_ERROR', error: 'network' });
      assert.strictEqual(state.getState().people.error, 'network');
      assert.strictEqual(state.getState().people.loading, false);
    });

    it('tracks receivables loading state', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_RECEIVABLES_LOADING', loading: true });
      assert.strictEqual(state.getState().receivables.loading, true);
      state.dispatch({ type: 'SET_RECEIVABLES', receivables: [{ id: 'r-1' }] });
      assert.strictEqual(state.getState().receivables.loading, false);
    });

    it('stores receivables', () => {
      const state = createApplicationState();
      const receivables = [{ id: 'r-1', description: 'Test' }];
      state.dispatch({ type: 'SET_RECEIVABLES', receivables });
      assert.deepStrictEqual(state.getState().receivables.items, receivables);
      assert.strictEqual(state.getState().receivables.error, null);
    });

    it('stores receivables error', () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_RECEIVABLES_ERROR', error: 'network' });
      assert.strictEqual(state.getState().receivables.error, 'network');
      assert.strictEqual(state.getState().receivables.loading, false);
    });

    describe('incomeProfiles selectedIncomeProfileId', () => {
      it('defaults selectedIncomeProfileId to null', () => {
        const state = createApplicationState();
        assert.strictEqual(state.getState().incomeProfiles.selectedIncomeProfileId, null);
      });

      it('sets selectedIncomeProfileId via dispatch', () => {
        const state = createApplicationState();
        state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: 'profile-123' });
        assert.strictEqual(state.getState().incomeProfiles.selectedIncomeProfileId, 'profile-123');
      });

      it('overwrites selectedIncomeProfileId on subsequent dispatch', () => {
        const state = createApplicationState();
        state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: 'profile-a' });
        state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: 'profile-b' });
        assert.strictEqual(state.getState().incomeProfiles.selectedIncomeProfileId, 'profile-b');
      });

      it('clears selectedIncomeProfileId when set to null', () => {
        const state = createApplicationState();
        state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: 'profile-1' });
        state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: null });
        assert.strictEqual(state.getState().incomeProfiles.selectedIncomeProfileId, null);
      });

      it('preserves incomeProfiles items when setting selectedIncomeProfileId', () => {
        const state = createApplicationState();
        const profiles = [{ id: 'p1', name: 'Vinted' }];
        state.dispatch({ type: 'SET_INCOME_PROFILES', profiles });
        state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: 'p1' });
        const snap = state.getState();
        assert.strictEqual(snap.incomeProfiles.selectedIncomeProfileId, 'p1');
        assert.deepStrictEqual(snap.incomeProfiles.items, profiles);
      });
    });
  });
});
