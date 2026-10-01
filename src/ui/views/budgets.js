/**
 * Stage UI-6 — Budgets View (Premium Fintech Redesign)
 *
 * Premium budget management screen with modal/bottom-sheet form,
 * improved progress visualization, and polished budget cards.
 * Preserves all domain contracts and key DOM selector contracts.
 */

import { createFormStateBuffer } from '../utils/form-state.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';
import { t } from '../i18n.js';
import { formatCurrency, formatMonthLabel, getMonthNames } from '../i18n-format.js';

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
    card.className = 'budget-card';
    card.style.opacity = '0.7';
    const header = document.createElement('div');
    header.className = 'budget-card-header';
    const nameLine = document.createElement('div');
    nameLine.className = 'skeleton skeleton-text skeleton-text--md';
    nameLine.style.width = '50%';
    header.appendChild(nameLine);
    card.appendChild(header);
    const body = document.createElement('div');
    body.className = 'budget-card-body';
    const limitLine = document.createElement('div');
    limitLine.className = 'skeleton skeleton-text skeleton-text--lg';
    limitLine.style.width = '40%';
    body.appendChild(limitLine);
    const spentLine = document.createElement('div');
    spentLine.className = 'skeleton skeleton-text skeleton-text--sm';
    spentLine.style.width = '60%';
    body.appendChild(spentLine);
    const progressLine = document.createElement('div');
    progressLine.className = 'skeleton';
    progressLine.style.height = '8px';
    progressLine.style.marginTop = 'var(--space-3)';
    body.appendChild(progressLine);
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
    el.innerHTML = `<h2>${t('budgets.title')}</h2><p>${t('common.placeholder')}</p>`;
    return el;
  }

  const snapshot = state.getState();
  const budgets = snapshot.budgets?.items || [];
  const loading = snapshot.budgets?.loading || false;
  const error = snapshot.budgets?.error || null;
  const form = snapshot.budgetForm || {};
  const monthKey = snapshot.ui?.monthKey || new Date().toISOString().slice(0, 7);
  const userId = snapshot.session?.userId;

  const root = document.createElement('div');
  root.className = 'budgets-view';

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = el('h1', 'page-header-title', t('budgets.title'));
  headerTitles.appendChild(title);
  const subtitle = el('p', 'page-header-subtitle', t('budgets.subtitle'));
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary budgets-add-btn';
  addBtn.textContent = t('budgets.add');
  addBtn.addEventListener('click', () => {
    state.dispatch({ type: 'RESET_BUDGET_FORM' });
    openBudgetForm();
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
    const loadingTitle = el('div', 'section-title', t('budgets.title'));
    loadingSurface.appendChild(loadingTitle);
    const skeletonGrid = document.createElement('div');
    skeletonGrid.style.display = 'grid';
    skeletonGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    skeletonGrid.style.gap = 'var(--space-5)';
    skeletonGrid.style.marginTop = 'var(--space-4)';
    createSkeletonCards(3).forEach(card => skeletonGrid.appendChild(card));
    loadingSurface.appendChild(skeletonGrid);
    root.appendChild(loadingSurface);
    return root;
  }

  const categoryMap = new Map();

  if (budgets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state--budgets';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '📊';
    const emptyTitle = el('p', 'empty-state-title', t('budgets.noBudgets'));
    const emptyDesc = el('p', 'empty-state-desc', t('budgets.emptyDesc'));
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = t('budgets.createBudget');
    emptyAction.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_BUDGET_FORM' });
      openBudgetForm();
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const summary = document.createElement('div');
    summary.className = 'summary-strip';
    const summaryValueEls = [];
    const summaryItems = [
        { label: t('budgets.totalBudgeted'), valueClass: 'summary-strip-value amount amount-neutral' },
        { label: t('budgets.totalSpent'), valueClass: 'summary-strip-value amount amount-neutral' },
        { label: t('common.remaining'), valueClass: 'summary-strip-value amount amount-neutral' },
        { label: t('budgets.utilization'), valueClass: 'summary-strip-value amount amount-neutral' },
    ];
    for (const item of summaryItems) {
        const stripItem = document.createElement('div');
        stripItem.className = 'summary-strip-item';
        const label = document.createElement('span');
        label.className = 'summary-strip-label';
        label.textContent = item.label;
        const value = document.createElement('span');
        value.className = item.valueClass;
        value.textContent = '…';
        stripItem.appendChild(label);
        stripItem.appendChild(value);
        summary.appendChild(stripItem);
        summaryValueEls.push(value);
    }
    root.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'budgets-grid';

    const budgetProgressMap = new Map();

    for (const budget of budgets) {
      const card = document.createElement('div');
      card.className = 'budget-card';
      card.dataset.budgetId = budget.id;

      const cardHeader = document.createElement('div');
      cardHeader.className = 'budget-card-header';

      const nameEl = document.createElement('div');
      nameEl.className = 'budget-card-name';
      nameEl.textContent = '';
      cardHeader.appendChild(nameEl);

      const statusBadge = document.createElement('span');
      statusBadge.className = 'budget-status';
      statusBadge.textContent = '';
      cardHeader.appendChild(statusBadge);

      const actions = document.createElement('div');
      actions.className = 'budget-card-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'surface-list-item-action';
      editBtn.textContent = '✎';
      editBtn.setAttribute('aria-label', t('budgets.editAria'));
      editBtn.addEventListener('click', () => {
        state.dispatch({
          type: 'SET_BUDGET_FORM',
          form: {
            editingId: budget.id,
            categoryId: budget.categoryId,
            amount: String(budget.amount),
          },
        });
        openBudgetForm(budget);
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'surface-list-item-action surface-list-item-action--danger';
      archiveBtn.textContent = '🗑';
      archiveBtn.setAttribute('aria-label', t('budgets.archiveAria'));
      archiveBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm({ message: t('budgets.archiveConfirm') });
        if (!confirmed) return;
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

      cardHeader.appendChild(actions);
      card.appendChild(cardHeader);

      const body = document.createElement('div');
      body.className = 'budget-card-body';

      const limitRow = document.createElement('div');
      limitRow.className = 'budget-card-limit';
      const limitLabel = document.createElement('span');
      limitLabel.className = 'budget-card-limit-label';
      limitLabel.textContent = t('common.monthlyBudget');
      const limitValue = document.createElement('span');
      limitValue.className = 'budget-card-limit-value amount amount-neutral';
      limitValue.textContent = formatCurrency(budget.amount);
      limitRow.appendChild(limitLabel);
      limitRow.appendChild(limitValue);
      body.appendChild(limitRow);

      const spentRow = document.createElement('div');
      spentRow.className = 'budget-card-spent-row';
      const spentLabel = document.createElement('span');
      spentLabel.className = 'budget-card-spent-label';
      spentLabel.textContent = t('common.spent');
      const spentValue = document.createElement('span');
      spentValue.className = 'budget-card-spent amount amount-neutral';
      spentValue.textContent = '0.00';
      spentRow.appendChild(spentLabel);
      spentRow.appendChild(spentValue);
      body.appendChild(spentRow);

      const progressTrack = document.createElement('div');
      progressTrack.className = 'progress-bar-track';
      const progressFill = document.createElement('div');
      progressFill.className = 'progress-bar-fill';
      progressFill.style.width = '0%';
      progressTrack.appendChild(progressFill);
      progressTrack.style.height = '10px';
      body.appendChild(progressTrack);

      const remainingRow = document.createElement('div');
      remainingRow.className = 'budget-card-remaining-row';
      const remainingText = document.createElement('span');
      remainingText.className = 'budget-card-remaining';
      remainingText.textContent = t('common.loading');
      const pctText = document.createElement('span');
      pctText.className = 'budget-card-pct';
      pctText.textContent = '';
      remainingRow.appendChild(remainingText);
      remainingRow.appendChild(pctText);
      body.appendChild(remainingRow);

      card.appendChild(body);
      grid.appendChild(card);

      budgetProgressMap.set(budget.id, {
        card,
        spentEl: spentValue,
        progressFill,
        remainingText,
        pctText,
        limitValue,
        spentRow,
        statusBadge,
      });
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
          const pct = budget.amount > 0 ? (progress.spent / budget.amount) * 100 : 0;
          const clampedPct = Math.min(pct, 100);
          entry.progressFill.style.width = `${clampedPct}%`;
          entry.progressFill.className = `progress-bar-fill${progress.overBudget ? ' over-budget' : ''}`;
          entry.spentEl.textContent = formatCurrency(progress.spent);
          entry.spentEl.className = `budget-card-spent amount ${progress.overBudget ? 'amount-negative' : 'amount-neutral'}`;
          entry.remainingText.textContent = progress.overBudget
            ? t('budgets.overByText', { amount: formatCurrency(progress.spent - budget.amount) })
            : t('budgets.remainingText', { amount: formatCurrency(progress.remaining) });
          entry.pctText.textContent = t('budgets.pctUsedText', { pct: Math.round(pct) });
          entry.limitValue.textContent = formatCurrency(budget.amount);
          if (progress.overBudget) {
            entry.spentRow.classList.add('budget-card-spent-row--over');
          } else {
            entry.spentRow.classList.remove('budget-card-spent-row--over');
          }
          const utilizationPct = budget.amount > 0 ? (progress.spent / budget.amount) * 100 : 0;
          if (utilizationPct < 70) {
            entry.statusBadge.className = 'budget-status budget-status--healthy';
            entry.statusBadge.textContent = t('budgets.statusHealthy');
          } else if (utilizationPct <= 90) {
            entry.statusBadge.className = 'budget-status budget-status--approaching';
            entry.statusBadge.textContent = t('budgets.statusApproaching');
          } else {
            entry.statusBadge.className = 'budget-status budget-status--over';
            entry.statusBadge.textContent = t('budgets.statusOver');
          }
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
        const [totalBudgetedEl, totalSpentEl, remainingEl, utilizationEl] = summaryValueEls;
        totalBudgetedEl.textContent = formatCurrency(totalBudgeted);
        totalBudgetedEl.className = 'summary-strip-value amount amount-neutral';
        totalSpentEl.textContent = formatCurrency(totalSpent);
        totalSpentEl.className = `summary-strip-value amount ${totalSpent > totalBudgeted ? 'summary-strip-value--negative' : 'amount-neutral'}`;
        remainingEl.textContent = formatCurrency(totalRemaining);
        remainingEl.className = `summary-strip-value amount ${totalRemaining < 0 ? 'summary-strip-value--negative' : 'summary-strip-value--positive'}`;
        const utilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
        utilizationEl.textContent = `${utilization}%`;
        utilizationEl.className = `summary-strip-value amount ${utilization > 90 ? 'summary-strip-value--negative' : utilization >= 70 ? 'summary-strip-value--muted' : 'summary-strip-value--positive'}`;
      }).catch(() => {});
    }
  }

  return root;

  function openBudgetForm(budget = null) {
    const isEditing = !!budget;
    let editingId = null;
    let formSnapshot = budget || state.getState().budgetForm || {};
    if (budget && budget.id) {
      editingId = budget.id;
    }

    const buffer = createFormStateBuffer({
      categoryId: formSnapshot.categoryId || '',
      amount: formSnapshot.amount || '',
      period: formSnapshot.period || 'monthly',
    });

    const body = document.createElement('div');
    body.className = 'budget-form-body';

    const categoryWrapper = document.createElement('div');
    categoryWrapper.className = 'form-field';
    const categoryLabel = document.createElement('label');
    categoryLabel.textContent = t('common.category');
    categoryLabel.className = 'form-label';
    categoryWrapper.appendChild(categoryLabel);

    const categorySelect = document.createElement('select');
    categorySelect.className = 'form-select';
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = t('common.selectCategory');
    categorySelect.appendChild(noneOption);
    categoryWrapper.appendChild(categorySelect);
    body.appendChild(categoryWrapper);

    categorySelect.addEventListener('change', (e) => {
      buffer.setValue('categoryId', e.target.value);
    });

    if (buffer.getState().categoryId) {
      categorySelect.value = buffer.getState().categoryId;
    }

    if (modules.category) {
      modules.category.getCategories({ userId: state.getState().session.userId })
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
          if (buffer.getState().categoryId) {
            const stillValid = Array.from(categorySelect.options).some(o => o.value === buffer.getState().categoryId);
            if (stillValid) {
              categorySelect.value = buffer.getState().categoryId;
            } else {
              categorySelect.value = '';
              buffer.setValue('categoryId', '');
            }
          }
        })
        .catch(() => {});
    }

    const amountField = createFormField(t('common.amount'), 'number', buffer.getState().amount, (value) => {
      buffer.setValue('amount', value);
    });
    const amountHint = document.createElement('span');
    amountHint.className = 'form-hint';
    amountHint.textContent = t('budgets.monthlySpendingLimit');
    amountField.appendChild(amountHint);
    body.appendChild(amountField);

    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = isEditing ? t('budgets.saveChanges') : t('budgets.createBudget');
    submitBtn.className = 'btn btn-primary';
    formActions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      buffer.reset({ categoryId: '', amount: '', period: 'monthly' });
      state.dispatch({ type: 'RESET_BUDGET_FORM' });
      closeModal();
    });
    formActions.appendChild(cancelBtn);

    body.appendChild(formActions);

    const formEl = document.createElement('form');
    formEl.className = 'budget-form';
    formEl.appendChild(body);

    let closeModal = () => {};
    let triggerEl = null;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      triggerEl = document.activeElement;
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

      function handleEscape(e) {
        if (e.key === 'Escape') {
          closeModalFn();
        }
      }
      document.addEventListener('keydown', handleEscape);

      function closeModalFn() {
        document.removeEventListener('keydown', handleEscape);
        sheet.classList.remove('is-open');
        sheet.style.pointerEvents = 'none';
        sheetBackdrop.style.pointerEvents = 'none';
        setTimeout(() => {
          sheet.remove();
          if (triggerEl && typeof triggerEl.focus === 'function') {
            triggerEl.focus();
          }
        }, 240);
      }

      closeModal = closeModalFn;
      sheetBackdrop.addEventListener('click', closeModalFn);
    } else {
      const modalClose = showModal({
        title: isEditing ? t('budgets.editTitle') : t('budgets.createBudget'),
        bodyHTML: formEl,
        size: 'sm',
        onClose: () => {
          buffer.reset({ categoryId: '', amount: '', period: 'monthly' });
        },
      });
      closeModal = modalClose;
    }

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const operationKey = isEditing ? 'updateBudget' : 'createBudget';
      if (state.getState().operations[operationKey]?.loading) return;

      const currentForm = buffer.getState();
      const categoryId = currentForm.categoryId?.trim();
      const rawAmount = currentForm.amount === '' ? undefined : Number(currentForm.amount);
      const amount = rawAmount === undefined ? NaN : rawAmount;

      if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
        showToast({ message: t('common.pleaseFillAllFields'), type: 'error' });
        return;
      }

      state.dispatch({ type: 'OPERATION_START', key: operationKey });

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (isEditing) {
          await modules.budget.updateBudget({
            budgetId: editingId,
            amount,
          });
          showToast({ message: t('budgets.updatedSuccess'), type: 'success' });
        } else {
          await modules.budget.createBudget({
            userId: state.getState().session.userId,
            categoryId,
            amount,
          });
          showToast({ message: t('budgets.createdSuccess'), type: 'success' });
        }

        closeModal();

        const refreshed = await modules.budget.getBudgets({ userId: state.getState().session.userId });
        state.dispatch({ type: 'SET_BUDGETS', budgets: refreshed });
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
