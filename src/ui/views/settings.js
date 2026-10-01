import { showToast } from '../utils/feedback.js';
import { t, getSupportedLocales, getDisplayName, setLocale } from '../i18n.js';

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

  const pageTitle = el('h1', 'settings-page-title', t('settings.title'));
  pageHeaderTitles.appendChild(pageTitle);

  const pageSubtitle = el('p', 'settings-page-subtitle', t('settings.subtitle'));
  pageHeaderTitles.appendChild(pageSubtitle);

  pageHeader.appendChild(pageHeaderTitles);
  root.appendChild(pageHeader);

  if (!profile) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-message';
    emptyEl.textContent = t('backup.noProfile');
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
      language: initialSettings.language || 'pl',
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

  const appearanceTitle = el('h3', 'settings-section-title', t('appearance.title'));
  appearanceSection.appendChild(appearanceTitle);

  const appearanceDesc = el('p', 'settings-section-desc', t('appearance.description'));
  appearanceSection.appendChild(appearanceDesc);

  const accentRow = document.createElement('div');
  accentRow.className = 'settings-accent-row';

  const accentLabel = el('span', 'settings-accent-label', t('appearance.accentColor'));
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

  const themeField = createSelectField(t('appearance.theme'), [
    { value: 'light', label: t('appearance.themeLight') },
    { value: 'dark', label: t('appearance.themeDark') },
    { value: 'system', label: t('appearance.themeSystem') },
  ], initialSettings.theme || 'system', (value) => {
    // Theme is applied immediately via data-theme attribute
    document.documentElement.setAttribute('data-theme', value);
  });
  appearanceSection.appendChild(themeField);

  root.appendChild(appearanceSection);

  // ── 3. Preferences Section ─────────────────────────────────
  const preferencesSection = document.createElement('div');
  preferencesSection.className = 'surface-interactive settings-section';

  const preferencesTitle = el('h3', 'settings-section-title', t('preferences.title'));
  preferencesSection.appendChild(preferencesTitle);

  const preferencesDesc = el('p', 'settings-section-desc', t('preferences.description'));
  preferencesSection.appendChild(preferencesDesc);

  const currencyField = createField(t('common.currency'), 'text', initialSettings.currency || 'PLN', (value) => {
    buffer.setValue('currency', value);
  });
  preferencesSection.appendChild(currencyField);

  const privacyField = createSelectField(t('preferences.privacyMode'), [
    { value: 'false', label: t('preferences.off') },
    { value: 'true', label: t('preferences.on') },
  ], String(initialSettings.privacyMode ?? false), (value) => {
    buffer.setValue('privacyMode', value === 'true');
  });
  preferencesSection.appendChild(privacyField);

  const excludeInvestmentsField = createSelectField(t('preferences.excludeInvestments'), [
    { value: 'false', label: 'No' },
    { value: 'true', label: 'Yes' },
  ], String(initialSettings.excludeInvestmentsFromNetWorth ?? false), (value) => {
    buffer.setValue('excludeInvestmentsFromNetWorth', value === 'true');
  });
  preferencesSection.appendChild(excludeInvestmentsField);

  const languageOptions = getSupportedLocales().map(locale => ({
    value: locale,
    label: getDisplayName(locale),
  }));
  const languageField = createSelectField(t('preferences.language'), languageOptions, initialSettings.language || 'pl', (value) => {
    buffer.setValue('language', value);
  });
  preferencesSection.appendChild(languageField);

  root.appendChild(preferencesSection);

  // ── 4. Data & Backup Section ───────────────────────────────
  const backupSection = document.createElement('div');
  backupSection.className = 'surface-interactive settings-section';

  const backupTitle = el('h3', 'settings-section-title', t('backup.title'));
  backupSection.appendChild(backupTitle);

  const backupDesc = el('p', 'settings-section-desc', t('backup.description'));
  backupSection.appendChild(backupDesc);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = t('backup.export');
  exportBtn.className = 'btn btn-primary';
  backupSection.appendChild(exportBtn);

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  backupSection.appendChild(importInput);

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.textContent = t('backup.import');
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
  confirmBtn.textContent = t('common.confirmRestore');
  confirmBtn.className = 'btn btn-danger';
  confirmBtn.style.display = 'none';
  backupSection.appendChild(confirmBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = t('common.cancel');
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
      showBackupError(t('backup.noProfile'));
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
        showBackupError(t('backup.noProfile'));
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
      h4.textContent = t('common.restorePreview');
      previewEl.appendChild(h4);

      const createdP = document.createElement('p');
      const createdStrong = document.createElement('strong');
      createdStrong.textContent = t('common.backupCreated');
      createdP.appendChild(createdStrong);
      createdP.appendChild(document.createTextNode(new Date(envelope.createdAt).toLocaleString()));
      previewEl.appendChild(createdP);

      const userIdP = document.createElement('p');
      const userIdStrong = document.createElement('strong');
      userIdStrong.textContent = t('common.userId');
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
      warningP.textContent = t('common.replaceWarning');
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
        showBackupError(t('backup.noProfile'));
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

  const categoryTitle = el('h3', 'settings-section-title', t('categories.title'));
  categorySection.appendChild(categoryTitle);

  const categoryDesc = el('p', 'settings-section-desc', t('categories.description'));
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

  const categoryNameField = createField(t('common.name'), 'text', categoryBuffer.getState().name, (value) => {
    categoryBuffer.setValue('name', value);
  });
  categoryFormEl.appendChild(categoryNameField);

  const categoryTypeField = createSelectField(t('common.type'), [
    { value: 'income', label: t('common.income') },
    { value: 'expense', label: t('common.expense') },
  ], categoryBuffer.getState().type, (value) => {
    categoryBuffer.setValue('type', value);
  });
  categoryFormEl.appendChild(categoryTypeField);

  const categoryIconField = createField(t('common.icon'), 'text', categoryBuffer.getState().icon || 'circle', (value) => {
    categoryBuffer.setValue('icon', value);
  });
  categoryFormEl.appendChild(categoryIconField);

  const categoryColorField = createField(t('common.color'), 'text', categoryBuffer.getState().color || '#888888', (value) => {
    categoryBuffer.setValue('color', value);
  });
  categoryFormEl.appendChild(categoryColorField);

  const createCategoryBtn = document.createElement('button');
  createCategoryBtn.type = 'submit';
  createCategoryBtn.textContent = t('categories.create');
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
      showToast({ message: t('common.pleaseFillAllFields'), type: 'error' });
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
      showToast({ message: t('categories.createSuccess'), type: 'success' });
    } catch (err) {
      state.dispatch({ type: 'OPERATION_ERROR', key: 'createCategory', error: err.message });
      showToast({ message: t('categories.createFailed', { error: err.message }), type: 'error' });
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

  const infoTitle = el('h3', 'settings-section-title', t('settings.appInfo'));
  infoSection.appendChild(infoTitle);

  const infoDesc = el('p', 'settings-section-desc', t('settings.appInfo'));
  infoSection.appendChild(infoDesc);

  const versionEl = el('p', 'settings-info-text', t('common.version'));
  infoSection.appendChild(versionEl);

  const infoP = document.createElement('p');
  infoP.className = 'settings-info-text';
  infoP.textContent = t('common.localFirst');
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

    const previousLanguage = profile.settings?.language || 'pl';
    const newLanguage = currentSettings.language || 'pl';

    state.dispatch({ type: 'SET_USER_PROFILE', profile: { ...profile, settings: currentSettings } });
    state.dispatch({ type: 'OPERATION_START', key: 'updateProfile' });

    const submitBtn = saveForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await modules.user.updateProfile({
        userId: profile.id,
        settings: currentSettings,
      });
      showToast({ message: t('settings.saveSuccess'), type: 'success' });

      if (newLanguage !== previousLanguage) {
        await setLocale(newLanguage);
        window.location.reload();
      }
    } catch (err) {
      state.dispatch({ type: 'OPERATION_ERROR', key: 'updateProfile', error: err.message });
      showToast({ message: t('settings.saveFailed', { error: err.message }), type: 'error' });
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
  saveBtn.textContent = t('settings.save') || 'Save Settings';
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
