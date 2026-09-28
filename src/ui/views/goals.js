import { renderIcon } from '../utils/icons.js';
import { createFormStateBuffer } from '../utils/form-state.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
}

function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
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

function createSelectField(label, options, selected, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  labelEl.className = 'form-label';
  wrapper.appendChild(labelEl);

  const select = document.createElement('select');
  select.className = 'form-select';
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'Select account';
  select.appendChild(noneOption);
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
    card.className = 'goal-item';
    card.style.opacity = '0.7';
    const header = document.createElement('div');
    header.className = 'goal-item-header';
    const icon = document.createElement('div');
    icon.className = 'goal-item-icon skeleton';
    icon.style.background = 'rgba(255,255,255,0.04)';
    header.appendChild(icon);
    const nameLine = document.createElement('div');
    nameLine.className = 'skeleton skeleton-text skeleton-text--md';
    nameLine.style.width = '60%';
    header.appendChild(nameLine);
    card.appendChild(header);
    const meta = document.createElement('div');
    meta.className = 'goal-card-meta';
    const metaLine = document.createElement('div');
    metaLine.className = 'skeleton skeleton-text skeleton-text--sm';
    metaLine.style.width = '50%';
    meta.appendChild(metaLine);
    card.appendChild(meta);
    const progress = document.createElement('div');
    progress.className = 'skeleton';
    progress.style.height = '12px';
    progress.style.marginTop = 'var(--space-3)';
    card.appendChild(progress);
    cards.push(card);
  }
  return cards;
}

