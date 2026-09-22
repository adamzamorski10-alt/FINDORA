/**
 * Stage UI-2 — Dashboard View
 *
 * Premium financial dashboard built on the UI-1 design system.
 * Uses real data from reporting, accounts, safe-to-spend, budgets, goals.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function render(context = {}) {
  const { state, modules } = context;

  if (!state) {
    const el = document.createElement('div');
    el.className = 'view-placeholder';
    el.innerHTML = '<h2>Dashboard</h2><p>Dashboard placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const snapshot = state.getState();
  const userId = snapshot.session?.userId;

  if (!userId) {
    const el = document.createElement('div');
    el.className = 'dashboard-view';
    const p = document.createElement('p');
    p.className = 'empty-message';
    p.textContent = 'Please log in to view your dashboard.';
    el.appendChild(p);
    return el;
  }

  const monthKey = snapshot.ui.monthKey || new Date().toISOString().slice(0, 7);
  const accounts = snapshot.accounts?.items || [];
  const transactions = snapshot.transactions?.items || [];
  const budgets = snapshot.budgets?.items || [];
  const goals = snapshot.goals?.items || [];

  const root = document.createElement('div');
  root.className = 'dashboard-view';

  const heading = document.createElement('h2');
  heading.textContent = 'Dashboard';
  root.appendChild(heading);

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'dashboard-summary-grid';

  const balanceCard = createSummaryCard('Total Balance', '…', 'neutral', '🏦');
  const incomeCard = createSummaryCard('Income', '…', 'neutral', '↓');
  const expenseCard = createSummaryCard('Expenses', '…', 'neutral', '↑');
  const safeCard = createSummaryCard('Safe-to-Spend', '…', 'neutral', '🛡️', true);

  summaryGrid.appendChild(balanceCard);
  summaryGrid.appendChild(incomeCard);
  summaryGrid.appendChild(expenseCard);
  summaryGrid.appendChild(safeCard);
  root.appendChild(summaryGrid);

  const middleGrid = document.createElement('div');
  middleGrid.className = 'dashboard-middle-grid';

  const cashFlowCard = document.createElement('div');
  cashFlowCard.className = 'card cash-flow-card';
  const cashFlowTitle = document.createElement('h3');
  cashFlowTitle.className = 'dashboard-section-title';
  cashFlowTitle.textContent = 'Cash Flow';
  cashFlowCard.appendChild(cashFlowTitle);

  const cashFlowBars = document.createElement('div');
  cashFlowBars.className = 'cash-flow-bars';
  cashFlowBars.innerHTML = `
    <div class="cash-flow-row">
      <span class="cash-flow-label">Income</span>
      <div class="cash-flow-bar-track"><div class="cash-flow-bar-fill income" style="width:0%"></div></div>
      <span class="cash-flow-value amount amount-neutral">…</span>
    </div>
    <div class="cash-flow-row">
      <span class="cash-flow-label">Expenses</span>
      <div class="cash-flow-bar-track"><div class="cash-flow-bar-fill expense" style="width:0%"></div></div>
      <span class="cash-flow-value amount amount-neutral">…</span>
    </div>
  `;
  cashFlowCard.appendChild(cashFlowBars);
  middleGrid.appendChild(cashFlowCard);

  const safeDetailCard = document.createElement('div');
  safeDetailCard.className = 'card safe-detail-card';
  const safeDetailTitle = document.createElement('h3');
  safeDetailTitle.className = 'dashboard-section-title';
  safeDetailTitle.textContent = 'Safe-to-Spend Breakdown';
  safeDetailCard.appendChild(safeDetailTitle);
  const safeDetailBody = document.createElement('div');
  safeDetailBody.className = 'safe-detail-body';
  safeDetailBody.innerHTML = `
    <div class="safe-detail-row"><span>Free funds</span><span class="amount amount-neutral">…</span></div>
    <div class="safe-detail-row"><span>Goals requirement</span><span class="amount amount-neutral">…</span></div>
    <div class="safe-detail-row"><span>Days left</span><span class="amount amount-neutral">…</span></div>
    <div class="safe-detail-row safe-detail-total"><span>Safe to spend</span><span class="amount amount-neutral">…</span></div>
  `;
  safeDetailCard.appendChild(safeDetailBody);
  middleGrid.appendChild(safeDetailCard);

  root.appendChild(middleGrid);

  const bottomGrid = document.createElement('div');
  bottomGrid.className = 'dashboard-bottom-grid';

  const txCard = document.createElement('div');
  txCard.className = 'dashboard-section-card';
  const txTitle = document.createElement('h3');
  txTitle.className = 'dashboard-section-title';
  txTitle.textContent = 'Recent Transactions';
  txCard.appendChild(txTitle);
  const txList = document.createElement('ul');
  txList.className = 'recent-transactions-list';
  txCard.appendChild(txList);
  bottomGrid.appendChild(txCard);

  const budgetCard = document.createElement('div');
  budgetCard.className = 'dashboard-section-card';
  const budgetTitle = document.createElement('h3');
  budgetTitle.className = 'dashboard-section-title';
  budgetTitle.textContent = 'Budgets';
  budgetCard.appendChild(budgetTitle);
  const budgetList = document.createElement('ul');
  budgetList.className = 'progress-list';
  budgetCard.appendChild(budgetList);
  bottomGrid.appendChild(budgetCard);

  const goalCard = document.createElement('div');
  goalCard.className = 'dashboard-section-card';
  const goalTitle = document.createElement('h3');
  goalTitle.className = 'dashboard-section-title';
  goalTitle.textContent = 'Goals';
  goalCard.appendChild(goalTitle);
  const goalList = document.createElement('ul');
  goalList.className = 'progress-list';
  goalCard.appendChild(goalList);
  bottomGrid.appendChild(goalCard);

  root.appendChild(bottomGrid);

  async function loadSummary() {
    try {
      const summary = await modules.reporting.getMonthlySummary({ userId, monthKey });
      const income = summary.income || 0;
      const expense = summary.expense || 0;

      updateSummaryCard(incomeCard, formatCurrency(income), 'positive');
      updateSummaryCard(expenseCard, formatCurrency(expense), 'negative');

      const maxValue = Math.max(income, expense, 0.01);
      const incomePercent = (income / maxValue) * 100;
      const expensePercent = (expense / maxValue) * 100;
      cashFlowBars.querySelector('.cash-flow-bar-fill.income').style.width = `${incomePercent}%`;
      cashFlowBars.querySelector('.cash-flow-bar-fill.expense').style.width = `${expensePercent}%`;
      const incomeValEl = cashFlowBars.querySelector('.cash-flow-value');
      incomeValEl.textContent = formatCurrency(income);
      incomeValEl.className = `cash-flow-value amount ${income >= 0 ? 'amount-positive' : 'amount-negative'}`;
      const expenseValEl = cashFlowBars.querySelectorAll('.cash-flow-value')[1];
      expenseValEl.textContent = formatCurrency(expense);
      expenseValEl.className = `cash-flow-value amount amount-negative`;
    } catch (e) {
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = `Failed to load monthly summary: ${e.message}`;
      summaryGrid.appendChild(errorEl);
    }
  }

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
      updateSummaryCard(balanceCard, formatCurrency(totalBalance), totalBalance >= 0 ? 'positive' : 'negative');
    } catch (e) {
      updateSummaryCard(balanceCard, '—', 'neutral');
    }
  }

  async function loadSafeToSpend() {
    try {
      const safeResult = await modules.safeToSpend.computeForCurrentState();
      const safeTotal = safeResult?.safeTotal ?? 0;
      const perDay = safeResult?.perDay ?? 0;
      updateSummaryCard(safeCard, formatCurrency(safeTotal), safeTotal >= 0 ? 'positive' : 'negative');
      const safeValueEl = safeCard.querySelector('.summary-card-value');
      if (safeValueEl) {
        safeValueEl.textContent = formatCurrency(safeTotal);
      }
      const safeSubtitleEl = safeCard.querySelector('.summary-card-subtitle');
      if (safeSubtitleEl) {
        safeSubtitleEl.textContent = `${formatCurrency(perDay)} / day`;
      }

      const freeFunds = safeResult?.freeFunds ?? 0;
      const goalsReq = safeResult?.goalsReq ?? 0;
      const daysLeft = safeResult?.daysLeft ?? 0;
      const safeDetailSpans = safeDetailBody.querySelectorAll('.safe-detail-row span:last-child');
      if (safeDetailSpans.length >= 4) {
        safeDetailSpans[0].textContent = formatCurrency(freeFunds);
        safeDetailSpans[0].className = `amount ${freeFunds >= 0 ? 'amount-positive' : 'amount-negative'}`;
        safeDetailSpans[1].textContent = formatCurrency(goalsReq);
        safeDetailSpans[1].className = `amount amount-negative`;
        safeDetailSpans[2].textContent = String(daysLeft);
        safeDetailSpans[2].className = 'amount amount-neutral';
        safeDetailSpans[3].textContent = formatCurrency(safeTotal);
        safeDetailSpans[3].className = `amount ${safeTotal >= 0 ? 'amount-positive' : 'amount-negative'}`;
      }
    } catch (e) {
      updateSummaryCard(safeCard, '—', 'neutral');
      const safeSubtitleEl = safeCard.querySelector('.summary-card-subtitle');
      if (safeSubtitleEl) {
        safeSubtitleEl.textContent = 'Unavailable';
      }
    }
  }

  async function loadRecentTransactions() {
    const accountMap = new Map();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc.name);
    }

    if (transactions.length === 0) {
      txList.innerHTML = '<li class="empty-message" style="padding: var(--space-2) 0;">No transactions this month.</li>';
    } else {
      txList.innerHTML = '';
      const recent = [...transactions].reverse().slice(0, 5);
      for (const tx of recent) {
        const li = document.createElement('li');
        li.className = 'recent-transaction-item';
        const info = document.createElement('div');
        info.className = 'recent-transaction-info';
        const desc = document.createElement('div');
        desc.className = 'recent-transaction-desc';
        desc.textContent = tx.description || '(no description)';
        const meta = document.createElement('div');
        meta.className = 'recent-transaction-meta';
        meta.textContent = `${accountMap.get(tx.accountId) || tx.accountId} • ${tx.date}`;
        info.appendChild(desc);
        info.appendChild(meta);
        li.appendChild(info);
        const amount = document.createElement('span');
        amount.className = `recent-transaction-amount amount ${tx.type === 'income' ? 'amount-positive' : 'amount-negative'}`;
        amount.textContent = `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`;
        li.appendChild(amount);
        txList.appendChild(li);
      }
    }
  }

  async function loadBudgets() {
    if (budgets.length === 0) {
      budgetList.innerHTML = '<li class="empty-message" style="padding: var(--space-2) 0;">No active budgets.</li>';
    } else {
      budgetList.innerHTML = '';
      const categoryMap = new Map();
      if (modules.category) {
        try {
          const categories = await modules.category.getCategories({ userId });
          for (const cat of categories) {
            categoryMap.set(cat.id, cat.name);
          }
        } catch (_e) {
          // leave category names as IDs on failure
        }
      }

      for (const budget of budgets) {
        const li = document.createElement('li');
        li.className = 'progress-item';
        const header = document.createElement('div');
        header.className = 'progress-item-header';
        const name = document.createElement('span');
        name.className = 'progress-item-name';
        name.textContent = categoryMap.get(budget.categoryId) || budget.categoryId;
        const value = document.createElement('span');
        value.className = 'progress-item-value';
        value.textContent = `${formatCurrency(budget.amount)} budget`;
        header.appendChild(name);
        header.appendChild(value);
        li.appendChild(header);

        const track = document.createElement('div');
        track.className = 'progress-bar-track';
        const fill = document.createElement('div');
        fill.className = 'progress-bar-fill';
        fill.style.width = '0%';
        track.appendChild(fill);
        li.appendChild(track);
        budgetList.appendChild(li);

        try {
          const progress = await modules.budget.getBudgetProgress({ budgetId: budget.id, monthKey });
          const spent = progress.spent || 0;
          const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
          fill.style.width = `${pct}%`;
          fill.className = `progress-bar-fill${progress.overBudget ? ' over-budget' : ''}`;
          const remainingText = progress.overBudget
            ? `Over by ${formatCurrency(spent - budget.amount)}`
            : `${formatCurrency(progress.remaining || 0)} remaining`;
          value.textContent = `${formatCurrency(spent)} of ${formatCurrency(budget.amount)} • ${remainingText}`;
        } catch (_e) {
          value.textContent = `${formatCurrency(budget.amount)} budget`;
        }
      }
    }
  }

  async function loadGoals() {
    if (goals.length === 0) {
      goalList.innerHTML = '<li class="empty-message" style="padding: var(--space-2) 0;">No active goals.</li>';
    } else {
      goalList.innerHTML = '';
      for (const goal of goals) {
        const li = document.createElement('li');
        li.className = 'progress-item';
        const header = document.createElement('div');
        header.className = 'progress-item-header';
        const name = document.createElement('span');
        name.className = 'progress-item-name';
        name.textContent = goal.name;
        const value = document.createElement('span');
        value.className = 'progress-item-value';
        value.textContent = `${formatCurrency(goal.current || 0)} of ${formatCurrency(goal.target)}`;
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

        const pct = goal.target > 0 ? Math.min(((goal.current || 0) / goal.target) * 100, 100) : 0;
        fill.style.width = `${pct}%`;
      }
    }
  }

  async function loadDashboardData() {
    await Promise.all([
      loadSummary(),
      loadBalance(),
      loadSafeToSpend(),
      loadRecentTransactions(),
      loadBudgets(),
      loadGoals(),
    ]);
  }

  loadDashboardData();

  return root;
}

function createSummaryCard(label, value, colorClass, icon, isSafe = false) {
  const card = document.createElement('div');
  card.className = `summary-card${isSafe ? ' is-safe' : ''}`;

  const header = document.createElement('div');
  header.className = 'summary-card-header';

  const iconEl = document.createElement('div');
  iconEl.className = 'summary-card-icon';
  iconEl.textContent = icon;

  const labelEl = document.createElement('span');
  labelEl.className = 'summary-card-label';
  labelEl.textContent = label;

  header.appendChild(iconEl);
  header.appendChild(labelEl);
  card.appendChild(header);

  const valueEl = document.createElement('div');
  valueEl.className = `summary-card-value amount amount-${colorClass}`;
  valueEl.textContent = value;

  if (isSafe) {
    const subtitle = document.createElement('div');
    subtitle.className = 'summary-card-subtitle';
    subtitle.textContent = '… / day';
    card.appendChild(valueEl);
    card.appendChild(subtitle);
  } else {
    card.appendChild(valueEl);
  }

  return card;
}

function updateSummaryCard(card, value, colorClass) {
  const valueEl = card.querySelector('.summary-card-value');
  if (valueEl) {
    valueEl.textContent = value;
    valueEl.className = `summary-card-value amount amount-${colorClass}`;
  }
}
