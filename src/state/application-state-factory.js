/**
 * Stage 2.X — Application State Foundation
 *
 * Minimal, explicit, testable application state container.
 * NO legacy global state. NO window dependencies. NO browser dependencies.
 * Pure factory pattern — each call creates an independent state instance.
 */

const Lifecycle = {
  INITIAL: 'initial',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
};

  const ActionTypes = {
  SET_LIFECYCLE: 'SET_LIFECYCLE',
  SET_INITIALIZATION_ERROR: 'SET_INITIALIZATION_ERROR',
  SET_USER_ID: 'SET_USER_ID',
  SET_USER_PROFILE: 'SET_USER_PROFILE',
  SET_PROFILE_LOADING: 'SET_PROFILE_LOADING',
  SET_PROFILE_ERROR: 'SET_PROFILE_ERROR',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_PRIVACY_MODE: 'SET_PRIVACY_MODE',
  SET_THEME: 'SET_THEME',
  SET_CURRENT_VIEW: 'SET_CURRENT_VIEW',
  SET_SELECTED_ACCOUNT_ID: 'SET_SELECTED_ACCOUNT_ID',
  SET_SELECTED_CATEGORY_ID: 'SET_SELECTED_CATEGORY_ID',
  SET_SELECTED_GOAL_ID: 'SET_SELECTED_GOAL_ID',
  SET_MONTH_KEY: 'SET_MONTH_KEY',
  SET_ACCOUNTS_LOADING: 'SET_ACCOUNTS_LOADING',
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  SET_ACCOUNTS_ERROR: 'SET_ACCOUNTS_ERROR',
  SET_ACCOUNT_FORM: 'SET_ACCOUNT_FORM',
  RESET_ACCOUNT_FORM: 'RESET_ACCOUNT_FORM',
  SET_TRANSACTIONS_LOADING: 'SET_TRANSACTIONS_LOADING',
  SET_TRANSACTIONS: 'SET_TRANSACTIONS',
  SET_TRANSACTIONS_ERROR: 'SET_TRANSACTIONS_ERROR',
  SET_TRANSACTION_FORM: 'SET_TRANSACTION_FORM',
  RESET_TRANSACTION_FORM: 'RESET_TRANSACTION_FORM',
  SET_BUDGETS_LOADING: 'SET_BUDGETS_LOADING',
  SET_BUDGETS: 'SET_BUDGETS',
  SET_BUDGETS_ERROR: 'SET_BUDGETS_ERROR',
  SET_BUDGET_FORM: 'SET_BUDGET_FORM',
  RESET_BUDGET_FORM: 'RESET_BUDGET_FORM',
  SET_GOALS_LOADING: 'SET_GOALS_LOADING',
  SET_GOALS: 'SET_GOALS',
  SET_GOALS_ERROR: 'SET_GOALS_ERROR',
  SET_GOAL_FORM: 'SET_GOAL_FORM',
  RESET_GOAL_FORM: 'RESET_GOAL_FORM',
  SET_GOAL_DEPOSIT_FORM: 'SET_GOAL_DEPOSIT_FORM',
  RESET_GOAL_DEPOSIT_FORM: 'RESET_GOAL_DEPOSIT_FORM',
  SET_CATEGORY_FORM: 'SET_CATEGORY_FORM',
  RESET_CATEGORY_FORM: 'RESET_CATEGORY_FORM',
  SET_PEOPLE_LOADING: 'SET_PEOPLE_LOADING',
  SET_PEOPLE: 'SET_PEOPLE',
  SET_PEOPLE_ERROR: 'SET_PEOPLE_ERROR',
  SET_RECEIVABLES_LOADING: 'SET_RECEIVABLES_LOADING',
  SET_RECEIVABLES: 'SET_RECEIVABLES',
  SET_RECEIVABLES_ERROR: 'SET_RECEIVABLES_ERROR',
  SET_INCOME_PROFILES_LOADING: 'SET_INCOME_PROFILES_LOADING',
  SET_INCOME_PROFILES: 'SET_INCOME_PROFILES',
  SET_INCOME_PROFILES_ERROR: 'SET_INCOME_PROFILES_ERROR',
  SET_SELECTED_INCOME_PROFILE_ID: 'SET_SELECTED_INCOME_PROFILE_ID',
  SET_INCOME_PROFILE_FORM: 'SET_INCOME_PROFILE_FORM',
  RESET_INCOME_PROFILE_FORM: 'RESET_INCOME_PROFILE_FORM',
  SET_RESELLING_PRODUCTS_LOADING: 'SET_RESELLING_PRODUCTS_LOADING',
  SET_RESELLING_PRODUCTS: 'SET_RESELLING_PRODUCTS',
  SET_RESELLING_PRODUCTS_ERROR: 'SET_RESELLING_PRODUCTS_ERROR',
  SET_RESELLING_ORDERS_LOADING: 'SET_RESELLING_ORDERS_LOADING',
  SET_RESELLING_ORDERS: 'SET_RESELLING_ORDERS',
  SET_RESELLING_ORDERS_ERROR: 'SET_RESELLING_ORDERS_ERROR',
  SET_RESELLING_SALES_LOADING: 'SET_RESELLING_SALES_LOADING',
  SET_RESELLING_SALES: 'SET_RESELLING_SALES',
  SET_RESELLING_SALES_ERROR: 'SET_RESELLING_SALES_ERROR',
  SET_RESELLING_COSTS_LOADING: 'SET_RESELLING_COSTS_LOADING',
  SET_RESELLING_COSTS: 'SET_RESELLING_COSTS',
  SET_RESELLING_COSTS_ERROR: 'SET_RESELLING_COSTS_ERROR',
  SET_RESELLING_TASKS_LOADING: 'SET_RESELLING_TASKS_LOADING',
  SET_RESELLING_TASKS: 'SET_RESELLING_TASKS',
  SET_RESELLING_TASKS_ERROR: 'SET_RESELLING_TASKS_ERROR',
  SET_RESELLING_PRODUCT_FORM: 'SET_RESELLING_PRODUCT_FORM',
  RESET_RESELLING_PRODUCT_FORM: 'RESET_RESELLING_PRODUCT_FORM',
  SET_RESELLING_ORDER_FORM: 'SET_RESELLING_ORDER_FORM',
  RESET_RESELLING_ORDER_FORM: 'RESET_RESELLING_ORDER_FORM',
  SET_RESELLING_SALE_FORM: 'SET_RESELLING_SALE_FORM',
  RESET_RESELLING_SALE_FORM: 'RESET_RESELLING_SALE_FORM',
  SET_RESELLING_COST_FORM: 'SET_RESELLING_COST_FORM',
  RESET_RESELLING_COST_FORM: 'RESET_RESELLING_COST_FORM',
  SET_RESELLING_TASK_FORM: 'SET_RESELLING_TASK_FORM',
  RESET_RESELLING_TASK_FORM: 'RESET_RESELLING_TASK_FORM',
  OPERATION_START: 'OPERATION_START',
  OPERATION_STOP: 'OPERATION_STOP',
  OPERATION_ERROR: 'OPERATION_ERROR',
  RESET: 'RESET',
};

