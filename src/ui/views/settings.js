import { showToast } from '../utils/feedback.js';

const ACCENT_OPTIONS = [
  { value: 'purple', label: 'Purple', color: '#8B5CF6' },
  { value: 'blue', label: 'Blue', color: '#3B82F6' },
  { value: 'emerald', label: 'Emerald', color: '#10B981' },
  { value: 'amber', label: 'Amber', color: '#F59E0B' },
  { value: 'rose', label: 'Rose', color: '#F43F5E' },
  { value: 'cyan', label: 'Cyan', color: '#06B6D4' },
];

function el(tag, className, textContent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (textContent !== undefined) e.textContent = textContent;
  return e;
}

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

  // ── 1. Page Header ─────────────────────────────────────────
  const pageHeader = document.createElement('div');
  pageHeader.className = 'settings-page-header';

  const pageHeaderTitles = document.createElement('div');
  pageHeaderTitles.className = 'settings-page-header-titles';

  const pageTitle = el('h1', 'settings-page-title', 'Settings');
  pageHeaderTitles.appendChild(pageTitle);

  const pageSubtitle = el('p', 'settings-page-subtitle', 'Manage your preferences and data');
  pageHeaderTitles.appendChild(pageSubtitle);

  pageHeader.appendChild(pageHeaderTitles);
  root.appendChild(pageHeader);

  if (!profile) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-message';
    emptyEl.textContent = 'No profile loaded.';
    root.appendChild(emptyEl);
    return root;
  }

  const initialSettings = profile.settings || {};

  const buffer = {
    _state: {
      currency: initialSettings.currency || 'PLN',
      theme: initialSettings.theme || 'system',
      accent: initialSettings.accent || 'purple',
      privacyMode: initialSettings.privacyMode || false,
      excludeInvestmentsFromNetWorth: initialSettings.excludeInvestmentsFromNetWorth || false,
    },
    getState() {
      return { ...this._state };
    },
    getValue(key) {
      return this._state[key];
    },
    setValue(key, value) {
      this._state[key] = value;
    },
  };

  // ── 2. Appearance Section ──────────────────────────────────
  const appearanceSection = document.createElement('div');
  appearanceSection.className = 'surface-interactive settings-section';

  const appearanceTitle = el('h3', 'settings-section-title', 'Appearance');
  appearanceSection.appendChild(appearanceTitle);

  const appearanceDesc = el('p', 'settings-section-desc', 'Customize the look and feel of FINDORA.');
  appearanceSection.appendChild(appearanceDesc);

  const accentRow = document.createElement('div');
  accentRow.className = 'settings-accent-row';

  const accentLabel = el('span', 'settings-accent-label', 'Accent color');
  accentRow.appendChild(accentLabel);

  const accentSwatches = document.createElement('div');
  accentSwatches.className = 'settings-accent-swatches';

  const currentAccent = initialSettings.accent || 'purple';
  for (const option of ACCENT_OPTIONS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = `settings-accent-swatch${option.value === currentAccent ? ' settings-accent-swatch--active' : ''}`;
    swatch.style.setProperty('--swatch-color', option.color);
    swatch.style.backgroundColor = option.color;
    swatch.setAttribute('aria-label', `Select ${option.label} accent`);
    swatch.setAttribute('title', option.label);
    swatch.addEventListener('click', () => {
      document.documentElement.setAttribute('data-accent', option.value);
      accentSwatches.querySelectorAll('.settings-accent-swatch').forEach(s => s.classList.remove('settings-accent-swatch--active'));
      swatch.classList.add('settings-accent-swatch--active');
    });
    accentSwatches.appendChild(swatch);
  }

  accentRow.appendChild(accentSwatches);
  appearanceSection.appendChild(accentRow);

  const themeField = createSelectField('Theme', [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ], initialSettings.theme || 'system', (value) => {
    // Theme is applied immediately via data-theme attribute
    document.documentElement.setAttribute('data-theme', value);
  });
  appearanceSection.appendChild(themeField);

  root.appendChild(appearanceSection);

  // ── 3. Preferences Section ─────────────────────────────────
  const preferencesSection = document.createElement('div');
  preferencesSection.className = 'surface-interactive settings-section';

  const preferencesTitle = el('h3', 'settings-section-title', 'Preferences');
  preferencesSection.appendChild(preferencesTitle);

  const preferencesDesc = el('p', 'settings-section-desc', 'Configure how FINDORA works for you.');
  preferencesSection.appendChild(preferencesDesc);

  const currencyField = createField('Currency', 'text', initialSettings.currency || 'PLN', (value) => {
    buffer.setValue('currency', value);
  });
  preferencesSection.appendChild(currencyField);

  const privacyField = createSelectField('Privacy Mode', [
    { value: 'false', label: 'Off' },
    { value: 'true', label: 'On' },
  ], String(initialSettings.privacyMode ?? false), (value) => {
    buffer.setValue('privacyMode', value === 'true');
  });
  preferencesSection.appendChild(privacyField);

  const excludeInvestmentsField = createSelectField('Exclude Investments from Net Worth', [
    { value: 'false', label: 'No' },
    { value: 'true', label: 'Yes' },
  ], String(initialSettings.excludeInvestmentsFromNetWorth ?? false), (value) => {
    buffer.setValue('excludeInvestmentsFromNetWorth', value === 'true');
  });
  preferencesSection.appendChild(excludeInvestmentsField);

  root.appendChild(preferencesSection);

  // ── 4. Data & Backup Section ───────────────────────────────
  const backupSection = document.createElement('div');
  backupSection.className = 'surface-interactive settings-section';

  const backupTitle = el('h3', 'settings-section-title', 'Data & Backup');
  backupSection.appendChild(backupTitle);

  const backupDesc = el('p', 'settings-section-desc', 'Export, import, and safeguard your financial data.');
  backupSection.appendChild(backupDesc);

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
      a.download = `findora-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

      previewEl.innerHTML = '';
      const h4 = document.createElement('h4');
      h4.textContent = 'Restore Preview';
      previewEl.appendChild(h4);

      const createdP = document.createElement('p');
      const createdStrong = document.createElement('strong');
      createdStrong.textContent = 'Backup created: ';
      createdP.appendChild(createdStrong);
      createdP.appendChild(document.createTextNode(new Date(envelope.createdAt).toLocaleString()));
      previewEl.appendChild(createdP);

      const userIdP = document.createElement('p');
      const userIdStrong = document.createElement('strong');
      userIdStrong.textContent = 'User ID: ';
      userIdP.appendChild(userIdStrong);
      userIdP.appendChild(document.createTextNode(envelope.userId));
      previewEl.appendChild(userIdP);

      const ul = document.createElement('ul');
      for (const [name, counts] of Object.entries(preview.collections)) {
        const li = document.createElement('li');
        li.textContent = `${name}: ${counts.backup} (current: ${counts.current})`;
        ul.appendChild(li);
      }
      previewEl.appendChild(ul);

      const warningP = document.createElement('p');
      warningP.className = 'warning';
      warningP.textContent = 'This will replace all your current data with the backup data.';
      previewEl.appendChild(warningP);
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

  root.appendChild(backupSection);

  // ── 5. Categories Section ──────────────────────────────────
  const categorySection = document.createElement('div');
  categorySection.className = 'surface-interactive settings-section';

  const categoryTitle = el('h3', 'settings-section-title', 'Categories');
  categorySection.appendChild(categoryTitle);

  const categoryDesc = el('p', 'settings-section-desc', 'Create and manage transaction categories.');
  categorySection.appendChild(categoryDesc);

  if (categoryError) {
    const categoryErrorEl = document.createElement('div');
    categoryErrorEl.className = 'error-message';
    categoryErrorEl.textContent = categoryError;
    categorySection.appendChild(categoryErrorEl);
  }

  const categoryFormEl = document.createElement('form');
  categoryFormEl.className = 'category-form';

  const categoryBuffer = {
    _state: { name: '', type: 'expense', icon: 'circle', color: '#888888' },
    getState() { return { ...this._state }; },
    getValue(key) { return this._state[key]; },
    setValue(key, value) { this._state[key] = value; },
  };

  const categoryNameField = createField('Name', 'text', categoryBuffer.getState().name, (value) => {
    categoryBuffer.setValue('name', value);
  });
  categoryFormEl.appendChild(categoryNameField);

  const categoryTypeField = createSelectField('Type', [
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
  ], categoryBuffer.getState().type, (value) => {
    categoryBuffer.setValue('type', value);
  });
  categoryFormEl.appendChild(categoryTypeField);

  const categoryIconField = createField('Icon', 'text', categoryBuffer.getState().icon || 'circle', (value) => {
    categoryBuffer.setValue('icon', value);
  });
  categoryFormEl.appendChild(categoryIconField);

  const categoryColorField = createField('Color (hex)', 'text', categoryBuffer.getState().color || '#888888', (value) => {
    categoryBuffer.setValue('color', value);
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

    const currentForm = categoryBuffer.getState();
    const name = currentForm.name?.trim();
    const type = currentForm.type;
    const icon = currentForm.icon?.trim();
    const color = currentForm.color?.trim();

    if (!name || !type || !icon || !color) {
      showToast({ message: 'Please fill in all category fields.', type: 'error' });
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
      categoryBuffer._state = { name: '', type: 'expense', icon: 'circle', color: '#888888' };
      showToast({ message: 'Category created successfully.', type: 'success' });
    } catch (err) {
      state.dispatch({ type: 'OPERATION_ERROR', key: 'createCategory', error: err.message });
      showToast({ message: 'Failed to create category: ' + err.message, type: 'error' });
    } finally {
      state.dispatch({ type: 'OPERATION_STOP', key: 'createCategory' });
      const finalBtn = categoryFormEl.querySelector('button[type="submit"]');
      if (finalBtn) finalBtn.disabled = false;
    }
  });

  categoryFormEl.appendChild(createCategoryBtn);
  categorySection.appendChild(categoryFormEl);
  root.appendChild(categorySection);

  // ── 6. Application Info Section ────────────────────────────
  const infoSection = document.createElement('div');
  infoSection.className = 'surface-interactive settings-section';

  const infoTitle = el('h3', 'settings-section-title', 'Application');
  infoSection.appendChild(infoTitle);

  const infoDesc = el('p', 'settings-section-desc', 'FINDORA Personal Wealth OS');
  infoSection.appendChild(infoDesc);

  const versionEl = el('p', 'settings-info-text', 'Version 1.0.0');
  infoSection.appendChild(versionEl);

  const infoP = document.createElement('p');
  infoP.className = 'settings-info-text';
  infoP.textContent = 'Local-first architecture. Your data stays on your device.';
  infoSection.appendChild(infoP);

  root.appendChild(infoSection);

  // ── Save Handler ───────────────────────────────────────────
  const saveForm = document.createElement('form');
  saveForm.className = 'settings-save-form';
  saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.getState().operations.updateProfile?.loading) return;

    const currentSettings = buffer.getState();
    const accentValue = currentSettings.accent;
    if (accentValue) {
      document.documentElement.setAttribute('data-accent', accentValue);
    }

    state.dispatch({ type: 'SET_USER_PROFILE', profile: { ...profile, settings: currentSettings } });
    state.dispatch({ type: 'OPERATION_START', key: 'updateProfile' });

    const submitBtn = saveForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await modules.user.updateProfile({
        userId: profile.id,
        settings: currentSettings,
      });
      showToast({ message: 'Settings saved successfully.', type: 'success' });
    } catch (err) {
      state.dispatch({ type: 'OPERATION_ERROR', key: 'updateProfile', error: err.message });
      showToast({ message: 'Failed to save settings: ' + err.message, type: 'error' });
      try {
        const reloaded = await modules.user.getProfile({ userId: profile.id });
        state.dispatch({ type: 'SET_USER_PROFILE', profile: reloaded });
      } catch (_reloadErr) {
        state.dispatch({ type: 'SET_USER_PROFILE', profile });
      }
    } finally {
      state.dispatch({ type: 'OPERATION_STOP', key: 'updateProfile' });
      const finalBtn = saveForm.querySelector('button[type="submit"]');
      if (finalBtn) finalBtn.disabled = false;
    }
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save Settings';
  saveBtn.className = 'btn btn-primary settings-save-btn';
  saveForm.appendChild(saveBtn);

  root.appendChild(saveForm);

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
