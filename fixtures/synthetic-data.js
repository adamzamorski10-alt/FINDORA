/**
 * Stage 0.3 — Synthetic fixtures for backup/restore tests.
 *
 * All data is synthetic. No real user data is used.
 */

const { v4: uuidv4 } = require('uuid');

function createTransaction(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    type: overrides.type || 'expense',
    category: overrides.category || 'food',
    amount: overrides.amount || 23.50,
    place: overrides.place || 'konto',
    desc: overrides.desc || 'Zakupy Biedronka',
    date: overrides.date || '2026-09-05',
    createdAt: overrides.createdAt || Date.now(),
    _excluded: overrides._excluded || false,
    _transfer: overrides._transfer || false,
    _autoSave: overrides._autoSave || false,
    _autoSaveDest: overrides._autoSaveDest || null,
    _debtRepay: overrides._debtRepay || null,
    _debtGeneralRepay: overrides._debtGeneralRepay || null,
    _debtBulkRepay: overrides._debtBulkRepay || null,
    ...overrides
  };
}

function createDebtor(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Jan Kowalski',
    debts: overrides.debts || [
      {
        id: overrides.debtId || uuidv4(),
        desc: overrides.debtDesc || 'Pożyczka na wakacje',
        amount: overrides.debtAmount || 500,
        date: overrides.debtDate || '2026-08-15',
        paid: overrides.debtPaid || false,
        paidAt: overrides.debtPaidAt || null,
        paidDate: overrides.debtPaidDate || null,
        paidPlace: overrides.debtPaidPlace || null,
        source: overrides.debtSource || 'konto',
        history: overrides.debtHistory || [],
        repayments: overrides.debtRepayments || [],
        lastEditedBy: overrides.lastEditedBy || 'System',
        lastModifiedBy: overrides.lastModifiedBy || 'System',
        lastModifiedAt: overrides.lastModifiedAt || Date.now()
      }
    ],
    shareSettings: overrides.shareSettings || { allowEdit: false, accessCode: 'abc123' },
    activityLog: overrides.activityLog || [],
    ...overrides
  };
}

function createBudget(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    category: overrides.category || 'food',
    limit: overrides.limit || 1000,
    ...overrides
  };
}

function createGoal(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Nowy laptop',
    target: overrides.target || 5000,
    current: overrides.current || 1200,
    deadline: overrides.deadline || '2026-12-31',
    icon: overrides.icon || 'laptop',
    color: overrides.color || '#6366f1',
    autoSave: overrides.autoSave || null,
    deposits: overrides.deposits || [],
    ...overrides
  };
}

function createReminder(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    title: overrides.title || 'Rachunek za prąd',
    amount: overrides.amount || 150,
    day: overrides.day || '2026-09-10',
    repeat: overrides.repeat || true,
    done: overrides.done || false,
    ...overrides
  };
}

function createTransfer(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    from: overrides.from || 'konto',
    to: overrides.to || 'skarbonka',
    amount: overrides.amount || 500,
    desc: overrides.desc || 'Przelew na oszczędności',
    date: overrides.date || '2026-09-01',
    ...overrides
  };
}

function createIncomeSource(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Strona internetowa',
    icon: overrides.icon || 'monitor',
    color: overrides.color || '#6366f1',
    _profileType: overrides._profileType || 'strony',
    ...overrides
  };
}

function createTemplate(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Standardowe zakupy',
    type: overrides.type || 'expense',
    amount: overrides.amount || 100,
    category: overrides.category || 'food',
    place: overrides.place || 'konto',
    desc: overrides.desc || 'Zakupy spożywcze',
    ...overrides
  };
}

