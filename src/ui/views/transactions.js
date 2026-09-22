/**
 * Stage UI-4 — Transactions View
 *
 * Premium transaction management screen built on the UI-1 design system.
 */

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

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
    el.innerHTML = '<h2>Transactions</h2><p>Transactions placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const snapshot = state.getState();
  const transactions = snapshot.transactions?.items || [];
  const loading = snapshot.transactions?.loading || false;
  const error = snapshot.transactions?.error || null;
  const form = snapshot.transactionForm || {};
  const accounts = snapshot.accounts?.items || [];
  const monthKey = snapshot.ui?.monthKey || new Date().toISOString().slice(0, 7);

  const root = document.createElement('div');
  root.className = 'transactions-view';

  const header = document.createElement('div');
  header.className = 'transactions-header';
  const title = document.createElement('h2');
  title.textContent = 'Transactions';
  const subtitle = document.createElement('p');
  subtitle.className = 'transactions-subtitle';
  subtitle.textContent = 'Review and manage your transactions';
  header.appendChild(title);
  header.appendChild(subtitle);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary transactions-add-btn';
  addBtn.textContent = 'Add Transaction';
  addBtn.addEventListener('click', () => {
    state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
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
    loadingEl.textContent = 'Loading transactions...';
    root.appendChild(loadingEl);
    return root;
  }

  if (transactions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '📝';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = 'No transactions this month';
    const emptyDesc = document.createElement('p');
    emptyDesc.className = 'empty-state-desc';
    emptyDesc.textContent = 'Create your first transaction to start tracking your cash flow.';
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = 'Add Transaction';
    emptyAction.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'transactions-list';

    const accountMap = new Map();
    for (const acc of accounts) {
      accountMap.set(acc.id, acc.name);
    }

    const categoryMap = new Map();
    if (modules.category) {
      modules.category.getCategories({ userId: snapshot.session.userId })
        .then((categories) => {
          for (const cat of categories) {
            categoryMap.set(cat.id, cat.name);
          }
          const items = list.querySelectorAll('.transaction-item');
          items.forEach(item => {
            const txId = item.dataset.transactionId;
            const tx = transactions.find(t => t.id === txId);
            if (tx) {
              const metaEl = item.querySelector('.transaction-item-meta');
              if (metaEl) {
                metaEl.textContent = `${accountMap.get(tx.accountId) || tx.accountId} • ${categoryMap.get(tx.categoryId) || tx.categoryId || 'Uncategorized'} • ${tx.date}`;
              }
            }
          });
        })
        .catch(() => {});
    }

    for (const tx of transactions) {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.transactionId = tx.id;

      const left = document.createElement('div');
      left.className = 'transaction-item-left';

      const typeIcon = document.createElement('div');
      typeIcon.className = `transaction-type-icon ${tx.type === 'income' ? 'income' : 'expense'}`;
      typeIcon.textContent = tx.type === 'income' ? '↓' : '↑';
      left.appendChild(typeIcon);

      const info = document.createElement('div');
      info.className = 'transaction-item-info';
      const desc = document.createElement('div');
      desc.className = 'transaction-item-desc';
      desc.textContent = tx.description || '(no description)';
      const meta = document.createElement('div');
      meta.className = 'transaction-item-meta';
      meta.textContent = `${accountMap.get(tx.accountId) || tx.accountId} • ${categoryMap.get(tx.categoryId) || tx.categoryId || 'Uncategorized'} • ${tx.date}`;
      info.appendChild(desc);
      info.appendChild(meta);
      left.appendChild(info);
      li.appendChild(left);

      const right = document.createElement('div');
      right.className = 'transaction-item-right';
      const amountEl = document.createElement('span');
      amountEl.className = `transaction-item-amount amount ${tx.type === 'income' ? 'amount-positive' : 'amount-negative'}`;
      amountEl.textContent = `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`;
      right.appendChild(amountEl);

      const actions = document.createElement('div');
      actions.className = 'transaction-item-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        state.dispatch({
          type: 'SET_TRANSACTION_FORM',
          form: {
            editingId: tx.id,
            accountId: tx.accountId,
            amount: String(tx.amount),
            type: tx.type,
            categoryId: tx.categoryId || '',
            description: tx.description || '',
            date: tx.date,
            notes: tx.notes || '',
          },
        });
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'btn btn-danger';
      archiveBtn.textContent = 'Archive';
      archiveBtn.addEventListener('click', async () => {
        if (!confirm('Archive this transaction?')) return;
        state.dispatch({ type: 'OPERATION_START', key: 'archiveTransaction' });
        try {
          await modules.transaction.archiveTransaction({ transactionId: tx.id });
          const refreshed = await modules.transaction.getTransactionsByMonth({
            userId: state.getState().session.userId,
            monthKey: state.getState().ui.monthKey || new Date().toISOString().slice(0, 7),
          });
          state.dispatch({ type: 'SET_TRANSACTIONS', transactions: refreshed });
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'archiveTransaction', error: e.message });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'archiveTransaction' });
        }
      });
      actions.appendChild(archiveBtn);

      right.appendChild(actions);
      li.appendChild(right);
      list.appendChild(li);
    }
    root.appendChild(list);
  }

  const createSection = document.createElement('div');
  createSection.className = 'create-transaction-section';

  const isEditing = form.editingId !== null && form.editingId !== undefined;

  const formTitle = document.createElement('h3');
  formTitle.className = 'form-section-title';
  formTitle.textContent = isEditing ? 'Edit Transaction' : 'Create Transaction';
  createSection.appendChild(formTitle);

  const formEl = document.createElement('form');
  formEl.className = 'transaction-form';

  const accountSelect = document.createElement('select');
  accountSelect.className = 'form-select';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select account';
  accountSelect.appendChild(defaultOption);
  for (const account of accounts) {
    const opt = document.createElement('option');
    opt.value = account.id;
    opt.textContent = account.name;
    if (account.id === form.accountId) opt.selected = true;
    accountSelect.appendChild(opt);
  }
  accountSelect.addEventListener('change', (e) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { accountId: e.target.value } });
  });

  const accountWrapper = document.createElement('div');
  accountWrapper.className = 'form-field';
  const accountLabel = document.createElement('label');
  accountLabel.textContent = 'Account';
  accountWrapper.appendChild(accountLabel);
  accountWrapper.appendChild(accountSelect);
  formEl.appendChild(accountWrapper);

  const typeField = createSelectField('Type', TYPE_OPTIONS, form.type || 'expense', (value) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { type: value } });
    refreshCategoryOptions();
  });
  formEl.appendChild(typeField);

  const amountField = createField('Amount', 'number', form.amount || '', (value) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { amount: value } });
  });
  const amountHint = document.createElement('span');
  amountHint.className = 'form-hint';
  amountHint.textContent = 'Enter a positive amount.';
  amountField.appendChild(amountHint);
  formEl.appendChild(amountField);

  const categoryWrapper = document.createElement('div');
  categoryWrapper.className = 'form-field';
  const categoryLabel = document.createElement('label');
  categoryLabel.textContent = 'Category (optional)';
  categoryWrapper.appendChild(categoryLabel);

  const categorySelect = document.createElement('select');
  categorySelect.className = 'form-select';
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'None';
  categorySelect.appendChild(noneOption);
  categoryWrapper.appendChild(categorySelect);
  formEl.appendChild(categoryWrapper);

  categorySelect.addEventListener('change', (e) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { categoryId: e.target.value } });
  });

  if (form.categoryId) {
    categorySelect.value = form.categoryId;
  }

  async function refreshCategoryOptions() {
    if (!modules.category) return;
    try {
      const categories = await modules.category.getCategories({ userId: state.getState().session.userId });
      const currentType = state.getState().transactionForm?.type || 'expense';
      while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
      }
      for (const category of categories) {
        if (category.systemRole === 'opening-balance') continue;
        if (category.archived) continue;
        if (category.type !== currentType) continue;
        const opt = document.createElement('option');
        opt.value = category.id;
        opt.textContent = category.name;
        categorySelect.appendChild(opt);
      }
      const currentCategoryId = state.getState().transactionForm?.categoryId;
      if (currentCategoryId) {
        const stillValid = Array.from(categorySelect.options).some(o => o.value === currentCategoryId);
        if (!stillValid) {
          categorySelect.value = '';
          state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { categoryId: '' } });
        } else {
          categorySelect.value = currentCategoryId;
        }
      }
    } catch {
      // leave select as-is on load failure
    }
  }

  refreshCategoryOptions();

  const descField = createField('Description', 'text', form.description || '', (value) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { description: value } });
  });
  formEl.appendChild(descField);

  const dateField = createField('Date (YYYY-MM-DD)', 'text', form.date || new Date().toISOString().slice(0, 10), (value) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { date: value } });
  });
  formEl.appendChild(dateField);

  const notesField = createField('Notes (optional)', 'text', form.notes || '', (value) => {
    state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { notes: value } });
  });
  formEl.appendChild(notesField);

  const formActions = document.createElement('div');
  formActions.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Transaction';
  submitBtn.className = 'btn btn-primary';
  formActions.appendChild(submitBtn);

  if (isEditing) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
    });
    formActions.appendChild(cancelBtn);
  }

  formEl.appendChild(formActions);

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const operationKey = isEditing ? 'updateTransaction' : 'createTransaction';
    if (state.getState().operations[operationKey]?.loading) return;

    const currentForm = state.getState().transactionForm;
    const accountId = currentForm.accountId?.trim();
    const rawAmount = currentForm.amount === '' ? undefined : Number(currentForm.amount);
    const amount = rawAmount === undefined ? NaN : rawAmount;
    const type = currentForm.type;
    const categoryId = currentForm.categoryId?.trim() || null;
    const description = currentForm.description?.trim();
    const date = currentForm.date;
    const notes = currentForm.notes?.trim();

    if (!accountId || !Number.isFinite(amount) || amount <= 0 || !type || !description || !date) {
      alert('Please fill in all required fields with valid values.');
      return;
    }

    state.dispatch({ type: 'OPERATION_START', key: operationKey });

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEditing) {
        await modules.transaction.updateTransaction({
          transactionId: currentForm.editingId,
          updates: { accountId, amount, type, categoryId, description, date, notes },
        });
      } else {
        await modules.transaction.createTransaction({
          userId: state.getState().session.userId,
          accountId,
          amount,
          type,
          categoryId,
          description,
          date,
          notes,
        });
      }

      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });

      const refreshed = await modules.transaction.getTransactionsByMonth({
        userId: state.getState().session.userId,
        monthKey: state.getState().ui.monthKey || new Date().toISOString().slice(0, 7),
      });
      state.dispatch({ type: 'SET_TRANSACTIONS', transactions: refreshed });
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

function createSelectField(label, options, selected, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const select = document.createElement('select');
  select.className = 'form-select';
  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    if (option.value === selected) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', (e) => onChange(e.target.value));
  wrapper.appendChild(select);

  return wrapper;
}
