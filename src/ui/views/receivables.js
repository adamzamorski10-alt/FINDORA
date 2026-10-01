/**
 * Stage 2 — Należności (Receivables) View
 *
 * Workspace for managing people and receivables.
 */

import { t } from '../i18n.js';
import { formatCurrency as formatLocaleCurrency } from '../i18n-format.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';

function formatCurrency(value) {
  return formatLocaleCurrency(value, 'PLN');
}

const STATUS_LABELS = {
  open: 'receivables.statusOpen',
  partially_paid: 'receivables.statusPartiallyPaid',
  paid: 'receivables.statusPaid',
  partially_forgiven: 'receivables.statusPartiallyForgiven',
  forgiven: 'receivables.statusForgiven',
};

export function render(context = {}) {
  const { state, modules } = context;
  let snapshot = state.getState();
  const session = snapshot.session || {};
  const userId = session.userId;

  const root = document.createElement('div');
  root.className = 'receivables-view';

  if (!userId) {
    const placeholder = document.createElement('div');
    placeholder.className = 'view-placeholder';
    placeholder.innerHTML = `<h2>${t('nav.receivables')}</h2><p>${t('common.pleaseLogin', { view: t('nav.receivables').toLowerCase() })}</p>`;
    root.appendChild(placeholder);
    return root;
  }

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = document.createElement('h1');
  title.className = 'page-header-title';
  title.textContent = t('nav.receivables');
  headerTitles.appendChild(title);
  const subtitle = document.createElement('p');
  subtitle.className = 'page-header-subtitle';
  subtitle.textContent = t('receivables.subtitle');
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-primary receivables-add-btn';
  addBtn.textContent = t('receivables.addPerson');
  addBtn.addEventListener('click', () => {
    openPersonForm();
  });
  header.appendChild(addBtn);
  root.appendChild(header);

  const content = document.createElement('div');
  content.className = 'receivables-content';

  const summary = document.createElement('div');
  summary.className = 'summary-strip';
  summary.id = 'receivables-summary';
  content.appendChild(summary);

  const peopleList = document.createElement('div');
  peopleList.className = 'surface-list receivables-people-list';
  peopleList.id = 'receivables-people-list';
  content.appendChild(peopleList);

  const detail = document.createElement('div');
  detail.className = 'receivables-detail';
  detail.id = 'receivables-detail';
  detail.style.display = 'none';
  content.appendChild(detail);

  root.appendChild(content);

  async function loadData() {
    if (!modules.receivable) return;
    snapshot = state.getState();

    try {
      const persons = await modules.receivable.getPersons({ userId });
      const summaryEl = document.getElementById('receivables-summary');
      const listEl = document.getElementById('receivables-people-list');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (summaryEl) {
        let totalOutstanding = 0;
        let peopleWithOutstanding = 0;
        let totalOverdue = 0;
        let overduePeople = 0;
        let recentlySettled = 0;
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        for (const person of persons) {
          const receivables = await modules.receivable.getReceivables({ personId: person.id });
          const openReceivables = receivables.filter(r => r.status !== 'paid' && r.status !== 'forgiven');
          const outstanding = openReceivables.reduce((sum, r) => sum + r.remainingAmount, 0);
          totalOutstanding += outstanding;
          if (outstanding > 0) peopleWithOutstanding++;

          const overdue = openReceivables.filter(r => {
            if (!r.dueDate) return false;
            return new Date(r.dueDate) < today;
          });
          const overdueAmount = overdue.reduce((sum, r) => sum + r.remainingAmount, 0);
          if (overdueAmount > 0) {
            totalOverdue += overdueAmount;
            overduePeople++;
          }

          const settled = receivables.filter(r => {
            if (r.status !== 'paid') return false;
            const paidDate = new Date(r.updatedAt);
            return paidDate >= thirtyDaysAgo;
          });
          recentlySettled += settled.length;
        }

        summaryEl.innerHTML = '';
        const totalItem = document.createElement('div');
        totalItem.className = 'summary-strip-item';
        const totalLabel = document.createElement('span');
        totalLabel.className = 'summary-strip-label';
        totalLabel.textContent = t('receivables.totalOutstanding');
        const totalValue = document.createElement('div');
        totalValue.className = 'summary-strip-value summary-strip-value--muted';
        totalValue.textContent = formatCurrency(totalOutstanding);
        totalItem.appendChild(totalLabel);
        totalItem.appendChild(totalValue);
        summaryEl.appendChild(totalItem);

        const peopleItem = document.createElement('div');
        peopleItem.className = 'summary-strip-item';
        const peopleLabel = document.createElement('span');
        peopleLabel.className = 'summary-strip-label';
        peopleLabel.textContent = t('receivables.peopleWithOutstanding');
        const peopleValue = document.createElement('div');
        peopleValue.className = 'summary-strip-value summary-strip-value--muted';
        peopleValue.textContent = String(peopleWithOutstanding);
        peopleItem.appendChild(peopleLabel);
        peopleItem.appendChild(peopleValue);
        summaryEl.appendChild(peopleItem);

        const overdueItem = document.createElement('div');
        overdueItem.className = 'summary-strip-item';
        const overdueLabel = document.createElement('span');
        overdueLabel.className = 'summary-strip-label';
        overdueLabel.textContent = t('receivables.overdue');
        const overdueValue = document.createElement('div');
        overdueValue.className = 'summary-strip-value summary-strip-value--negative';
        overdueValue.textContent = totalOverdue > 0 ? formatCurrency(totalOverdue) : '—';
        overdueItem.appendChild(overdueLabel);
        overdueItem.appendChild(overdueValue);
        summaryEl.appendChild(overdueItem);

        const settledItem = document.createElement('div');
        settledItem.className = 'summary-strip-item';
        const settledLabel = document.createElement('span');
        settledLabel.className = 'summary-strip-label';
        settledLabel.textContent = t('receivables.recentlySettled');
        const settledValue = document.createElement('div');
        settledValue.className = 'summary-strip-value summary-strip-value--positive';
        settledValue.textContent = String(recentlySettled);
        settledItem.appendChild(settledLabel);
        settledItem.appendChild(settledValue);
        summaryEl.appendChild(settledItem);
      }

      if (listEl) {
        listEl.innerHTML = '';

        if (persons.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          const emptyIcon = document.createElement('div');
          emptyIcon.className = 'empty-state-icon';
          emptyIcon.textContent = '👤';
          const emptyTitle = document.createElement('p');
          emptyTitle.className = 'empty-state-title';
          emptyTitle.textContent = t('receivables.noPeople');
          const emptyDesc = document.createElement('p');
          emptyDesc.className = 'empty-state-desc';
          emptyDesc.textContent = t('receivables.noPeopleDesc');
          const emptyAction = document.createElement('button');
          emptyAction.type = 'button';
          emptyAction.className = 'btn btn-primary';
          emptyAction.textContent = t('receivables.addPerson');
          emptyAction.addEventListener('click', () => {
            openPersonForm();
          });
          empty.appendChild(emptyIcon);
          empty.appendChild(emptyTitle);
          empty.appendChild(emptyDesc);
          empty.appendChild(emptyAction);
          listEl.appendChild(empty);
        } else {
          for (const person of persons) {
            const receivables = await modules.receivable.getReceivables({ personId: person.id });
            const openReceivables = receivables.filter(r => r.status !== 'paid' && r.status !== 'forgiven');
            const outstanding = openReceivables.reduce((sum, r) => sum + r.remainingAmount, 0);

            const item = document.createElement('div');
            item.className = 'surface-list-item receivables-person-item';
            item.style.cursor = 'pointer';

            const body = document.createElement('div');
            body.className = 'account-list-item-body';

            const nameEl = document.createElement('div');
            nameEl.className = 'account-list-item-name';
            nameEl.textContent = person.name;
            body.appendChild(nameEl);

            const metaEl = document.createElement('div');
            metaEl.className = 'account-list-item-meta';
            const openCount = openReceivables.length;
            const overdue = openReceivables.filter(r => r.dueDate && new Date(r.dueDate) < today);
            const overdueCount = overdue.length;
            let metaText = `${openCount} ${t('receivables.openReceivables')}`;
            if (overdueCount > 0) {
              metaText += ` • ${t('receivables.overdue')}: ${overdueCount}`;
            }
            metaEl.textContent = metaText;
            body.appendChild(metaEl);

            const nextDue = openReceivables
              .filter(r => r.dueDate)
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
            if (nextDue) {
              const dueEl = document.createElement('div');
              dueEl.className = 'account-list-item-meta';
              dueEl.textContent = `${t('receivables.dueDate')}: ${nextDue.dueDate}`;
              body.appendChild(dueEl);
            }

            const balanceEl = document.createElement('span');
            balanceEl.className = 'account-list-item-balance amount amount-neutral';
            balanceEl.textContent = formatCurrency(outstanding);
            body.appendChild(balanceEl);

            item.appendChild(body);

            item.addEventListener('click', () => {
              showPersonDetail(person, receivables);
            });

            listEl.appendChild(item);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load receivables:', e);
    }
  }

  async function showPersonDetail(person, receivables) {
    const detailEl = document.getElementById('receivables-detail');
    if (!detailEl) return;

    detailEl.style.display = 'block';
    detailEl.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'receivables-detail-header';

    const nameEl = document.createElement('h3');
    nameEl.className = 'receivables-detail-name';
    nameEl.textContent = person.name;
    header.appendChild(nameEl);

    const actions = document.createElement('div');
    actions.className = 'receivables-detail-actions';

    const addReceivableBtn = document.createElement('button');
    addReceivableBtn.type = 'button';
    addReceivableBtn.className = 'btn btn-primary';
    addReceivableBtn.textContent = t('receivables.addReceivable');
    addReceivableBtn.addEventListener('click', () => {
      openReceivableForm(person.id);
    });
    actions.appendChild(addReceivableBtn);

    const archiveBtn = document.createElement('button');
    archiveBtn.type = 'button';
    archiveBtn.className = 'btn btn-secondary';
    archiveBtn.textContent = t('common.archive');
    archiveBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm({ message: t('receivables.archivePersonConfirm') });
      if (confirmed) {
        try {
          await modules.receivable.archivePerson({ userId, personId: person.id });
          showToast({ message: t('receivables.archivedSuccess'), type: 'success' });
          detailEl.style.display = 'none';
          loadData();
        } catch (e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    });
    actions.appendChild(archiveBtn);

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = t('common.cancel');
    backBtn.addEventListener('click', () => {
      detailEl.style.display = 'none';
    });
    actions.appendChild(backBtn);

    header.appendChild(actions);
    detailEl.appendChild(header);

    const totalOutstanding = receivables.filter(r => r.status !== 'paid' && r.status !== 'forgiven').reduce((sum, r) => sum + r.remainingAmount, 0);
    const summaryEl = document.createElement('div');
    summaryEl.className = 'summary-strip';
    const outstandingItem = document.createElement('div');
    outstandingItem.className = 'summary-strip-item';
    const outstandingLabel = document.createElement('span');
    outstandingLabel.className = 'summary-strip-label';
    outstandingLabel.textContent = t('receivables.outstanding');
    const outstandingValue = document.createElement('div');
    outstandingValue.className = 'summary-strip-value summary-strip-value--muted';
    outstandingValue.textContent = formatCurrency(totalOutstanding);
    outstandingItem.appendChild(outstandingLabel);
    outstandingItem.appendChild(outstandingValue);
    summaryEl.appendChild(outstandingItem);
    detailEl.appendChild(summaryEl);

    const receivablesHeader = document.createElement('h3');
    receivablesHeader.className = 'receivables-subtitle';
    receivablesHeader.textContent = t('receivables.receivables');
    detailEl.appendChild(receivablesHeader);

    const receivablesList = document.createElement('div');
    receivablesList.className = 'surface-list';

    if (receivables.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const emptyTitle = document.createElement('p');
      emptyTitle.className = 'empty-state-title';
      emptyTitle.textContent = t('receivables.noReceivables');
      receivablesList.appendChild(empty);
    } else {
      for (const receivable of receivables) {
        const item = document.createElement('div');
        item.className = 'surface-list-item receivable-item';

        const body = document.createElement('div');
        body.className = 'account-list-item-body';

        const descEl = document.createElement('div');
        descEl.className = 'account-list-item-name';
        descEl.textContent = receivable.description;
        body.appendChild(descEl);

        const statusEl = document.createElement('div');
        statusEl.className = 'account-list-item-meta';
        statusEl.textContent = t(STATUS_LABELS[receivable.status] || receivable.status);
        body.appendChild(statusEl);

        if (receivable.dueDate) {
          const dueEl = document.createElement('div');
          dueEl.className = 'account-list-item-meta';
          const isOverdue = receivable.status !== 'paid' && receivable.status !== 'forgiven' && new Date(receivable.dueDate) < new Date();
          dueEl.textContent = `${t('receivables.dueDate')}: ${receivable.dueDate}${isOverdue ? ' (' + t('receivables.overdue') + ')' : ''}`;
          body.appendChild(dueEl);
        }

        const remainingEl = document.createElement('span');
        remainingEl.className = `account-list-item-balance amount ${receivable.status === 'paid' || receivable.status === 'forgiven' ? 'amount-positive' : 'amount-neutral'}`;
        remainingEl.textContent = formatCurrency(receivable.remainingAmount);
        body.appendChild(remainingEl);

        item.appendChild(body);

        const actionsRow = document.createElement('div');
        actionsRow.className = 'receivables-row-actions';

        if (receivable.status !== 'paid' && receivable.status !== 'forgiven') {
          const repayBtn = document.createElement('button');
          repayBtn.type = 'button';
          repayBtn.className = 'btn btn-secondary';
          repayBtn.textContent = t('receivables.repay');
          repayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openRepaymentForm(receivable);
          });
          actionsRow.appendChild(repayBtn);

          const forgiveBtn = document.createElement('button');
          forgiveBtn.type = 'button';
          forgiveBtn.className = 'btn btn-secondary';
          forgiveBtn.textContent = t('receivables.forgive');
          forgiveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openForgiveForm(receivable);
          });
          actionsRow.appendChild(forgiveBtn);
        }

        item.appendChild(actionsRow);
        receivablesList.appendChild(item);
      }
    }

    detailEl.appendChild(receivablesList);

    const historyHeader = document.createElement('h3');
    historyHeader.className = 'receivables-subtitle';
    historyHeader.textContent = t('receivables.history');
    detailEl.appendChild(historyHeader);

    const historyEl = document.createElement('div');
    historyEl.className = 'surface-list receivables-history';
    historyEl.id = 'receivables-history';
    detailEl.appendChild(historyEl);

    loadHistory(person.id, historyEl);
  }

  async function loadHistory(personId, container) {
    if (!container || !modules.receivable) return;
    try {
      const history = await modules.receivable.getPersonHistory({ personId });
      container.innerHTML = '';

      const allEvents = [];

      for (const receivable of history.receivables) {
        allEvents.push({
          type: 'receivable_created',
          date: receivable.date,
          description: receivable.description,
          amount: receivable.amount,
          status: receivable.status,
          createdAt: receivable.createdAt,
        });
      }

      for (const tx of history.transactions) {
        const isRepayment = tx.metadata?.receivableId && tx.type === 'income';
        if (!isRepayment) continue;
        allEvents.push({
          type: 'repayment',
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          status: null,
          createdAt: tx.createdAt,
        });
      }

      allEvents.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        if (a.createdAt < b.createdAt) return -1;
        if (a.createdAt > b.createdAt) return 1;
        return 0;
      });

      if (allEvents.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const emptyTitle = document.createElement('p');
        emptyTitle.className = 'empty-state-title';
        emptyTitle.textContent = t('receivables.noHistory');
        empty.appendChild(emptyTitle);
        container.appendChild(empty);
        return;
      }

      for (const event of allEvents) {
        const item = document.createElement('div');
        item.className = 'surface-list-item';

        const body = document.createElement('div');
        body.className = 'account-list-item-body';

        const descEl = document.createElement('div');
        descEl.className = 'account-list-item-name';
        descEl.textContent = event.description;
        body.appendChild(descEl);

        const metaEl = document.createElement('div');
        metaEl.className = 'account-list-item-meta';
        const statusKey = event.type === 'repayment' ? 'receivables.repayment' : 'receivables.creation';
        metaEl.textContent = t(statusKey) + ' • ' + event.date;
        body.appendChild(metaEl);

        const amountEl = document.createElement('span');
        amountEl.className = `account-list-item-balance amount ${event.type === 'repayment' ? 'amount-positive' : 'amount-negative'}`;
        amountEl.textContent = formatCurrency(event.amount);
        body.appendChild(amountEl);

        item.appendChild(body);
        container.appendChild(item);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  function openPersonForm() {
    const form = document.createElement('form');
    form.className = 'receivable-form';

    const nameField = createFormField(t('common.name'), 'text', '', (value) => {
      form.dataset.personName = value;
    });
    nameField.querySelector('input').setAttribute('name', 'personName');
    form.appendChild(nameField);

    const noteField = createFormField(t('receivables.note'), 'text', '', (value) => {
      form.dataset.personNote = value;
    });
    noteField.querySelector('input').setAttribute('name', 'personNote');
    form.appendChild(noteField);

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = t('common.save');
    submitBtn.className = 'btn btn-primary';
    actions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.className = 'btn btn-secondary';
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('receivables.createPerson'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    cancelBtn.addEventListener('click', () => modalClose());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.dataset.personName || '';
      const note = form.dataset.personNote || '';
      if (!name.trim()) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      submitBtn.disabled = true;
      try {
        await modules.receivable.createPerson({ userId, name, note });
        showToast({ message: t('receivables.createdSuccess'), type: 'success' });
        modalClose();
        loadData();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openReceivableForm(personId) {
    const form = document.createElement('form');
    form.className = 'receivable-form';

    const amountField = createFormField(t('common.amount'), 'number', '', (value) => {
      form.dataset.amount = value;
    });
    amountField.querySelector('input').setAttribute('name', 'amount');
    amountField.querySelector('input').setAttribute('inputmode', 'decimal');
    const amountHint = document.createElement('span');
    amountHint.className = 'form-hint';
    amountHint.textContent = t('receivables.positiveAmount');
    amountField.appendChild(amountHint);
    form.appendChild(amountField);

    const descField = createFormField(t('common.description'), 'text', '', (value) => {
      form.dataset.description = value;
    });
    descField.querySelector('input').setAttribute('name', 'description');
    form.appendChild(descField);

    const dateField = createFormField(t('common.date'), 'date', new Date().toISOString().slice(0, 10), (value) => {
      form.dataset.date = value;
    });
    dateField.querySelector('input').setAttribute('name', 'date');
    form.appendChild(dateField);

    const accountSelect = createAccountSelect(form);
    form.appendChild(accountSelect);

    const dueDateField = createFormField(t('receivables.dueDate') + ' (' + t('common.optional') + ')', 'date', '', (value) => {
      form.dataset.dueDate = value;
    });
    dueDateField.querySelector('input').setAttribute('name', 'dueDate');
    form.appendChild(dueDateField);

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = t('common.save');
    submitBtn.className = 'btn btn-primary';
    actions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.className = 'btn btn-secondary';
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('receivables.createReceivable'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    cancelBtn.addEventListener('click', () => modalClose());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(form.dataset.amount);
      const description = form.dataset.description || '';
      const date = form.dataset.date || '';
      const sourceAccountId = form.dataset.accountId || '';
      const dueDate = form.dataset.dueDate || undefined;

      if (!Number.isFinite(amount) || amount <= 0) {
        showToast({ message: t('receivables.positiveAmount'), type: 'error' });
        return;
      }
      if (!description.trim()) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!sourceAccountId) {
        showToast({ message: t('receivables.selectAccount'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        await modules.receivable.createReceivable({
          userId,
          personId,
          amount,
          description,
          date,
          sourceAccountId,
          dueDate,
        });
        showToast({ message: t('receivables.createdSuccess'), type: 'success' });
        modalClose();
        const person = await modules.receivable.getPerson({ personId });
        const receivables = await modules.receivable.getReceivables({ personId });
        showPersonDetail(person, receivables);
        loadData();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openRepaymentForm(receivable) {
    const form = document.createElement('form');
    form.className = 'receivable-form';

    const amountField = createFormField(t('common.amount'), 'number', '', (value) => {
      form.dataset.amount = value;
    });
    amountField.querySelector('input').setAttribute('name', 'repayAmount');
    amountField.querySelector('input').setAttribute('inputmode', 'decimal');
    const amountHint = document.createElement('span');
    amountHint.className = 'form-hint';
    amountHint.textContent = t('receivables.maxAmount', { amount: formatCurrency(receivable.remainingAmount) });
    amountField.appendChild(amountHint);
    form.appendChild(amountField);

    const accountSelect = createAccountSelect(form);
    form.appendChild(accountSelect);

    const dateField = createFormField(t('common.date'), 'date', new Date().toISOString().slice(0, 10), (value) => {
      form.dataset.date = value;
    });
    dateField.querySelector('input').setAttribute('name', 'repayDate');
    form.appendChild(dateField);

    const descField = createFormField(t('common.description') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.description = value;
    });
    descField.querySelector('input').setAttribute('name', 'repayDescription');
    form.appendChild(descField);

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = t('common.save');
    submitBtn.className = 'btn btn-primary';
    actions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.className = 'btn btn-secondary';
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('receivables.recordRepayment'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    cancelBtn.addEventListener('click', () => modalClose());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(form.dataset.amount);
      const destinationAccountId = form.dataset.accountId || '';
      const date = form.dataset.date || '';
      const description = form.dataset.description || '';

      if (!Number.isFinite(amount) || amount <= 0) {
        showToast({ message: t('receivables.positiveAmount'), type: 'error' });
        return;
      }
      if (amount > receivable.remainingAmount) {
        showToast({ message: t('receivables.amountExceedsRemaining'), type: 'error' });
        return;
      }
      if (!destinationAccountId) {
        showToast({ message: t('receivables.selectAccount'), type: 'error' });
        return;
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        const result = await modules.receivable.recordRepayment({
          userId,
          receivableId: receivable.id,
          amount,
          destinationAccountId,
          date,
          description,
        });
        showToast({ message: t('receivables.repaymentSuccess'), type: 'success' });
        modalClose();
        const person = await modules.receivable.getPerson({ personId: receivable.personId });
        const receivables = await modules.receivable.getReceivables({ personId: receivable.personId });
        showPersonDetail(person, receivables);
        loadData();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openForgiveForm(receivable) {
    const form = document.createElement('form');
    form.className = 'receivable-form';

    const amountField = createFormField(t('common.amount'), 'number', String(receivable.remainingAmount), (value) => {
      form.dataset.amount = value;
    });
    amountField.querySelector('input').setAttribute('name', 'forgiveAmount');
    amountField.querySelector('input').setAttribute('inputmode', 'decimal');
    const amountHint = document.createElement('span');
    amountHint.className = 'form-hint';
    amountHint.textContent = t('receivables.maxAmount', { amount: formatCurrency(receivable.remainingAmount) });
    amountField.appendChild(amountHint);
    form.appendChild(amountField);

    const noteField = createFormField(t('receivables.note') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.note = value;
    });
    noteField.querySelector('input').setAttribute('name', 'forgiveNote');
    form.appendChild(noteField);

    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = t('common.confirm');
    submitBtn.className = 'btn btn-primary';
    actions.appendChild(submitBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('common.cancel');
    cancelBtn.className = 'btn btn-secondary';
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('receivables.forgive'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    cancelBtn.addEventListener('click', () => modalClose());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(form.dataset.amount);
      const note = form.dataset.note || '';

      if (!Number.isFinite(amount) || amount <= 0) {
        showToast({ message: t('receivables.positiveAmount'), type: 'error' });
        return;
      }
      if (amount > receivable.remainingAmount) {
        showToast({ message: t('receivables.amountExceedsRemaining'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        await modules.receivable.forgiveReceivable({ userId, receivableId: receivable.id, amount, note });
        showToast({ message: t('receivables.forgivenSuccess'), type: 'success' });
        modalClose();
        const person = await modules.receivable.getPerson({ personId: receivable.personId });
        const receivables = await modules.receivable.getReceivables({ personId: receivable.personId });
        showPersonDetail(person, receivables);
        loadData();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function createAccountSelect(form) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.textContent = t('common.selectAccount');
    labelEl.className = 'form-label';
    wrapper.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'form-select';
    select.setAttribute('name', 'accountId');

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = t('common.selectAccount');
    select.appendChild(noneOption);

    const currentSnapshot = state.getState();
    const accounts = currentSnapshot.accounts?.items || [];
    for (const acc of accounts) {
      if (acc.archived) continue;
      const option = document.createElement('option');
      option.value = acc.id;
      option.textContent = acc.name;
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      form.dataset.accountId = e.target.value;
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  function createFormField(label, type, value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.className = 'form-label';
    wrapper.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-input';
    input.value = value;
    input.addEventListener('input', (e) => {
      onChange(e.target.value);
    });
    wrapper.appendChild(input);

    return wrapper;
  }

  loadData();

  return root;
}
