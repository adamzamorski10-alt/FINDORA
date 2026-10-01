/**
 * Stage UI-3 — Dashboard View (Premium Fintech Redesign)
 *
 * Premium financial dashboard with dominant hero hierarchy,
 * restrained surfaces, and data-rich composition.
 * Preserves all DOM selector contracts for E2E tests.
 */

import { createLineChart, createHorizontalBarChart } from '../utils/charts.js';
import { t } from '../i18n.js';
import { formatCurrency as formatLocaleCurrency, formatMonthLabel as formatLocaleMonthLabel, getMonthNames } from '../i18n-format.js';

function formatCurrency(value) {
  return formatLocaleCurrency(value, 'PLN');
}

function formatMonthLabel(monthKey) {
  return formatLocaleMonthLabel(monthKey);
}

const MONTH_NAMES = getMonthNames();

function formatShortMonth(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const name = MONTH_NAMES[month - 1];
  return name.slice(0, 3);
}

function getLastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
  }
  return keys;
}

function el(tag, className, textContent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (textContent !== undefined) e.textContent = textContent;
  return e;
}

export function render(context = {}) {
  const { state, modules } = context;

  if (!state) {
    const placeholder = document.createElement('div');
    placeholder.className = 'view-placeholder';
    placeholder.innerHTML = `<h2>${t('nav.dashboard')}</h2><p>${t('common.pleaseLogin', { view: t('nav.dashboard').toLowerCase() })}</p>`;
    return placeholder;
  }

  const snapshot = state.getState();
  const userId = snapshot.session?.userId;

  if (!userId) {
    const empty = document.createElement('div');
    empty.className = 'dashboard-view';
    const p = document.createElement('p');
    p.className = 'empty-message';
    p.textContent = t('common.pleaseLogin', { view: t('nav.dashboard').toLowerCase() });
    empty.appendChild(p);
    return empty;
  }

  const monthKey = snapshot.ui.monthKey || new Date().toISOString().slice(0, 7);
  const accounts = snapshot.accounts?.items || [];
  const transactions = snapshot.transactions?.items || [];
  const budgets = snapshot.budgets?.items || [];
  const goals = snapshot.goals?.items || [];

  const root = document.createElement('div');
  root.className = 'dashboard-view';

  // ── 1. Page Header ─────────────────────────────────────────
  const pageHeader = document.createElement('div');
  pageHeader.className = 'dashboard-page-header';

  const pageHeaderTitles = document.createElement('div');
  pageHeaderTitles.className = 'dashboard-page-header-titles';

  const pageTitle = el('h1', 'dashboard-page-title', t('nav.dashboard'));
  pageHeaderTitles.appendChild(pageTitle);

  const pageSubtitle = el('p', 'dashboard-page-subtitle', t('dashboard.subtitle'));
  pageHeaderTitles.appendChild(pageSubtitle);

  pageHeader.appendChild(pageHeaderTitles);
  root.appendChild(pageHeader);

  // ── 2. Hero ────────────────────────────────────────────────
  const heroSection = document.createElement('div');
  heroSection.className = 'surface-hero dashboard-hero';

  const heroLabel = el('span', 'dashboard-hero-label', t('dashboard.totalBalance') || '');
  heroSection.appendChild(heroLabel);

  const heroValue = el('div', 'dashboard-hero-value amount amount-neutral', '…');
  heroSection.appendChild(heroValue);

  const heroMeta = el('div', 'dashboard-hero-meta', `${t('dashboard.subtitle')} • ${formatMonthLabel(monthKey)}`);
  heroSection.appendChild(heroMeta);

  root.appendChild(heroSection);

  // ── 3. Analytics Grid ──────────────────────────────────────
  const analyticsGrid = document.createElement('div');
  analyticsGrid.className = 'dashboard-analytics-grid';

  const cashFlowCard = document.createElement('div');
  cashFlowCard.className = 'surface-analytic dashboard-analytic-card';
  const cashFlowTitle = el('h3', 'dashboard-section-title', t('dashboard.cashFlow'));
  cashFlowCard.appendChild(cashFlowTitle);
  const cashFlowChartWrap = document.createElement('div');
  cashFlowChartWrap.className = 'dashboard-chart-wrap';
  cashFlowCard.appendChild(cashFlowChartWrap);
  analyticsGrid.appendChild(cashFlowCard);

  const categoryCard = document.createElement('div');
  categoryCard.className = 'surface-analytic dashboard-analytic-card';
  const categoryTitle = el('h3', 'dashboard-section-title', t('dashboard.categoryBreakdown'));
  categoryCard.appendChild(categoryTitle);
  const categoryChartWrap = document.createElement('div');
  categoryChartWrap.className = 'dashboard-chart-wrap';
  categoryCard.appendChild(categoryChartWrap);
  analyticsGrid.appendChild(categoryCard);

  root.appendChild(analyticsGrid);

  // ── 4. Summary Strip ──────────────────────────────────────
  const summaryStrip = document.createElement('div');
  summaryStrip.className = 'summary-strip';

  const safeCard = document.createElement('div');
  safeCard.className = 'dashboard-safe-card';

  const safeTitle = el('div', 'dashboard-safe-card-title', t('dashboard.safeToSpend'));
  safeCard.appendChild(safeTitle);

  const safeValue = el('div', 'dashboard-safe-card-value amount amount-neutral', '…');
  safeCard.appendChild(safeValue);

  const safeMeta = el('div', 'dashboard-safe-card-meta', t('dashboard.availableAfterObligations'));
  safeCard.appendChild(safeMeta);

  const safeBreakdown = document.createElement('div');
  safeBreakdown.className = 'dashboard-safe-card-breakdown';

  const freeFundsItem = document.createElement('div');
  freeFundsItem.className = 'dashboard-safe-card-breakdown-item';
  const freeFundsLabel = el('span', 'dashboard-safe-card-breakdown-label', t('dashboard.freeFunds'));
  const freeFundsValue = el('span', 'dashboard-safe-card-breakdown-value amount amount-neutral', '…');
  freeFundsItem.appendChild(freeFundsLabel);
  freeFundsItem.appendChild(freeFundsValue);
  safeBreakdown.appendChild(freeFundsItem);

  const obligationsItem = document.createElement('div');
  obligationsItem.className = 'dashboard-safe-card-breakdown-item';
  const obligationsLabel = el('span', 'dashboard-safe-card-breakdown-label', t('dashboard.upcomingObligations'));
  const obligationsValue = el('span', 'dashboard-safe-card-breakdown-value amount amount-negative', '…');
  obligationsItem.appendChild(obligationsLabel);
  obligationsItem.appendChild(obligationsValue);
  safeBreakdown.appendChild(obligationsItem);

  safeCard.appendChild(safeBreakdown);
  summaryStrip.appendChild(safeCard);

  const incomeItem = document.createElement('div');
  incomeItem.className = 'summary-strip-item';
  const incomeLabel = el('span', 'summary-strip-label', t('dashboard.income'));
  const incomeValue = el('span', 'summary-strip-value summary-strip-value--positive', '…');
  incomeItem.appendChild(incomeLabel);
  incomeItem.appendChild(incomeValue);
  summaryStrip.appendChild(incomeItem);

  const expenseItem = document.createElement('div');
  expenseItem.className = 'summary-strip-item';
  const expenseLabel = el('span', 'summary-strip-label', t('dashboard.expenses'));
  const expenseValue = el('span', 'summary-strip-value summary-strip-value--negative', '…');
  expenseItem.appendChild(expenseLabel);
  expenseItem.appendChild(expenseValue);
  summaryStrip.appendChild(expenseItem);

  const netItem = document.createElement('div');
  netItem.className = 'summary-strip-item';
  const netLabel = el('span', 'summary-strip-label', t('dashboard.net'));
  const netValue = el('span', 'summary-strip-value summary-strip-value--muted', '…');
  netItem.appendChild(netLabel);
  netItem.appendChild(netValue);
  summaryStrip.appendChild(netItem);

  root.appendChild(summaryStrip);

  // ── 5. Attention Area ──────────────────────────────────────
  const attentionGrid = document.createElement('div');
  attentionGrid.className = 'dashboard-attention-grid';

  const txCard = document.createElement('div');
  txCard.className = 'surface-list dashboard-section-card';

  const txHeader = document.createElement('div');
  txHeader.className = 'dashboard-list-header';
  const txTitle = el('h3', 'dashboard-section-title', t('dashboard.recentTransactions'));
  txHeader.appendChild(txTitle);
  txCard.appendChild(txHeader);

  const txList = document.createElement('ul');
  txList.className = 'recent-transactions-list';
  txCard.appendChild(txList);
  attentionGrid.appendChild(txCard);

  let budgetCard = null;
  let goalCard = null;

  if (budgets.length > 0) {
    budgetCard = document.createElement('div');
    budgetCard.className = 'surface-analytic dashboard-section-card dashboard-section-card--compact';

    const budgetTitle = el('h3', 'dashboard-section-title', t('dashboard.budgetsAtRisk'));
    budgetCard.appendChild(budgetTitle);

    const budgetList = document.createElement('ul');
    budgetList.className = 'progress-list';
    budgetCard.appendChild(budgetList);
    attentionGrid.appendChild(budgetCard);
  }

  if (goals.length > 0) {
    goalCard = document.createElement('div');
    goalCard.className = 'surface-analytic dashboard-section-card dashboard-section-card--compact';

    const goalTitle = el('h3', 'dashboard-section-title', t('dashboard.goals'));
    goalCard.appendChild(goalTitle);

    const goalList = document.createElement('ul');
    goalList.className = 'progress-list';
    goalCard.appendChild(goalList);
    attentionGrid.appendChild(goalCard);
  }

  let receivablesCard = null;
  if (modules.receivable) {
    receivablesCard = document.createElement('div');
    receivablesCard.className = 'surface-analytic dashboard-section-card dashboard-section-card--compact';

    const receivablesTitle = el('h3', 'dashboard-section-title', t('nav.receivables'));
    receivablesCard.appendChild(receivablesTitle);

    const receivablesList = document.createElement('ul');
    receivablesList.className = 'progress-list';
    receivablesCard.appendChild(receivablesList);
    attentionGrid.appendChild(receivablesCard);
  }

  let incomeProfilesCard = null;
  if (modules.incomeProfile) {
    incomeProfilesCard = document.createElement('div');
    incomeProfilesCard.className = 'surface-analytic dashboard-section-card dashboard-section-card--compact';

    const incomeProfilesTitle = el('h3', 'dashboard-section-title', t('nav.incomeProfiles'));
    incomeProfilesCard.appendChild(incomeProfilesTitle);

    const incomeProfilesList = document.createElement('ul');
    incomeProfilesList.className = 'progress-list';
    incomeProfilesCard.appendChild(incomeProfilesList);
    attentionGrid.appendChild(incomeProfilesCard);
  }

  root.appendChild(attentionGrid);

  // ── Data Loaders ──────────────────────────────────────────
  async function loadBalance() {
    try {
      let totalBalance = 0;
      if (accounts.length > 0) {
        const balanceResults = await Promise.all(
          accounts.map(async (acc) => {
            try {
              const result = await modules.reporting.getAccountBalance({ accountId: acc.id });
              return Number(result.balance) || 0;
            } catch (_e) {
              return 0;
            }
          }),
        );
        totalBalance = balanceResults.reduce((sum, b) => sum + b, 0);
      }
      heroValue.textContent = formatCurrency(totalBalance);
      heroValue.className = `dashboard-hero-value amount ${totalBalance >= 0 ? 'amount-positive' : 'amount-negative'}`;
    } catch (e) {
      heroValue.textContent = '—';
      heroValue.className = 'dashboard-hero-value amount amount-neutral';
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = t('common.error') + ': ' + e.message;
      heroSection.appendChild(errorEl);
    }
  }

  async function loadSummary() {
    try {
      const summary = await modules.reporting.getMonthlySummary({ userId, monthKey });
      const income = summary.income || 0;
      const expense = summary.expense || 0;
      const net = income - expense;

      incomeValue.textContent = formatCurrency(income);
      incomeValue.className = `summary-strip-value ${income >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;

      expenseValue.textContent = formatCurrency(expense);
      expenseValue.className = `summary-strip-value ${expense >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;

      netValue.textContent = formatCurrency(net);
      netValue.className = `summary-strip-value ${net >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;
    } catch (e) {
      incomeValue.textContent = '—';
      expenseValue.textContent = '—';
      netValue.textContent = '—';
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = t('common.error') + ': ' + e.message;
      summaryStrip.appendChild(errorEl);
    }
  }

  async function loadSafeToSpend() {
    try {
      const safeResult = await modules.safeToSpend.computeForCurrentState();
      const safeTotal = safeResult?.safeTotal ?? 0;

      safeValue.textContent = formatCurrency(safeTotal);
      safeValue.className = `dashboard-safe-card-value amount ${safeTotal >= 0 ? 'amount-positive' : 'amount-negative'}`;

      const freeFunds = safeResult?.freeFunds ?? 0;
      const goalsReq = safeResult?.goalsReq ?? 0;

      freeFundsValue.textContent = formatCurrency(freeFunds);
      freeFundsValue.className = `dashboard-safe-card-breakdown-value amount ${freeFunds >= 0 ? 'amount-positive' : 'amount-negative'}`;

      obligationsValue.textContent = formatCurrency(goalsReq);
      obligationsValue.className = `dashboard-safe-card-breakdown-value amount amount-negative`;
    } catch (e) {
      safeValue.textContent = '—';
      safeValue.className = 'dashboard-safe-card-value amount amount-neutral';
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = t('common.error') + ': ' + e.message;
      safeCard.appendChild(errorEl);
    }
  }

  async function loadRecentTransactions() {
    const accountMap = new Map();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc.name);
    }

    if (transactions.length === 0) {
      txList.innerHTML = `
        <li class="empty-state-list-item">
          <div class="empty-state-icon">📝</div>
          <p class="empty-state-title">${t('transactions.noTransactions')}</p>
          <p class="empty-state-desc">${t('transactions.emptyActionDesc') || ''}</p>
        </li>`;
    } else {
      txList.innerHTML = '';
      const recent = [...transactions].reverse().slice(0, 5);
      for (const tx of recent) {
        const li = document.createElement('li');
        li.className = 'surface-list-item recent-transaction-item';

        const typeIcon = document.createElement('div');
        typeIcon.className = `transaction-type-icon ${tx.type === 'income' ? 'income' : 'expense'}`;
        typeIcon.textContent = tx.type === 'income' ? '↑' : '↓';
        li.appendChild(typeIcon);

        const info = document.createElement('div');
        info.className = 'surface-list-item-body';
        const desc = document.createElement('div');
        desc.className = 'surface-list-item-title';
        desc.textContent = tx.description || '(no description)';
        const meta = document.createElement('div');
        meta.className = 'surface-list-item-meta';
        meta.textContent = `${accountMap.get(tx.accountId) || tx.accountId} \u2022 ${tx.date}`;
        info.appendChild(desc);
        info.appendChild(meta);
        li.appendChild(info);

        const right = document.createElement('div');
        right.className = 'transaction-item-right';

        const amount = document.createElement('span');
        amount.className = `transaction-item-amount amount ${tx.type === 'income' ? 'amount-positive' : 'amount-negative'}`;
        amount.textContent = `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`;
        right.appendChild(amount);

        li.appendChild(right);
        txList.appendChild(li);
      }
    }
  }

  async function loadBudgetsAtRisk() {
    if (!budgetCard) return;

    if (budgets.length === 0) {
      budgetCard.style.display = 'none';
      return;
    }

    const categoryMap = new Map();
    if (modules.category) {
      try {
        const categories = await modules.category.getCategories({ userId });
        for (const cat of categories) {
          categoryMap.set(cat.id, cat.name);
        }
      } catch (_e) {}
    }

    const atRisk = [];
    for (const budget of budgets) {
      try {
        const progress = await modules.budget.getBudgetProgress({ budgetId: budget.id, monthKey });
        const spent = progress.spent || 0;
        const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
        if (progress.overBudget || pct >= 80) {
          atRisk.push({
            name: categoryMap.get(budget.categoryId) || budget.categoryId,
            spent,
            amount: budget.amount,
            pct,
            overBudget: progress.overBudget,
          });
        }
      } catch (_e) {}
    }

    if (atRisk.length === 0) {
      budgetCard.style.display = 'none';
      return;
    }

    atRisk.sort((a, b) => b.pct - a.pct);
    const top = atRisk.slice(0, 3);

    const budgetList = budgetCard.querySelector('.progress-list');
    budgetList.innerHTML = '';
    for (const item of top) {
      const li = document.createElement('li');
      li.className = 'progress-item';

      const header = document.createElement('div');
      header.className = 'progress-item-header';

      const name = el('span', 'progress-item-name', item.name);
      const value = el('span', 'progress-item-value',
        item.overBudget
          ? `Over by ${formatCurrency(item.spent - item.amount)}`
          : `${formatCurrency(item.spent)} of ${formatCurrency(item.amount)}`
      );

      header.appendChild(name);
      header.appendChild(value);
      li.appendChild(header);

      const track = document.createElement('div');
      track.className = 'progress-bar-track';
      const fill = document.createElement('div');
      fill.className = 'progress-bar-fill';
      fill.style.width = `${item.pct}%`;
      track.appendChild(fill);
      li.appendChild(track);
      budgetList.appendChild(li);

      fill.className = `progress-bar-fill${item.overBudget ? ' over-budget' : ''}`;
    }
    budgetCard.style.display = 'flex';
  }
  async function loadGoalsClosest() {
    if (!goalCard) return;

    if (goals.length === 0) {
      goalCard.style.display = 'none';
      return;
    }

    const sorted = goals
      .map(g => ({
        ...g,
        pct: g.target > 0 ? Math.min(((g.current || 0) / g.target) * 100, 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);

    const goalList = goalCard.querySelector('.progress-list');
    goalList.innerHTML = '';
    for (const goal of sorted) {
      const li = document.createElement('li');
      li.className = 'progress-item';

      const header = document.createElement('div');
      header.className = 'progress-item-header';

      const name = el('span', 'progress-item-name', goal.name);
      const value = el('span', 'progress-item-value',
        `${formatCurrency(goal.current || 0)} of ${formatCurrency(goal.target)}`
      );

      header.appendChild(name);
      header.appendChild(value);
      li.appendChild(header);

      const track = document.createElement('div');
      track.className = 'progress-bar-track';
      const fill = document.createElement('div');
      fill.className = 'progress-bar-fill goal';
      fill.style.width = '0%';
      track.appendChild(fill);
      li.appendChild(track);

      goalList.appendChild(li);

      fill.style.width = `${goal.pct}%`;
    }
    goalCard.style.display = 'flex';
  }

  async function loadReceivablesSummary() {
    if (!receivablesCard || !modules.receivable) return;

    try {
      const persons = await modules.receivable.getPersons({ userId });
      const receivablesList = receivablesCard.querySelector('.progress-list');
      receivablesList.innerHTML = '';

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalOutstanding = 0;
      let peopleWithOutstanding = 0;
      let totalOverdue = 0;

      for (const person of persons) {
        const personReceivables = await modules.receivable.getReceivables({ personId: person.id });
        const openReceivables = personReceivables.filter(r => r.status !== 'paid' && r.status !== 'forgiven');
        const outstanding = openReceivables.reduce((sum, r) => sum + r.remainingAmount, 0);
        if (outstanding > 0) {
          totalOutstanding += outstanding;
          peopleWithOutstanding++;
        }
        const overdue = openReceivables.filter(r => r.dueDate && new Date(r.dueDate) < today);
        totalOverdue += overdue.reduce((sum, r) => sum + r.remainingAmount, 0);
      }

      if (totalOutstanding === 0) {
        receivablesCard.style.display = 'none';
        return;
      }

      receivablesCard.style.display = 'flex';
      const summaryText = `${formatCurrency(totalOutstanding)} • ${peopleWithOutstanding} ${t('receivables.peopleWithOutstanding').toLowerCase()}${totalOverdue > 0 ? ' • ' + t('receivables.overdue') + ': ' + formatCurrency(totalOverdue) : ''}`;
      receivablesList.innerHTML = `<li class="progress-item"><div class="progress-item-header"><span class="progress-item-name">${t('nav.receivables')}</span><span class="progress-item-value">${summaryText}</span></div></li>`;
    } catch (e) {
      receivablesCard.style.display = 'none';
    }
  }

  async function loadIncomeProfilesSummary() {
    if (!incomeProfilesCard || !modules.incomeProfile) return;

    try {
      const profiles = await modules.incomeProfile.listProfiles({ userId });
      const incomeProfilesList = incomeProfilesCard.querySelector('.progress-list');
      incomeProfilesList.innerHTML = '';

      if (profiles.length === 0) {
        incomeProfilesCard.style.display = 'none';
        return;
      }

      incomeProfilesCard.style.display = 'flex';
      const activeCount = profiles.filter(p => !p.archived).length;
      const summaryText = `${activeCount} ${t('incomeProfiles.activeProfiles').toLowerCase()} • ${t('incomeProfiles.totalProfiles').toLowerCase()}: ${profiles.length}`;
      incomeProfilesList.innerHTML = `<li class="progress-item"><div class="progress-item-header"><span class="progress-item-name">${t('nav.incomeProfiles')}</span><span class="progress-item-value">${summaryText}</span></div></li>`;
    } catch (e) {
      incomeProfilesCard.style.display = 'none';
    }
  }

  async function loadCashFlowTrend() {
    const monthKeys = getLastNMonthKeys(6);
    const labels = monthKeys.map(formatShortMonth);
    let incomeData = [];
    let expenseData = [];

    try {
      const results = await Promise.all(
        monthKeys.map(mk => modules.reporting.getMonthlySummary({ userId, monthKey: mk }))
      );
      incomeData = results.map(r => r.income || 0);
      expenseData = results.map(r => r.expense || 0);
    } catch (e) {
      console.error('Failed to load cash flow trend:', e);
    }

    cashFlowChartWrap.innerHTML = '';

    if (incomeData.length === 0 && expenseData.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state empty-state--dashboard';
      empty.innerHTML = `
        <div class="empty-state-icon">📈</div>
        <p class="empty-state-title">No data available</p>
        <p class="empty-state-desc">Add income and expense transactions to see your trend.</p>
      `;
      cashFlowChartWrap.appendChild(empty);
      return;
    }

    const allValues = [...incomeData, ...expenseData];
    const yMin = Math.min(0, ...allValues);
    const yMax = Math.max(...allValues);
    const yPad = (yMax - yMin) * 0.1 || 1;

    const chart = createLineChart({
      data: labels,
      width: 600,
      height: 220,
      padding: { top: 20, right: 20, bottom: 30, left: 50 },
      lines: [
        {
          data: incomeData.map((value, i) => ({ value, label: labels[i] })),
          color: 'var(--color-positive)',
        },
        {
          data: expenseData.map((value, i) => ({ value, label: labels[i] })),
          color: 'var(--color-negative)',
        },
      ],
      yMin: yMin - yPad,
      yMax: yMax + yPad,
      ariaLabel: 'Cash flow trend showing income and expenses over the last 6 months',
    });
    cashFlowChartWrap.appendChild(chart);
  }

  async function loadCategoryBreakdown() {
    categoryChartWrap.innerHTML = '';

    try {
      const categories = await modules.category.getCategories({ userId });
      const categoryNameMap = new Map();
      for (const cat of categories) {
        categoryNameMap.set(cat.id, cat.name);
      }

      const result = await modules.reporting.getMonthCategoryBreakdown({ userId, monthKey, type: 'expense' });
      const entries = Object.entries(result.byCategory || {})
        .map(([id, data]) => ({
          id,
          label: id === 'uncategorized' ? 'Uncategorized' : (categoryNameMap.get(id) || 'Other'),
          value: data.total || 0,
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state empty-state--dashboard';
        empty.innerHTML = `
          <div class="empty-state-icon">📊</div>
          <p class="empty-state-title">No data available</p>
          <p class="empty-state-desc">Add transactions to see your category breakdown.</p>
        `;
        categoryChartWrap.appendChild(empty);
        return;
      }

      const chart = createHorizontalBarChart({
        data: entries.map((item, i) => ({
          label: item.label,
          value: item.value,
          color: i === 0 ? 'var(--color-primary)' : 'var(--color-secondary)',
        })),
        width: 500,
        height: Math.max(220, entries.length * 36 + 20),
        padding: { top: 10, right: 80, bottom: 10, left: 110 },
        ariaLabel: 'Expense breakdown by category for this month',
      });
      categoryChartWrap.appendChild(chart);
    } catch (e) {
      console.error('Failed to load category breakdown:', e);
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = `Failed to load category breakdown: ${e.message}`;
      categoryChartWrap.appendChild(errorEl);
    }
  }

  async function loadDashboardData() {
    await Promise.all([
      loadBalance(),
      loadSummary(),
      loadSafeToSpend(),
      loadRecentTransactions(),
      loadCashFlowTrend(),
      loadCategoryBreakdown(),
      loadBudgetsAtRisk(),
      loadGoalsClosest(),
      loadReceivablesSummary(),
      loadIncomeProfilesSummary(),
    ]);
  }

  loadDashboardData();

  return root;
}

function createMetricCard(label, value, colorClass, subtitle) {
  const card = document.createElement('div');
  card.className = 'surface-metric dashboard-metric-card';

  const labelEl = el('span', 'dashboard-metric-label', label);
  card.appendChild(labelEl);

  const valueEl = el('div', `dashboard-metric-value amount ${colorClass}`, value);
  card.appendChild(valueEl);

  if (subtitle) {
    const subtitleEl = el('div', 'dashboard-metric-subtitle', subtitle);
    card.appendChild(subtitleEl);
  }

  return card;
}

function updateMetricCard(card, value, colorClass) {
  const valueEl = card.querySelector('.dashboard-metric-value');
  if (valueEl) {
    valueEl.textContent = value;
    valueEl.className = `dashboard-metric-value amount ${colorClass}`;
  }
}
