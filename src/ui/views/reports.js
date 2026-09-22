export function render(context = {}) {
  const { state, modules } = context;

  if (!state || !modules) {
    const el = document.createElement('div');
    el.className = 'view-placeholder';
    el.innerHTML = '<h2>Reports</h2><p>Reports placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const root = document.createElement('div');
  root.className = 'reports-view';

  const header = document.createElement('div');
  header.className = 'reports-header';
  const title = document.createElement('h2');
  title.textContent = 'Reports';
  const subtitle = document.createElement('p');
  subtitle.className = 'reports-subtitle';
  subtitle.textContent = 'Monthly financial performance overview';
  header.appendChild(title);
  header.appendChild(subtitle);
  root.appendChild(header);

  const monthKey = state.getState().ui.monthKey || new Date().toISOString().slice(0, 7);

  const summarySection = document.createElement('div');
  summarySection.className = 'report-section';

  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Monthly Summary';
  summarySection.appendChild(summaryTitle);

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'report-summary-grid';

  const incomeCard = document.createElement('div');
  incomeCard.className = 'summary-card';
  const incomeLabel = document.createElement('span');
  incomeLabel.className = 'summary-card-label';
  incomeLabel.textContent = 'Income';
  const incomeValue = document.createElement('span');
  incomeValue.className = 'summary-card-value amount amount-positive';
  incomeValue.textContent = '—';
  incomeCard.appendChild(incomeLabel);
  incomeCard.appendChild(incomeValue);
  summaryGrid.appendChild(incomeCard);

  const expenseCard = document.createElement('div');
  expenseCard.className = 'summary-card';
  const expenseLabel = document.createElement('span');
  expenseLabel.className = 'summary-card-label';
  expenseLabel.textContent = 'Expenses';
  const expenseValue = document.createElement('span');
  expenseValue.className = 'summary-card-value amount amount-negative';
  expenseValue.textContent = '—';
  expenseCard.appendChild(expenseLabel);
  expenseCard.appendChild(expenseValue);
  summaryGrid.appendChild(expenseCard);

  const netCard = document.createElement('div');
  netCard.className = 'summary-card';
  const netLabel = document.createElement('span');
  netLabel.className = 'summary-card-label';
  netLabel.textContent = 'Net';
  const netValue = document.createElement('span');
  netValue.className = 'summary-card-value amount amount-neutral';
  netValue.textContent = '—';
  netCard.appendChild(netLabel);
  netCard.appendChild(netValue);
  summaryGrid.appendChild(netCard);

  const txCard = document.createElement('div');
  txCard.className = 'summary-card';
  const txLabel = document.createElement('span');
  txLabel.className = 'summary-card-label';
  txLabel.textContent = 'Transactions';
  const txValue = document.createElement('span');
  txValue.className = 'summary-card-value amount amount-neutral';
  txValue.textContent = '—';
  txCard.appendChild(txLabel);
  txCard.appendChild(txValue);
  summaryGrid.appendChild(txCard);

  summarySection.appendChild(summaryGrid);
  root.appendChild(summarySection);

  const breakdownSection = document.createElement('div');
  breakdownSection.className = 'report-section';

  const breakdownTitle = document.createElement('h3');
  breakdownTitle.textContent = 'Category Breakdown';
  breakdownSection.appendChild(breakdownTitle);

  const breakdownEl = document.createElement('div');
  breakdownEl.className = 'report-breakdown';
  breakdownEl.textContent = 'Loading...';
  breakdownSection.appendChild(breakdownEl);

  root.appendChild(breakdownSection);

  modules.reporting.getMonthlySummary({ userId: state.getState().session.userId, monthKey })
    .then(summary => {
      incomeValue.textContent = formatCurrency(summary.income);
      expenseValue.textContent = formatCurrency(summary.expense);
      netValue.textContent = formatCurrency(summary.net);
      txValue.textContent = String(summary.transactionCount);

      if (summary.net >= 0) {
        netValue.className = 'summary-card-value amount amount-positive';
      } else {
        netValue.className = 'summary-card-value amount amount-negative';
      }
    })
    .catch(e => {
      incomeValue.textContent = 'Error';
      expenseValue.textContent = 'Error';
      netValue.textContent = 'Error';
      txValue.textContent = 'Error';
    });

  modules.reporting.getMonthCategoryBreakdown({ userId: state.getState().session.userId, monthKey })
    .then(breakdown => {
      const entries = Object.entries(breakdown.byCategory);
      if (entries.length === 0) {
        breakdownEl.textContent = 'No data for this month.';
        return;
      }

      const categoryIds = entries.map(([categoryId]) => categoryId);
      const uniqueCategoryIds = [...new Set(categoryIds)];

      modules.category.getCategories({ userId: state.getState().session.userId })
        .then((categories) => {
          const categoryMap = new Map();
          for (const category of categories) {
            categoryMap.set(category.id, category.name);
          }

          const list = document.createElement('ul');
          list.className = 'breakdown-list';
          const maxTotal = Math.max(...entries.map(([, data]) => data.total || 0));
          for (const [categoryId, data] of entries) {
            const li = document.createElement('li');
            li.className = 'breakdown-item';
            const name = document.createElement('span');
            name.className = 'breakdown-item-name';
            if (categoryId === 'uncategorized') {
              name.textContent = 'Uncategorized';
            } else {
              name.textContent = categoryMap.get(categoryId) || categoryId;
            }
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
            name.textContent = categoryId === 'uncategorized' ? 'Uncategorized' : categoryId;
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
    })
    .catch(e => {
      breakdownEl.textContent = 'Error loading breakdown: ' + e.message;
    });

  return root;
}

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
}
