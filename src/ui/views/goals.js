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
  header.className = 'goals-header';
  const title = document.createElement('h2');
  title.textContent = 'Goals';
  const subtitle = document.createElement('p');
  subtitle.className = 'goals-subtitle';
  subtitle.textContent = 'Track progress toward your financial goals';
  header.appendChild(title);
  header.appendChild(subtitle);
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
    loadingEl.textContent = 'Loading goals...';
    root.appendChild(loadingEl);
    return root;
  }

  if (goals.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '🎯';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = 'No goals yet';
    const emptyDesc = document.createElement('p');
    emptyDesc.className = 'empty-state-desc';
    emptyDesc.textContent = 'Create your first goal to start tracking your savings progress.';
    empty.appendChild(emptyIcon);
    empty.appendChild(emptyTitle);
    empty.appendChild(emptyDesc);
    root.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'goal-list';
    for (const goal of goals) {
      const li = document.createElement('li');
      li.className = 'goal-item';
      li.dataset.goalId = goal.id;

      const header = document.createElement('div');
      header.className = 'goal-item-header';

      const iconEl = document.createElement('div');
      iconEl.className = 'goal-item-icon';
      if (goal.icon) {
        iconEl.textContent = goal.icon;
      }
      header.appendChild(iconEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'goal-item-name goal-name';
      nameEl.textContent = goal.name;
      header.appendChild(nameEl);

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

      const meta = document.createElement('div');
      meta.className = 'goal-item-meta';
      const remaining = Math.max(0, (goal.target || 0) - (goal.current || 0));
      meta.textContent = `${formatCurrency(goal.current)} of ${formatCurrency(goal.target)} • ${formatCurrency(remaining)} remaining`;
      header.appendChild(meta);

      li.appendChild(header);

      const current = Number(goal.current) || 0;
      const target = Number(goal.target) || 0;
      const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
      const progressTrack = document.createElement('div');
      progressTrack.className = 'goal-progress-track';
      const progressFill = document.createElement('div');
      progressFill.className = `goal-progress-fill${pct >= 100 ? ' complete' : ''}`;
      progressFill.style.width = `${pct}%`;
      progressTrack.appendChild(progressFill);
      li.appendChild(progressTrack);

      const actions = document.createElement('div');
      actions.className = 'goal-actions';

      const depositAccountOptions = accounts.map(a => ({ value: a.id, label: a.name }));
      const depositAccountField = createSelectField('Account', depositAccountOptions, '', () => {});
      actions.appendChild(depositAccountField);

      const depositBtn = document.createElement('button');
      depositBtn.type = 'button';
      depositBtn.textContent = 'Deposit';
      depositBtn.className = 'btn btn-secondary';
      depositBtn.addEventListener('click', () => {
        const depositForm = document.getElementById(`deposit-form-${goal.id}`);
        if (depositForm) {
          depositForm.style.display = depositForm.style.display === 'none' ? 'block' : 'none';
        }
      });
      actions.appendChild(depositBtn);

      const depositForm = document.createElement('div');
      depositForm.id = `deposit-form-${goal.id}`;
      depositForm.className = 'deposit-form';
      depositForm.style.display = 'none';

      const depositAmountField = createField('Amount', 'number', '', () => {});
      depositForm.appendChild(depositAmountField);

      const depositDateField = createField('Date (YYYY-MM-DD)', 'text', new Date().toISOString().slice(0, 10), () => {});
      depositForm.appendChild(depositDateField);

      const depositSubmitBtn = document.createElement('button');
      depositSubmitBtn.type = 'button';
      depositSubmitBtn.textContent = 'Submit Deposit';
      depositSubmitBtn.className = 'btn btn-primary';
      depositSubmitBtn.addEventListener('click', async () => {
        if (state.getState().operations?.depositToGoal?.loading) return;

        const goalActions = document.querySelector(`.goal-item[data-goal-id="${goal.id}"] .goal-actions`);
        const accountSelect = goalActions ? goalActions.querySelector('select') : null;
        const selectedAccountId = accountSelect ? accountSelect.value : '';

        if (!selectedAccountId) {
          alert('Please select an account first.');
          return;
        }

        const amountInput = depositForm.querySelector('input[type="number"]');
        const dateInput = depositForm.querySelector('input[type="text"]');
        const rawAmount = amountInput ? Number(amountInput.value) : NaN;
        const amount = Number.isFinite(rawAmount) ? rawAmount : NaN;
        const date = dateInput ? dateInput.value : '';

        if (!Number.isFinite(amount) || amount <= 0 || isNaN(amount)) {
          alert('Please enter a valid amount.');
          return;
        }
        if (!date) {
          alert('Please enter a date.');
          return;
        }

        depositSubmitBtn.disabled = true;
        state.dispatch({ type: 'OPERATION_START', key: 'depositToGoal' });
        try {
          const result = await modules.goal.depositToGoal({
            userId: state.getState().session.userId,
            goalId: goal.id,
            accountId: selectedAccountId,
            amount,
            date,
            description: 'Goal deposit',
          });
          const refreshed = await modules.goal.getActiveGoals({ userId: state.getState().session.userId });
          state.dispatch({ type: 'SET_GOALS', goals: refreshed });
          depositForm.style.display = 'none';
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'depositToGoal', error: e.message });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'depositToGoal' });
          depositSubmitBtn.disabled = false;
        }
      });
      depositForm.appendChild(depositSubmitBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.addEventListener('click', () => {
        depositForm.style.display = 'none';
      });
      depositForm.appendChild(cancelBtn);

      actions.appendChild(depositForm);

      const depositErrorEl = document.createElement('div');
      depositErrorEl.className = 'error-message';
      if (depositOperation.error) {
        depositErrorEl.textContent = depositOperation.error;
      }
      actions.appendChild(depositErrorEl);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.textContent = 'Archive';
      archiveBtn.className = 'btn btn-danger';
      archiveBtn.addEventListener('click', async () => {
        if (!confirm('Archive this goal?')) return;
        state.dispatch({ type: 'OPERATION_START', key: 'archiveGoal' });
        try {
          await modules.goal.archiveGoal({ goalId: goal.id });
          const refreshed = await modules.goal.getActiveGoals({ userId: state.getState().session.userId });
          state.dispatch({ type: 'SET_GOALS', goals: refreshed });
        } catch (e) {
          state.dispatch({ type: 'OPERATION_ERROR', key: 'archiveGoal', error: e.message });
        } finally {
          state.dispatch({ type: 'OPERATION_STOP', key: 'archiveGoal' });
        }
      });
      actions.appendChild(archiveBtn);

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
          },
        });
      });
      actions.appendChild(editBtn);

      li.appendChild(actions);
      list.appendChild(li);
    }
    root.appendChild(list);
  }

  const createSection = document.createElement('div');
  createSection.className = 'create-goal-section';

  const isEditing = form.editingId !== null && form.editingId !== undefined;

  const formTitle = document.createElement('h3');
  formTitle.textContent = isEditing ? 'Edit Goal' : 'Create Goal';
  createSection.appendChild(formTitle);

  const formEl = document.createElement('form');
  formEl.className = 'goal-form';

  const nameField = createField('Name', 'text', form.name || '', (value) => {
    state.dispatch({ type: 'SET_GOAL_FORM', form: { name: value } });
  });
  formEl.appendChild(nameField);

  const targetField = createField('Target Amount', 'number', form.target || '', (value) => {
    state.dispatch({ type: 'SET_GOAL_FORM', form: { target: value } });
  });
  formEl.appendChild(targetField);

  const deadlineField = createField('Deadline (YYYY-MM-DD)', 'text', form.deadline || '', (value) => {
    state.dispatch({ type: 'SET_GOAL_FORM', form: { deadline: value } });
  });
  formEl.appendChild(deadlineField);

  const iconField = createField('Icon (emoji)', 'text', form.icon || '🎯', (value) => {
    state.dispatch({ type: 'SET_GOAL_FORM', form: { icon: value } });
  });
  formEl.appendChild(iconField);

  const colorField = createField('Color (hex)', 'text', form.color || '#FF0000', (value) => {
    state.dispatch({ type: 'SET_GOAL_FORM', form: { color: value } });
  });
  formEl.appendChild(colorField);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Goal';
  submitBtn.className = 'btn btn-primary';
  formEl.appendChild(submitBtn);

  if (isEditing) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.addEventListener('click', () => {
      state.dispatch({ type: 'RESET_GOAL_FORM' });
    });
    formEl.appendChild(cancelBtn);
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const operationKey = isEditing ? 'updateGoal' : 'createGoal';
    if (state.getState().operations[operationKey]?.loading) return;

    const currentForm = state.getState().goalForm;
    const name = currentForm.name?.trim();
    const rawTarget = currentForm.target === '' ? undefined : Number(currentForm.target);
    const target = rawTarget === undefined ? NaN : rawTarget;
    const deadline = currentForm.deadline?.trim();
    const icon = currentForm.icon?.trim();
    const color = currentForm.color?.trim();

    if (!name || !Number.isFinite(target) || target <= 0 || !deadline || !icon || !color) {
      alert('Please fill in all fields with valid values.');
      return;
    }

    state.dispatch({ type: 'OPERATION_START', key: operationKey });

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEditing) {
        await modules.goal.updateGoal({
          goalId: currentForm.editingId,
          updates: { name, target, deadline, icon, color },
        });
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
      }

      state.dispatch({ type: 'RESET_GOAL_FORM' });

      const refreshed = await modules.goal.getActiveGoals({ userId: state.getState().session.userId });
      state.dispatch({ type: 'SET_GOALS', goals: refreshed });
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

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
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
  select.className = 'form-input';
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
