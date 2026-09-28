/**
 * Stage UI-4 — Accounts View (Premium Fintech Redesign)
 *
 * Premium financial accounts screen with dominant balance summary,
 * premium account cards, and visual icon/color pickers.
 * Preserves all domain contracts and key DOM selector contracts.
 */

import { renderIcon } from '../utils/icons.js';
import { createFormStateBuffer } from '../utils/form-state.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';

const TYPE_LABELS = {
  bank: 'Bank',
  savings: 'Savings',
  cash: 'Cash',
};

const CURATED_ICONS = [
  { value: 'bank', label: 'Bank' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'vault', label: 'Vault' },
  { value: 'piggy-bank', label: 'Piggy Bank' },
  { value: 'landmark', label: 'Landmark' },
  { value: 'circle', label: 'Other' },
];

const CURATED_COLORS = [
  '#4A90D9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#EC4899',
  '#6B7280',
  '#0000FF',
];

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
}

function sanitizeColor(color) {
  if (!color || typeof color !== 'string') return '#6B7280';
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return '#6B7280';
}

function el(tag, className, textContent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (textContent !== undefined) e.textContent = textContent;
  return e;
}

function createSkeletonCards(count = 3) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.style.opacity = '0.7';
    const accent = document.createElement('div');
    accent.className = 'account-card-accent';
    accent.style.background = 'rgba(255,255,255,0.04)';
    card.appendChild(accent);
    const body = document.createElement('div');
    body.className = 'account-card-body';
    const top = document.createElement('div');
    top.className = 'account-card-top';
    const icon = document.createElement('div');
    icon.className = 'account-card-icon skeleton';
    icon.style.background = 'rgba(255,255,255,0.04)';
    top.appendChild(icon);
    const names = document.createElement('div');
    names.className = 'account-card-names';
    const nameLine = document.createElement('div');
    nameLine.className = 'skeleton skeleton-text skeleton-text--md';
    nameLine.style.width = '60%';
    const typeLine = document.createElement('div');
    typeLine.className = 'skeleton skeleton-text skeleton-text--sm';
    typeLine.style.width = '40%';
    names.appendChild(nameLine);
    names.appendChild(typeLine);
    top.appendChild(names);
    body.appendChild(top);
    const balance = document.createElement('div');
    balance.className = 'account-card-balance-wrap';
    const balanceLine = document.createElement('div');
    balanceLine.className = 'skeleton skeleton-text skeleton-text--lg';
    balanceLine.style.width = '50%';
    balance.appendChild(balanceLine);
    body.appendChild(balance);
    card.appendChild(body);
    cards.push(card);
  }
  return cards;
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
  const userId = snapshot.session?.userId;

  const root = document.createElement('div');
  root.className = 'accounts-view';

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = el('h1', 'page-header-title', 'Accounts');
  headerTitles.appendChild(title);
  const subtitle = el('p', 'page-header-subtitle', 'Manage your accounts and balances');
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary accounts-add-btn';
  addBtn.textContent = 'Add Account';
  addBtn.addEventListener('click', () => {
    openAccountForm();
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
    loadingSurface.className = 'surface-hero';
    loadingSurface.style.minHeight = '120px';
    loadingSurface.style.display = 'flex';
    loadingSurface.style.alignItems = 'center';
    loadingSurface.style.justifyContent = 'center';
    const loadingText = el('div', 'kpi-label', 'Loading balances...');
    loadingSurface.appendChild(loadingText);
    root.appendChild(loadingSurface);

    const grid = document.createElement('ul');
    grid.className = 'account-list';
    createSkeletonCards(3).forEach(card => {
      const li = document.createElement('li');
      li.className = 'account-item';
      li.appendChild(card);
      grid.appendChild(li);
    });
    root.appendChild(grid);
    return root;
  }

  if (accounts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state--accounts';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '🏦';
    const emptyTitle = el('p', 'empty-state-title', 'No accounts yet');
    const emptyDesc = el('p', 'empty-state-desc', 'Create your first account to start tracking your balances.');
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = 'Add Account';
    emptyAction.addEventListener('click', () => {
      openAccountForm();
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const hero = document.createElement('div');
    hero.className = 'surface-hero';
    const heroLabel = el('span', 'summary-strip-label', 'Total Balance');
    hero.appendChild(heroLabel);
    const heroValue = el('span', 'summary-strip-value', '…');
    hero.appendChild(heroValue);
    const heroMeta = el('span', 'summary-strip-value--muted', `${accounts.length} active account${accounts.length !== 1 ? 's' : ''}`);
    hero.appendChild(heroMeta);
    root.appendChild(hero);

    const balanceEls = new Map();
    const list = document.createElement('ul');
    list.className = 'account-list';
    for (const account of accounts) {
      const li = document.createElement('li');
      li.className = 'account-list-item surface-interactive';
      li.dataset.accountId = account.id;

      const iconEl = document.createElement('div');
      iconEl.className = 'account-list-item-icon';
      iconEl.textContent = renderIcon(account.icon);
      iconEl.style.color = sanitizeColor(account.color);
      li.appendChild(iconEl);

      const body = document.createElement('div');
      body.className = 'account-list-item-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'account-list-item-name';
      nameEl.textContent = account.name;
      body.appendChild(nameEl);

      const typeEl = document.createElement('div');
      typeEl.className = 'account-list-item-meta';
      typeEl.textContent = TYPE_LABELS[account.type] || account.type;
      body.appendChild(typeEl);

      li.appendChild(body);

      const balanceEl = document.createElement('span');
      balanceEl.className = 'account-list-item-balance amount amount-neutral';
      balanceEl.textContent = '…';
      li.appendChild(balanceEl);

      const actions = document.createElement('div');
      actions.className = 'account-list-item-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        openAccountForm(account);
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'btn btn-danger';
      archiveBtn.textContent = 'Archive';
      archiveBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm({ message: 'Archive this account?' });
        if (!confirmed) return;
        state.dispatch({ type: 'OPERATION_START', key: 'archiveAccount' });
        try {
          await modules.account.archiveAccount({ accountId: account.id });
          const refreshed = await modules.account.getActiveAccounts({ userId: state.getState().session.userId });
          state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });
          showToast({ message: 'Account archived.', type: 'success' });
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'archiveAccount', error: e.message });
          showToast({ message: e.message, type: 'error' });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'archiveAccount' });
        }
      });
      actions.appendChild(archiveBtn);

      li.appendChild(actions);
      list.appendChild(li);

      balanceEls.set(account.id, { cardBalance: balanceEl, total: heroValue });
    }
    root.appendChild(list);

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
                entry.cardBalance.className = `account-list-item-balance amount ${result.balance >= 0 ? 'amount-positive' : 'amount-negative'}`;
              }
            } catch (_e) {
              const entry = balanceEls.get(account.id);
              if (entry) {
                entry.cardBalance.textContent = '—';
                entry.cardBalance.className = 'account-list-item-balance amount amount-neutral';
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
            totalValue.className = `summary-strip-value ${total >= 0 ? 'summary-strip-value--positive' : 'summary-strip-value--negative'}`;
          }
        }).catch(() => {
          for (const [, entry] of balanceEls) {
            entry.cardBalance.textContent = '—';
            entry.cardBalance.className = 'account-list-item-balance amount amount-neutral';
          }
        });
      }
    }
  }

  function openAccountForm(account = null) {
    const isEditing = !!account;
    const formSnapshot = account || state.getState().accountForm || {};

    const buffer = createFormStateBuffer({
      name: formSnapshot.name || '',
      type: formSnapshot.type || 'bank',
      icon: formSnapshot.icon || 'bank',
      color: formSnapshot.color || '#0000FF',
      openingBalance: formSnapshot.openingBalance === undefined ? '' : String(formSnapshot.openingBalance),
    });

    const body = document.createElement('div');
    body.className = 'account-form-body';

    const nameField = createFormField('Account Name', 'text', buffer.getState().name, (value) => {
      buffer.setValue('name', value);
    });
    body.appendChild(nameField);

    const typeField = createFormSelectField('Account Type', ['bank', 'savings', 'cash'], buffer.getState().type, (value) => {
      buffer.setValue('type', value);
    });
    body.appendChild(typeField);

    const iconLabel = document.createElement('label');
    iconLabel.textContent = 'Icon';
    iconLabel.className = 'form-label';
    body.appendChild(iconLabel);

    const iconPicker = document.createElement('div');
    iconPicker.className = 'icon-picker';
    iconPicker.setAttribute('role', 'radiogroup');
    iconPicker.setAttribute('aria-label', 'Account icon');
    for (const iconDef of CURATED_ICONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-picker-btn';
      if (buffer.getState().icon === iconDef.value) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.setAttribute('aria-checked', 'false');
      }
      btn.textContent = renderIcon(iconDef.value);
      btn.setAttribute('aria-label', iconDef.label);
      btn.setAttribute('title', iconDef.label);
      btn.addEventListener('click', () => {
        buffer.setValue('icon', iconDef.value);
        iconPicker.querySelectorAll('.icon-picker-btn').forEach((b) => {
          b.classList.remove('is-selected');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('is-selected');
        btn.setAttribute('aria-checked', 'true');
      });
      iconPicker.appendChild(btn);
    }
    body.appendChild(iconPicker);

    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color';
    colorLabel.className = 'form-label';
    body.appendChild(colorLabel);

    const colorPicker = document.createElement('div');
    colorPicker.className = 'color-picker';
    colorPicker.setAttribute('role', 'radiogroup');
    colorPicker.setAttribute('aria-label', 'Account color');
    for (const color of CURATED_COLORS) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-swatch';
      if (buffer.getState().color === color) {
        swatch.classList.add('is-selected');
        swatch.setAttribute('aria-checked', 'true');
      } else {
        swatch.setAttribute('aria-checked', 'false');
      }
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', color);
      swatch.setAttribute('title', color);
      swatch.addEventListener('click', () => {
        buffer.setValue('color', color);
        colorPicker.querySelectorAll('.color-swatch').forEach((s) => {
          s.classList.remove('is-selected');
          s.setAttribute('aria-checked', 'false');
        });
        swatch.classList.add('is-selected');
        swatch.setAttribute('aria-checked', 'true');
      });
      colorPicker.appendChild(swatch);
    }
    body.appendChild(colorPicker);

    if (!isEditing) {
      const openingBalanceField = createFormField('Opening Balance', 'number', buffer.getState().openingBalance || '', (value) => {
        const parsed = value === '' ? undefined : Number(value);
        buffer.setValue('openingBalance', parsed);
      });
      const openingHint = document.createElement('span');
      openingHint.className = 'form-hint';
      openingHint.textContent = 'Use a negative value for starting debt.';
      openingBalanceField.appendChild(openingHint);
      body.appendChild(openingBalanceField);
    }

    const actionsRow = document.createElement('div');
    actionsRow.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Account';
    submitBtn.className = 'btn btn-primary';
    actionsRow.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      buffer.reset({
        name: formSnapshot.name || '',
        type: formSnapshot.type || 'bank',
        icon: formSnapshot.icon || 'bank',
        color: formSnapshot.color || '#0000FF',
        openingBalance: '',
      });
      closeModal();
    });
    actionsRow.appendChild(cancelBtn);

    body.appendChild(actionsRow);

    const formEl = document.createElement('form');
    formEl.className = 'account-form';
    formEl.appendChild(body);

    let closeModal = () => {};
    if (document.documentElement && document.documentElement.clientWidth <= 640) {
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
        setTimeout(() => sheet.remove(), 220);
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
        title: isEditing ? 'Edit Account' : 'Create Account',
        bodyHTML: formEl,
        size: 'md',
        onClose: () => {
          buffer.reset({
            name: formSnapshot.name || '',
            type: formSnapshot.type || 'bank',
            icon: formSnapshot.icon || 'bank',
            color: formSnapshot.color || '#0000FF',
            openingBalance: '',
          });
        },
      });
      closeModal = modalClose;
    }

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const operationKey = isEditing ? 'updateAccount' : 'createAccount';
      if (state.getState().operations[operationKey]?.loading) return;

      const currentForm = buffer.getState();
      const name = currentForm.name?.trim();
      const type = currentForm.type;
      const icon = currentForm.icon?.trim();
      const color = currentForm.color?.trim();
      const rawOpeningBalance = currentForm.openingBalance === '' || currentForm.openingBalance === undefined || currentForm.openingBalance === null
        ? undefined
        : Number(currentForm.openingBalance);
      const openingBalance = rawOpeningBalance === undefined ? undefined : (Number.isFinite(rawOpeningBalance) ? rawOpeningBalance : undefined);

      if (!name || !type || !icon || !color) {
        showToast({ message: 'Please fill in all fields.', type: 'error' });
        return;
      }

      state.dispatch({ type: 'OPERATION_START', key: operationKey });

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (isEditing) {
          await modules.account.updateAccount({
            accountId: currentForm.editingId || formSnapshot.id,
            updates: { name, type, icon, color },
          });
          showToast({ message: 'Account updated successfully.', type: 'success' });
        } else {
          await modules.account.createAccount({
            userId: state.getState().session.userId,
            name,
            type,
            icon,
            color,
            openingBalance,
          });
          showToast({ message: 'Account created successfully.', type: 'success' });
        }

        closeModal();

        const refreshed = await modules.account.getActiveAccounts({ userId: state.getState().session.userId });
        state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });
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
    opt.value = option;
    opt.textContent = TYPE_LABELS[option] || option;
    if (option === selected) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', (e) => onChange(e.target.value));
  wrapper.appendChild(select);

  return wrapper;
}
