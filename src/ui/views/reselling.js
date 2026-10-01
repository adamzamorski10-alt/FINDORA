/**
 * Stage 4 — Reselling Workspace View
 *
 * Comprehensive workspace for reselling operations:
 * Overview, Products, Orders, Sales, Costs, Tasks, Analysis
 */

import { t } from '../i18n.js';
import { formatCurrency as formatLocaleCurrency } from '../i18n-format.js';
import { showToast, showConfirm, showModal } from '../utils/feedback.js';

function formatCurrency(value) {
  return formatLocaleCurrency(value, 'PLN');
}

const PRODUCT_STATUS_LABELS = {
  ordered: 'reselling.productStatusOrdered',
  in_transit: 'reselling.productStatusInTransit',
  in_stock: 'reselling.productStatusInStock',
  listed: 'reselling.productStatusListed',
  reserved: 'reselling.productStatusReserved',
  sold: 'reselling.productStatusSold',
  returned: 'reselling.productStatusReturned',
  cancelled: 'reselling.productStatusCancelled',
};

const ORDER_STATUS_LABELS = {
  ordered: 'reselling.orderStatusOrdered',
  processing: 'reselling.orderStatusProcessing',
  shipped: 'reselling.orderStatusShipped',
  delivered: 'reselling.orderStatusDelivered',
  cancelled: 'reselling.orderStatusCancelled',
};

const SALE_PAYMENT_STATUS_LABELS = {
  pending: 'reselling.paymentStatusPending',
  paid: 'reselling.paymentStatusPaid',
  failed: 'reselling.paymentStatusFailed',
  refunded: 'reselling.paymentStatusRefunded',
};

const SALE_STATUS_LABELS = {
  sold: 'reselling.saleStatusSold',
  awaiting_payment: 'reselling.saleStatusAwaitingPayment',
  paid: 'reselling.saleStatusPaid',
  shipped: 'reselling.saleStatusShipped',
  completed: 'reselling.saleStatusCompleted',
  cancelled: 'reselling.saleStatusCancelled',
};

const COST_CATEGORY_LABELS = {
  shipping: 'reselling.costCategoryShipping',
  commission: 'reselling.costCategoryCommission',
  packaging: 'reselling.costCategoryPackaging',
  advertising: 'reselling.costCategoryAdvertising',
  equipment: 'reselling.costCategoryEquipment',
  other: 'reselling.costCategoryOther',
};

const TASK_PRIORITY_LABELS = {
  low: 'reselling.taskPriorityLow',
  medium: 'reselling.taskPriorityMedium',
  high: 'reselling.taskPriorityHigh',
};

const TASK_STATUS_LABELS = {
  todo: 'reselling.taskStatusTodo',
  in_progress: 'reselling.taskStatusInProgress',
  done: 'reselling.taskStatusDone',
};

