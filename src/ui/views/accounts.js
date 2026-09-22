/**
 * Stage UI-3 — Accounts View
 *
 * Premium account management screen built on the UI-1 design system.
 */

const TYPE_LABELS = {
  bank: 'Bank',
  savings: 'Savings',
  cash: 'Cash',
};

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
}

function sanitizeColor(color) {
  if (!color || typeof color !== 'string') return '#6B7280';
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return '#6B7280';
}

export function render(context = {}) {
  const { state, modules } = context;

  if (!state) {
    const el = document.createElement('div');
    el.className = 'view-placeholder';
    el.innerHTML = '<h2>Accounts</h2><p>Accounts placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const snapshot = state.getState();
  const accounts = snapshot.accounts?.items || [];
  const loading = snapshot.accounts?.loading || false;
  const error = snapshot.accounts?.error || null;
  const form = snapshot.accountForm || {};
  const userId = snapshot.session?.userId;

  const root = document.createElement('div');
  root.className = 'accounts-view';

  const header = document.createElement('div');
  header.className = 'accounts-header';
  const title = document.createElement('h2');
  title.textContent = 'Accounts';
  const subtitle = document.createElement('p');
  subtitle.className = 'accounts-subtitle';
  subtitle.textContent = 'Manage your accounts and balances';
  header.appendChild(title);
  header.appendChild(subtitle);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary accounts-add-btn';
  addBtn.textContent = 'Add Account';
  addBtn.addEventListener('click', () => {
    state.dispatch({ type: 'RESET_ACCOUNT_FORM' });
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
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-message';
    loadingEl.textContent = 'Loading accounts...';
    root.appendChild(loadingEl);
    return root;
  }

  if (accounts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '🏦';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = 'No accounts yet';
    const emptyDesc = document.createElement('p');
    emptyDesc.className = 'empty-state-desc';
    emptyDesc.textContent = 'Create your first account to start tracking balances.';
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = 'Add Account';
    emptyAction.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_ACCOUNT_FORM' });
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const summary = document.createElement('div');
    summary.className = 'accounts-summary';
    const totalEl = document.createElement('div');
    totalEl.className = 'accounts-total';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'accounts-total-label';
    totalLabel.textContent = 'Total Balance';
    const totalValue = document.createElement('span');
    totalValue.className = 'accounts-total-value amount amount-neutral';
    totalValue.textContent = '…';
    totalEl.appendChild(totalLabel);
    totalEl.appendChild(totalValue);
    summary.appendChild(totalEl);
    root.appendChild(summary);

    const balanceEls = new Map();
    const grid = document.createElement('ul');
    grid.className = 'accounts-grid';
    for (const account of accounts) {
      const li = document.createElement('li');
      li.className = 'account-card';
      li.dataset.accountId = account.id;

      const accent = document.createElement('div');
      accent.className = 'account-card-accent';
      accent.style.backgroundColor = sanitizeColor(account.color);
      li.appendChild(accent);

      const body = document.createElement('div');
      body.className = 'account-card-body';

      const topRow = document.createElement('div');
      topRow.className = 'account-card-top';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'account-card-icon';
      iconWrap.textContent = account.icon || '🏦';
      iconWrap.style.color = sanitizeColor(account.color);
      topRow.appendChild(iconWrap);

      const nameType = document.createElement('div');
      nameType.className = 'account-card-names';
      const nameEl = document.createElement('div');
      nameEl.className = 'account-card-name';
      nameEl.textContent = account.name;
      const typeEl = document.createElement('div');
      typeEl.className = 'account-card-type';
      typeEl.textContent = TYPE_LABELS[account.type] || account.type;
      nameType.appendChild(nameEl);
      nameType.appendChild(typeEl);
      topRow.appendChild(nameType);

      body.appendChild(topRow);

      const balanceWrap = document.createElement('div');
      balanceWrap.className = 'account-card-balance-wrap';
      const balanceLabel = document.createElement('span');
      balanceLabel.className = 'account-card-balance-label';
      balanceLabel.textContent = 'Balance';
      const balanceValue = document.createElement('span');
      balanceValue.className = 'account-card-balance amount amount-neutral';
      balanceValue.textContent = '…';
      balanceWrap.appendChild(balanceLabel);
      balanceWrap.appendChild(balanceValue);
      body.appendChild(balanceWrap);

      li.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'account-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        state.dispatch({
          type: 'SET_ACCOUNT_FORM',
          form: {
            editingId: account.id,
            name: account.name,
            type: account.type,
            icon: account.icon,
            color: account.color,
            openingBalance: undefined,
          },
        });
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'btn btn-danger';
      archiveBtn.textContent = 'Archive';
      archiveBtn.addEventListener('click', async () => {
        if (!confirm('Archive this account?')) return;
        state.dispatch({ type: 'OPERATION_START', key: 'archiveAccount' });
        try {
          await modules.account.archiveAccount({ accountId: account.id });
          const refreshed = await modules.account.getActiveAccounts({ userId: state.getState().session.userId });
          state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'archiveAccount', error: e.message });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'archiveAccount' });
        }
      });
      actions.appendChild(archiveBtn);

      li.appendChild(actions);
      grid.appendChild(li);

      balanceEls.set(account.id, { cardBalance: balanceValue, total: totalValue });
    }
    root.appendChild(grid);

    if (modules && modules.reporting && typeof modules.reporting.getAccountBalance === 'function') {
      if (userId) {
        Promise.all(
          accounts.map(async (account) => {
            try {
              const result = await modules.reporting.getAccountBalance({ accountId: account.id });
              const entry = balanceEls.get(account.id);
              if (entry) {
                const text = formatCurrency(result.balance);
                entry.cardBalance.textContent = text;
                entry.cardBalance.className = `account-card-balance amount ${result.balance >= 0 ? 'amount-positive' : 'amount-negative'}`;
              }
            } catch (_e) {
              const entry = balanceEls.get(account.id);
              if (entry) {
                entry.cardBalance.textContent = '—';
                entry.cardBalance.className = 'account-card-balance amount amount-neutral';
              }
            }
          }),
        ).then(() => {
          if (!balanceEls.size) return;
          let total = 0;
          for (const [id, entry] of balanceEls) {
            const raw = entry.cardBalance.textContent;
            const num = Number(raw);
            if (raw !== '—' && Number.isFinite(num)) total += num;
          }
          const totalText = formatCurrency(total);
          const totalValue = balanceEls.values().next().value?.total;
          if (totalValue) {
            totalValue.textContent = totalText;
            totalValue.className = `accounts-total-value amount ${total >= 0 ? 'amount-positive' : 'amount-negative'}`;
          }
        }).catch(() => {
          for (const [, entry] of balanceEls) {
            entry.cardBalance.textContent = '—';
            entry.cardBalance.className = 'account-card-balance amount amount-neutral';
          }
        });
      }
    }
  }

  const createSection = document.createElement('div');
  createSection.className = 'create-account-section';

  const isEditing = form.editingId !== null && form.editingId !== undefined;

  const formTitle = document.createElement('h3');
  formTitle.className = 'form-section-title';
  formTitle.textContent = isEditing ? 'Edit Account' : 'Create Account';
  createSection.appendChild(formTitle);

  const formEl = document.createElement('form');
  formEl.className = 'account-form';

  const nameField = createField('Account Name', 'text', form.name || '', (value) => {
    state.dispatch({ type: 'SET_ACCOUNT_FORM', form: { name: value } });
  });
  formEl.appendChild(nameField);

  const typeField = createSelectField('Account Type', ['bank', 'savings', 'cash'], form.type || 'bank', (value) => {
    state.dispatch({ type: 'SET_ACCOUNT_FORM', form: { type: value } });
  });
  formEl.appendChild(typeField);

  const iconField = createField('Icon', 'text', form.icon || 'landmark', (value) => {
    state.dispatch({ type: 'SET_ACCOUNT_FORM', form: { icon: value } });
  });
  formEl.appendChild(iconField);

  const colorField = createField('Color', 'text', form.color || '#0000FF', (value) => {
    state.dispatch({ type: 'SET_ACCOUNT_FORM', form: { color: value } });
  });
  formEl.appendChild(colorField);

  if (!isEditing) {
    const openingBalanceField = createField('Opening Balance', 'number', '', (value) => {
      const parsed = value === '' ? undefined : Number(value);
      state.dispatch({ type: 'SET_ACCOUNT_FORM', form: { openingBalance: parsed } });
    });
    const openingHint = document.createElement('span');
    openingHint.className = 'form-hint';
    openingHint.textContent = 'Use a negative value for starting debt.';
    openingBalanceField.appendChild(openingHint);
    formEl.appendChild(openingBalanceField);
  }

  const actionsRow = document.createElement('div');
  actionsRow.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Account';
  submitBtn.className = 'btn btn-primary';
  actionsRow.appendChild(submitBtn);

  if (isEditing) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_ACCOUNT_FORM' });
    });
    actionsRow.appendChild(cancelBtn);
  }

  formEl.appendChild(actionsRow);

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const operationKey = isEditing ? 'updateAccount' : 'createAccount';
    if (state.getState().operations[operationKey]?.loading) return;

    const currentForm = state.getState().accountForm;
    const name = currentForm.name?.trim();
    const type = currentForm.type;
    const icon = currentForm.icon?.trim();
    const color = currentForm.color?.trim();
    const rawOpeningBalance = currentForm.openingBalance === '' || currentForm.openingBalance === undefined || currentForm.openingBalance === null
      ? undefined
      : Number(currentForm.openingBalance);
    const openingBalance = rawOpeningBalance === undefined ? undefined : (Number.isFinite(rawOpeningBalance) ? rawOpeningBalance : undefined);

    if (!name || !type || !icon || !color) {
      alert('Please fill in all fields.');
      return;
    }

    state.dispatch({ type: 'OPERATION_START', key: operationKey });

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEditing) {
        await modules.account.updateAccount({
          accountId: currentForm.editingId,
          updates: { name, type, icon, color },
        });
      } else {
        await modules.account.createAccount({
          userId: state.getState().session.userId,
          name,
          type,
          icon,
          color,
          openingBalance,
        });
      }

      state.dispatch({ type: 'RESET_ACCOUNT_FORM' });

      const refreshed = await modules.account.getActiveAccounts({ userId: state.getState().session.userId });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });
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
    opt.value = option;
    opt.textContent = option;
    if (option === selected) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', (e) => onChange(e.target.value));
  wrapper.appendChild(select);

  return wrapper;
}
