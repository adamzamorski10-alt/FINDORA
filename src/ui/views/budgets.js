/**
 * Stage UI-5 — Budgets View
 *
 * Premium budget planning screen built on the UI-1 design system.
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
    el.innerHTML = '<h2>Budgets</h2><p>Budgets placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const snapshot = state.getState();
  const budgets = snapshot.budgets?.items || [];
  const loading = snapshot.budgets?.loading || false;
  const error = snapshot.budgets?.error || null;
  const form = snapshot.budgetForm || {};
  const monthKey = snapshot.ui?.monthKey || new Date().toISOString().slice(0, 7);

  const root = document.createElement('div');
  root.className = 'budgets-view';

  const header = document.createElement('div');
  header.className = 'budgets-header';
  const title = document.createElement('h2');
  title.textContent = 'Budgets';
  const subtitle = document.createElement('p');
  subtitle.className = 'budgets-subtitle';
  subtitle.textContent = 'Plan and track your spending limits';
  header.appendChild(title);
  header.appendChild(subtitle);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary budgets-add-btn';
  addBtn.textContent = 'Add Budget';
  addBtn.addEventListener('click', () => {
    state.dispatch({ type: 'RESET_BUDGET_FORM' });
  });
  header.appendChild(addBtn);
  root.appendChild(header);

  const monthNav = document.createElement('div');
  monthNav.className = 'month-nav';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'month-nav-btn';
  prevBtn.textContent = '‹';
  prevBtn.setAttribute('aria-label', 'Previous month');
  prevBtn.addEventListener('click', () => {
    const [year, month] = monthKey.split('-').map(Number);
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: `${newYear}-${String(newMonth).padStart(2, '0')}` });
  });
  const monthLabel = document.createElement('span');
  monthLabel.className = 'month-nav-label';
  monthLabel.textContent = formatMonthLabel(monthKey);
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'month-nav-btn';
  nextBtn.textContent = '›';
  nextBtn.setAttribute('aria-label', 'Next month');
  nextBtn.addEventListener('click', () => {
    const [year, month] = monthKey.split('-').map(Number);
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    state.dispatch({ type: 'SET_MONTH_KEY', monthKey: `${newYear}-${String(newMonth).padStart(2, '0')}` });
  });
  monthNav.appendChild(prevBtn);
  monthNav.appendChild(monthLabel);
  monthNav.appendChild(nextBtn);
  root.appendChild(monthNav);

  if (error) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = error;
    root.appendChild(errorEl);
  }

  if (loading) {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-message';
    loadingEl.textContent = 'Loading budgets...';
    root.appendChild(loadingEl);
    return root;
  }

  const categoryMap = new Map();

  if (budgets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '📊';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = 'No active budgets';
    const emptyDesc = document.createElement('p');
    emptyDesc.className = 'empty-state-desc';
    emptyDesc.textContent = 'Create a budget to start tracking your spending limits by category.';
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = 'Add Budget';
    emptyAction.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_BUDGET_FORM' });
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const summary = document.createElement('div');
    summary.className = 'budgets-summary';
    const totalEl = document.createElement('div');
    totalEl.className = 'budgets-summary-item';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'budgets-summary-label';
    totalLabel.textContent = 'Total Budgeted';
    const totalValue = document.createElement('span');
    totalValue.className = 'budgets-summary-value amount amount-neutral';
    totalValue.textContent = '…';
    totalEl.appendChild(totalLabel);
    totalEl.appendChild(totalValue);
    summary.appendChild(totalEl);

    const spentEl = document.createElement('div');
    spentEl.className = 'budgets-summary-item';
    const spentLabel = document.createElement('span');
    spentLabel.className = 'budgets-summary-label';
    spentLabel.textContent = 'Total Spent';
    const spentValue = document.createElement('span');
    spentValue.className = 'budgets-summary-value amount amount-neutral';
    spentValue.textContent = '…';
    spentEl.appendChild(spentLabel);
    spentEl.appendChild(spentValue);
    summary.appendChild(spentEl);

    const remainingEl = document.createElement('div');
    remainingEl.className = 'budgets-summary-item';
    const remainingLabel = document.createElement('span');
    remainingLabel.className = 'budgets-summary-label';
    remainingLabel.textContent = 'Remaining';
    const remainingValue = document.createElement('span');
    remainingValue.className = 'budgets-summary-value amount amount-neutral';
    remainingValue.textContent = '…';
    remainingEl.appendChild(remainingLabel);
    remainingEl.appendChild(remainingValue);
    summary.appendChild(remainingEl);
    root.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'budgets-grid';

    const budgetProgressMap = new Map();

    for (const budget of budgets) {
      const card = document.createElement('div');
      card.className = 'budget-card';
      card.dataset.budgetId = budget.id;

      const header = document.createElement('div');
      header.className = 'budget-card-header';

      const nameEl = document.createElement('div');
      nameEl.className = 'budget-card-name';
      nameEl.textContent = budget.categoryId;
      header.appendChild(nameEl);

      const actions = document.createElement('div');
      actions.className = 'budget-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        state.dispatch({
          type: 'SET_BUDGET_FORM',
          form: {
            editingId: budget.id,
            categoryId: budget.categoryId,
            amount: String(budget.amount),
          },
        });
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'btn btn-danger';
      archiveBtn.textContent = 'Archive';
      archiveBtn.addEventListener('click', async () => {
        if (!confirm('Archive this budget?')) return;
        state.dispatch({ type: 'OPERATION_START', key: 'archiveBudget' });
        try {
          await modules.budget.archiveBudget({ budgetId: budget.id });
          const refreshed = await modules.budget.getBudgets({ userId: state.getState().session.userId });
          state.dispatch({ type: 'SET_BUDGETS', budgets: refreshed });
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'archiveBudget', error: e.message });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'archiveBudget' });
        }
      });
      actions.appendChild(archiveBtn);

      header.appendChild(actions);
      card.appendChild(header);

      const body = document.createElement('div');
      body.className = 'budget-card-body';

      const amountRow = document.createElement('div');
      amountRow.className = 'budget-card-amounts';
      const budgetAmount = document.createElement('span');
      budgetAmount.className = 'budget-card-budget amount amount-neutral';
      budgetAmount.textContent = formatCurrency(budget.amount);
      const spentAmount = document.createElement('span');
      spentAmount.className = 'budget-card-spent amount amount-negative';
      spentAmount.textContent = '0.00';
      amountRow.appendChild(budgetAmount);
      amountRow.appendChild(spentAmount);
      body.appendChild(amountRow);

      const progressTrack = document.createElement('div');
      progressTrack.className = 'progress-bar-track';
      const progressFill = document.createElement('div');
      progressFill.className = 'progress-bar-fill';
      progressFill.style.width = '0%';
      progressTrack.appendChild(progressFill);
      body.appendChild(progressTrack);

      const remainingText = document.createElement('div');
      remainingText.className = 'budget-card-remaining';
      remainingText.textContent = 'Loading...';
      body.appendChild(remainingText);

      card.appendChild(body);
      grid.appendChild(card);

      budgetProgressMap.set(budget.id, { card: card, spentEl: spentAmount, progressFill, remainingText, budgetAmount });
    }
    root.appendChild(grid);

    if (modules.category) {
      modules.category.getCategories({ userId: snapshot.session.userId })
        .then((categories) => {
          for (const category of categories) {
            categoryMap.set(category.id, category.name);
          }
          const cards = grid.querySelectorAll('.budget-card');
          cards.forEach(card => {
            const budgetId = card.dataset.budgetId;
            const budget = budgets.find(b => b.id === budgetId);
            if (budget) {
              const nameEl = card.querySelector('.budget-card-name');
              if (nameEl) nameEl.textContent = categoryMap.get(budget.categoryId) || budget.categoryId;
            }
          });
        })
        .catch(() => {});
    }

    if (modules.budget) {
      const budgetPromises = budgets.map(async (budget) => {
        try {
          const progress = await modules.budget.getBudgetProgress({ budgetId: budget.id, monthKey });
          const entry = budgetProgressMap.get(budget.id);
          if (!entry) return;
          const pct = budget.amount > 0 ? Math.min((progress.spent / budget.amount) * 100, 100) : 0;
          entry.progressFill.style.width = `${pct}%`;
          entry.progressFill.className = `progress-bar-fill${progress.overBudget ? ' over-budget' : ''}`;
          entry.spentEl.textContent = formatCurrency(progress.spent);
          entry.spentEl.className = `budget-card-spent amount ${progress.overBudget ? 'amount-negative' : 'amount-neutral'}`;
          entry.remainingText.textContent = progress.overBudget
            ? `Over by ${formatCurrency(progress.spent - budget.amount)}`
            : `${formatCurrency(progress.remaining)} remaining`;
          return progress;
        } catch (_e) {
          return null;
        }
      });

      Promise.all(budgetPromises).then((results) => {
        let totalBudgeted = 0;
        let totalSpent = 0;
        let totalRemaining = 0;
        for (let i = 0; i < results.length; i++) {
          const progress = results[i];
          const budget = budgets[i];
          if (!budget || !progress) continue;
          totalBudgeted += budget.amount;
          totalSpent += progress.spent;
          totalRemaining += progress.remaining;
        }
        const summaryValues = root.querySelectorAll('.budgets-summary-value');
        if (summaryValues.length >= 3) {
          summaryValues[0].textContent = formatCurrency(totalBudgeted);
          summaryValues[0].className = 'budgets-summary-value amount amount-neutral';
          summaryValues[1].textContent = formatCurrency(totalSpent);
          summaryValues[1].className = `budgets-summary-value amount ${totalSpent > totalBudgeted ? 'amount-negative' : 'amount-neutral'}`;
          summaryValues[2].textContent = formatCurrency(totalRemaining);
          summaryValues[2].className = `budgets-summary-value amount ${totalRemaining < 0 ? 'amount-negative' : 'amount-positive'}`;
        }
      }).catch(() => {});
    }
  }

  const createSection = document.createElement('div');
  createSection.className = 'create-budget-section';

  const isEditing = form.editingId !== null && form.editingId !== undefined;

  const formTitle = document.createElement('h3');
  formTitle.className = 'form-section-title';
  formTitle.textContent = isEditing ? 'Edit Budget' : 'Create Budget';
  createSection.appendChild(formTitle);

  const formEl = document.createElement('form');
  formEl.className = 'budget-form';

  const categorySelect = document.createElement('select');
  categorySelect.className = 'form-select';
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'Select category';
  categorySelect.appendChild(noneOption);
  formEl.appendChild(categorySelect);

  const categoryWrapper = document.createElement('div');
  categoryWrapper.className = 'form-field';
  const categoryLabel = document.createElement('label');
  categoryLabel.textContent = 'Category';
  categoryWrapper.appendChild(categoryLabel);
  categoryWrapper.appendChild(categorySelect);
  formEl.appendChild(categoryWrapper);

  categorySelect.addEventListener('change', (e) => {
    state.dispatch({ type: 'SET_BUDGET_FORM', form: { categoryId: e.target.value } });
  });

  if (form.categoryId) {
    categorySelect.value = form.categoryId;
  }

  const amountField = createField('Amount', 'number', form.amount || '', (value) => {
    state.dispatch({ type: 'SET_BUDGET_FORM', form: { amount: value } });
  });
  const amountHint = document.createElement('span');
  amountHint.className = 'form-hint';
  amountHint.textContent = 'Monthly spending limit. Must be a positive value.';
  amountField.appendChild(amountHint);
  formEl.appendChild(amountField);

  const formActions = document.createElement('div');
  formActions.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Budget';
  submitBtn.className = 'btn btn-primary';
  formActions.appendChild(submitBtn);

  if (isEditing) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_BUDGET_FORM' });
    });
    formActions.appendChild(cancelBtn);
  }

  formEl.appendChild(formActions);

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const operationKey = isEditing ? 'updateBudget' : 'createBudget';
    if (state.getState().operations[operationKey]?.loading) return;

    const currentForm = state.getState().budgetForm;
    const categoryId = currentForm.categoryId?.trim();
    const rawAmount = currentForm.amount === '' ? undefined : Number(currentForm.amount);
    const amount = rawAmount === undefined ? NaN : rawAmount;

    if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
      alert('Please fill in all fields with valid values.');
      return;
    }

    state.dispatch({ type: 'OPERATION_START', key: operationKey });

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEditing) {
        await modules.budget.updateBudget({
          budgetId: currentForm.editingId,
          amount,
        });
      } else {
        await modules.budget.createBudget({
          userId: state.getState().session.userId,
          categoryId,
          amount,
        });
      }

      state.dispatch({ type: 'RESET_BUDGET_FORM' });

      const refreshed = await modules.budget.getBudgets({ userId: state.getState().session.userId });
      state.dispatch({ type: 'SET_BUDGETS', budgets: refreshed });
    } catch (e) {
      state.dispatch({ type: 'OPERATION_ERROR', key: operationKey, error: e.message });
    } finally {
      state.dispatch({ type: 'OPERATION_STOP', key: operationKey });
      const finalBtn = formEl.querySelector('button[type="submit"]');
      if (finalBtn) finalBtn.disabled = false;
    }
  });

  createSection.appendChild(formEl);
  root.appendChild(createSection);

  if (modules.category) {
    modules.category.getCategories({ userId: snapshot.session.userId })
      .then((categories) => {
        while (categorySelect.options.length > 1) {
          categorySelect.remove(1);
        }
        for (const category of categories) {
          if (category.systemRole === 'opening-balance') continue;
          if (category.systemRole === 'savings') continue;
          if (category.archived) continue;
          if (category.type !== 'expense') continue;
          const opt = document.createElement('option');
          opt.value = category.id;
          opt.textContent = category.name;
          categorySelect.appendChild(opt);
        }
        if (form.categoryId) {
          const stillValid = Array.from(categorySelect.options).some(o => o.value === form.categoryId);
          if (stillValid) {
            categorySelect.value = form.categoryId;
          } else {
            categorySelect.value = '';
            state.dispatch({ type: 'SET_BUDGET_FORM', form: { categoryId: '' } });
          }
        }
        for (const budget of budgets) {
          const item = categoryMap.get(budget.categoryId) || budget.categoryId;
          const nameEl = grid.querySelector(`[data-budget-id="${budget.id}"] .budget-card-name`);
          if (nameEl) nameEl.textContent = item;
        }
      })
      .catch(() => {});
  }

  return root;
}

function createField(label, type, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.className = 'form-input';
  input.addEventListener('input', (e) => onChange(e.target.value));
  wrapper.appendChild(input);

  return wrapper;
}