export function render(context = {}) {
  const { state, modules } = context;
  let snapshot = state.getState();
  const session = snapshot.session || {};
  const userId = session.userId;

  const root = document.createElement('div');
  root.className = 'reselling-view';

  if (!userId) {
    const placeholder = document.createElement('div');
    placeholder.className = 'view-placeholder';
    placeholder.innerHTML = `<h2>${t('reselling.title')}</h2><p>${t('common.pleaseLogin', { view: t('reselling.title').toLowerCase() })}</p>`;
    root.appendChild(placeholder);
    return root;
  }

  const header = document.createElement('div');
  header.className = 'page-header';
  const headerTitles = document.createElement('div');
  headerTitles.className = 'page-header-titles';
  const title = document.createElement('h1');
  title.className = 'page-header-title';
  title.textContent = t('reselling.title');
  headerTitles.appendChild(title);
  const subtitle = document.createElement('p');
  subtitle.className = 'page-header-subtitle';
  subtitle.textContent = t('reselling.subtitle');
  headerTitles.appendChild(subtitle);
  header.appendChild(headerTitles);
  root.appendChild(header);

  const subNav = document.createElement('div');
  subNav.className = 'sub-nav';
  const subTabs = [
    { key: 'overview', label: t('reselling.tabOverview') },
    { key: 'products', label: t('reselling.tabProducts') },
    { key: 'orders', label: t('reselling.tabOrders') },
    { key: 'sales', label: t('reselling.tabSales') },
    { key: 'costs', label: t('reselling.tabCosts') },
    { key: 'tasks', label: t('reselling.tabTasks') },
    { key: 'analysis', label: t('reselling.tabAnalysis') },
  ];

  let activeSubTab = 'overview';

  function updateSubNav() {
    subNav.querySelectorAll('.sub-nav-tab').forEach(tab => {
      tab.setAttribute('aria-current', tab.dataset.sub === activeSubTab ? 'page' : 'false');
      tab.classList.toggle('sub-nav-tab--active', tab.dataset.sub === activeSubTab);
    });
  }

  subTabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sub-nav-tab';
    btn.dataset.sub = tab.key;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      activeSubTab = tab.key;
      updateSubNav();
      renderSubView();
    });
    subNav.appendChild(btn);
  });

  root.appendChild(subNav);

  const content = document.createElement('div');
  content.className = 'reselling-content';
  content.id = 'reselling-content';
  root.appendChild(content);

  function renderSubView() {
    const contentEl = document.getElementById('reselling-content');
    if (!contentEl) return;
    contentEl.innerHTML = '';

    switch (activeSubTab) {
      case 'overview':
        renderOverview(contentEl);
        break;
      case 'products':
        renderProducts(contentEl);
        break;
      case 'orders':
        renderOrders(contentEl);
        break;
      case 'sales':
        renderSales(contentEl);
        break;
      case 'costs':
        renderCosts(contentEl);
        break;
      case 'tasks':
        renderTasks(contentEl);
        break;
      case 'analysis':
        renderAnalysis(contentEl);
        break;
    }
  }

  async function renderOverview(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const [products, orders, sales, costs, tasks, analytics] = await Promise.all([
      modules.reselling.listProducts({ userId }),
      modules.reselling.listOrders({ userId }),
      modules.reselling.listSales({ userId }),
      modules.reselling.listCosts({ userId }),
      modules.reselling.listTasks({ userId }),
      modules.reselling.getResellingAnalytics({ userId }),
    ]);

    const inStockProducts = products.filter(p => p.status === 'in_stock').length;
    const listedProducts = products.filter(p => p.status === 'listed').length;
    const pendingOrders = orders.filter(o => o.status === 'ordered' || o.status === 'processing').length;
    const pendingSales = sales.filter(s => s.saleStatus === 'awaiting_payment' || s.saleStatus === 'sold').length;
    const openTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;

    const summaryEl = document.createElement('div');
    summaryEl.className = 'summary-strip';

    const metrics = [
      { label: t('reselling.totalProducts'), value: String(products.length) },
      { label: t('reselling.inStock'), value: String(inStockProducts) },
      { label: t('reselling.listed'), value: String(listedProducts) },
      { label: t('reselling.pendingOrders'), value: String(pendingOrders) },
      { label: t('reselling.pendingSales'), value: String(pendingSales) },
      { label: t('reselling.openTasks'), value: String(openTasks) },
      { label: t('reselling.totalRevenue'), value: formatCurrency(analytics.totalRevenue) },
      { label: t('reselling.totalNet'), value: formatCurrency(analytics.totalNet) },
    ];

    metrics.forEach(m => {
      const item = document.createElement('div');
      item.className = 'summary-strip-item';
      const labelEl = document.createElement('span');
      labelEl.className = 'summary-strip-label';
      labelEl.textContent = m.label;
      const valueEl = document.createElement('div');
      valueEl.className = 'summary-strip-value summary-strip-value--muted';
      valueEl.textContent = m.value;
      item.appendChild(labelEl);
      item.appendChild(valueEl);
      summaryEl.appendChild(item);
    });

    container.appendChild(summaryEl);

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    const emptyIcon = document.createElement('div');
    emptyIcon.className = 'empty-state-icon';
    emptyIcon.textContent = '📦';
    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'empty-state-title';
    emptyTitle.textContent = t('reselling.noData');
    const emptyDesc = document.createElement('p');
    emptyDesc.className = 'empty-state-desc';
    emptyDesc.textContent = t('reselling.noDataDesc');
    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyTitle);
    emptyState.appendChild(emptyDesc);
    container.appendChild(emptyState);
  }

  async function renderProducts(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = t('reselling.addProduct');
    addBtn.addEventListener('click', () => openProductForm());
    container.appendChild(addBtn);

    const listEl = document.createElement('div');
    listEl.className = 'surface-list';
    listEl.id = 'reselling-products-list';
    container.appendChild(listEl);

    const products = await modules.reselling.listProducts({ userId });
    listEl.innerHTML = '';

    if (products.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-state-title">${t('reselling.noProducts')}</p><p class="empty-state-desc">${t('reselling.noProductsDesc')}</p>`;
      listEl.appendChild(empty);
      return;
    }

    for (const product of products) {
      const item = document.createElement('div');
      item.className = 'surface-list-item';

      const body = document.createElement('div');
      body.className = 'account-list-item-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'account-list-item-name';
      nameEl.textContent = product.name;
      body.appendChild(nameEl);

      const metaEl = document.createElement('div');
      metaEl.className = 'account-list-item-meta';
      metaEl.textContent = `${t('reselling.productPurchasePrice')}: ${formatCurrency(product.purchasePrice)} × ${product.quantity} • ${t('reselling.productPlatform', { platform: product.platform || '—' })}`;
      body.appendChild(metaEl);

      const statusEl = document.createElement('div');
      statusEl.className = 'account-list-item-meta';
      statusEl.textContent = t(PRODUCT_STATUS_LABELS[product.status] || product.status);
      body.appendChild(statusEl);

      const priceEl = document.createElement('span');
      priceEl.className = 'account-list-item-balance amount amount-neutral';
      priceEl.textContent = formatCurrency(product.purchasePrice);
      body.appendChild(priceEl);

      item.appendChild(body);

      const actionsRow = document.createElement('div');
      actionsRow.className = 'receivables-row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = t('common.edit');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProductForm(product);
      });
      actionsRow.appendChild(editBtn);

      const archiveBtn = document.createElement('button');
      archiveBtn.type = 'button';
      archiveBtn.className = 'btn btn-secondary';
      archiveBtn.textContent = t('common.archive');
      archiveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (await showConfirm({ message: t('reselling.archiveConfirm') })) {
          try {
            await modules.reselling.archiveProduct({ productId: product.id });
            showToast({ message: t('reselling.archivedSuccess'), type: 'success' });
            renderProducts(container);
          } catch (err) {
            showToast({ message: err.message, type: 'error' });
          }
        }
      });
      actionsRow.appendChild(archiveBtn);

      item.appendChild(actionsRow);
      listEl.appendChild(item);
    }
  }

  async function renderOrders(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = t('reselling.addOrder');
    addBtn.addEventListener('click', () => openOrderForm());
    container.appendChild(addBtn);

    const listEl = document.createElement('div');
    listEl.className = 'surface-list';
    container.appendChild(listEl);

    const orders = await modules.reselling.listOrders({ userId });
    listEl.innerHTML = '';

    if (orders.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-state-title">${t('reselling.noOrders')}</p><p class="empty-state-desc">${t('reselling.noOrdersDesc')}</p>`;
      listEl.appendChild(empty);
      return;
    }

    for (const order of orders) {
      const item = document.createElement('div');
      item.className = 'surface-list-item';

      const body = document.createElement('div');
      body.className = 'account-list-item-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'account-list-item-name';
      nameEl.textContent = order.orderNumber;
      body.appendChild(nameEl);

      const metaEl = document.createElement('div');
      metaEl.className = 'account-list-item-meta';
      metaEl.textContent = `${order.supplier || '—'} • ${t('reselling.orderDate', { date: order.date })}`;
      body.appendChild(metaEl);

      const statusEl = document.createElement('div');
      statusEl.className = 'account-list-item-meta';
      statusEl.textContent = t(ORDER_STATUS_LABELS[order.status] || order.status);
      body.appendChild(statusEl);

      const totalEl = document.createElement('span');
      totalEl.className = 'account-list-item-balance amount amount-neutral';
      totalEl.textContent = formatCurrency(order.totalCost);
      body.appendChild(totalEl);

      item.appendChild(body);
      listEl.appendChild(item);
    }
  }

  async function renderSales(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = t('reselling.addSale');
    addBtn.addEventListener('click', () => openSaleForm());
    container.appendChild(addBtn);

    const listEl = document.createElement('div');
    listEl.className = 'surface-list';
    container.appendChild(listEl);

    const sales = await modules.reselling.listSales({ userId });
    listEl.innerHTML = '';

    if (sales.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-state-title">${t('reselling.noSales')}</p><p class="empty-state-desc">${t('reselling.noSalesDesc')}</p>`;
      listEl.appendChild(empty);
      return;
    }

    for (const sale of sales) {
      const item = document.createElement('div');
      item.className = 'surface-list-item';

      const body = document.createElement('div');
      body.className = 'account-list-item-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'account-list-item-name';
      nameEl.textContent = `${t('reselling.saleLabel')} ${sale.platform || ''}`;
      body.appendChild(nameEl);

      const metaEl = document.createElement('div');
      metaEl.className = 'account-list-item-meta';
      metaEl.textContent = `${t('reselling.saleDate', { date: sale.saleDate })} • ${t(SALE_STATUS_LABELS[sale.saleStatus] || sale.saleStatus)}`;
      body.appendChild(metaEl);

      const paymentEl = document.createElement('div');
      paymentEl.className = 'account-list-item-meta';
      paymentEl.textContent = `${t('reselling.paymentStatus', { status: t(SALE_PAYMENT_STATUS_LABELS[sale.paymentStatus] || sale.paymentStatus) })}`;
      body.appendChild(paymentEl);

      const netEl = document.createElement('span');
      netEl.className = 'account-list-item-balance amount amount-positive';
      netEl.textContent = formatCurrency(sale.netAmount);
      body.appendChild(netEl);

      item.appendChild(body);
      listEl.appendChild(item);
    }
  }

  async function renderCosts(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = t('reselling.addCost');
    addBtn.addEventListener('click', () => openCostForm());
    container.appendChild(addBtn);

    const listEl = document.createElement('div');
    listEl.className = 'surface-list';
    container.appendChild(listEl);

    const costs = await modules.reselling.listCosts({ userId });
    listEl.innerHTML = '';

    if (costs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-state-title">${t('reselling.noCosts')}</p><p class="empty-state-desc">${t('reselling.noCostsDesc')}</p>`;
      listEl.appendChild(empty);
      return;
    }

    for (const cost of costs) {
      const item = document.createElement('div');
      item.className = 'surface-list-item';

      const body = document.createElement('div');
      body.className = 'account-list-item-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'account-list-item-name';
      nameEl.textContent = cost.description;
      body.appendChild(nameEl);

      const categoryEl = document.createElement('div');
      categoryEl.className = 'account-list-item-meta';
      categoryEl.textContent = t(COST_CATEGORY_LABELS[cost.category] || cost.category);
      body.appendChild(categoryEl);

      const dateEl = document.createElement('div');
      dateEl.className = 'account-list-item-meta';
      dateEl.textContent = cost.date;
      body.appendChild(dateEl);

      const amountEl = document.createElement('span');
      amountEl.className = 'account-list-item-balance amount amount-negative';
      amountEl.textContent = formatCurrency(cost.amount);
      body.appendChild(amountEl);

      item.appendChild(body);
      listEl.appendChild(item);
    }
  }

  async function renderTasks(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = t('reselling.addTask');
    addBtn.addEventListener('click', () => openTaskForm());
    container.appendChild(addBtn);

    const listEl = document.createElement('div');
    listEl.className = 'surface-list';
    container.appendChild(listEl);

    const tasks = await modules.reselling.listTasks({ userId });
    listEl.innerHTML = '';

    if (tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-state-title">${t('reselling.noTasks')}</p><p class="empty-state-desc">${t('reselling.noTasksDesc')}</p>`;
      listEl.appendChild(empty);
      return;
    }

    for (const task of tasks) {
      const item = document.createElement('div');
      item.className = 'surface-list-item';

      const body = document.createElement('div');
      body.className = 'account-list-item-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'account-list-item-name';
      nameEl.textContent = task.title;
      body.appendChild(nameEl);

      const priorityEl = document.createElement('div');
      priorityEl.className = 'account-list-item-meta';
      priorityEl.textContent = t(TASK_PRIORITY_LABELS[task.priority] || task.priority);
      body.appendChild(priorityEl);

      const statusEl = document.createElement('div');
      statusEl.className = 'account-list-item-meta';
      statusEl.textContent = t(TASK_STATUS_LABELS[task.status] || task.status);
      body.appendChild(statusEl);

      const dueEl = document.createElement('div');
      dueEl.className = 'account-list-item-meta';
      dueEl.textContent = task.dueDate || '—';
      body.appendChild(dueEl);

      item.appendChild(body);
      listEl.appendChild(item);
    }
  }

  async function renderAnalysis(container) {
    if (!modules.reselling) return;
    snapshot = state.getState();

    const analytics = await modules.reselling.getResellingAnalytics({ userId });

    const summaryEl = document.createElement('div');
    summaryEl.className = 'summary-strip';

    const metrics = [
      { label: t('reselling.totalRevenue'), value: formatCurrency(analytics.totalRevenue), positive: true },
      { label: t('reselling.totalCost'), value: formatCurrency(analytics.totalCost), positive: false },
      { label: t('reselling.totalNet'), value: formatCurrency(analytics.totalNet), positive: analytics.totalNet >= 0 },
      { label: t('reselling.profitMargin'), value: `${analytics.profitMargin.toFixed(1)}%` },
    ];

    metrics.forEach(m => {
      const item = document.createElement('div');
      item.className = 'summary-strip-item';
      const labelEl = document.createElement('span');
      labelEl.className = 'summary-strip-label';
      labelEl.textContent = m.label;
      const valueEl = document.createElement('div');
      valueEl.className = 'summary-strip-value summary-strip-value--' + (m.positive !== false ? 'positive' : 'negative');
      valueEl.textContent = m.value;
      item.appendChild(labelEl);
      item.appendChild(valueEl);
      summaryEl.appendChild(item);
    });

    container.appendChild(summaryEl);

    const platformsTitle = document.createElement('h3');
    platformsTitle.className = 'reselling-subtitle';
    platformsTitle.textContent = t('reselling.salesByPlatform');
    container.appendChild(platformsTitle);

    const platformsEl = document.createElement('div');
    platformsEl.className = 'surface-list';

    const platforms = Object.entries(analytics.salesByPlatform);
    if (platforms.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p class="empty-state-title">${t('reselling.noSales')}</p>`;
      platformsEl.appendChild(empty);
    } else {
      for (const [platform, data] of platforms) {
        const item = document.createElement('div');
        item.className = 'surface-list-item';
        const body = document.createElement('div');
        body.className = 'account-list-item-body';
        const nameEl = document.createElement('div');
        nameEl.className = 'account-list-item-name';
        nameEl.textContent = platform;
        body.appendChild(nameEl);
        const metaEl = document.createElement('div');
        metaEl.className = 'account-list-item-meta';
        metaEl.textContent = `${data.count} ${t('reselling.sales')} • ${formatCurrency(data.revenue)}`;
        body.appendChild(metaEl);
        const netEl = document.createElement('span');
        netEl.className = 'account-list-item-balance amount amount-positive';
        netEl.textContent = formatCurrency(data.net);
        body.appendChild(netEl);
        item.appendChild(body);
        platformsEl.appendChild(item);
      }
    }
    container.appendChild(platformsEl);
  }

  function openProductForm(product) {
    const isEdit = !!product;
    const currentSnapshot = state.getState();

    const form = document.createElement('form');
    form.className = 'reselling-form';

    const incomeProfiles = currentSnapshot.incomeProfiles?.items || [];
    if (incomeProfiles.length === 0) {
      showToast({ message: t('reselling.noIncomeProfiles'), type: 'error' });
      return;
    }

    const profileSelect = createProfileSelect(form, incomeProfiles, product ? product.incomeProfileId : '');
    form.appendChild(profileSelect);

    const nameField = createFormField(t('reselling.productName'), 'text', product ? product.name : '', (value) => {
      form.dataset.productName = value;
    });
    form.appendChild(nameField);

    const skuField = createFormField(t('reselling.productSku') + ' (' + t('common.optional') + ')', 'text', product ? product.sku : '', (value) => {
      form.dataset.sku = value;
    });
    form.appendChild(skuField);

    const platformField = createFormField(t('reselling.productPlatform'), 'text', product ? product.platform : '', (value) => {
      form.dataset.platform = value;
    });
    form.appendChild(platformField);

    const purchasePriceField = createFormField(t('reselling.productPurchasePrice'), 'number', product ? String(product.purchasePrice) : '', (value) => {
      form.dataset.purchasePrice = value;
    });
    purchasePriceField.querySelector('input').setAttribute('inputmode', 'decimal');
    form.appendChild(purchasePriceField);

    const plannedSalePriceField = createFormField(t('reselling.productPlannedSalePrice') + ' (' + t('common.optional') + ')', 'number', product ? String(product.plannedSalePrice || '') : '', (value) => {
      form.dataset.plannedSalePrice = value;
    });
    plannedSalePriceField.querySelector('input').setAttribute('inputmode', 'decimal');
    form.appendChild(plannedSalePriceField);

    const purchaseDateField = createFormField(t('reselling.productPurchaseDate'), 'date', product ? product.purchaseDate : new Date().toISOString().slice(0, 10), (value) => {
      form.dataset.purchaseDate = value;
    });
    form.appendChild(purchaseDateField);

    const quantityField = createFormField(t('reselling.productQuantity'), 'number', product ? String(product.quantity) : '1', (value) => {
      form.dataset.quantity = value;
    });
    quantityField.querySelector('input').setAttribute('inputmode', 'numeric');
    form.appendChild(quantityField);

    const locationField = createFormField(t('reselling.productLocation') + ' (' + t('common.optional') + ')', 'text', product ? product.location : '', (value) => {
      form.dataset.location = value;
    });
    form.appendChild(locationField);

    const statusSelect = createStatusSelect(form, [
      { value: 'ordered', label: t('reselling.productStatusOrdered') },
      { value: 'in_transit', label: t('reselling.productStatusInTransit') },
      { value: 'in_stock', label: t('reselling.productStatusInStock') },
      { value: 'listed', label: t('reselling.productStatusListed') },
      { value: 'reserved', label: t('reselling.productStatusReserved') },
      { value: 'sold', label: t('reselling.productStatusSold') },
      { value: 'returned', label: t('reselling.productStatusReturned') },
      { value: 'cancelled', label: t('reselling.productStatusCancelled') },
    ], product ? product.status : 'ordered', t('reselling.productStatus'));
    form.appendChild(statusSelect);

    const notesField = createFormField(t('common.notes') + ' (' + t('common.optional') + ')', 'text', product ? product.notes : '', (value) => {
      form.dataset.notes = value;
    });
    form.appendChild(notesField);

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
    cancelBtn.addEventListener('click', () => modalClose());
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: isEdit ? t('reselling.editProduct') : t('reselling.createProduct'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incomeProfileId = form.dataset.incomeProfileId || '';
      const name = form.dataset.productName || '';
      const sku = form.dataset.sku || '';
      const platform = form.dataset.platform || '';
      const purchasePrice = parseFloat(form.dataset.purchasePrice);
      const plannedSalePrice = form.dataset.plannedSalePrice ? parseFloat(form.dataset.plannedSalePrice) : '';
      const purchaseDate = form.dataset.purchaseDate || '';
      const quantity = parseInt(form.dataset.quantity, 10);
      const location = form.dataset.location || '';
      const notes = form.dataset.notes || '';
      const status = form.dataset.status || 'ordered';

      if (!incomeProfileId) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!name.trim()) {
        showToast({ message: t('reselling.productNameRequired'), type: 'error' });
        return;
      }
      if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        showToast({ message: t('reselling.validPurchasePrice'), type: 'error' });
        return;
      }
      if (!purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        showToast({ message: t('reselling.validQuantity'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        if (isEdit) {
          await modules.reselling.updateProduct({
            productId: product.id,
            updates: { name, sku, platform, purchasePrice, plannedSalePrice: plannedSalePrice || null, purchaseDate, quantity, location, notes, status },
          });
          showToast({ message: t('reselling.updatedSuccess'), type: 'success' });
        } else {
          await modules.reselling.createProduct({
            userId,
            incomeProfileId,
            name,
            sku,
            platform,
            purchasePrice,
            plannedSalePrice: plannedSalePrice || undefined,
            purchaseDate,
            quantity,
            location,
            notes,
            status,
          });
          showToast({ message: t('reselling.createdSuccess'), type: 'success' });
        }
        modalClose();
        renderSubView();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openOrderForm() {
    const form = document.createElement('form');
    form.className = 'reselling-form';

    const currentSnapshot = state.getState();
    const incomeProfiles = currentSnapshot.incomeProfiles?.items || [];
    if (incomeProfiles.length === 0) {
      showToast({ message: t('reselling.noIncomeProfiles'), type: 'error' });
      return;
    }

    const profileSelect = createProfileSelect(form, incomeProfiles, '');
    form.appendChild(profileSelect);

    const orderNumberField = createFormField(t('reselling.orderNumber'), 'text', '', (value) => {
      form.dataset.orderNumber = value;
    });
    form.appendChild(orderNumberField);

    const supplierField = createFormField(t('reselling.orderSupplier') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.supplier = value;
    });
    form.appendChild(supplierField);

    const platformField = createFormField(t('reselling.orderPlatform') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.platform = value;
    });
    form.appendChild(platformField);

    const dateField = createFormField(t('reselling.orderDate'), 'date', new Date().toISOString().slice(0, 10), (value) => {
      form.dataset.date = value;
    });
    form.appendChild(dateField);

    const shippingField = createFormField(t('reselling.orderShipping') + ' (' + t('common.optional') + ')', 'number', '0', (value) => {
      form.dataset.shipping = value;
    });
    form.appendChild(shippingField);

    const additionalCostsField = createFormField(t('reselling.orderAdditionalCosts') + ' (' + t('common.optional') + ')', 'number', '0', (value) => {
      form.dataset.additionalCosts = value;
    });
    form.appendChild(additionalCostsField);

    const trackingField = createFormField(t('reselling.orderTracking') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.tracking = value;
    });
    form.appendChild(trackingField);

    const notesField = createFormField(t('common.notes') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.notes = value;
    });
    form.appendChild(notesField);

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
    cancelBtn.addEventListener('click', () => modalClose());
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('reselling.createOrder'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incomeProfileId = form.dataset.incomeProfileId || '';
      const orderNumber = form.dataset.orderNumber || '';
      const supplier = form.dataset.supplier || '';
      const platform = form.dataset.platform || '';
      const date = form.dataset.date || '';
      const shipping = parseFloat(form.dataset.shipping) || 0;
      const additionalCosts = parseFloat(form.dataset.additionalCosts) || 0;
      const tracking = form.dataset.tracking || '';
      const notes = form.dataset.notes || '';

      if (!incomeProfileId) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!orderNumber.trim()) {
        showToast({ message: t('reselling.orderNumberRequired'), type: 'error' });
        return;
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        await modules.reselling.createOrder({
          userId,
          incomeProfileId,
          orderNumber,
          supplier,
          platform,
          date,
          items: [],
          shipping,
          additionalCosts,
          totalCost: undefined,
          status: 'ordered',
          tracking,
          notes,
        });
        showToast({ message: t('reselling.createdSuccess'), type: 'success' });
        modalClose();
        renderSubView();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openSaleForm() {
    const form = document.createElement('form');
    form.className = 'reselling-form';

    const currentSnapshot = state.getState();
    const incomeProfiles = currentSnapshot.incomeProfiles?.items || [];
    if (incomeProfiles.length === 0) {
      showToast({ message: t('reselling.noIncomeProfiles'), type: 'error' });
      return;
    }

    const profileSelect = createProfileSelect(form, incomeProfiles, '');
    form.appendChild(profileSelect);

    const productIdField = createFormField(t('reselling.saleProductId'), 'text', '', (value) => {
      form.dataset.productId = value;
    });
    form.appendChild(productIdField);

    const quantityField = createFormField(t('reselling.saleQuantity'), 'number', '1', (value) => {
      form.dataset.quantity = value;
    });
    quantityField.querySelector('input').setAttribute('inputmode', 'numeric');
    form.appendChild(quantityField);

    const salePriceField = createFormField(t('reselling.salePrice'), 'number', '', (value) => {
      form.dataset.salePrice = value;
    });
    salePriceField.querySelector('input').setAttribute('inputmode', 'decimal');
    form.appendChild(salePriceField);

    const platformField = createFormField(t('reselling.salePlatform') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.platform = value;
    });
    form.appendChild(platformField);

    const commissionField = createFormField(t('reselling.saleCommission') + ' (' + t('common.optional') + ')', 'number', '0', (value) => {
      form.dataset.commission = value;
    });
    form.appendChild(commissionField);

    const shippingField = createFormField(t('reselling.saleShipping') + ' (' + t('common.optional') + ')', 'number', '0', (value) => {
      form.dataset.shipping = value;
    });
    form.appendChild(shippingField);

    const otherCostsField = createFormField(t('reselling.saleOtherCosts') + ' (' + t('common.optional') + ')', 'number', '0', (value) => {
      form.dataset.otherCosts = value;
    });
    form.appendChild(otherCostsField);

    const saleDateField = createFormField(t('reselling.saleDate'), 'date', new Date().toISOString().slice(0, 10), (value) => {
      form.dataset.saleDate = value;
    });
    form.appendChild(saleDateField);

    const paymentStatusSelect = createStatusSelect(form, [
      { value: 'pending', label: t('reselling.paymentStatusPending') },
      { value: 'paid', label: t('reselling.paymentStatusPaid') },
      { value: 'failed', label: t('reselling.paymentStatusFailed') },
      { value: 'refunded', label: t('reselling.paymentStatusRefunded') },
    ], 'pending', t('reselling.paymentStatus'));
    form.appendChild(paymentStatusSelect);

    const saleStatusSelect = createStatusSelect(form, [
      { value: 'sold', label: t('reselling.saleStatusSold') },
      { value: 'awaiting_payment', label: t('reselling.saleStatusAwaitingPayment') },
      { value: 'paid', label: t('reselling.saleStatusPaid') },
      { value: 'shipped', label: t('reselling.saleStatusShipped') },
      { value: 'completed', label: t('reselling.saleStatusCompleted') },
      { value: 'cancelled', label: t('reselling.saleStatusCancelled') },
    ], 'sold', t('reselling.saleStatus'));
    form.appendChild(saleStatusSelect);

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
    cancelBtn.addEventListener('click', () => modalClose());
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('reselling.createSale'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incomeProfileId = form.dataset.incomeProfileId || '';
      const productId = form.dataset.productId || '';
      const quantity = parseInt(form.dataset.quantity, 10);
      const salePrice = parseFloat(form.dataset.salePrice);
      const platform = form.dataset.platform || '';
      const commission = parseFloat(form.dataset.commission) || 0;
      const shipping = parseFloat(form.dataset.shipping) || 0;
      const otherCosts = parseFloat(form.dataset.otherCosts) || 0;
      const saleDate = form.dataset.saleDate || '';
      const paymentStatus = form.dataset.paymentStatus || 'pending';
      const saleStatus = form.dataset.saleStatus || 'sold';

      if (!incomeProfileId) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!productId) {
        showToast({ message: t('reselling.saleProductIdRequired'), type: 'error' });
        return;
      }
      if (!Number.isFinite(salePrice) || salePrice < 0) {
        showToast({ message: t('reselling.validSalePrice'), type: 'error' });
        return;
      }
      if (!saleDate || !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        await modules.reselling.createSale({
          userId,
          incomeProfileId,
          productId,
          quantity,
          salePrice,
          platform,
          commission,
          shipping,
          otherCosts,
          saleDate,
          paymentStatus,
          saleStatus,
        });
        showToast({ message: t('reselling.createdSuccess'), type: 'success' });
        modalClose();
        renderSubView();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openCostForm() {
    const form = document.createElement('form');
    form.className = 'reselling-form';

    const currentSnapshot = state.getState();
    const incomeProfiles = currentSnapshot.incomeProfiles?.items || [];
    if (incomeProfiles.length === 0) {
      showToast({ message: t('reselling.noIncomeProfiles'), type: 'error' });
      return;
    }

    const profileSelect = createProfileSelect(form, incomeProfiles, '');
    form.appendChild(profileSelect);

    const amountField = createFormField(t('common.amount'), 'number', '', (value) => {
      form.dataset.amount = value;
    });
    amountField.querySelector('input').setAttribute('inputmode', 'decimal');
    form.appendChild(amountField);

    const categorySelect = createStatusSelect(form, [
      { value: 'shipping', label: t('reselling.costCategoryShipping') },
      { value: 'commission', label: t('reselling.costCategoryCommission') },
      { value: 'packaging', label: t('reselling.costCategoryPackaging') },
      { value: 'advertising', label: t('reselling.costCategoryAdvertising') },
      { value: 'equipment', label: t('reselling.costCategoryEquipment') },
      { value: 'other', label: t('reselling.costCategoryOther') },
    ], 'shipping', t('reselling.costCategory'));
    form.appendChild(categorySelect);

    const dateField = createFormField(t('common.date'), 'date', new Date().toISOString().slice(0, 10), (value) => {
      form.dataset.date = value;
    });
    form.appendChild(dateField);

    const descriptionField = createFormField(t('common.description'), 'text', '', (value) => {
      form.dataset.description = value;
    });
    form.appendChild(descriptionField);

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
    cancelBtn.addEventListener('click', () => modalClose());
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('reselling.createCost'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incomeProfileId = form.dataset.incomeProfileId || '';
      const amount = parseFloat(form.dataset.amount);
      const category = form.dataset.category || 'shipping';
      const date = form.dataset.date || '';
      const description = form.dataset.description || '';

      if (!incomeProfileId) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast({ message: t('validation.positiveAmount'), type: 'error' });
        return;
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!description.trim()) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        await modules.reselling.createCost({
          userId,
          incomeProfileId,
          amount,
          category,
          date,
          description,
        });
        showToast({ message: t('reselling.createdSuccess'), type: 'success' });
        modalClose();
        renderSubView();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function openTaskForm() {
    const form = document.createElement('form');
    form.className = 'reselling-form';

    const currentSnapshot = state.getState();
    const incomeProfiles = currentSnapshot.incomeProfiles?.items || [];
    if (incomeProfiles.length === 0) {
      showToast({ message: t('reselling.noIncomeProfiles'), type: 'error' });
      return;
    }

    const profileSelect = createProfileSelect(form, incomeProfiles, '');
    form.appendChild(profileSelect);

    const titleField = createFormField(t('reselling.taskTitle'), 'text', '', (value) => {
      form.dataset.taskTitle = value;
    });
    form.appendChild(titleField);

    const dueDateField = createFormField(t('reselling.taskDueDate') + ' (' + t('common.optional') + ')', 'date', '', (value) => {
      form.dataset.dueDate = value;
    });
    form.appendChild(dueDateField);

    const prioritySelect = createStatusSelect(form, [
      { value: 'low', label: t('reselling.taskPriorityLow') },
      { value: 'medium', label: t('reselling.taskPriorityMedium') },
      { value: 'high', label: t('reselling.taskPriorityHigh') },
    ], 'medium', t('reselling.taskPriority'));
    form.appendChild(prioritySelect);

    const statusSelect = createStatusSelect(form, [
      { value: 'todo', label: t('reselling.taskStatusTodo') },
      { value: 'in_progress', label: t('reselling.taskStatusInProgress') },
      { value: 'done', label: t('reselling.taskStatusDone') },
    ], 'todo', t('reselling.taskStatus'));
    form.appendChild(statusSelect);

    const noteField = createFormField(t('common.notes') + ' (' + t('common.optional') + ')', 'text', '', (value) => {
      form.dataset.note = value;
    });
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
    cancelBtn.addEventListener('click', () => modalClose());
    actions.appendChild(cancelBtn);

    form.appendChild(actions);

    const modalClose = showModal({
      title: t('reselling.createTask'),
      bodyHTML: form,
      size: 'md',
      onClose: () => {},
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incomeProfileId = form.dataset.incomeProfileId || '';
      const title = form.dataset.taskTitle || '';
      const dueDate = form.dataset.dueDate || '';
      const priority = form.dataset.priority || 'medium';
      const status = form.dataset.status || 'todo';
      const note = form.dataset.note || '';

      if (!incomeProfileId) {
        showToast({ message: t('validation.required'), type: 'error' });
        return;
      }
      if (!title.trim()) {
        showToast({ message: t('reselling.taskTitleRequired'), type: 'error' });
        return;
      }

      submitBtn.disabled = true;
      try {
        await modules.reselling.createTask({
          userId,
          incomeProfileId,
          title,
          dueDate,
          priority,
          status,
          note,
        });
        showToast({ message: t('reselling.createdSuccess'), type: 'success' });
        modalClose();
        renderSubView();
      } catch (err) {
        showToast({ message: err.message, type: 'error' });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function createProfileSelect(form, profiles, selectedId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.textContent = t('reselling.incomeProfile');
    labelEl.className = 'form-label';
    wrapper.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'form-select';
    select.setAttribute('name', 'incomeProfileId');

    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.textContent = t('reselling.selectIncomeProfile');
    select.appendChild(noneOption);

    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      if (profile.id === selectedId) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      form.dataset.incomeProfileId = e.target.value;
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  function createStatusSelect(form, options, selectedValue, labelText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.textContent = labelText;
    labelEl.className = 'form-label';
    wrapper.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'form-select';
    select.setAttribute('name', 'status');

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = t('common.select') || 'Wybierz';
    select.appendChild(defaultOption);

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === selectedValue) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
      form.dataset.status = e.target.value;
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  function createFormField(labelText, inputType, value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const labelEl = document.createElement('label');
    labelEl.textContent = labelText;
    labelEl.className = 'form-label';
    wrapper.appendChild(labelEl);

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

  renderSubView();

  return root;
}