function createRecurring(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Netflix',
    type: overrides.type || 'expense',
    amount: overrides.amount || 45,
    category: overrides.category || 'subscription',
    place: overrides.place || 'konto',
    desc: overrides.desc || 'Abonament Netflix',
    freq: overrides.freq || 'monthly',
    dayOfMonth: overrides.dayOfMonth || 5,
    nextDate: overrides.nextDate || '2026-09-05',
    active: overrides.active !== undefined ? overrides.active : true,
    lastBooked: overrides.lastBooked || null,
    isSubscription: overrides.isSubscription !== undefined ? overrides.isSubscription : true,
    subscriptionGroup: overrides.subscriptionGroup || null,
    ...overrides
  };
}

function createCreditor(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Bank PKO',
    icon: overrides.icon || 'landmark',
    loans: overrides.loans || [
      {
        id: overrides.loanId || uuidv4(),
        desc: overrides.loanDesc || 'Pożyczka gotówkowa',
        amount: overrides.loanAmount || 10000,
        date: overrides.loanDate || '2026-01-15',
        due: overrides.loanDue || '2027-01-15',
        dest: overrides.loanDest || 'konto',
        interest: overrides.loanInterest || 5.5,
        paid: overrides.loanPaid || false,
        repayments: overrides.loanRepayments || [],
        history: overrides.loanHistory || []
      }
    ],
    ...overrides
  };
}

function createAutoSaveRule(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    sourceId: overrides.sourceId || null,
    pct: overrides.pct || 10,
    dest: overrides.dest || 'skarbonka',
    label: overrides.label || 'Auto-oszczędzanie',
    active: overrides.active !== undefined ? overrides.active : true,
    ...overrides
  };
}

function createStronaProduct(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Landing page',
    price: overrides.price || 2500,
    desc: overrides.desc || 'Strona wizytówkowa',
    category: overrides.category || 'strona',
    avgTime: overrides.avgTime || 7,
    notes: overrides.notes || '',
    ...overrides
  };
}

function createResaleProduct(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Bluza Nike',
    buyPrice: overrides.buyPrice || 50,
    weight: overrides.weight || 0.5,
    link: overrides.link || 'https://example.com',
    notes: overrides.notes || '',
    minStockAlert: overrides.minStockAlert || 2,
    ...overrides
  };
}

function createResaleSale(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    productId: overrides.productId || uuidv4(),
    price: overrides.price || 120,
    date: overrides.date || '2026-09-05',
    status: overrides.status || 'sold',
    soldAt: overrides.soldAt || Date.now(),
    shippedAt: overrides.shippedAt || null,
    ...overrides
  };
}

function createResaleTask(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    title: overrides.title || 'Wysłać paczkę',
    type: overrides.type || 'shipping',
    dueDate: overrides.dueDate || '2026-09-06',
    productId: overrides.productId || null,
    done: overrides.done || false,
    createdAt: overrides.createdAt || Date.now(),
    ...overrides
  };
}

function createResaleShipment(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Paczka 1',
    items: overrides.items || [{ productId: uuidv4(), qty: 2 }],
    createdAt: overrides.createdAt || Date.now(),
    ordered: overrides.ordered || false,
    orderedAt: overrides.orderedAt || null,
    deliveryDays: overrides.deliveryDays || 30,
    deliveredAt: overrides.deliveredAt || null,
    ...overrides
  };
}

function createResaleEvent(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    at: overrides.at || new Date().toISOString(),
    type: overrides.type || 'sale',
    entity: overrides.entity || 'sale',
    entityId: overrides.entityId || uuidv4(),
    meta: overrides.meta || {},
    ...overrides
  };
}

function createResaleSettings(overrides = {}) {
  return {
    staleThresholdDays: overrides.staleThresholdDays || 30,
    defaultMinStockAlert: overrides.defaultMinStockAlert || 2,
    shipPerKg: overrides.shipPerKg || 65,
    platformCommissions: overrides.platformCommissions || {
      vinted: 0,
      allegro: 10,
      olx: 0,
      ebay: 10,
      facebook: 0,
      inne: 0
    },
    ...overrides
  };
}

function createGieldaOp(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    type: overrides.type || 'wplata',
    name: overrides.name || 'Akcje Tesla',
    amount: overrides.amount || 1000,
    date: overrides.date || '2026-09-05',
    ...overrides
  };
}

