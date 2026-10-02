import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';
import { createResellingProduct, validateResellingProductUpdate } from '../../domain/reselling/reselling-product-entity.js';
import { createResellingOrder, validateResellingOrderUpdate } from '../../domain/reselling/reselling-order-entity.js';
import { createResellingSale, validateResellingSaleUpdate } from '../../domain/reselling/reselling-sale-entity.js';
import { createResellingCost, validateResellingCostUpdate } from '../../domain/reselling/reselling-cost-entity.js';
import { createResellingTask, validateResellingTaskUpdate } from '../../domain/reselling/reselling-task-entity.js';

export function createResellingModule({
  resellingProductRepository,
  resellingOrderRepository,
  resellingSaleRepository,
  resellingCostRepository,
  resellingTaskRepository,
  transactionRepository,
  accountRepository,
  incomeProfileRepository,
  applicationTransaction,
}) {
  const productRepo = resellingProductRepository;
  const orderRepo = resellingOrderRepository;
  const saleRepo = resellingSaleRepository;
  const costRepo = resellingCostRepository;
  const taskRepo = resellingTaskRepository;
  const txRepo = transactionRepository;
  const accountRepo = accountRepository;
  const profileRepo = incomeProfileRepository;
  const appTx = applicationTransaction;

  async function assertActiveIncomeProfile(userId, incomeProfileId) {
    if (!profileRepo) throw new Error('DEPENDENCY_MISSING');
    const profile = await profileRepo.findById(incomeProfileId);
    if (!profile || profile.userId !== userId) throw new Error('NOT_FOUND');
    if (profile.archived) throw new Error('ARCHIVED_ENTITY');
    return profile;
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function validateDate(date) {
    if (!date || typeof date !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  // Products
  async function createProduct({ userId, incomeProfileId, name, sku, platform, purchasePrice, plannedSalePrice, purchaseDate, quantity, location, notes, status }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    await assertActiveIncomeProfile(userId, incomeProfileId);

    const product = createResellingProduct({
      userId,
      incomeProfileId,
      name,
      sku,
      platform,
      purchasePrice,
      plannedSalePrice,
      purchaseDate,
      quantity,
      location,
      notes,
      status,
    });

    await appTx.run(async () => {
      await productRepo.save(product);
    });

    return product;
  }

  async function getProduct({ productId }) {
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await productRepo.findById(productId);
  }

  async function listProducts({ userId, incomeProfileId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    let products = await productRepo.loadAll();
    products = products.filter(p => p.userId === userId && !p.archived);
    if (incomeProfileId) {
      products = products.filter(p => p.incomeProfileId === incomeProfileId);
    }
    return products;
  }

  async function updateProduct({ productId, updates }) {
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await productRepo.findById(productId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = validateResellingProductUpdate({ existing, updates });

    await appTx.run(async () => {
      await productRepo.save(updated);
    });

    return updated;
  }

  async function archiveProduct({ productId }) {
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await productRepo.findById(productId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    await appTx.run(async () => {
      existing.archived = true;
      existing.updatedAt = new Date().toISOString();
      await productRepo.save(existing);
    });
    return existing;
  }

  // Orders
  async function createOrder({ userId, incomeProfileId, orderNumber, supplier, platform, date, items, shipping, additionalCosts, totalCost, status, tracking, notes }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    await assertActiveIncomeProfile(userId, incomeProfileId);

    const order = createResellingOrder({
      userId,
      incomeProfileId,
      orderNumber,
      supplier,
      platform,
      date,
      items,
      shipping,
      additionalCosts,
      totalCost,
      status,
      tracking,
      notes,
    });

    await appTx.run(async () => {
      await orderRepo.save(order);
    });

    return order;
  }

  async function getOrder({ orderId }) {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await orderRepo.findById(orderId);
  }

  async function listOrders({ userId, incomeProfileId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    let orders = await orderRepo.loadAll();
    orders = orders.filter(o => o.userId === userId && !o.archived);
    if (incomeProfileId) {
      orders = orders.filter(o => o.incomeProfileId === incomeProfileId);
    }
    return orders;
  }

  async function updateOrder({ orderId, updates }) {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await orderRepo.findById(orderId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = validateResellingOrderUpdate({ existing, updates });

    await appTx.run(async () => {
      await orderRepo.save(updated);
    });

    return updated;
  }

  async function archiveOrder({ orderId }) {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await orderRepo.findById(orderId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    await appTx.run(async () => {
      existing.archived = true;
      existing.updatedAt = new Date().toISOString();
      await orderRepo.save(existing);
    });
    return existing;
  }

  // Sales
  async function createSale({ userId, incomeProfileId, productId, quantity, salePrice, platform, commission, shipping, otherCosts, saleDate, paymentStatus, saleStatus, accountId, linkedTransactionId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    await assertActiveIncomeProfile(userId, incomeProfileId);
    if (linkedTransactionId) throw new Error('VALIDATION_FAILED');

    const product = productId ? await productRepo.findById(productId) : null;
    if (product && (product.userId !== userId || product.archived || product.incomeProfileId !== incomeProfileId)) {
      throw new Error('NOT_FOUND');
    }
    const purchaseCost = product && typeof quantity === 'number' ? product.purchasePrice * quantity : null;

    const sale = createResellingSale({
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
      accountId,
      linkedTransactionId,
      purchaseCost,
    });

    await appTx.run(async () => {
      if (sale.paymentStatus === 'paid') {
        if (!sale.accountId) throw new Error('VALIDATION_FAILED');
        if (!Number.isFinite(sale.netAmount) || sale.netAmount <= 0) throw new Error('VALIDATION_FAILED');
        if (!txRepo || !accountRepo) throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');
        const account = await accountRepo.findById(sale.accountId);
        if (!account || account.userId !== userId) throw new Error('NOT_FOUND');
        if (account.archived) throw new Error('ARCHIVED_ENTITY');
      }

      await saleRepo.save(sale);

      if (sale.paymentStatus === 'paid') {
        const transaction = {
          id: generateId(),
          userId,
          accountId: sale.accountId,
          amount: sale.netAmount,
          type: 'income',
          categoryId: null,
          description: sale.platform ? 'Reselling sale — ' + sale.platform : 'Reselling sale',
          date: sale.saleDate,
          notes: '',
          metadata: { resellingSaleId: sale.id },
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await txRepo.save(transaction);
        sale.linkedTransactionId = transaction.id;
        await saleRepo.save(sale);
      }
    });

    return sale;
  }

  async function getSale({ saleId }) {
    if (!saleId || typeof saleId !== 'string' || saleId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await saleRepo.findById(saleId);
  }

  async function listSales({ userId, incomeProfileId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    let sales = await saleRepo.loadAll();
    sales = sales.filter(s => s.userId === userId && !s.archived);
    if (incomeProfileId) {
      sales = sales.filter(s => s.incomeProfileId === incomeProfileId);
    }
    return sales;
  }

  async function updateSale({ saleId, updates }) {
    if (!saleId || typeof saleId !== 'string' || saleId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await saleRepo.findById(saleId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    if (updates.linkedTransactionId !== undefined) throw new Error('VALIDATION_FAILED');

    const updated = validateResellingSaleUpdate({ existing, updates });

    if (updates.productId !== undefined || updates.quantity !== undefined) {
      const product = await productRepo.findById(updated.productId);
      if (product && product.userId === existing.userId && !product.archived && product.incomeProfileId === updated.incomeProfileId) {
        updated.purchaseCost = product.purchasePrice * updated.quantity;
      } else if (updates.productId !== undefined) {
        throw new Error('NOT_FOUND');
      }
    }

    await appTx.run(async () => {
      const oldPaymentStatus = existing.paymentStatus || 'pending';
      const newPaymentStatus = updated.paymentStatus || 'pending';
      const oldAccountId = existing.accountId || '';
      const newAccountId = updated.accountId || '';
      const financialChange = updated.netAmount !== existing.netAmount || updated.saleDate !== existing.saleDate || updated.platform !== existing.platform;
      const existingLinkedTx = existing.linkedTransactionId && txRepo
        ? await txRepo.findById(existing.linkedTransactionId)
        : null;
      const linkedTransactionNeedsRepair = Boolean(existing.linkedTransactionId) && (!existingLinkedTx || existingLinkedTx.archived);

      if (oldPaymentStatus === 'paid' && newPaymentStatus !== 'paid') {
        if (existing.linkedTransactionId && !txRepo) throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');
        if (existing.linkedTransactionId && txRepo) {
          const linkedTx = await txRepo.findById(existing.linkedTransactionId);
          if (linkedTx && !linkedTx.archived) await txRepo.save({ ...linkedTx, archived: true, updatedAt: new Date().toISOString() });
        }
        updated.linkedTransactionId = '';
      } else if (oldPaymentStatus !== 'paid' && newPaymentStatus === 'paid') {
        if (!Number.isFinite(updated.netAmount) || updated.netAmount <= 0) throw new Error('VALIDATION_FAILED');
        if (!newAccountId) throw new Error('VALIDATION_FAILED');
        if (!txRepo || !accountRepo) throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');
        const account = await accountRepo.findById(newAccountId);
        if (!account || account.userId !== existing.userId) throw new Error('NOT_FOUND');
        if (account.archived) throw new Error('ARCHIVED_ENTITY');
        const transaction = {
          id: generateId(), userId: existing.userId, accountId: newAccountId, amount: updated.netAmount,
          type: 'income', categoryId: null,
          description: updated.platform ? 'Reselling sale — ' + updated.platform : 'Reselling sale',
          date: updated.saleDate, notes: '', metadata: { resellingSaleId: existing.id }, archived: false,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await txRepo.save(transaction);
        updated.linkedTransactionId = transaction.id;
      } else if (newPaymentStatus === 'paid' && (oldAccountId !== newAccountId || financialChange || !existing.linkedTransactionId || linkedTransactionNeedsRepair)) {
        if (!Number.isFinite(updated.netAmount) || updated.netAmount <= 0) throw new Error('VALIDATION_FAILED');
        if (!newAccountId) throw new Error('VALIDATION_FAILED');
        if (!txRepo || !accountRepo) throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');
        const account = await accountRepo.findById(newAccountId);
        if (!account || account.userId !== existing.userId) throw new Error('NOT_FOUND');
        if (account.archived) throw new Error('ARCHIVED_ENTITY');
        if (existing.linkedTransactionId) {
          const oldLinkedTx = existingLinkedTx;
          if (oldLinkedTx && !oldLinkedTx.archived) await txRepo.save({ ...oldLinkedTx, archived: true, updatedAt: new Date().toISOString() });
        }
        const transaction = {
          id: generateId(), userId: existing.userId, accountId: newAccountId, amount: updated.netAmount,
          type: 'income', categoryId: null,
          description: updated.platform ? 'Reselling sale — ' + updated.platform : 'Reselling sale',
          date: updated.saleDate, notes: '', metadata: { resellingSaleId: existing.id }, archived: false,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await txRepo.save(transaction);
        updated.linkedTransactionId = transaction.id;
      }

      await saleRepo.save(updated);
    });

    return updated;
  }

  async function archiveSale({ saleId }) {
    if (!saleId || typeof saleId !== 'string' || saleId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await saleRepo.findById(saleId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    await appTx.run(async () => {
      existing.archived = true;
      existing.updatedAt = new Date().toISOString();
      await saleRepo.save(existing);
      if (existing.linkedTransactionId && txRepo) {
        const linkedTx = await txRepo.findById(existing.linkedTransactionId);
        if (linkedTx && !linkedTx.archived) await txRepo.save({ ...linkedTx, archived: true, updatedAt: new Date().toISOString() });
      }
    });
    return existing;
  }

  // Costs
  async function createCost({ userId, incomeProfileId, amount, category, date, description, accountId, linkedProductId, linkedSaleId, linkedOrderId, paymentStatus }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') throw new Error('VALIDATION_FAILED');
    if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') throw new Error('VALIDATION_FAILED');
    await assertActiveIncomeProfile(userId, incomeProfileId);

    const cost = createResellingCost({
      userId, incomeProfileId, amount, category, date, description, accountId,
      linkedProductId, linkedSaleId, linkedOrderId, paymentStatus,
    });

    let resultCost = cost;
    await appTx.run(async () => {
      if (cost.paymentStatus === 'paid') {
        if (!cost.accountId) throw new Error('VALIDATION_FAILED');
        if (!txRepo || !accountRepo) throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');

        const account = await accountRepo.findById(cost.accountId);
        if (!account || account.userId !== userId) throw new Error('NOT_FOUND');
        if (account.archived) throw new Error('ARCHIVED_ENTITY');
      }

      await costRepo.save(cost);

      if (cost.paymentStatus === 'paid') {
        const transaction = {
          id: generateId(), userId, accountId: cost.accountId, amount: cost.amount,
          type: 'expense', categoryId: null, description: cost.description, date: cost.date,
          notes: '', metadata: { resellingCostId: cost.id }, archived: false,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await txRepo.save(transaction);
        resultCost = { ...cost, linkedTransactionId: transaction.id };
        await costRepo.save(resultCost);
      }
    });

    return resultCost;
  }

  async function getCost({ costId }) {
    if (!costId || typeof costId !== 'string' || costId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await costRepo.findById(costId);
  }

  async function listCosts({ userId, incomeProfileId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    let costs = await costRepo.loadAll();
    costs = costs.filter(c => c.userId === userId && !c.archived);
    if (incomeProfileId) {
      costs = costs.filter(c => c.incomeProfileId === incomeProfileId);
    }
    return costs;
  }

  async function updateCost({ costId, updates }) {
    if (!costId || typeof costId !== 'string' || costId.trim() === '') throw new Error('VALIDATION_FAILED');
    if (!updates || typeof updates !== 'object') throw new Error('VALIDATION_FAILED');

    const existing = await costRepo.findById(costId);
    if (!existing) throw new Error('NOT_FOUND');
    if (updates.linkedTransactionId !== undefined) throw new Error('VALIDATION_FAILED');
    if (updates.incomeProfileId !== undefined) {
      if (!updates.incomeProfileId || typeof updates.incomeProfileId !== 'string') throw new Error('VALIDATION_FAILED');
      await assertActiveIncomeProfile(existing.userId, updates.incomeProfileId);
    }

    const updated = validateResellingCostUpdate({ existing, updates });

    await appTx.run(async () => {
      const oldPaymentStatus = existing.paymentStatus || 'unpaid';
      const newPaymentStatus = updated.paymentStatus || 'unpaid';
      const oldAccountId = existing.accountId || '';
      const newAccountId = updated.accountId || '';
      const financialChange =
        updated.amount !== existing.amount ||
        updated.date !== existing.date ||
        updated.description !== existing.description ||
        oldAccountId !== newAccountId;

      if (newPaymentStatus === 'paid') {
        if (!newAccountId) throw new Error('VALIDATION_FAILED');
        if (!txRepo || !accountRepo) throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');

        const account = await accountRepo.findById(newAccountId);
        if (!account || account.userId !== existing.userId) throw new Error('NOT_FOUND');
        if (account.archived) throw new Error('ARCHIVED_ENTITY');

        const linkedTx = existing.linkedTransactionId
          ? await txRepo.findById(existing.linkedTransactionId)
          : null;
        const needsReplacement =
          oldPaymentStatus !== 'paid' ||
          financialChange ||
          !linkedTx ||
          linkedTx.archived;

        if (needsReplacement) {
          if (linkedTx && !linkedTx.archived) {
            await txRepo.save({ ...linkedTx, archived: true, updatedAt: new Date().toISOString() });
          }

          const transaction = {
            id: generateId(), userId: existing.userId, accountId: newAccountId, amount: updated.amount,
            type: 'expense', categoryId: null, description: updated.description, date: updated.date,
            notes: '', metadata: { resellingCostId: existing.id }, archived: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          };
          await txRepo.save(transaction);
          updated.linkedTransactionId = transaction.id;
        }
      } else {
        if (oldPaymentStatus === 'paid' && existing.linkedTransactionId && txRepo) {
          const linkedTx = await txRepo.findById(existing.linkedTransactionId);
          if (linkedTx && !linkedTx.archived) {
            await txRepo.save({ ...linkedTx, archived: true, updatedAt: new Date().toISOString() });
          }
        }
        updated.linkedTransactionId = '';
      }

      await costRepo.save(updated);
    });

    return updated;
  }

  async function archiveCost({ costId }) {
    if (!costId || typeof costId !== 'string' || costId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await costRepo.findById(costId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    await appTx.run(async () => {
      existing.archived = true;
      existing.updatedAt = new Date().toISOString();
      await costRepo.save(existing);

      if (existing.linkedTransactionId) {
        const linkedTx = await txRepo.findById(existing.linkedTransactionId);
        if (linkedTx && !linkedTx.archived) {
          const archivedTx = { ...linkedTx, archived: true, updatedAt: new Date().toISOString() };
          await txRepo.save(archivedTx);
        }
      }
    });

    return existing;
  }

  // Tasks
  async function createTask({ userId, incomeProfileId, title, dueDate, priority, status, linkedProductId, linkedSaleId, linkedOrderId, note }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    await assertActiveIncomeProfile(userId, incomeProfileId);

    const task = createResellingTask({
      userId,
      incomeProfileId,
      title,
      dueDate,
      priority,
      status,
      linkedProductId,
      linkedSaleId,
      linkedOrderId,
      note,
    });

    await appTx.run(async () => {
      await taskRepo.save(task);
    });

    return task;
  }

  async function getTask({ taskId }) {
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await taskRepo.findById(taskId);
  }

  async function listTasks({ userId, incomeProfileId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    let tasks = await taskRepo.loadAll();
    tasks = tasks.filter(t => t.userId === userId && !t.archived);
    if (incomeProfileId) {
      tasks = tasks.filter(t => t.incomeProfileId === incomeProfileId);
    }
    return tasks;
  }

  async function updateTask({ taskId, updates }) {
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await taskRepo.findById(taskId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = validateResellingTaskUpdate({ existing, updates });

    await appTx.run(async () => {
      await taskRepo.save(updated);
    });

    return updated;
  }

  async function archiveTask({ taskId }) {
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await taskRepo.findById(taskId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    await appTx.run(async () => {
      existing.archived = true;
      existing.updatedAt = new Date().toISOString();
      await taskRepo.save(existing);
    });
    return existing;
  }

  // Analytics
  async function getResellingAnalytics({ userId, incomeProfileId, period }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    let sales = await saleRepo.loadAll();
    sales = sales.filter(s => s.userId === userId && !s.archived);
    if (incomeProfileId) {
      sales = sales.filter(s => s.incomeProfileId === incomeProfileId);
    }

    let costs = await costRepo.loadAll();
    costs = costs.filter(c => c.userId === userId && !c.archived);
    if (incomeProfileId) {
      costs = costs.filter(c => c.incomeProfileId === incomeProfileId);
    }

    let products = await productRepo.loadAll();
    products = products.filter(p => p.userId === userId && !p.archived);
    if (incomeProfileId) {
      products = products.filter(p => p.incomeProfileId === incomeProfileId);
    }

    if (period && period.startDate && period.endDate) {
      sales = sales.filter(s => s.saleDate >= period.startDate && s.saleDate <= period.endDate);
      costs = costs.filter(c => c.date >= period.startDate && c.date <= period.endDate);
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    const totalPurchaseCost = sales.reduce((sum, sale) => {
      if (typeof sale.purchaseCost === 'number' && Number.isFinite(sale.purchaseCost)) {
        return sum + sale.purchaseCost;
      }
      const product = productMap.get(sale.productId);
      return sum + (product ? product.purchasePrice * sale.quantity : 0);
    }, 0);

    const totalRevenue = sales.reduce((sum, s) => sum + s.salePrice, 0);
    const totalSellingCosts = sales.reduce((sum, s) => sum + (s.commission || 0) + (s.shipping || 0) + (s.otherCosts || 0), 0);
    const totalOperationalCost = costs.reduce((sum, c) => sum + c.amount, 0);
    const totalCost = totalPurchaseCost + totalSellingCosts + totalOperationalCost;
    const totalNet = totalRevenue - totalCost;
    const totalSalesCount = sales.length;
    const totalCostsCount = costs.length;

    const salesByPlatform = {};
    for (const sale of sales) {
      const platform = sale.platform || 'unknown';
      if (!salesByPlatform[platform]) {
        salesByPlatform[platform] = { count: 0, revenue: 0, net: 0 };
      }
      const purchaseCost = typeof sale.purchaseCost === 'number' && Number.isFinite(sale.purchaseCost)
        ? sale.purchaseCost
        : (productMap.get(sale.productId)?.purchasePrice || 0) * sale.quantity;
      salesByPlatform[platform].count++;
      salesByPlatform[platform].revenue += sale.salePrice;
      salesByPlatform[platform].net += sale.salePrice - purchaseCost - (sale.commission || 0) - (sale.shipping || 0) - (sale.otherCosts || 0);
    }

    const costsByCategory = {};
    for (const cost of costs) {
      if (!costsByCategory[cost.category]) {
        costsByCategory[cost.category] = { count: 0, amount: 0 };
      }
      costsByCategory[cost.category].count++;
      costsByCategory[cost.category].amount += cost.amount;
    }

    return {
      totalRevenue,
      totalPurchaseCost,
      totalSellingCosts,
      totalOperationalCost,
      totalCost,
      totalNet,
      realizedRevenue: sales.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + s.netAmount, 0),
      realizedCost: costs.filter(c => c.paymentStatus === 'paid').reduce((sum, c) => sum + c.amount, 0),
      realizedSalesCount: sales.filter(s => s.paymentStatus === 'paid').length,
      refundedSalesCount: sales.filter(s => s.paymentStatus === 'refunded').length,
      totalSalesCount,
      totalCostsCount,
      profitMargin: totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0,
      salesByPlatform,
      costsByCategory,
      period: period || null,
    };
  }

  return {
    createProduct,
    getProduct,
    listProducts,
    updateProduct,
    archiveProduct,
    createOrder,
    getOrder,
    listOrders,
    updateOrder,
    archiveOrder,
    createSale,
    getSale,
    listSales,
    updateSale,
    archiveSale,
    createCost,
    getCost,
    listCosts,
    updateCost,
    archiveCost,
    createTask,
    getTask,
    listTasks,
    updateTask,
    archiveTask,
    getResellingAnalytics,
  };
}
