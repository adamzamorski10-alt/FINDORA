/**
 * Stage UI-5 — Transactions View (Premium Fintech Redesign)
 *
 * Premium financial transactions screen with modal/bottom-sheet form,
 * monthly summary, filter bar, and polished transaction list.
 * Preserves all domain contracts and key DOM selector contracts.
 */

import { createFormStateBuffer } from '../utils/form-state.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';
import { createSvgIcon } from '../utils/icons.js';
import { t } from '../i18n.js';
import { formatCurrency as formatLocaleCurrency, formatMonthLabel as formatLocaleMonthLabel, getMonthNames } from '../i18n-format.js';

function formatCurrency(value) {
  return formatLocaleCurrency(value, 'PLN');
}

function formatMonthLabel(monthKey) {
  return formatLocaleMonthLabel(monthKey);
}

const MONTH_NAMES = getMonthNames();

const TYPE_OPTIONS = [
  { value: 'expense', labelKey: 'transactions.expense', label: 'Expense' },
  { value: 'income', labelKey: 'transactions.income', label: 'Income' },
];

function el(tag, className, textContent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (textContent !== undefined) e.textContent = textContent;
  return e;
}

function createSkeletonListItems(count = 4) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'skeleton-list-item';
    const icon = document.createElement('div');
    icon.className = 'skeleton skeleton-list-item-icon';
    item.appendChild(icon);
    const body = document.createElement('div');
    body.className = 'skeleton-list-item-body';
    const line1 = document.createElement('div');
    line1.className = 'skeleton skeleton-text skeleton-text--md';
    const line2 = document.createElement('div');
    line2.className = 'skeleton skeleton-text skeleton-text--sm';
    body.appendChild(line1);
    body.appendChild(line2);
    item.appendChild(body);
    const amount = document.createElement('div');
    amount.className = 'skeleton skeleton-text skeleton-text--lg';
    item.appendChild(amount);
    items.push(item);
  }
  return items;
}

