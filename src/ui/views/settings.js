export function render(context = {}) {
  const { state, modules } = context;

  if (!state) {
    const el = document.createElement('div');
    el.className = 'view-placeholder';
    el.innerHTML = '<h2>Settings</h2><p>Settings placeholder — functional screens will be added in later stages.</p>';
    return el;
  }

  const snapshot = state.getState();
  const profile = snapshot.session?.profile || null;
  const categoryError = snapshot.operations?.createCategory?.error || null;

  const root = document.createElement('div');
  root.className = 'settings-view';

  const heading = document.createElement('h2');
  heading.textContent = 'Settings';
  root.appendChild(heading);

  if (!profile) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-message';
    emptyEl.textContent = 'No profile loaded.';
    root.appendChild(emptyEl);
    return root;
  }

  const settingsSection = document.createElement('div');
  settingsSection.className = 'settings-section';

  const settingsTitle = document.createElement('h3');
  settingsTitle.textContent = 'Profile Settings';
  settingsSection.appendChild(settingsTitle);

  const formEl = document.createElement('form');
  formEl.className = 'settings-form';

  const currencyField = createField('Currency', 'text', profile.settings?.currency || 'PLN', (value) => {
    state.dispatch({ type: 'SET_USER_PROFILE', profile: { ...profile, settings: { ...profile.settings, currency: value } } });
  });
  formEl.appendChild(currencyField);

  const themeField = createSelectField('Theme', [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ], profile.settings?.theme || 'system', (value) => {
    state.dispatch({ type: 'SET_USER_PROFILE', profile: { ...profile, settings: { ...profile.settings, theme: value } } });
  });
  formEl.appendChild(themeField);

  const privacyField = createSelectField('Privacy Mode', [
    { value: 'false', label: 'Off' },
    { value: 'true', label: 'On' },
  ], String(profile.settings?.privacyMode ?? false), (value) => {
    state.dispatch({ type: 'SET_USER_PROFILE', profile: { ...profile, settings: { ...profile.settings, privacyMode: value === 'true' } } });
  });
  formEl.appendChild(privacyField);

  const excludeInvestmentsField = createSelectField('Exclude Investments from Net Worth', [
    { value: 'false', label: 'No' },
    { value: 'true', label: 'Yes' },
  ], String(profile.settings?.excludeInvestmentsFromNetWorth ?? false), (value) => {
    state.dispatch({ type: 'SET_USER_PROFILE', profile: { ...profile, settings: { ...profile.settings, excludeInvestmentsFromNetWorth: value === 'true' } } });
  });
  formEl.appendChild(excludeInvestmentsField);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Save Settings';
  submitBtn.className = 'btn btn-primary';
  formEl.appendChild(submitBtn);

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.getState().operations.updateProfile?.loading) return;

    const currentProfile = state.getState().session.profile;
    if (!currentProfile) {
      return;
    }

    const originalProfile = currentProfile;

    state.dispatch({ type: 'OPERATION_START', key: 'updateProfile' });

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await modules.user.updateProfile({
        userId: currentProfile.id,
        settings: currentProfile.settings,
      });
      alert('Settings saved successfully.');
    } catch (err) {
      state.dispatch({ type: 'OPERATION_ERROR', key: 'updateProfile', error: err.message });
      try {
        const reloaded = await modules.user.getProfile({ userId: currentProfile.id });
        state.dispatch({ type: 'SET_USER_PROFILE', profile: reloaded });
      } catch (_reloadErr) {
        state.dispatch({ type: 'SET_USER_PROFILE', profile: originalProfile });
      }
      alert('Failed to save settings: ' + err.message);
    } finally {
      state.dispatch({ type: 'OPERATION_STOP', key: 'updateProfile' });
      const finalBtn = formEl.querySelector('button[type="submit"]');
      if (finalBtn) finalBtn.disabled = false;
    }
  });

  settingsSection.appendChild(formEl);
  root.appendChild(settingsSection);

  const categorySection = document.createElement('div');
  categorySection.className = 'settings-section';

  const categoryTitle = document.createElement('h3');
  categoryTitle.textContent = 'Categories';
  categorySection.appendChild(categoryTitle);

  if (categoryError) {
    const categoryErrorEl = document.createElement('div');
    categoryErrorEl.className = 'error-message';
    categoryErrorEl.textContent = categoryError;
    categorySection.appendChild(categoryErrorEl);
  }

  const categoryFormEl = document.createElement('form');
  categoryFormEl.className = 'category-form';

  const categoryNameField = createField('Name', 'text', state.getState().categoryForm.name || '', (value) => {
    state.dispatch({ type: 'SET_CATEGORY_FORM', form: { name: value } });
  });
  categoryFormEl.appendChild(categoryNameField);

  const categoryTypeField = createSelectField('Type', [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
  ], state.getState().categoryForm.type || 'expense', (value) => {
    state.dispatch({ type: 'SET_CATEGORY_FORM', form: { type: value } });
  });
  categoryFormEl.appendChild(categoryTypeField);

  const categoryIconField = createField('Icon', 'text', state.getState().categoryForm.icon || 'circle', (value) => {
    state.dispatch({ type: 'SET_CATEGORY_FORM', form: { icon: value } });
  });
  categoryFormEl.appendChild(categoryIconField);

  const categoryColorField = createField('Color (hex)', 'text', state.getState().categoryForm.color || '#888888', (value) => {
    state.dispatch({ type: 'SET_CATEGORY_FORM', form: { color: value } });
  });
  categoryFormEl.appendChild(categoryColorField);

  const createCategoryBtn = document.createElement('button');
  createCategoryBtn.type = 'submit';
  createCategoryBtn.textContent = 'Create Category';
  createCategoryBtn.className = 'btn btn-primary';
  categoryFormEl.appendChild(createCategoryBtn);

  categoryFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.getState().operations.createCategory?.loading) return;

    const currentForm = state.getState().categoryForm;
    const name = currentForm.name?.trim();
    const type = currentForm.type;
    const icon = currentForm.icon?.trim();
    const color = currentForm.color?.trim();

    if (!name || !type || !icon || !color) {
      alert('Please fill in all category fields.');
      return;
    }

    state.dispatch({ type: 'OPERATION_START', key: 'createCategory' });

    const submitBtn = categoryFormEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await modules.category.createCategory({
        userId: state.getState().session.userId,
        name,
        type,
        icon,
        color,
      });
      state.dispatch({ type: 'RESET_CATEGORY_FORM' });
      alert('Category created successfully.');
    } catch (err) {
      state.dispatch({ type: 'OPERATION_ERROR', key: 'createCategory', error: err.message });
      alert('Failed to create category: ' + err.message);
    } finally {
      state.dispatch({ type: 'OPERATION_STOP', key: 'createCategory' });
      const finalBtn = categoryFormEl.querySelector('button[type="submit"]');
      if (finalBtn) finalBtn.disabled = false;
    }
  });

  categorySection.appendChild(categoryFormEl);
  root.appendChild(categorySection);

  const backupSection = document.createElement('div');
  backupSection.className = 'settings-section';

  const backupTitle = document.createElement('h3');
  backupTitle.textContent = 'Backup & Restore';
  backupSection.appendChild(backupTitle);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Export Backup';
  exportBtn.className = 'btn btn-primary';
  backupSection.appendChild(exportBtn);

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  backupSection.appendChild(importInput);

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.textContent = 'Import Backup';
  importBtn.className = 'btn btn-secondary';
  backupSection.appendChild(importBtn);

  const backupErrorEl = document.createElement('div');
  backupErrorEl.className = 'error-message';
  backupErrorEl.style.display = 'none';
  backupSection.appendChild(backupErrorEl);

  const backupSuccessEl = document.createElement('div');
  backupSuccessEl.className = 'success-message';
  backupSuccessEl.style.display = 'none';
  backupSection.appendChild(backupSuccessEl);

  const previewEl = document.createElement('div');
  previewEl.className = 'backup-preview';
  previewEl.style.display = 'none';
  backupSection.appendChild(previewEl);

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.textContent = 'Confirm Restore';
  confirmBtn.className = 'btn btn-danger';
  confirmBtn.style.display = 'none';
  backupSection.appendChild(confirmBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.style.display = 'none';
  backupSection.appendChild(cancelBtn);

  let pendingBackupEnvelope = null;

  function showBackupError(message) {
    backupErrorEl.textContent = message;
    backupErrorEl.style.display = message ? 'block' : 'none';
  }

  function showBackupSuccess(message) {
    backupSuccessEl.textContent = message;
    backupSuccessEl.style.display = message ? 'block' : 'none';
  }

  function hideBackupMessages() {
    showBackupError(null);
    showBackupSuccess(null);
  }

  exportBtn.addEventListener('click', async () => {
    hideBackupMessages();
    previewEl.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.style.display = 'none';

    const currentProfile = state.getState().session.profile;
    if (!currentProfile) {
      showBackupError('No profile loaded.');
      return;
    }

    try {
      const envelope = await modules.backup.createBackup({
        userId: currentProfile.id,
      });

      const json = JSON.stringify(envelope, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showBackupSuccess('Backup exported successfully.');
    } catch (err) {
      showBackupError('Export failed: ' + err.message);
    }
  });

  importBtn.addEventListener('click', () => {
    hideBackupMessages();
    importInput.click();
  });

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    hideBackupMessages();
    previewEl.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.style.display = 'none';

    try {
      const text = await file.text();
      const envelope = JSON.parse(text);

      const currentProfile = state.getState().session.profile;
      if (!currentProfile) {
        showBackupError('No profile loaded.');
        return;
      }

      const validation = modules.restore.validateRestoreBackup(envelope, currentProfile.id);
      if (!validation.valid) {
        showBackupError('Invalid backup: ' + validation.errors.join(', '));
        return;
      }

      const preview = modules.restore.computeRestorePreview(envelope.data, envelope);
      previewEl.innerHTML = `
        <h4>Restore Preview</h4>
        <p><strong>Backup created:</strong> ${new Date(envelope.createdAt).toLocaleString()}</p>
        <p><strong>User ID:</strong> ${envelope.userId}</p>
        <ul>
          ${Object.entries(preview.collections).map(([name, counts]) => `
            <li>${name}: ${counts.backup} (current: ${counts.current})</li>
          `).join('')}
        </ul>
        <p class="warning">This will replace all your current data with the backup data.</p>
      `;
      previewEl.style.display = 'block';

      pendingBackupEnvelope = envelope;
      confirmBtn.style.display = 'inline-block';
      cancelBtn.style.display = 'inline-block';
    } catch (err) {
      showBackupError('Import failed: ' + err.message);
    }

    importInput.value = '';
  });

  cancelBtn.addEventListener('click', () => {
    pendingBackupEnvelope = null;
    previewEl.style.display = 'none';
    confirmBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    hideBackupMessages();
  });

  confirmBtn.addEventListener('click', async () => {
    if (!pendingBackupEnvelope) return;

    hideBackupMessages();
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      const currentProfile = state.getState().session.profile;
      if (!currentProfile) {
        showBackupError('No profile loaded.');
        return;
      }

      const result = await modules.restore.executeRestore(pendingBackupEnvelope, {
        userId: currentProfile.id,
      });

      if (result.success) {
        showBackupSuccess('Restore completed successfully. Reloading...');
        pendingBackupEnvelope = null;
        previewEl.style.display = 'none';
        confirmBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showBackupError('Restore failed: ' + (result.error || 'Unknown error'));
        if (result.rollbackAvailable) {
          showBackupError('A pre-restore backup was saved. You can attempt rollback.');
        }
      }
    } catch (err) {
      showBackupError('Restore failed: ' + err.message);
    } finally {
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  backupSection.appendChild(backupErrorEl);
  backupSection.appendChild(backupSuccessEl);
  backupSection.appendChild(previewEl);
  backupSection.appendChild(confirmBtn);
  backupSection.appendChild(cancelBtn);

  root.appendChild(backupSection);

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