export function render(context = {}) {
  const { state, modules } = context;

  if (!state) {
    const el = document.createElement('div');
    el.className = 'view-placeholder';
    el.innerHTML = '<h2>Goals</h2><p>Goals placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const snapshot = state.getState();
  const goals = snapshot.goals?.items || [];
  const loading = snapshot.goals?.loading || false;
  const error = snapshot.goals?.error || null;
  const form = snapshot.goalForm || {};
  const accounts = snapshot.accounts?.items || [];
  const depositOperation = snapshot.operations?.depositToGoal || {};

  const root = document.createElement('div');
  root.className = 'goals-view';

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = el('h1', 'page-header-title', 'Goals');
  headerTitles.appendChild(title);
  const subtitle = el('p', 'page-header-subtitle', 'Track progress toward your financial goals');
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary goals-add-btn';
  addBtn.textContent = 'Add Goal';
  addBtn.addEventListener('click', () => {
    state.dispatch({ type: 'RESET_GOAL_FORM' });
    openGoalForm();
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
    const loadingTitle = el('div', 'section-title', 'Financial Goals');
    loadingSurface.appendChild(loadingTitle);
    const skeletonGrid = document.createElement('div');
    skeletonGrid.style.display = 'grid';
    skeletonGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    skeletonGrid.style.gap = 'var(--space-5)';
    skeletonGrid.style.marginTop = 'var(--space-4)';
    createSkeletonCards(3).forEach(card => skeletonGrid.appendChild(card));
    loadingSurface.appendChild(skeletonGrid);
    root.appendChild(loadingSurface);
    return root;
  }

  const summary = createSummary(goals);
  root.appendChild(summary);

  if (goals.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state empty-state--goals';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '🗺️';
    const emptyTitle = el('p', 'empty-state-title', 'No goals yet');
    const emptyDesc = el('p', 'empty-state-desc', 'Create your first goal to start tracking progress toward your financial future.');
    const emptyAction = document.createElement('button');
    emptyAction.type = 'button';
    emptyAction.className = 'btn btn-primary';
    emptyAction.textContent = 'Create Goal';
    emptyAction.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_GOAL_FORM' });
      openGoalForm();
    });
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    empty.appendChild(emptyAction);
    root.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'goal-list';
    for (const goal of goals) {
      const li = document.createElement('li');
      li.className = 'goal-item';
      li.dataset.goalId = goal.id;

      const targetEl = document.createElement('span');
      targetEl.className = 'goal-target';
      targetEl.textContent = formatCurrency(goal.target);
      targetEl.style.display = 'none';
      li.appendChild(targetEl);

      const currentEl = document.createElement('span');
      currentEl.className = 'goal-current';
      currentEl.textContent = formatCurrency(goal.current || 0);
      currentEl.style.display = 'none';
      li.appendChild(currentEl);

      const card = document.createElement('div');
      card.className = 'goal-card';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'goal-item-header';

      const iconEl = document.createElement('div');
      iconEl.className = 'goal-item-icon';
      iconEl.textContent = renderIcon(goal.icon);
      cardHeader.appendChild(iconEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'goal-item-name goal-name';
      nameEl.textContent = goal.name;
      cardHeader.appendChild(nameEl);

      const currentAmountEl = document.createElement('div');
      currentAmountEl.className = 'goal-card-amount';
      const currentValueEl = document.createElement('span');
      currentValueEl.className = 'goal-card-amount-value amount amount-positive';
      currentValueEl.textContent = formatCurrency(goal.current || 0);
      currentAmountEl.appendChild(currentValueEl);
      cardHeader.appendChild(currentAmountEl);

      card.appendChild(cardHeader);

      const remaining = Math.max(0, (goal.target || 0) - (goal.current || 0));
      const metaEl = document.createElement('div');
      metaEl.className = 'goal-card-meta';
      const targetText = document.createElement('span');
      targetText.textContent = `Target ${formatCurrency(goal.target)}`;
      const remainingText = document.createElement('span');
      remainingText.textContent = `${formatCurrency(remaining)} remaining`;
      metaEl.appendChild(targetText);
      metaEl.appendChild(remainingText);
      card.appendChild(metaEl);

      const current = Number(goal.current) || 0;
      const target = Number(goal.target) || 0;
      const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
      const progressWrap = document.createElement('div');
      progressWrap.className = 'goal-progress-wrap';
      const progressTrack = document.createElement('div');
      progressTrack.className = 'goal-progress-track';
      progressTrack.style.height = '10px';
      const progressFill = document.createElement('div');
      progressFill.className = `goal-progress-fill${pct >= 100 ? ' complete' : ''}`;
      progressFill.style.width = `${pct}%`;
      progressTrack.appendChild(progressFill);
      progressWrap.appendChild(progressTrack);
      const pctLabel = document.createElement('span');
      pctLabel.className = 'goal-progress-pct';
      pctLabel.textContent = `${Math.round(pct)}%`;
      progressWrap.appendChild(pctLabel);
      card.appendChild(progressWrap);

      const deadlineEl = document.createElement('div');
      deadlineEl.className = 'goal-card-deadline';
      const today = new Date().toISOString().slice(0, 10);
      if (goal.deadline) {
        deadlineEl.textContent = `Due ${formatDate(goal.deadline)}`;
        if (goal.deadline < today && pct < 100) {
          deadlineEl.classList.add('goal-card-deadline--past');
        }
        if (pct >= 100) {
          deadlineEl.classList.add('goal-card-deadline--complete');
        }
      } else {
        deadlineEl.textContent = 'No deadline';
        deadlineEl.classList.add('goal-card-deadline--none');
      }
      card.appendChild(deadlineEl);

      const actions = document.createElement('div');
      actions.className = 'goal-actions';

      const depositBtn = document.createElement('button');
      depositBtn.type = 'button';
      depositBtn.textContent = 'Deposit';
      depositBtn.className = 'btn btn-primary goal-deposit-btn';
      depositBtn.addEventListener('click', () => openDepositModal(goal, accounts));
      actions.appendChild(depositBtn);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.className = 'btn btn-secondary';
      editBtn.addEventListener('click', () => {
        state.dispatch({
          type: 'SET_GOAL_FORM',
          form: {
            editingId: goal.id,
            name: goal.name,
            target: String(goal.target),
            deadline: goal.deadline || '',
            icon: goal.icon,
            color: goal.color,
            priority: goal.priority || 'medium',
          },
        });
        openGoalForm(goal);
      });
      actions.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.textContent = 'Archive';
      archiveBtn.className = 'btn btn-danger';
      archiveBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm({ message: 'Archive this goal?' });
        if (!confirmed) return;
        state.dispatch({ type: 'OPERATION_START', key: 'archiveGoal' });
        try {
          await modules.goal.archiveGoal({ goalId: goal.id });
          const refreshed = await modules.goal.getActiveGoals({ userId: state.getState().session.userId });
          state.dispatch({ type: 'SET_GOALS', goals: refreshed });
          showToast({ message: 'Goal archived.', type: 'success' });
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'archiveGoal', error: e.message });
          showToast({ message: e.message, type: 'error' });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'archiveGoal' });
        }
      });
      actions.appendChild(archiveBtn);

      card.appendChild(actions);
      li.appendChild(card);
      list.appendChild(li);
    }
    root.appendChild(list);
  }

  return root;

  function createSummary(goals) {
    const summary = document.createElement('div');
    summary.className = 'summary-strip';

    const totalSaved = goals.reduce((sum, g) => sum + (Number(g.current) || 0), 0);
    const totalTarget = goals.reduce((sum, g) => sum + (Number(g.target) || 0), 0);
    const activeCount = goals.length;

    let nearestDeadline = null;
    const today = new Date().toISOString().slice(0, 10);
    const futureGoals = goals.filter(g => g.deadline && g.deadline >= today);
    if (futureGoals.length > 0) {
      futureGoals.sort((a, b) => a.deadline.localeCompare(b.deadline));
      nearestDeadline = futureGoals[0].deadline;
    }

    const items = [
      { label: 'Total Saved', value: formatCurrency(totalSaved), valueClass: 'summary-strip-value--positive' },
      { label: 'Total Target', value: formatCurrency(totalTarget), valueClass: 'summary-strip-value--muted' },
      { label: 'Active Goals', value: String(activeCount), valueClass: '' },
      { label: 'Nearest Deadline', value: nearestDeadline ? formatDate(nearestDeadline) : '—', valueClass: '' },
    ];

    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'summary-strip-item';
      const label = document.createElement('span');
      label.className = 'summary-strip-label';
      label.textContent = item.label;
      const value = document.createElement('span');
      value.className = `summary-strip-value ${item.valueClass}`.trim();
      value.textContent = item.value;
      div.appendChild(label);
      div.appendChild(value);
      summary.appendChild(div);
    }

    return summary;
  }

  function openGoalForm(goal = null) {
    const isEditing = !!goal;
    let editingId = null;
    let formSnapshot = goal || state.getState().goalForm || {};
    if (goal && goal.id) {
      editingId = goal.id;
    }

    const buffer = createFormStateBuffer({
      name: formSnapshot.name || '',
      target: formSnapshot.target || '',
      deadline: formSnapshot.deadline || '',
      icon: formSnapshot.icon || '🎯',
      color: formSnapshot.color || '#FF0000',
      priority: formSnapshot.priority || 'medium',
    });

    const body = document.createElement('div');
    body.className = 'goal-form-body';

    const nameField = createField('Name', 'text', buffer.getState().name, (value) => {
      buffer.setValue('name', value);
    });
    body.appendChild(nameField);

    const targetField = createField('Target Amount', 'number', buffer.getState().target || '', (value) => {
      buffer.setValue('target', value);
    });
    body.appendChild(targetField);

    const deadlineField = createField('Deadline (YYYY-MM-DD)', 'text', buffer.getState().deadline || '', (value) => {
      buffer.setValue('deadline', value);
    });
    body.appendChild(deadlineField);

    const iconField = createField('Icon (emoji)', 'text', buffer.getState().icon || '🎯', (value) => {
      buffer.setValue('icon', value);
    });
    body.appendChild(iconField);

    const colorField = createField('Color (hex)', 'text', buffer.getState().color || '#FF0000', (value) => {
      buffer.setValue('color', value);
    });
    body.appendChild(colorField);

    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Goal';
    submitBtn.className = 'btn btn-primary';
    formActions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      buffer.reset({ name: '', target: '', deadline: '', icon: '🎯', color: '#FF0000', priority: 'medium' });
      state.dispatch({ type: 'RESET_GOAL_FORM' });
      closeModal();
    });
    formActions.appendChild(cancelBtn);

    body.appendChild(formActions);

    const formEl = document.createElement('form');
    formEl.className = 'goal-form';
    formEl.appendChild(body);

    const createSection = document.createElement('div');
    createSection.className = 'create-goal-section';
    createSection.appendChild(formEl);

    let closeModal = () => {};
    const modalClose = showModal({
      title: isEditing ? 'Edit Goal' : 'Create Goal',
      bodyHTML: createSection,
      size: 'sm',
      onClose: () => {
        buffer.reset({ name: '', target: '', deadline: '', icon: '🎯', color: '#FF0000', priority: 'medium' });
        state.dispatch({ type: 'RESET_GOAL_FORM' });
      },
    });
    closeModal = modalClose;

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const operationKey = isEditing ? 'updateGoal' : 'createGoal';
      if (state.getState().operations[operationKey]?.loading) return;

      const currentForm = buffer.getState();
      const name = currentForm.name?.trim();
      const rawTarget = currentForm.target === '' ? undefined : Number(currentForm.target);
      const target = rawTarget === undefined ? NaN : rawTarget;
      const deadline = currentForm.deadline?.trim();
      const icon = currentForm.icon?.trim();
      const color = currentForm.color?.trim();

      if (!name || !Number.isFinite(target) || target <= 0 || !deadline || !icon || !color) {
        showToast({ message: 'Please fill in all fields with valid values.', type: 'error' });
        return;
      }

      state.dispatch({ type: 'OPERATION_START', key: operationKey });
      submitBtn.disabled = true;

      try {
        if (isEditing) {
          await modules.goal.updateGoal({
            goalId: editingId,
            updates: { name, target, deadline, icon, color },
          });
          showToast({ message: 'Goal updated successfully.', type: 'success' });
        } else {
          await modules.goal.createGoal({
            userId: state.getState().session.userId,
            name,
            target,
            deadline,
            icon,
            color,
            priority: currentForm.priority || 'medium',
          });
          showToast({ message: 'Goal created successfully.', type: 'success' });
        }

        closeModal();
        const refreshed = await modules.goal.getActiveGoals({ userId: state.getState().session.userId });
        state.dispatch({ type: 'SET_GOALS', goals: refreshed });
      } catch (e) {
        state.dispatch({ type: 'OPERATION_ERROR', key: operationKey, error: e.message });
        showToast({ message: e.message, type: 'error' });
      } finally {
        state.dispatch({ type: 'OPERATION_STOP', key: operationKey });
        submitBtn.disabled = false;
      }
    });
  }

  function openDepositModal(goal, accounts) {
    const buffer = createFormStateBuffer({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      accountId: '',
    });

    const body = document.createElement('div');
    body.className = 'deposit-form-body';

    const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
    const accountField = createSelectField('Account', accountOptions, '', (value) => {
      buffer.setValue('accountId', value);
    });
    body.appendChild(accountField);

    const amountField = createField('Amount', 'number', buffer.getState().amount, (value) => {
      buffer.setValue('amount', value);
    });
    body.appendChild(amountField);

    const dateField = createField('Date (YYYY-MM-DD)', 'text', buffer.getState().date, (value) => {
      buffer.setValue('date', value);
    });
    body.appendChild(dateField);

    const formActions = document.createElement('div');
    formActions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Submit Deposit';
    submitBtn.className = 'btn btn-primary';
    formActions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      buffer.reset({ amount: '', date: new Date().toISOString().slice(0, 10), accountId: '' });
      closeModal();
    });
    formActions.appendChild(cancelBtn);

    body.appendChild(formActions);

    const formEl = document.createElement('form');
    formEl.className = 'deposit-form';
    formEl.appendChild(body);

    const depositSection = document.createElement('div');
    depositSection.className = 'deposit-form-section';
    depositSection.appendChild(formEl);

    let closeModal = () => {};
    const modalClose = showModal({
      title: `Deposit to ${goal.name}`,
      bodyHTML: depositSection,
      size: 'sm',
      onClose: () => {
        buffer.reset({ amount: '', date: new Date().toISOString().slice(0, 10), accountId: '' });
      },
    });
    closeModal = modalClose;

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.getState().operations?.depositToGoal?.loading) return;

      const depositFormState = buffer.getState();
      const rawAmount = depositFormState.amount === '' ? undefined : Number(depositFormState.amount);
      const amount = Number.isFinite(rawAmount) ? rawAmount : NaN;
      const date = depositFormState.date;
      const accountId = depositFormState.accountId;

      if (!accountId) {
        showToast({ message: 'Please select an account first.', type: 'error' });
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0 || isNaN(amount)) {
        showToast({ message: 'Please enter a valid amount.', type: 'error' });
        return;
      }
      if (!date) {
        showToast({ message: 'Please enter a date.', type: 'error' });
        return;
      }

      state.dispatch({ type: 'OPERATION_START', key: 'depositToGoal' });
      submitBtn.disabled = true;

      try {
        const result = await modules.goal.depositToGoal({
          userId: state.getState().session.userId,
          goalId: goal.id,
          accountId,
          amount,
          date,
          description: 'Goal deposit',
        });
        const refreshed = await modules.goal.getActiveGoals({ userId: state.getState().session.userId });
        state.dispatch({ type: 'SET_GOALS', goals: refreshed });
        showToast({ message: 'Deposit successful.', type: 'success' });
        closeModal();
      } catch (e) {
        state.dispatch({ type: 'OPERATION_ERROR', key: 'depositToGoal', error: e.message });
        showToast({ message: e.message, type: 'error' });
      } finally {
        state.dispatch({ type: 'OPERATION_STOP', key: 'depositToGoal' });
        submitBtn.disabled = false;
      }
    });
  }
}
