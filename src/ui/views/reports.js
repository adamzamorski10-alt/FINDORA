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

  const heading = document.createElement('h2');
  heading.textContent = 'Reports';
  root.appendChild(heading);

  const summarySection = document.createElement('div');
  summarySection.className = 'report-section';

  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Monthly Summary';
  summarySection.appendChild(summaryTitle);

  const monthKey = state.getState().ui.monthKey || new Date().toISOString().slice(0, 7);

  const summaryEl = document.createElement('div');
  summaryEl.className = 'report-summary';
  summaryEl.textContent = 'Loading...';
  summarySection.appendChild(summaryEl);

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
      summaryEl.innerHTML = `
        <p><strong>Month:</strong> ${summary.monthKey}</p>
        <p><strong>Income:</strong> ${summary.income.toFixed(2)}</p>
        <p><strong>Expense:</strong> ${summary.expense.toFixed(2)}</p>
        <p><strong>Net:</strong> ${summary.net.toFixed(2)}</p>
        <p><strong>Transactions:</strong> ${summary.transactionCount}</p>
      `;
    })
    .catch(e => {
      summaryEl.textContent = 'Error loading summary: ' + e.message;
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
          for (const [categoryId, data] of entries) {
            const li = document.createElement('li');
            li.className = 'breakdown-item';
            const name = document.createElement('span');
            if (categoryId === 'uncategorized') {
              name.textContent = 'Uncategorized';
            } else {
              name.textContent = categoryMap.get(categoryId) || categoryId;
            }
            const total = document.createElement('span');
            total.textContent = data.total.toFixed(2);
            li.appendChild(name);
            li.appendChild(total);
            list.appendChild(li);
          }
          breakdownEl.innerHTML = '';
          breakdownEl.appendChild(list);
        })
        .catch(() => {
          const list = document.createElement('ul');
          list.className = 'breakdown-list';
          for (const [categoryId, data] of entries) {
            const li = document.createElement('li');
            li.className = 'breakdown-item';
            const name = document.createElement('span');
            name.textContent = categoryId === 'uncategorized' ? 'Uncategorized' : categoryId;
            const total = document.createElement('span');
            total.textContent = data.total.toFixed(2);
            li.appendChild(name);
            li.appendChild(total);
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