function createStronaClient(overrides = {}) {
  return {
    id: overrides.id || uuidv4(),
    name: overrides.name || 'Firma XYZ',
    email: overrides.email || 'kontakt@xyz.pl',
    phone: overrides.phone || '+48123456789',
    industry: overrides.industry || 'IT',
    address: overrides.address || 'ul. Testowa 1, Warszawa',
    hasWebsite: overrides.hasWebsite || false,
    mediaLink: overrides.mediaLink || '',
    googleMapsLink: overrides.googleMapsLink || '',
    message: overrides.message || '',
    status: overrides.status || 'znaleziony',
    estimatedPrice: overrides.estimatedPrice || 5000,
    specs: overrides.specs || '',
    soldPrice: overrides.soldPrice || null,
    soldPlace: overrides.soldPlace || null,
    soldDate: overrides.soldDate || null,
    createdAt: overrides.createdAt || Date.now(),
    ...overrides
  };
}

function createIncomeProfile(overrides = {}) {
  return {
    id: overrides.id || 'strony',
    name: overrides.name || 'Strony',
    icon: overrides.icon || 'monitor',
    balance: overrides.balance || 30,
    modules: overrides.modules || ['profits', 'projects', 'clients'],
    ...overrides
  };
}

function createSettings(overrides = {}) {
  return {
    layouts: overrides.layouts || {
      home: { order: ['net_worth', 'safe_to_spend', 'accounts_summary'], hidden: [] },
      stats: { order: ['kpi_row', 'debts_stats'], hidden: [] },
      report: { order: ['report_overview'], hidden: [] }
    },
    ...overrides
  };
}

