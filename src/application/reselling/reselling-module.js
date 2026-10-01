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
  applicationTransaction,
}) {
  const productRepo = resellingProductRepository;
  const orderRepo = resellingOrderRepository;
  const saleRepo = resellingSaleRepository;
  const costRepo = resellingCostRepository;
  const taskRepo = resellingTaskRepository;
  const appTx = applicationTransaction;

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

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await productRepo.save(existing);
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

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await orderRepo.save(existing);
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
    });

    await appTx.run(async () => {
      await saleRepo.save(sale);
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

    const updated = validateResellingSaleUpdate({ existing, updates });

    await appTx.run(async () => {
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

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await saleRepo.save(existing);
    return existing;
  }

  // Costs
  async function createCost({ userId, incomeProfileId, amount, category, date, description, accountId, linkedProductId, linkedSaleId, linkedOrderId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!incomeProfileId || typeof incomeProfileId !== 'string' || incomeProfileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const cost = createResellingCost({
      userId,
      incomeProfileId,
      amount,
      category,
      date,
      description,
      accountId,
      linkedProductId,
      linkedSaleId,
      linkedOrderId,
    });

    await appTx.run(async () => {
      await costRepo.save(cost);
    });

    return cost;
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
    if (!costId || typeof costId !== 'string' || costId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await costRepo.findById(costId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = validateResellingCostUpdate({ existing, updates });

    await appTx.run(async () => {
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

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await costRepo.save(existing);
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

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await taskRepo.save(existing);
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

    if (period && period.startDate && period.endDate) {
      sales = sales.filter(s => s.saleDate >= period.startDate && s.saleDate <= period.endDate);
      costs = costs.filter(c => c.date >= period.startDate && c.date <= period.endDate);
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.salePrice, 0);
    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
    const totalNet = totalRevenue - totalCost;
    const totalSalesCount = sales.length;
    const totalCostsCount = costs.length;

    const salesByPlatform = {};
    for (const sale of sales) {
      const platform = sale.platform || 'unknown';
      if (!salesByPlatform[platform]) {
        salesByPlatform[platform] = { count: 0, revenue: 0, net: 0 };
      }
      salesByPlatform[platform].count++;
      salesByPlatform[platform].revenue += sale.salePrice;
      salesByPlatform[platform].net += sale.netAmount;
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
      totalCost,
      totalNet,
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
