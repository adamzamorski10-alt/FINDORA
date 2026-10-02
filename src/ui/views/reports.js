import { createLineChart, createHorizontalBarChart } from '../utils/charts.js';
import { t } from '../i18n.js';
import { formatCurrency, formatMonthLabel, formatShortMonth, getMonthNames } from '../i18n-format.js';

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

  if (!state || !modules) {
    const placeholder = document.createElement('div');
    placeholder.className = 'view-placeholder';
    placeholder.innerHTML = `<h2>${t('reports.title')}</h2><p>${t('common.placeholder')}</p>`;
    return placeholder;
  }

  const snapshot = state.getState();
  const userId = snapshot.session?.userId;

  if (!userId) {
    const empty = document.createElement('div');
    empty.className = 'reports-view';
    const p = document.createElement('p');
    p.className = 'empty-message';
    p.textContent = t('reports.loginRequired');
    empty.appendChild(p);
    return empty;
  }

  const monthKey = snapshot.ui.monthKey || new Date().toISOString().slice(0, 7);

  const root = document.createElement('div');
  root.className = 'reports-view';

  // ── 1. Page Header ─────────────────────────────────────────
  const pageHeader = document.createElement('div');
  pageHeader.className = 'reports-page-header';

  const pageHeaderTitles = document.createElement('div');
  pageHeaderTitles.className = 'reports-page-header-titles';

  const pageTitle = el('h1', 'reports-page-title', t('reports.title'));
  pageHeaderTitles.appendChild(pageTitle);

  const pageSubtitle = el('p', 'reports-page-subtitle', t('reports.subtitle'));
  pageHeaderTitles.appendChild(pageSubtitle);

  pageHeader.appendChild(pageHeaderTitles);
  root.appendChild(pageHeader);

  // ── 2. Financial Overview (Summary Strip) ──────────────────
  const summaryStrip = document.createElement('div');
  summaryStrip.className = 'summary-strip';

  // Income
  const incomeItem = document.createElement('div');
  incomeItem.className = 'summary-strip-item';
  const incomeLabel = el('span', 'summary-strip-label', t('common.income'));
  const incomeValue = el('span', 'summary-strip-value summary-strip-value--positive', '—');
  incomeItem.appendChild(incomeLabel);
  incomeItem.appendChild(incomeValue);
  summaryStrip.appendChild(incomeItem);

  // Expenses
  const expenseItem = document.createElement('div');
  expenseItem.className = 'summary-strip-item';
  const expenseLabel = el('span', 'summary-strip-label', t('common.expense'));
  const expenseValue = el('span', 'summary-strip-value summary-strip-value--negative', '—');
  expenseItem.appendChild(expenseLabel);
  expenseItem.appendChild(expenseValue);
  summaryStrip.appendChild(expenseItem);

  // Net Cash Flow
  const netItem = document.createElement('div');
  netItem.className = 'summary-strip-item';
  const netLabel = el('span', 'summary-strip-label', t('reports.netCashFlow'));
  const netValue = el('span', 'summary-strip-value summary-strip-value--muted', '—');
  netItem.appendChild(netLabel);
  netItem.appendChild(netValue);
  summaryStrip.appendChild(netItem);

  // Savings Rate
  const savingsItem = document.createElement('div');
  savingsItem.className = 'summary-strip-item';
  const savingsLabel = el('span', 'summary-strip-label', t('reports.savingsRate'));
  const savingsValue = el('span', 'summary-strip-value summary-strip-value--muted', '—');
  savingsItem.appendChild(savingsLabel);
  savingsItem.appendChild(savingsValue);
  summaryStrip.appendChild(savingsItem);

  root.appendChild(summaryStrip);

  // ── 3. Cash Flow Trend (Primary Chart) ─────────────────────
  const chartSection = document.createElement('div');
  chartSection.className = 'surface-analytic reports-chart-section';

  const chartTitle = el('h3', 'reports-section-title', t('reports.cashFlowTrend'));
  chartSection.appendChild(chartTitle);

  const chartWrap = document.createElement('div');
  chartWrap.className = 'reports-chart-wrap';
  chartSection.appendChild(chartWrap);

  root.appendChild(chartSection);

  // ── 4. Analytics Grid (Secondary + Intelligence) ────────────
  const analyticsGrid = document.createElement('div');
  analyticsGrid.className = 'reports-analytics-grid';

  // ── 4a. Category Breakdown ──────────────────────────────────
  const breakdownSection = document.createElement('div');
  breakdownSection.className = 'surface-analytic reports-breakdown-section';

  const breakdownTitle = el('h3', 'reports-section-title', t('reports.expenseBreakdown'));
  breakdownSection.appendChild(breakdownTitle);

  const breakdownEl = document.createElement('div');
  breakdownEl.className = 'reports-breakdown';
  breakdownSection.appendChild(breakdownEl);

  analyticsGrid.appendChild(breakdownSection);

  // ── 4b. Top Spending Categories ─────────────────────────────
  const spendingSection = document.createElement('div');
  spendingSection.className = 'surface-analytic reports-spending-section';

  const spendingTitle = el('h3', 'reports-section-title', t('reports.topSpendingCategories'));
  spendingSection.appendChild(spendingTitle);

  const spendingEl = document.createElement('div');
  spendingEl.className = 'reports-spending';
  spendingSection.appendChild(spendingEl);

  analyticsGrid.appendChild(spendingSection);

  root.appendChild(analyticsGrid);

  // ── Data Loaders ───────────────────────────────────────────
  async function loadSummary() {
    try {
      const summary = await modules.reporting.getMonthlySummary({ userId, monthKey });
      const income = summary.income || 0;
      const expense = summary.expense || 0;
      const net = income - expense;
      const savingsRate = income > 0 ? Math.max(0, (net / income) * 100) : 0;

      incomeValue.textContent = formatCurrency(income);
      incomeValue.className = `summary-strip-value ${income >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;

      expenseValue.textContent = formatCurrency(expense);
      expenseValue.className = `summary-strip-value ${expense >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;

      netValue.textContent = formatCurrency(net);
      netValue.className = `summary-strip-value ${net >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;

      savingsValue.textContent = `${savingsRate.toFixed(1)}%`;
      savingsValue.className = `summary-strip-value ${savingsRate >= 20 ? 'summary-strip-value--positive' : savingsRate >= 0 ? 'summary-strip-value--muted' : 'summary-strip-value--negative'}`;
    } catch (e) {
      incomeValue.textContent = '—';
      expenseValue.textContent = '—';
      netValue.textContent = '—';
      savingsValue.textContent = '—';
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = t('reports.summaryError', { error: e.message });
      summaryStrip.appendChild(errorEl);
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
      incomeData = results.map(r => ({ label: formatShortMonth(r.monthKey), value: r.income || 0 }));
      expenseData = results.map(r => ({ label: formatShortMonth(r.monthKey), value: r.expense || 0 }));
    } catch (e) {
      console.error('Failed to load cash flow trend:', e);
    }

    chartWrap.innerHTML = '';

    if (incomeData.length === 0 && expenseData.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state empty-state--reports';
      empty.innerHTML = `
        <div class="empty-state-icon">📈</div>
        <p class="empty-state-title">${t('common.noData')}</p>
        <p class="empty-state-desc">${t('reports.noDataDesc')}</p>
      `;
      chartWrap.appendChild(empty);
      return;
    }

    const width = chartWrap.clientWidth || 800;
    const height = 260;

    const incomeLine = { data: incomeData, color: 'var(--color-positive)' };
    const expenseLine = { data: expenseData, color: 'var(--color-negative)' };

    const chart = createLineChart({
      data: labels,
      width,
      height,
      padding: { top: 20, right: 20, bottom: 30, left: 50 },
      lines: [incomeLine, expenseLine],
      ariaLabel: t('reports.cashFlowTrendAria'),
    });

    chartWrap.appendChild(chart);
  }

  async function loadCategoryBreakdown() {
    try {
      const breakdown = await modules.reporting.getMonthCategoryBreakdown({ userId, monthKey });
      const entries = Object.entries(breakdown.byCategory?.expense || breakdown.byCategory || {});

      if (entries.length === 0) {
        breakdownEl.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state empty-state--reports';
      empty.innerHTML = `
        <div class="empty-state-icon">📊</div>
        <p class="empty-state-title">${t('reports.noExpenseData')}</p>
        <p class="empty-state-desc">${t('reports.breakdownDesc')}</p>
      `;

        breakdownEl.appendChild(empty);
        return;
      }

      const categoryIds = entries.map(([categoryId]) => categoryId);
      const uniqueCategoryIds = [...new Set(categoryIds)];

      modules.category.getCategories({ userId })
        .then((categories) => {
          const categoryMap = new Map();
          for (const cat of categories) {
            categoryMap.set(cat.id, cat.name);
          }

          const list = document.createElement('ul');
          list.className = 'breakdown-list';
          const maxTotal = Math.max(...entries.map(([, data]) => data.total || 0));
          for (const [categoryId, data] of entries) {
            const li = document.createElement('li');
            li.className = 'breakdown-item';
            const name = document.createElement('span');
            name.className = 'breakdown-item-name';
            name.textContent = categoryId === 'uncategorized' ? t('reports.uncategorized') : (categoryMap.get(categoryId) || categoryId);
            const barTrack = document.createElement('div');
            barTrack.className = 'breakdown-item-bar-track';
            const barFill = document.createElement('div');
            barFill.className = 'breakdown-item-bar-fill';
            const total = data.total || 0;
            const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            barFill.style.width = `${widthPct}%`;
            barTrack.appendChild(barFill);
            const totalEl = document.createElement('span');
            totalEl.className = 'breakdown-item-total';
            totalEl.textContent = formatCurrency(total);
            li.appendChild(name);
            li.appendChild(barTrack);
            li.appendChild(totalEl);
            list.appendChild(li);
          }
          breakdownEl.innerHTML = '';
          breakdownEl.appendChild(list);
        })
        .catch(() => {
          const list = document.createElement('ul');
          list.className = 'breakdown-list';
          const maxTotal = Math.max(...entries.map(([, data]) => data.total || 0));
          for (const [categoryId, data] of entries) {
            const li = document.createElement('li');
            li.className = 'breakdown-item';
            const name = document.createElement('span');
            name.className = 'breakdown-item-name';
            name.textContent = categoryId === 'uncategorized' ? t('reports.uncategorized') : categoryId;
            const barTrack = document.createElement('div');
            barTrack.className = 'breakdown-item-bar-track';
            const barFill = document.createElement('div');
            barFill.className = 'breakdown-item-bar-fill';
            const total = data.total || 0;
            const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            barFill.style.width = `${widthPct}%`;
            barTrack.appendChild(barFill);
            const totalEl = document.createElement('span');
            totalEl.className = 'breakdown-item-total';
            totalEl.textContent = formatCurrency(total);
            li.appendChild(name);
            li.appendChild(barTrack);
            li.appendChild(totalEl);
            list.appendChild(li);
          }
          breakdownEl.innerHTML = '';
          breakdownEl.appendChild(list);
        });
    } catch (e) {
      breakdownEl.textContent = t('reports.errorBreakdown', { error: e.message });
    }
  }

  async function loadTopSpending() {
    try {
      const breakdown = await modules.reporting.getMonthCategoryBreakdown({ userId, monthKey });
      const entries = Object.entries(breakdown.byCategory?.expense || breakdown.byCategory || {})
        .map(([categoryId, data]) => ({ categoryId, total: data.total || 0 }))
        .filter(item => item.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      if (entries.length === 0) {
        spendingEl.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state empty-state--reports';
      empty.innerHTML = `
        <div class="empty-state-icon">🏷️</div>
        <p class="empty-state-title">${t('reports.noSpendingData')}</p>
        <p class="empty-state-desc">${t('reports.spendingDesc')}</p>
      `;

        spendingEl.appendChild(empty);
        return;
      }

      const categoryIds = entries.map(e => e.categoryId);
      const uniqueCategoryIds = [...new Set(categoryIds)];

      modules.category.getCategories({ userId })
        .then((categories) => {
          const categoryMap = new Map();
          for (const cat of categories) {
            categoryMap.set(cat.id, cat.name);
          }

          const chartData = entries.map(entry => ({
            label: entry.categoryId === 'uncategorized' ? t('reports.uncategorized') : (categoryMap.get(entry.categoryId) || categoryId),
            value: entry.total,
          }));

          const chart = createHorizontalBarChart({
            data: chartData,
            width: spendingEl.clientWidth || 800,
            height: Math.max(120, chartData.length * 36),
            ariaLabel: t('reports.topSpendingAria'),
          });

          spendingEl.innerHTML = '';
          spendingEl.appendChild(chart);
        })
        .catch(() => {
          spendingEl.textContent = t('reports.unableToLoadCategories');
        });
    } catch (e) {
      spendingEl.textContent = t('reports.errorSpending', { error: e.message });
    }
  }

  // Initial load
  loadSummary();
  loadCashFlowTrend();
  loadCategoryBreakdown();
  loadTopSpending();

  return root;
}