function createSyntheticDataset() {
  const transactions = [
    createTransaction({ id: 'tx-1', type: 'income', amount: 5000, category: 'salary', desc: 'Wypłata', date: '2026-09-01' }),
    createTransaction({ id: 'tx-2', type: 'expense', amount: 1200, category: 'rent', desc: 'Czynsz', date: '2026-09-02' }),
    createTransaction({ id: 'tx-3', type: 'expense', amount: 456.78, category: 'food', desc: 'Zakupy', date: '2026-09-03' }),
    createTransaction({ id: 'tx-4', type: 'expense', amount: 99, category: 'subscription', desc: 'Netflix', date: '2026-09-05' })
  ];

  const debtors = [
    createDebtor({ id: 'debtor-1', name: 'Anna Nowak', debts: [{ id: 'debt-1', desc: 'Pożyczka', amount: 300, date: '2026-08-01', paid: false, source: 'konto' }] }),
    createDebtor({ id: 'debtor-2', name: 'Piotr Zieliński', debts: [{ id: 'debt-2', desc: 'Zwrot', amount: 150, date: '2026-08-10', paid: true, source: 'skarbonka' }] })
  ];

  const budgets = [
    createBudget({ id: 'budget-1', category: 'food', limit: 1500 }),
    createBudget({ id: 'budget-2', category: 'subscription', limit: 200 })
  ];

  const goals = [
    createGoal({ id: 'goal-1', name: 'Laptop', target: 10000, current: 3500, deadline: '2026-12-31' }),
    createGoal({ id: 'goal-2', name: 'Wakacje', target: 5000, current: 1200, deadline: '2027-06-01' })
  ];

  const reminders = [
    createReminder({ id: 'rem-1', title: 'Rachunek za prąd', amount: 150, day: '2026-09-10' }),
    createReminder({ id: 'rem-2', title: 'Wynajem', amount: 1200, day: '2026-09-01', repeat: true })
  ];

  const transfers = [
    createTransfer({ id: 'tr-1', from: 'konto', to: 'skarbonka', amount: 500, date: '2026-09-01' })
  ];

  const incomeSources = [
    createIncomeSource({ id: 'src-1', name: 'Strony', icon: 'monitor', _profileType: 'strony' }),
    createIncomeSource({ id: 'src-2', name: 'Resale', icon: 'package', _profileType: 'resale' }),
    createIncomeSource({ id: 'src-3', name: 'Giełda', icon: 'trending-up', _profileType: 'gielda' })
  ];

  const templates = [
    createTemplate({ id: 'tmpl-1', name: 'Zakupy', type: 'expense', amount: 100, category: 'food' })
  ];

  const recurringTx = [
    createRecurring({ id: 'rec-1', name: 'Netflix', type: 'expense', amount: 45, category: 'subscription', freq: 'monthly', dayOfMonth: 5 })
  ];

  const creditors = [
    createCreditor({ id: 'cred-1', name: 'Bank PKO', loans: [{ id: 'loan-1', desc: 'Pożyczka', amount: 10000, date: '2026-01-15', due: '2027-01-15', interest: 5.5, paid: false }] })
  ];

  const autoSaveRules = [
    createAutoSaveRule({ id: 'asr-1', pct: 10, dest: 'skarbonka', label: 'Auto 10%' })
  ];

  const ruleTargets = { needs: 50, wants: 30, savings: 20 };

  const stronyProducts = [
    createStronaProduct({ id: 'prod-1', name: 'Landing page', price: 2500, category: 'strona' })
  ];

  const resaleProducts = [
    createResaleProduct({ id: 'res-prod-1', name: 'Bluza Nike', buyPrice: 50 })
  ];

  const resaleSales = [
    createResaleSale({ id: 'res-sale-1', productId: 'res-prod-1', price: 120 })
  ];

  const resaleTasks = [
    createResaleTask({ id: 'res-task-1', title: 'Wysłać paczkę', type: 'shipping' })
  ];

  const resaleShipments = [
    createResaleShipment({ id: 'res-ship-1', name: 'Paczka 1' })
  ];

  const resaleEvents = [
    createResaleEvent({ id: 'res-ev-1', type: 'sale', entity: 'sale', entityId: 'res-sale-1' })
  ];

  const resaleSettings = createResaleSettings();

  const gieldaOps = [
    createGieldaOp({ id: 'gielda-1', type: 'wplata', amount: 1000 })
  ];

  const stronyClients = [
    createStronaClient({ id: 'client-1', name: 'Firma XYZ', status: 'znaleziony' })
  ];

  const incomeProfiles = {
    strony: createIncomeProfile({ id: 'strony', name: 'Strony', modules: ['profits', 'projects', 'clients'] }),
    resale: createIncomeProfile({ id: 'resale', name: 'Resale', modules: ['profits', 'products', 'sales', 'todo'] }),
    gielda: createIncomeProfile({ id: 'gielda', name: 'Giełda', modules: ['profits', 'portfolio', 'history'] })
  };

  const settings = createSettings();

  const data = {
    transactions,
    debtors,
    budgets,
    goals,
    reminders,
    transfers,
    incomeSources,
    templates,
    recurringTx,
    creditors,
    autoSaveRules,
    ruleTargets,
    stronyProducts,
    resaleProducts,
    resaleSales,
    resaleTasks,
    resaleShipments,
    resaleEvents,
    resaleSettings,
    gieldaOps,
    stronyClients,
    incomeProfiles,
    settings
  };

  const localSettings = {
    finapp_theme: 'dark',
    finapp_privacy_mode: 'false',
    finapp_user_nick: 'TestUser',
    finapp_active_money_place: 'konto'
  };

  return { data, localSettings, userId: 'synthetic-test-user-001' };
}

module.exports = {
  createTransaction,
  createDebtor,
  createBudget,
  createGoal,
  createReminder,
  createTransfer,
  createIncomeSource,
  createTemplate,
  createRecurring,
  createCreditor,
  createAutoSaveRule,
  createStronaProduct,
  createResaleProduct,
  createResaleSale,
  createResaleTask,
  createResaleShipment,
  createResaleEvent,
  createResaleSettings,
  createGieldaOp,
  createStronaClient,
  createIncomeProfile,
  createSettings,
  createSyntheticDataset
};