export function render(context = {}) {
  const { state, modules } = context;

  if (!state) {
    const placeholder = document.createElement('div');
    placeholder.className = 'view-placeholder';
    placeholder.innerHTML = `<h2>${t('nav.transactions')}</h2><p>${t('common.placeholder') || ''}</p>`;
    return placeholder;
  }

  const snapshot = state.getState();
  const transactions = snapshot.transactions?.items || [];
  const loading = snapshot.transactions?.loading || false;
  const error = snapshot.transactions?.error || null;
  const form = snapshot.transactionForm || {};
  const accounts = snapshot.accounts?.items || [];
  const monthKey = snapshot.ui?.monthKey || new Date().toISOString().slice(0, 7);
  const userId = snapshot.session?.userId;

  const root = document.createElement('div');
  root.className = 'transactions-view';

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = el('h1', 'page-header-title', t('nav.transactions'));
  headerTitles.appendChild(title);
  const subtitle = el('p', 'page-header-subtitle', t('transactions.subtitle'));
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary transactions-add-btn';
  addBtn.textContent = t('transactions.add');
  addBtn.addEventListener('click', () => {
    state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
    openTransactionForm();
  });
  header.appendChild(addBtn);
  root.appendChild(header);

  if (error) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = error;
    root.appendChild(errorEl);
  }

  if (loading) {
    const loadingSurface = document.createElement('div');
    loadingSurface.className = 'surface-analytic';
    const loadingTitle = el('div', 'section-title', t('dashboard.subtitle'));
    loadingSurface.appendChild(loadingTitle);
    const skeletonList = document.createElement('div');
    skeletonList.style.marginTop = 'var(--space-4)';
    skeletonList.style.display = 'flex';
    skeletonList.style.flexDirection = 'column';
    skeletonList.style.gap = '0';
    createSkeletonListItems(5).forEach(item => skeletonList.appendChild(item));
    loadingSurface.appendChild(skeletonList);
    root.appendChild(loadingSurface);
    return root;
  }

  const summaryStrip = document.createElement('div');
  summaryStrip.className = 'summary-strip';

  const incomeItem = document.createElement('div');
  incomeItem.className = 'summary-strip-item';
  const incomeLabel = el('span', 'summary-strip-label', t('dashboard.income'));
  const incomeValue = el('div', 'summary-strip-value summary-strip-value--muted', '—');
  incomeItem.appendChild(incomeLabel);
  incomeItem.appendChild(incomeValue);

  const expenseItem = document.createElement('div');
  expenseItem.className = 'summary-strip-item';
  const expenseLabel = el('span', 'summary-strip-label', t('dashboard.expenses'));
  const expenseValue = el('div', 'summary-strip-value summary-strip-value--muted', '—');
  expenseItem.appendChild(expenseLabel);
  expenseItem.appendChild(expenseValue);

  const netItem = document.createElement('div');
  netItem.className = 'summary-strip-item';
  const netLabel = el('span', 'summary-strip-label', t('dashboard.net'));
  const netValue = el('div', 'summary-strip-value summary-strip-value--muted', '—');
  netItem.appendChild(netLabel);
  netItem.appendChild(netValue);

  const countItem = document.createElement('div');
  countItem.className = 'summary-strip-item';
  const countLabel = el('span', 'summary-strip-label', t('transactions.count'));
  const countValue = el('div', 'summary-strip-value summary-strip-value--muted', '0');
  countItem.appendChild(countLabel);
  countItem.appendChild(countValue);

  summaryStrip.appendChild(incomeItem);
  summaryStrip.appendChild(expenseItem);
  summaryStrip.appendChild(netItem);
  summaryStrip.appendChild(countItem);
  root.appendChild(summaryStrip);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  root.appendChild(filterBar);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'form-input';
  searchInput.placeholder = t('transactions.search');
  searchInput.style.maxWidth = '260px';
  filterBar.appendChild(searchInput);

  const typeSelect = document.createElement('select');
  typeSelect.className = 'form-select';
  typeSelect.style.maxWidth = '160px';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = t('common.allTypes');
  typeSelect.appendChild(allOption);
  for (const opt of TYPE_OPTIONS) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = t(opt.labelKey);
    typeSelect.appendChild(option);
  }
  filterBar.appendChild(typeSelect);

  const accountSelect = document.createElement('select');
  accountSelect.className = 'form-select';
  accountSelect.style.maxWidth = '200px';
  const accountNoneOption = document.createElement('option');
  accountNoneOption.value = '';
  accountNoneOption.textContent = t('common.allAccounts');
  accountSelect.appendChild(accountNoneOption);
  for (const acc of accounts) {
    const option = document.createElement('option');
    option.value = acc.id;
    option.textContent = acc.name;
    accountSelect.appendChild(option);
  }
  filterBar.appendChild(accountSelect);

  function applyFilters() {
    const searchText = searchInput.value.toLowerCase();
    const typeFilter = typeSelect.value;
    const accountFilter = accountSelect.value;
    const items = list.querySelectorAll('.transaction-row');
    items.forEach(item => {
      const txId = item.dataset.transactionId;
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;
      const matchesSearch = !searchText || (tx.description || '').toLowerCase().includes(searchText);
      const matchesType = !typeFilter || tx.type === typeFilter;
      const matchesAccount = !accountFilter || tx.accountId === accountFilter;
      item.style.display = (matchesSearch && matchesType && matchesAccount) ? '' : 'none';
    });
  }

  searchInput.addEventListener('input', applyFilters);
  typeSelect.addEventListener('change', applyFilters);
  accountSelect.addEventListener('change', applyFilters);

  if (transactions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state empty-state--transactions';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '📝';
    const emptyTitle = el('p', 'empty-state-title', t('transactions.noTransactions'));
    const emptyDesc = el('p', 'empty-state-desc', t('transactions.emptyActionDesc'));
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = t('transactions.emptyAction');
    emptyAction.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
      openTransactionForm();
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const listSurface = document.createElement('div');
    listSurface.className = 'surface-list';

    const listHeader = document.createElement('div');
    listHeader.className = 'transaction-list-header';
    const headerDesc = el('div', 'transaction-row-desc', t('common.description'));
    const headerCategory = el('div', 'transaction-row-category', t('common.category'));
    const headerAccount = el('div', 'transaction-row-account', t('accounts.title'));
    const headerDate = el('div', 'transaction-row-date', 'Date');
    const headerAmount = el('div', 'transaction-row-amount', 'Amount');
    listHeader.appendChild(headerDesc);
    listHeader.appendChild(headerCategory);
    listHeader.appendChild(headerAccount);
    listHeader.appendChild(headerDate);
    listHeader.appendChild(headerAmount);
    listSurface.appendChild(listHeader);

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
          const items = listSurface.querySelectorAll('.transaction-row');
          items.forEach(item => {
            const txId = item.dataset.transactionId;
            const tx = transactions.find(t => t.id === txId);
            if (tx) {
              const categoryEl = item.querySelector('.transaction-row-category');
              if (categoryEl) {
                const categoryName = tx.categoryId
                  ? (categoryMap.get(tx.categoryId) || 'Uncategorized')
                  : 'Uncategorized';
                categoryEl.textContent = categoryName;
              }
              const accountEl = item.querySelector('.transaction-row-account');
              if (accountEl) {
                const accountName = accountMap.get(tx.accountId) || tx.accountId;
                accountEl.textContent = accountName;
              }
            }
          });
        })
        .catch(() => {});
    }

    for (const tx of transactions) {
      const row = document.createElement('div');
      row.className = 'transaction-row';
      row.dataset.transactionId = tx.id;

      const desc = el('div', 'transaction-row-desc', tx.description || '(no description)');

      const categoryName = tx.categoryId
        ? (categoryMap.get(tx.categoryId) || 'Uncategorized')
        : 'Uncategorized';
      const categoryEl = el('div', 'transaction-row-category', categoryName);

      const accountName = accountMap.get(tx.accountId) || tx.accountId;
      const accountEl = el('div', 'transaction-row-account', accountName);

      const dateEl = el('div', 'transaction-row-date', tx.date || '');

      const amountClass = tx.type === 'income' ? 'amount-positive' : 'amount-negative';
      const amountEl = el('div', `transaction-row-amount amount ${amountClass}`, `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`);

      const actions = document.createElement('div');
      actions.className = 'transaction-row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'surface-list-item-action';
      editBtn.textContent = '✎';
      editBtn.setAttribute('aria-label', 'Edit');
      editBtn.addEventListener('click', () => {
        if (tx.metadata && tx.metadata.openingBalance) {
          showToast({ message: 'Opening balance transactions cannot be updated.', type: 'error' });
          return;
        }
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
        openTransactionForm(tx.id);
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'surface-list-item-action surface-list-item-action--danger';
      archiveBtn.textContent = '🗑';
      archiveBtn.setAttribute('aria-label', 'Archive');
      archiveBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm({ message: 'Archive this transaction?' });
        if (!confirmed) return;
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

      row.appendChild(desc);
      row.appendChild(categoryEl);
      row.appendChild(accountEl);
      row.appendChild(dateEl);
      row.appendChild(amountEl);
      row.appendChild(actions);
      listSurface.appendChild(row);
    }
    root.appendChild(listSurface);
  }

  if (modules.reporting && typeof modules.reporting.getMonthlySummary === 'function' && userId) {
    modules.reporting.getMonthlySummary({ userId, monthKey })
      .then(summary => {
        if (summary) {
          incomeValue.textContent = formatCurrency(summary.income);
          expenseValue.textContent = formatCurrency(summary.expense);
          netValue.textContent = formatCurrency(summary.net);
          countValue.textContent = String(summary.transactionCount || 0);
          incomeValue.className = `summary-strip-value ${summary.income >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;
          expenseValue.className = `summary-strip-value ${summary.expense >= 0 ? 'summary-strip-value--negative' : 'summary-strip-value--positive'}`;
          const netClass = summary.net > 0 ? 'summary-strip-value--positive' : summary.net < 0 ? 'summary-strip-value--negative' : 'summary-strip-value--muted';
          netValue.className = `summary-strip-value ${netClass}`;
        }
      })
      .catch(() => {
        incomeValue.textContent = '—';
        expenseValue.textContent = '—';
        netValue.textContent = '—';
        countValue.textContent = '0';
      });
  }

  function openTransactionForm(tx = null) {
    let isEditing = false;
    let editingId = null;
    let formSnapshot = state.getState().transactionForm || {};

    if (tx) {
      if (typeof tx === 'string') {
        editingId = tx;
        isEditing = true;
        const found = transactions.find(t => t.id === tx);
        if (found) formSnapshot = found;
      } else {
        isEditing = true;
        editingId = tx.id;
        formSnapshot = tx;
      }
    }

    const buffer = createFormStateBuffer({
      accountId: formSnapshot.accountId || '',
      amount: formSnapshot.amount || '',
      type: formSnapshot.type || 'expense',
      categoryId: formSnapshot.categoryId || '',
      description: formSnapshot.description || '',
      date: formSnapshot.date || new Date().toISOString().slice(0, 10),
      notes: formSnapshot.notes || '',
    });

    const body = document.createElement('div');
    body.className = 'transaction-form-body';

    const accountOptions = [{ value: '', label: 'Select account' }, ...accounts.map(a => ({ value: a.id, label: a.name }))];
    const accountField = createFormSelectField('Account', accountOptions, buffer.getState().accountId, (value) => {
      buffer.setValue('accountId', value);
    });
    body.appendChild(accountField);

    const typeField = createFormSelectField(t('common.type'), TYPE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) })), buffer.getState().type, (value) => {
      buffer.setValue('type', value);
      populateCategoryOptions(value);
    });
    body.appendChild(typeField);

    const amountField = createFormField(t('common.amount'), 'number', buffer.getState().amount, (value) => {
      buffer.setValue('amount', value);
    });
    const amountHint = document.createElement('span');
    amountHint.className = 'form-hint';
    amountHint.textContent = t('common.enterPositiveAmount');
    amountField.appendChild(amountHint);
    body.appendChild(amountField);

    const categoryWrapper = document.createElement('div');
    categoryWrapper.className = 'form-field';
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = t('common.categoryOptional');
    categoryLabel.className = 'form-label';
    categoryWrapper.appendChild(categoryLabel);

    const categorySelect = document.createElement('select');
    categorySelect.className = 'form-select';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = t('common.none');
    categorySelect.appendChild(noneOption);
    categoryWrapper.appendChild(categorySelect);
    body.appendChild(categoryWrapper);

    categorySelect.addEventListener('change', (e) => {
      buffer.setValue('categoryId', e.target.value);
    });

    if (buffer.getState().categoryId) {
      categorySelect.value = buffer.getState().categoryId;
    }

    function populateCategoryOptions(type) {
      if (!modules.category) return;
      modules.category.getCategories({ userId: state.getState().session.userId })
        .then((categories) => {
          while (categorySelect.options.length > 1) {
            categorySelect.remove(1);
          }
          for (const category of categories) {
            if (category.systemRole === 'opening-balance') continue;
            if (category.archived) continue;
            if (category.type !== type) continue;
            const opt = document.createElement('option');
            opt.value = category.id;
            opt.textContent = category.name;
            categorySelect.appendChild(opt);
          }
          const currentCategoryId = buffer.getState().categoryId;
          if (currentCategoryId) {
            const stillValid = Array.from(categorySelect.options).some(o => o.value === currentCategoryId);
            if (!stillValid) {
              categorySelect.value = '';
              buffer.setValue('categoryId', '');
            } else {
              categorySelect.value = currentCategoryId;
            }
          }
        })
        .catch(() => {});
    }

    populateCategoryOptions(buffer.getState().type || 'expense');

    const descField = createFormField(t('common.description'), 'text', buffer.getState().description, (value) => {
      buffer.setValue('description', value);
    });
    body.appendChild(descField);

    const dateField = createFormField(t('common.date'), 'text', buffer.getState().date, (value) => {
      buffer.setValue('date', value);
    });
    body.appendChild(dateField);

    const notesField = createFormField(t('common.notes'), 'text', buffer.getState().notes, (value) => {
      buffer.setValue('notes', value);
    });
    body.appendChild(notesField);

    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = isEditing ? t('common.save') : t('transactions.addTransaction');
    submitBtn.className = 'btn btn-primary';
    formActions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      buffer.reset({
        accountId: '',
        amount: '',
        type: 'expense',
        categoryId: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
      closeModal();
    });
    formActions.appendChild(cancelBtn);

    body.appendChild(formActions);

    const formEl = document.createElement('form');
    formEl.className = 'transaction-form';
    formEl.appendChild(body);

    let closeModal = () => {};
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      const sheet = document.createElement('div');
      sheet.className = 'bottom-sheet';
      const sheetBackdrop = document.createElement('div');
      sheetBackdrop.className = 'bottom-sheet-backdrop';
      const sheetPanel = document.createElement('div');
      sheetPanel.className = 'bottom-sheet-panel';
      sheetPanel.appendChild(formEl);
      sheet.appendChild(sheetBackdrop);
      sheet.appendChild(sheetPanel);
      document.body.appendChild(sheet);
      requestAnimationFrame(() => sheet.classList.add('is-open'));

      closeModal = () => {
        sheet.classList.remove('is-open');
        sheet.style.pointerEvents = 'none';
        sheetBackdrop.style.pointerEvents = 'none';
        setTimeout(() => sheet.remove(), 240);
      };

      sheetBackdrop.addEventListener('click', closeModal);
      function handleEscape(e) {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      }
      document.addEventListener('keydown', handleEscape);
    } else {
      const modalClose = showModal({
        title: isEditing ? 'Edit Transaction' : 'Create Transaction',
        bodyHTML: formEl,
        size: 'md',
        onClose: () => {
          buffer.reset({
            accountId: '',
            amount: '',
            type: 'expense',
            categoryId: '',
            description: '',
            date: new Date().toISOString().slice(0, 10),
            notes: '',
          });
        },
      });
      closeModal = modalClose;
    }

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const operationKey = isEditing ? 'updateTransaction' : 'createTransaction';
      if (state.getState().operations[operationKey]?.loading) return;

      const currentForm = buffer.getState();
      const accountId = currentForm.accountId?.trim();
      const rawAmount = currentForm.amount === '' ? undefined : Number(currentForm.amount);
      const amount = rawAmount === undefined ? NaN : rawAmount;
      const type = currentForm.type;
      const categoryId = currentForm.categoryId?.trim() || null;
      const description = currentForm.description?.trim();
      const date = currentForm.date;
      const notes = currentForm.notes?.trim();

      if (!accountId || !Number.isFinite(amount) || amount <= 0 || !type || !description || !date) {
        showToast({ message: 'Please fill in all required fields with valid values.', type: 'error' });
        return;
      }

      state.dispatch({ type: 'OPERATION_START', key: operationKey });

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (isEditing) {
          await modules.transaction.updateTransaction({
            transactionId: editingId,
            updates: { accountId, amount, type, categoryId, description, date, notes },
          });
          showToast({ message: 'Transaction updated successfully.', type: 'success' });
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
          showToast({ message: 'Transaction created successfully.', type: 'success' });
        }

        closeModal();

        const refreshed = await modules.transaction.getTransactionsByMonth({
          userId: state.getState().session.userId,
          monthKey: state.getState().ui.monthKey || new Date().toISOString().slice(0, 7),
        });
        state.dispatch({ type: 'SET_TRANSACTIONS', transactions: refreshed });
      } catch (e) {
        state.dispatch({ type: 'OPERATION_ERROR', key: operationKey, error: e.message });
        showToast({ message: e.message, type: 'error' });
      } finally {
        state.dispatch({ type: 'OPERATION_STOP', key: operationKey });
        const finalBtn = formEl.querySelector('button[type="submit"]');
        if (finalBtn) finalBtn.disabled = false;
      }
    });
  }

  return root;
}

function createField(label, type, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  labelEl.className = 'form-label';
  wrapper.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.className = 'form-input';
  input.addEventListener('input', (e) => onChange(e.target.value));
  wrapper.appendChild(input);

  return wrapper;
}

function createFormField(label, type, value, onChange) {
  return createField(label, type, value, onChange);
}

function createFormSelectField(label, options, selected, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  labelEl.className = 'form-label';
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