function createInitialState() {
  return {
    lifecycle: Lifecycle.INITIAL,
    initializationError: null,
    session: {
      userId: null,
      profile: null,
      profileLoading: false,
      profileError: null,
    },
    ui: {
      activeTab: 'dashboard',
      privacyMode: false,
      theme: 'light',
      currentView: null,
      selectedAccountId: null,
      selectedCategoryId: null,
      selectedGoalId: null,
      monthKey: null,
    },
    accounts: {
      loading: false,
      error: null,
      items: [],
    },
    accountForm: {
      editingId: null,
      name: '',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      openingBalance: undefined,
    },
    transactions: {
      loading: false,
      error: null,
      items: [],
    },
    transactionForm: {
      editingId: null,
      accountId: '',
      amount: '',
      type: 'expense',
      categoryId: '',
      description: '',
      date: '',
      notes: '',
    },
    budgets: {
      loading: false,
      error: null,
      items: [],
    },
    budgetForm: {
      editingId: null,
      categoryId: '',
      amount: '',
      period: 'monthly',
    },
    goals: {
      loading: false,
      error: null,
      items: [],
    },
    goalForm: {
      editingId: null,
      name: '',
      target: '',
      deadline: '',
      icon: '🎯',
      color: '#FF0000',
      priority: 'medium',
    },
    goalDepositForm: {
      amount: '',
      date: new Date().toISOString().slice(0, 10),
    },
    categoryForm: {
      name: '',
      type: 'expense',
      icon: 'circle',
      color: '#888888',
    },
    people: {
      loading: false,
      error: null,
      items: [],
    },
    receivables: {
      loading: false,
      error: null,
      items: [],
    },
    incomeProfiles: {
      loading: false,
      error: null,
      items: [],
      selectedIncomeProfileId: null,
    },
    incomeProfileForm: {
      editingId: null,
      type: '',
      name: '',
      description: '',
    },
    resellingProducts: {
      loading: false,
      error: null,
      items: [],
    },
    resellingOrders: {
      loading: false,
      error: null,
      items: [],
    },
    resellingSales: {
      loading: false,
      error: null,
      items: [],
    },
    resellingCosts: {
      loading: false,
      error: null,
      items: [],
    },
    resellingTasks: {
      loading: false,
      error: null,
      items: [],
    },
    resellingProductForm: {
      editingId: null,
      incomeProfileId: '',
      name: '',
      sku: '',
      platform: '',
      purchasePrice: '',
      plannedSalePrice: '',
      purchaseDate: '',
      quantity: 1,
      location: '',
      notes: '',
      status: 'ordered',
    },
    resellingOrderForm: {
      editingId: null,
      incomeProfileId: '',
      orderNumber: '',
      supplier: '',
      platform: '',
      date: '',
      items: [],
      shipping: 0,
      additionalCosts: 0,
      totalCost: '',
      status: 'ordered',
      tracking: '',
      notes: '',
    },
    resellingSaleForm: {
      editingId: null,
      incomeProfileId: '',
      productId: '',
      quantity: 1,
      salePrice: '',
      platform: '',
      commission: 0,
      shipping: 0,
      otherCosts: 0,
      saleDate: '',
      paymentStatus: 'pending',
      saleStatus: 'sold',
      accountId: '',
      linkedTransactionId: '',
    },
    resellingCostForm: {
      editingId: null,
      incomeProfileId: '',
      amount: '',
      category: 'shipping',
      date: '',
      description: '',
      accountId: '',
      linkedProductId: '',
      linkedSaleId: '',
      linkedOrderId: '',
    },
    resellingTaskForm: {
      editingId: null,
      incomeProfileId: '',
      title: '',
      dueDate: '',
      priority: 'medium',
      status: 'todo',
      linkedProductId: '',
      linkedSaleId: '',
      linkedOrderId: '',
      note: '',
    },
    operations: {},
  };
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

export function createApplicationState() {
  let state = createInitialState();
  const listeners = new Set();

  function getState() {
    return deepClone(state);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('VALIDATION_FAILED');
    }
    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function notify() {
    const snapshot = getState();
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[ApplicationState] listener error:', e);
      }
    }
  }

  function dispatch(action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }

    switch (action.type) {
      case ActionTypes.SET_LIFECYCLE:
        state = { ...state, lifecycle: action.lifecycle };
        break;

      case ActionTypes.SET_INITIALIZATION_ERROR:
        state = { ...state, initializationError: action.error };
        break;

      case ActionTypes.SET_USER_ID:
        state = {
          ...state,
          session: { ...state.session, userId: action.userId },
        };
        break;

      case ActionTypes.SET_USER_PROFILE:
        state = {
          ...state,
          session: {
            ...state.session,
            profile: action.profile ? deepClone(action.profile) : null,
            profileLoading: false,
            profileError: null,
          },
        };
        break;

      case ActionTypes.SET_PROFILE_LOADING:
        state = {
          ...state,
          session: { ...state.session, profileLoading: action.loading },
        };
        break;

      case ActionTypes.SET_PROFILE_ERROR:
        state = {
          ...state,
          session: {
            ...state.session,
            profileLoading: false,
            profileError: action.error,
          },
        };
        break;

      case ActionTypes.SET_ACTIVE_TAB:
        state = {
          ...state,
          ui: { ...state.ui, activeTab: action.tab },
        };
        break;

      case ActionTypes.SET_PRIVACY_MODE:
        state = {
          ...state,
          ui: { ...state.ui, privacyMode: action.enabled },
        };
        break;

      case ActionTypes.SET_THEME:
        state = {
          ...state,
          ui: { ...state.ui, theme: action.theme },
        };
        break;

      case ActionTypes.SET_CURRENT_VIEW:
        state = {
          ...state,
          ui: { ...state.ui, currentView: action.view },
        };
        break;

      case ActionTypes.SET_SELECTED_ACCOUNT_ID:
        state = {
          ...state,
          ui: { ...state.ui, selectedAccountId: action.accountId },
        };
        break;

      case ActionTypes.SET_SELECTED_CATEGORY_ID:
        state = {
          ...state,
          ui: { ...state.ui, selectedCategoryId: action.categoryId },
        };
        break;

      case ActionTypes.SET_SELECTED_GOAL_ID:
        state = {
          ...state,
          ui: { ...state.ui, selectedGoalId: action.goalId },
        };
        break;

      case ActionTypes.SET_MONTH_KEY:
        state = {
          ...state,
          ui: { ...state.ui, monthKey: action.monthKey },
        };
        break;

      case ActionTypes.SET_ACCOUNTS_LOADING:
        state = {
          ...state,
          accounts: { ...state.accounts, loading: action.loading },
        };
        break;

      case ActionTypes.SET_ACCOUNTS:
        state = {
          ...state,
          accounts: { ...state.accounts, items: action.accounts, error: null },
        };
        break;

      case ActionTypes.SET_ACCOUNTS_ERROR:
        state = {
          ...state,
          accounts: { ...state.accounts, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_ACCOUNT_FORM:
        state = {
          ...state,
          accountForm: { ...state.accountForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_ACCOUNT_FORM:
        state = {
          ...state,
          accountForm: {
            editingId: null,
            name: '',
            type: 'bank',
            icon: 'landmark',
            color: '#0000FF',
            openingBalance: undefined,
          },
        };
        break;

      case ActionTypes.SET_TRANSACTIONS_LOADING:
        state = {
          ...state,
          transactions: { ...state.transactions, loading: action.loading },
        };
        break;

      case ActionTypes.SET_TRANSACTIONS:
        state = {
          ...state,
          transactions: { ...state.transactions, items: action.transactions, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_TRANSACTIONS_ERROR:
        state = {
          ...state,
          transactions: { ...state.transactions, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_TRANSACTION_FORM:
        state = {
          ...state,
          transactionForm: { ...state.transactionForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_TRANSACTION_FORM:
        state = {
          ...state,
          transactionForm: {
            editingId: null,
            accountId: '',
            amount: '',
            type: 'expense',
            categoryId: '',
            description: '',
            date: '',
            notes: '',
          },
        };
        break;

      case ActionTypes.SET_BUDGETS_LOADING:
        state = {
          ...state,
          budgets: { ...state.budgets, loading: action.loading },
        };
        break;

      case ActionTypes.SET_BUDGETS:
        state = {
          ...state,
          budgets: { ...state.budgets, items: action.budgets, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_BUDGETS_ERROR:
        state = {
          ...state,
          budgets: { ...state.budgets, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_BUDGET_FORM:
        state = {
          ...state,
          budgetForm: { ...state.budgetForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_BUDGET_FORM:
        state = {
          ...state,
          budgetForm: {
            editingId: null,
            categoryId: '',
            amount: '',
            period: 'monthly',
          },
        };
        break;

      case ActionTypes.SET_GOALS_LOADING:
        state = {
          ...state,
          goals: { ...state.goals, loading: action.loading },
        };
        break;

      case ActionTypes.SET_GOALS:
        state = {
          ...state,
          goals: { ...state.goals, items: action.goals, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_GOALS_ERROR:
        state = {
          ...state,
          goals: { ...state.goals, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_GOAL_FORM:
        state = {
          ...state,
          goalForm: { ...state.goalForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_GOAL_FORM:
        state = {
          ...state,
          goalForm: {
            editingId: null,
            name: '',
            target: '',
            deadline: '',
            icon: '🎯',
            color: '#FF0000',
            priority: 'medium',
          },
        };
        break;

      case ActionTypes.SET_GOAL_DEPOSIT_FORM:
        state = {
          ...state,
          goalDepositForm: { ...state.goalDepositForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_GOAL_DEPOSIT_FORM:
        state = {
          ...state,
          goalDepositForm: {
            amount: '',
            date: new Date().toISOString().slice(0, 10),
          },
        };
        break;

      case ActionTypes.SET_CATEGORY_FORM:
        state = {
          ...state,
          categoryForm: { ...state.categoryForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_CATEGORY_FORM:
        state = {
          ...state,
          categoryForm: {
            name: '',
            type: 'expense',
            icon: 'circle',
            color: '#888888',
          },
        };
        break;

      case ActionTypes.SET_PEOPLE_LOADING:
        state = {
          ...state,
          people: { ...state.people, loading: action.loading },
        };
        break;

      case ActionTypes.SET_PEOPLE:
        state = {
          ...state,
          people: { ...state.people, items: action.people, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_PEOPLE_ERROR:
        state = {
          ...state,
          people: { ...state.people, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_RECEIVABLES_LOADING:
        state = {
          ...state,
          receivables: { ...state.receivables, loading: action.loading },
        };
        break;

      case ActionTypes.SET_RECEIVABLES:
        state = {
          ...state,
          receivables: { ...state.receivables, items: action.receivables, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_RECEIVABLES_ERROR:
        state = {
          ...state,
          receivables: { ...state.receivables, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_INCOME_PROFILES_LOADING:
        state = {
          ...state,
          incomeProfiles: { ...state.incomeProfiles, loading: action.loading },
        };
        break;

      case ActionTypes.SET_INCOME_PROFILES:
        state = {
          ...state,
          incomeProfiles: { ...state.incomeProfiles, items: action.profiles, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_INCOME_PROFILES_ERROR:
        state = {
          ...state,
          incomeProfiles: { ...state.incomeProfiles, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_SELECTED_INCOME_PROFILE_ID:
        state = {
          ...state,
          incomeProfiles: { ...state.incomeProfiles, selectedIncomeProfileId: action.profileId },
        };
        break;

      case ActionTypes.SET_INCOME_PROFILE_FORM:
        state = {
          ...state,
          incomeProfileForm: { ...state.incomeProfileForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_INCOME_PROFILE_FORM:
        state = {
          ...state,
          incomeProfileForm: {
            editingId: null,
            type: '',
            name: '',
            description: '',
          },
        };
        break;

      case ActionTypes.SET_RESELLING_PRODUCTS_LOADING:
        state = {
          ...state,
          resellingProducts: { ...state.resellingProducts, loading: action.loading },
        };
        break;

      case ActionTypes.SET_RESELLING_PRODUCTS:
        state = {
          ...state,
          resellingProducts: { ...state.resellingProducts, items: action.products, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_PRODUCTS_ERROR:
        state = {
          ...state,
          resellingProducts: { ...state.resellingProducts, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_ORDERS_LOADING:
        state = {
          ...state,
          resellingOrders: { ...state.resellingOrders, loading: action.loading },
        };
        break;

      case ActionTypes.SET_RESELLING_ORDERS:
        state = {
          ...state,
          resellingOrders: { ...state.resellingOrders, items: action.orders, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_ORDERS_ERROR:
        state = {
          ...state,
          resellingOrders: { ...state.resellingOrders, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_SALES_LOADING:
        state = {
          ...state,
          resellingSales: { ...state.resellingSales, loading: action.loading },
        };
        break;

      case ActionTypes.SET_RESELLING_SALES:
        state = {
          ...state,
          resellingSales: { ...state.resellingSales, items: action.sales, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_SALES_ERROR:
        state = {
          ...state,
          resellingSales: { ...state.resellingSales, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_COSTS_LOADING:
        state = {
          ...state,
          resellingCosts: { ...state.resellingCosts, loading: action.loading },
        };
        break;

      case ActionTypes.SET_RESELLING_COSTS:
        state = {
          ...state,
          resellingCosts: { ...state.resellingCosts, items: action.costs, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_COSTS_ERROR:
        state = {
          ...state,
          resellingCosts: { ...state.resellingCosts, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_TASKS_LOADING:
        state = {
          ...state,
          resellingTasks: { ...state.resellingTasks, loading: action.loading },
        };
        break;

      case ActionTypes.SET_RESELLING_TASKS:
        state = {
          ...state,
          resellingTasks: { ...state.resellingTasks, items: action.tasks, error: null, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_TASKS_ERROR:
        state = {
          ...state,
          resellingTasks: { ...state.resellingTasks, error: action.error, loading: false },
        };
        break;

      case ActionTypes.SET_RESELLING_PRODUCT_FORM:
        state = {
          ...state,
          resellingProductForm: { ...state.resellingProductForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_RESELLING_PRODUCT_FORM:
        state = {
          ...state,
          resellingProductForm: {
            editingId: null,
            incomeProfileId: '',
            name: '',
            sku: '',
            platform: '',
            purchasePrice: '',
            plannedSalePrice: '',
            purchaseDate: '',
            quantity: 1,
            location: '',
            notes: '',
            status: 'ordered',
          },
        };
        break;

      case ActionTypes.SET_RESELLING_ORDER_FORM:
        state = {
          ...state,
          resellingOrderForm: { ...state.resellingOrderForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_RESELLING_ORDER_FORM:
        state = {
          ...state,
          resellingOrderForm: {
            editingId: null,
            incomeProfileId: '',
            orderNumber: '',
            supplier: '',
            platform: '',
            date: '',
            items: [],
            shipping: 0,
            additionalCosts: 0,
            totalCost: '',
            status: 'ordered',
            tracking: '',
            notes: '',
          },
        };
        break;

      case ActionTypes.SET_RESELLING_SALE_FORM:
        state = {
          ...state,
          resellingSaleForm: { ...state.resellingSaleForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_RESELLING_SALE_FORM:
        state = {
          ...state,
          resellingSaleForm: {
            editingId: null,
            incomeProfileId: '',
            productId: '',
            quantity: 1,
            salePrice: '',
            platform: '',
            commission: 0,
            shipping: 0,
            otherCosts: 0,
            saleDate: '',
            paymentStatus: 'pending',
            saleStatus: 'sold',
            accountId: '',
            linkedTransactionId: '',
          },
        };
        break;

      case ActionTypes.SET_RESELLING_COST_FORM:
        state = {
          ...state,
          resellingCostForm: { ...state.resellingCostForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_RESELLING_COST_FORM:
        state = {
          ...state,
          resellingCostForm: {
            editingId: null,
            incomeProfileId: '',
            amount: '',
            category: 'shipping',
            date: '',
            description: '',
            accountId: '',
            linkedProductId: '',
            linkedSaleId: '',
            linkedOrderId: '',
          },
        };
        break;

      case ActionTypes.SET_RESELLING_TASK_FORM:
        state = {
          ...state,
          resellingTaskForm: { ...state.resellingTaskForm, ...action.form },
        };
        break;

      case ActionTypes.RESET_RESELLING_TASK_FORM:
        state = {
          ...state,
          resellingTaskForm: {
            editingId: null,
            incomeProfileId: '',
            title: '',
            dueDate: '',
            priority: 'medium',
            status: 'todo',
            linkedProductId: '',
            linkedSaleId: '',
            linkedOrderId: '',
            note: '',
          },
        };
        break;

      case ActionTypes.OPERATION_START: {
        const operations = { ...state.operations };
        operations[action.key] = { loading: true, error: null };
        state = { ...state, operations };
        break;
      }

      case ActionTypes.OPERATION_STOP: {
        const operations = { ...state.operations };
        delete operations[action.key];
        state = { ...state, operations };
        break;
      }

      case ActionTypes.OPERATION_ERROR: {
        const operations = { ...state.operations };
        operations[action.key] = { loading: false, error: action.error };
        state = { ...state, operations };
        break;
      }

      case ActionTypes.RESET:
        state = createInitialState();
        break;

      default:
        throw new Error('VALIDATION_FAILED');
    }

    notify();
  }

  return { getState, subscribe, dispatch, ActionTypes };
}
