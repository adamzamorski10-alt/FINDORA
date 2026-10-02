/**
 * Stage 3 — Income Profiles View
 *
 * Workspace for managing income profiles.
 */

import { t } from '../i18n.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';
import { isSupportedProfileType, getProfileType, SUPPORTED_PROFILE_TYPES } from '../../domain/income-profile/income-profile-types.js';

export function render(context = {}) {
  const { state, modules } = context;
  let snapshot = state.getState();
  const session = snapshot.session || {};
  const userId = session.userId;

  const root = document.createElement('div');
  root.className = 'income-profiles-view';

  if (!userId) {
    const placeholder = document.createElement('div');
    placeholder.className = 'view-placeholder';
    placeholder.innerHTML = `<h2>${t('incomeProfiles.title')}</h2><p>${t('common.pleaseLogin', { view: t('incomeProfiles.title').toLowerCase() })}</p>`;
    root.appendChild(placeholder);
    return root;
  }

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = document.createElement('h1');
  title.className = 'page-header-title';
  title.textContent = t('incomeProfiles.title');
  headerTitles.appendChild(title);
  const subtitle = document.createElement('p');
  subtitle.className = 'page-header-subtitle';
  subtitle.textContent = t('incomeProfiles.subtitle');
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary income-profiles-add-btn';
  addBtn.textContent = t('incomeProfiles.addProfile');
  addBtn.addEventListener('click', () => {
    openProfileForm();
  });
  header.appendChild(addBtn);
  root.appendChild(header);

  const content = document.createElement('div');
  content.className = 'income-profiles-content';

  const summary = document.createElement('div');
  summary.className = 'summary-strip';
  summary.id = 'income-profiles-summary';
  content.appendChild(summary);

  const list = document.createElement('div');
  list.className = 'surface-list income-profiles-list';
  list.id = 'income-profiles-list';
  content.appendChild(list);

  const detail = document.createElement('div');
  detail.className = 'income-profiles-detail';
  detail.id = 'income-profiles-detail';
  detail.style.display = 'none';
  content.appendChild(detail);

  root.appendChild(content);

  async function loadData() {
    if (!modules.incomeProfile) return;
    snapshot = state.getState();

    try {
      const profiles = await modules.incomeProfile.listProfiles({ userId });
      const summaryEl = document.getElementById('income-profiles-summary');
      const listEl = document.getElementById('income-profiles-list');

      if (summaryEl) {
        const active = profiles.filter(p => !p.archived).length;
        const total = profiles.length;

        summaryEl.innerHTML = '';

        const activeItem = document.createElement('div');
        activeItem.className = 'summary-strip-item';
        const activeLabel = document.createElement('span');
        activeLabel.className = 'summary-strip-label';
        activeLabel.textContent = t('incomeProfiles.activeProfiles');
        const activeValue = document.createElement('div');
        activeValue.className = 'summary-strip-value summary-strip-value--muted';
        activeValue.textContent = String(active);
        activeItem.appendChild(activeLabel);
        activeItem.appendChild(activeValue);
        summaryEl.appendChild(activeItem);

        const totalItem = document.createElement('div');
        totalItem.className = 'summary-strip-item';
        const totalLabel = document.createElement('span');
        totalLabel.className = 'summary-strip-label';
        totalLabel.textContent = t('incomeProfiles.totalProfiles');
        const totalValue = document.createElement('div');
        totalValue.className = 'summary-strip-value summary-strip-value--muted';
        totalValue.textContent = String(total);
        totalItem.appendChild(totalLabel);
        totalItem.appendChild(totalValue);
        summaryEl.appendChild(totalItem);
      }

      if (listEl) {
        listEl.innerHTML = '';

        if (profiles.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          const emptyIcon = document.createElement('div');
          emptyIcon.className = 'empty-state-icon';
          emptyIcon.textContent = '💼';
          const emptyTitle = document.createElement('p');
          emptyTitle.className = 'empty-state-title';
          emptyTitle.textContent = t('incomeProfiles.noProfiles');
          const emptyDesc = document.createElement('p');
          emptyDesc.className = 'empty-state-desc';
          emptyDesc.textContent = t('incomeProfiles.noProfilesDesc');
          const emptyAction = document.createElement('button');
          emptyAction.type = 'button';
          emptyAction.className = 'btn btn-primary';
          emptyAction.textContent = t('incomeProfiles.emptyAction');
          emptyAction.addEventListener('click', () => {
            openProfileForm();
          });
          empty.appendChild(emptyIcon);
          empty.appendChild(emptyTitle);
          empty.appendChild(emptyDesc);
          empty.appendChild(emptyAction);
          listEl.appendChild(empty);
          return;
        }

        profiles.forEach(profile => {
          const item = document.createElement('div');
          item.className = 'surface-list-item income-profile-item';
          item.dataset.profileId = profile.id;

          const iconInfo = getProfileType(profile.type);
          const typeLabel = iconInfo ? t(iconInfo.labelKey) : profile.type;

          const itemIcon = document.createElement('div');
          itemIcon.className = 'surface-list-item-icon';
          itemIcon.innerHTML = `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;

          const itemContent = document.createElement('div');
          itemContent.className = 'surface-list-item-content';

          const itemTitle = document.createElement('p');
          itemTitle.className = 'surface-list-item-title';
          itemTitle.textContent = profile.name;

          const itemMeta = document.createElement('p');
          itemMeta.className = 'surface-list-item-meta';
          itemMeta.innerHTML = `<span class="income-profile-type-badge">${escH(typeLabel)}</span><span>${profile.archived ? t('incomeProfiles.statusArchived') : t('incomeProfiles.statusActive')}</span>`;

          itemContent.appendChild(itemTitle);
          itemContent.appendChild(itemMeta);
          item.appendChild(itemIcon);
          item.appendChild(itemContent);

          const itemActions = document.createElement('div');
          itemActions.className = 'surface-list-item-actions';

          if (!profile.archived) {
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'surface-list-item-action';
            editBtn.textContent = t('common.edit');
            editBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              openProfileForm(profile);
            });

            const archiveBtn = document.createElement('button');
            archiveBtn.type = 'button';
            archiveBtn.className = 'surface-list-item-action surface-list-item-action--danger';
            archiveBtn.textContent = t('common.archive');
            archiveBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (await showConfirm({ message: t('incomeProfiles.archiveConfirm') })) {
                try {
                  await modules.incomeProfile.archiveProfile({ profileId: profile.id });
                  showToast({ message: t('incomeProfiles.archivedSuccess'), type: 'success' });
                  loadData();
                } catch (err) {
                  showToast({ message: t('common.error') + ': ' + (err && err.message ? err.message : err), type: 'error' });
                }
              }
            });

            itemActions.appendChild(editBtn);
            itemActions.appendChild(archiveBtn);
          }

          item.appendChild(itemActions);

          item.addEventListener('click', () => {
            openProfileDetail(profile);
          });

          listEl.appendChild(item);
        });
      }
    } catch (err) {
      console.error('Failed to load income profiles:', err);
    }
  }

  function openProfileForm(profile) {
    const isEdit = !!profile;
    const editingProfile = profile || null;

    const form = document.createElement('form');
    form.className = 'income-profile-form';

    if (isEdit && editingProfile) {
      state.dispatch({
        type: 'SET_INCOME_PROFILE_FORM',
        form: {
          type: editingProfile.type || '',
          name: editingProfile.name || '',
          description: editingProfile.description || '',
        },
      });
    }

    const typeField = createFormSelectField(
      t('incomeProfiles.type'),
      SUPPORTED_PROFILE_TYPES.map(pt => ({ value: pt.key, label: t(pt.labelKey) })),
      editingProfile ? editingProfile.type : '',
      (value) => {
        state.dispatch({ type: 'SET_INCOME_PROFILE_FORM', form: { type: value } });
      }
    );
    typeField.querySelector('select')?.setAttribute('name', 'profileType');
    form.appendChild(typeField);

    const nameField = createFormField(t('incomeProfiles.name'), 'text', editingProfile ? editingProfile.name : '', (value) => {
      state.dispatch({ type: 'SET_INCOME_PROFILE_FORM', form: { name: value } });
    });
    nameField.querySelector('input')?.setAttribute('name', 'profileName');
    form.appendChild(nameField);

    const descField = createFormField(t('incomeProfiles.descriptionOptional'), 'text', editingProfile ? editingProfile.description : '', (value) => {
      state.dispatch({ type: 'SET_INCOME_PROFILE_FORM', form: { description: value } });
    });
    descField.querySelector('input')?.setAttribute('name', 'profileDescription');
    form.appendChild(descField);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = t('common.save');
    form.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.addEventListener('click', () => {
      modalClose();
      state.dispatch({ type: 'RESET_INCOME_PROFILE_FORM' });
    });
    form.appendChild(cancelBtn);

    const modalClose = showModal({
      title: isEdit ? t('incomeProfiles.editProfile') : t('incomeProfiles.createProfile'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentSnapshot = state.getState();
      const formData = currentSnapshot.incomeProfileForm;

      const type = formData.type;
      const name = formData.name.trim();
      const description = formData.description ? formData.description.trim() : '';

      if (!isSupportedProfileType(type)) {
        showToast({ message: t('incomeProfiles.typeRequired'), type: 'error' });
        return;
      }
      if (!name) {
        showToast({ message: t('incomeProfiles.nameRequired'), type: 'error' });
        return;
      }

      try {
        if (isEdit && editingProfile) {
          await modules.incomeProfile.updateProfile({
            profileId: editingProfile.id,
            updates: { name, description },
          });
          showToast({ message: t('incomeProfiles.updatedSuccess'), type: 'success' });
        } else {
          await modules.incomeProfile.createProfile({
            userId,
            type,
            name,
            description,
          });
          showToast({ message: t('incomeProfiles.createdSuccess'), type: 'success' });
        }
        modalClose();
        state.dispatch({ type: 'RESET_INCOME_PROFILE_FORM' });
        loadData();
      } catch (err) {
        if (err.message === 'VALIDATION_FAILED') {
          showToast({ message: t('incomeProfiles.duplicateName'), type: 'error' });
        } else {
          showToast({ message: t('common.error') + ': ' + (err && err.message ? err.message : err), type: 'error' });
        }
      }
    });
  }

  function openProfileDetail(profile) {
    const detailEl = document.getElementById('income-profiles-detail');
    const listEl = document.getElementById('income-profiles-list');
    const summaryEl = document.getElementById('income-profiles-summary');

    if (detailEl) detailEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';
    if (summaryEl) summaryEl.style.display = 'none';

    detailEl.innerHTML = '';
    state.dispatch({ type: 'SET_SELECTED_INCOME_PROFILE_ID', profileId: profile.id });

    const PROFILE_ROUTING = {
      reselling: 'reselling',
    };

    const targetTab = PROFILE_ROUTING[profile.type];
    if (targetTab) {
      state.dispatch({ type: 'SET_ACTIVE_TAB', tab: targetTab });
    } else {
      detailEl.style.display = 'block';
      const iconInfo = getProfileType(profile.type);
      const typeLabel = iconInfo ? t(iconInfo.labelKey) : profile.type;
      const header = document.createElement('div');
      header.className = 'page-header';
      const headerTitles = document.createElement('div');
      headerTitles.className = 'page-header-titles';
      const title = document.createElement('h1');
      title.className = 'page-header-title';
      title.textContent = profile.name;
      headerTitles.appendChild(title);
      const subtitle = document.createElement('p');
      subtitle.className = 'page-header-subtitle';
      subtitle.textContent = typeLabel;
      headerTitles.appendChild(subtitle);
      header.appendChild(headerTitles);
      detailEl.appendChild(header);

      const placeholder = document.createElement('div');
      placeholder.className = 'empty-state';
      placeholder.innerHTML = `
        <div class="empty-state-icon">🚧</div>
        <p class="empty-state-title">${t('incomeProfiles.workspaceNotImplemented')}</p>
        <p class="empty-state-desc">${t('incomeProfiles.workspaceNotImplementedDesc', { type: typeLabel })}</p>
      `;
      detailEl.appendChild(placeholder);
    }
  }

  loadData();

  return root;
}

function createFormField(labelText, inputType, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = labelText;
  wrapper.appendChild(label);

  const input = document.createElement('input');
  input.type = inputType;
  input.className = 'form-input';
  input.value = value || '';
  input.addEventListener('input', (e) => {
    onChange(e.target.value);
  });
  wrapper.appendChild(input);

  return wrapper;
}

function createFormSelectField(labelText, options, selectedValue, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = labelText;
  wrapper.appendChild(label);

  const select = document.createElement('select');
  select.className = 'form-select';
  select.innerHTML = '<option value="">' + t('incomeProfiles.selectType') + '</option>' +
    options.map(opt => `<option value="${escH(opt.value)}" ${opt.value === selectedValue ? 'selected' : ''}>${escH(opt.label)}</option>`).join('');
  select.addEventListener('change', (e) => {
    onChange(e.target.value);
  });
  wrapper.appendChild(select);

  return wrapper;
}

function escH(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
