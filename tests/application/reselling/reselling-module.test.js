import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResellingModule } from '../../../src/application/reselling/reselling-module.js';
import { ResellingProductRepository } from '../../../src/infrastructure/repositories/reselling-product-repository.js';
import { ResellingOrderRepository } from '../../../src/infrastructure/repositories/reselling-order-repository.js';
import { ResellingSaleRepository } from '../../../src/infrastructure/repositories/reselling-sale-repository.js';
import { ResellingCostRepository } from '../../../src/infrastructure/repositories/reselling-cost-repository.js';
import { ResellingTaskRepository } from '../../../src/infrastructure/repositories/reselling-task-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { IncomeProfileRepository } from '../../../src/infrastructure/repositories/income-profile-repository.js';

async function createModule(userId = 'user-1') {
  const storage = new InMemoryStorageAdapter();
  await storage.init();
  const productRepo = new ResellingProductRepository(storage, userId, () => storage.keys());
  const orderRepo = new ResellingOrderRepository(storage, userId, () => storage.keys());
  const saleRepo = new ResellingSaleRepository(storage, userId, () => storage.keys());
  const costRepo = new ResellingCostRepository(storage, userId, () => storage.keys());
  const taskRepo = new ResellingTaskRepository(storage, userId, () => storage.keys());
  const transactionRepo = new TransactionRepository(storage, userId, () => storage.keys());
  const accountRepo = new AccountRepository(storage, userId, () => storage.keys());
  const incomeProfileRepo = new IncomeProfileRepository(storage, userId, () => storage.keys());
  await incomeProfileRepo.save({ id: 'ip-1', userId, type: 'reselling', name: 'Test Profile', description: '', archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const appTx = new ApplicationTransaction(storage);

  return {
    module: createResellingModule({
      resellingProductRepository: productRepo,
      resellingOrderRepository: orderRepo,
      resellingSaleRepository: saleRepo,
      resellingCostRepository: costRepo,
      resellingTaskRepository: taskRepo,
      transactionRepository: transactionRepo,
      accountRepository: accountRepo,
      incomeProfileRepository: incomeProfileRepo,
      applicationTransaction: appTx,
    }),
    storage,
    productRepo,
    orderRepo,
    saleRepo,
    costRepo,
    taskRepo,
    transactionRepo,
    accountRepo,
    incomeProfileRepo,
    appTx,
  };
}

describe('ResellingModule', () => {
  describe('income profile isolation', () => {
    it('rejects creation against another user profile', async () => {
      const { module, storage } = await createModule('user-1');
      const foreignProfileRepo = new IncomeProfileRepository(storage, 'user-2', () => storage.keys());
      await foreignProfileRepo.save({
        id:'foreign-ip', userId:'user-2', type:'reselling', name:'Foreign',
        description:'', archived:false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
      });
      await assert.rejects(module.createProduct({
        userId:'user-1', incomeProfileId:'foreign-ip', name:'Item',
        purchasePrice:10, purchaseDate:'2024-07-01', quantity:1
      }), /NOT_FOUND/);
    });

    it('rejects creation against an archived profile', async () => {
      const { module, incomeProfileRepo } = await createModule('user-1');
      await incomeProfileRepo.save({
        id:'archived-ip', userId:'user-1', type:'reselling', name:'Archived',
        description:'', archived:true, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
      });
      await assert.rejects(module.createProduct({
        userId:'user-1', incomeProfileId:'archived-ip', name:'Item',
        purchasePrice:10, purchaseDate:'2024-07-01', quantity:1
      }), /ARCHIVED_ENTITY/);
    });
  });

  describe('construction', () => {
    it('creates a module with all public methods', async () => {
      const { module } = await createModule();
      assert.ok(module);
      assert.strictEqual(typeof module.createProduct, 'function');
      assert.strictEqual(typeof module.getProduct, 'function');
      assert.strictEqual(typeof module.listProducts, 'function');
      assert.strictEqual(typeof module.updateProduct, 'function');
      assert.strictEqual(typeof module.archiveProduct, 'function');
      assert.strictEqual(typeof module.createOrder, 'function');
      assert.strictEqual(typeof module.getOrder, 'function');
      assert.strictEqual(typeof module.listOrders, 'function');
      assert.strictEqual(typeof module.updateOrder, 'function');
      assert.strictEqual(typeof module.archiveOrder, 'function');
      assert.strictEqual(typeof module.createSale, 'function');
      assert.strictEqual(typeof module.getSale, 'function');
      assert.strictEqual(typeof module.listSales, 'function');
      assert.strictEqual(typeof module.updateSale, 'function');
      assert.strictEqual(typeof module.archiveSale, 'function');
      assert.strictEqual(typeof module.createCost, 'function');
      assert.strictEqual(typeof module.getCost, 'function');
      assert.strictEqual(typeof module.listCosts, 'function');
      assert.strictEqual(typeof module.updateCost, 'function');
      assert.strictEqual(typeof module.archiveCost, 'function');
      assert.strictEqual(typeof module.createTask, 'function');
      assert.strictEqual(typeof module.getTask, 'function');
      assert.strictEqual(typeof module.listTasks, 'function');
      assert.strictEqual(typeof module.updateTask, 'function');
      assert.strictEqual(typeof module.archiveTask, 'function');
      assert.strictEqual(typeof module.getResellingAnalytics, 'function');
    });
  });

  describe('createProduct', () => {
    it('creates product with correct shape', async () => {
      const { module } = await createModule();
      const product = await module.createProduct({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        name: 'T-Shirt',
        sku: 'TS-001',
        platform: 'Vinted',
        purchasePrice: 50,
        plannedSalePrice: 100,
        purchaseDate: '2024-06-15',
        quantity: 5,
        location: 'Warsaw',
        notes: 'Test note',
        status: 'in_stock',
      });

      assert.ok(product.id);
      assert.strictEqual(product.userId, 'user-1');
      assert.strictEqual(product.incomeProfileId, 'ip-1');
      assert.strictEqual(product.name, 'T-Shirt');
      assert.strictEqual(product.sku, 'TS-001');
      assert.strictEqual(product.platform, 'Vinted');
      assert.strictEqual(product.purchasePrice, 50);
      assert.strictEqual(product.plannedSalePrice, 100);
      assert.strictEqual(product.purchaseDate, '2024-06-15');
      assert.strictEqual(product.quantity, 5);
      assert.strictEqual(product.location, 'Warsaw');
      assert.strictEqual(product.status, 'in_stock');
      assert.strictEqual(product.archived, false);
      assert.ok(product.createdAt);
      assert.ok(product.updatedAt);
    });

    it('defaults status to ordered', async () => {
      const { module } = await createModule();
      const product = await module.createProduct({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        name: 'T-Shirt',
        purchasePrice: 50,
        purchaseDate: '2024-06-15',
        quantity: 1,
      });
      assert.strictEqual(product.status, 'ordered');
    });

    it('defaults quantity to 1', async () => {
      const { module } = await createModule();
      const product = await module.createProduct({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        name: 'T-Shirt',
        purchasePrice: 50,
        purchaseDate: '2024-06-15',
        quantity: 1,
      });
      assert.strictEqual(product.quantity, 1);
    });

    it('throws VALIDATION_FAILED for missing required fields', async () => {
      const { module } = await createModule();
      let threw = false;
      try {
        await module.createProduct({});
      } catch (e) {
        threw = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(threw);
    });
  });

  describe('createOrder', () => {
    it('creates order with correct shape', async () => {
      const { module } = await createModule();
      const order = await module.createOrder({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        orderNumber: 'ORD-001',
        supplier: 'Supplier A',
        platform: 'Allegro',
        date: '2024-06-15',
        items: [{ productId: 'p-1', quantity: 5, purchasePrice: 50 }],
        shipping: 20,
        status: 'processing',
      });

      assert.ok(order.id);
      assert.strictEqual(order.userId, 'user-1');
      assert.strictEqual(order.orderNumber, 'ORD-001');
      assert.strictEqual(order.status, 'processing');
      assert.strictEqual(order.totalCost, 270);
    });

    it('computes totalCost from items + shipping + additionalCosts', async () => {
      const { module } = await createModule();
      const order = await module.createOrder({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        orderNumber: 'ORD-002',
        date: '2024-06-15',
        items: [
          { productId: 'p-1', quantity: 2, purchasePrice: 30 },
          { productId: 'p-2', quantity: 1, purchasePrice: 20 },
        ],
        shipping: 10,
        additionalCosts: 5,
      });
      assert.strictEqual(order.totalCost, 2 * 30 + 1 * 20 + 10 + 5);
    });
  });

  describe('createSale', () => {
    it('creates sale with correct netAmount', async () => {
      const { module } = await createModule();
      const sale = await module.createSale({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        productId: 'p-1',
        quantity: 2,
        salePrice: 200,
        platform: 'Vinted',
        commission: 10,
        shipping: 15,
        otherCosts: 0,
        saleDate: '2024-07-01',
        paymentStatus: 'pending',
        saleStatus: 'completed',
      });

      assert.ok(sale.id);
      assert.strictEqual(sale.netAmount, 175);
      assert.strictEqual(sale.paymentStatus, 'pending');
      assert.strictEqual(sale.saleStatus, 'completed');
    });
  });

  describe('cost financial integration', () => {
    async function addAccount(accountRepo, id = 'acc-1', userId = 'user-1') {
      await accountRepo.save({
        id, userId, name: 'Test account', type: 'cash', icon: '', color: '#000000',
        openingBalance: 1000, archived: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }

    it('creates exactly one expense transaction for a paid cost', async () => {
      const { module, accountRepo, transactionRepo } = await createModule();
      await addAccount(accountRepo);
      const cost = await module.createCost({
        userId:'user-1', incomeProfileId:'ip-1', amount:50, category:'shipping',
        date:'2024-07-01', description:'Shipping', accountId:'acc-1', paymentStatus:'paid'
      });
      const txs = await transactionRepo.loadAll();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].amount, 50);
      assert.strictEqual(txs[0].type, 'expense');
      assert.strictEqual(cost.linkedTransactionId, txs[0].id);
    });

    it('requires an account for a paid cost', async () => {
      const { module, transactionRepo } = await createModule();
      await assert.rejects(module.createCost({
        userId:'user-1', incomeProfileId:'ip-1', amount:50, category:'shipping',
        date:'2024-07-01', description:'Shipping', paymentStatus:'paid'
      }), /VALIDATION_FAILED/);
      assert.strictEqual((await transactionRepo.loadAll()).length, 0);
    });

    it('refreshes the expense transaction when a paid cost changes', async () => {
      const { module, accountRepo, transactionRepo } = await createModule();
      await addAccount(accountRepo);
      const cost = await module.createCost({
        userId:'user-1', incomeProfileId:'ip-1', amount:50, category:'shipping',
        date:'2024-07-01', description:'Shipping', accountId:'acc-1', paymentStatus:'paid'
      });
      const updated = await module.updateCost({ costId:cost.id, updates:{ amount:75, description:'Updated shipping' } });
      const txs = await transactionRepo.loadAll();
      assert.strictEqual(txs.length, 2);
      assert.strictEqual(txs.filter(tx => tx.archived).length, 1);
      const active = txs.find(tx => !tx.archived);
      assert.strictEqual(active.amount, 75);
      assert.strictEqual(active.description, 'Updated shipping');
      assert.strictEqual(updated.linkedTransactionId, active.id);
    });

    it('repairs a paid cost with a missing linked transaction', async () => {
      const { module, accountRepo, transactionRepo } = await createModule();
      await addAccount(accountRepo);
      const cost = await module.createCost({
        userId:'user-1', incomeProfileId:'ip-1', amount:50, category:'shipping',
        date:'2024-07-01', description:'Shipping', accountId:'acc-1', paymentStatus:'paid'
      });
      await transactionRepo.archive(cost.linkedTransactionId);
      const updated = await module.updateCost({ costId:cost.id, updates:{ description:'Repair' } });
      const txs = await transactionRepo.loadAll();
      assert.strictEqual(txs.filter(tx => !tx.archived).length, 1);
      assert.strictEqual(updated.linkedTransactionId, txs.find(tx => !tx.archived).id);
    });

    it('archives the linked expense when a paid cost is archived', async () => {
      const { module, accountRepo, transactionRepo } = await createModule();
      await addAccount(accountRepo);
      const cost = await module.createCost({
        userId:'user-1', incomeProfileId:'ip-1', amount:50, category:'shipping',
        date:'2024-07-01', description:'Shipping', accountId:'acc-1', paymentStatus:'paid'
      });
      await module.archiveCost({ costId:cost.id });
      const txs = await transactionRepo.loadAll();
      assert.strictEqual(txs.filter(tx => !tx.archived).length, 0);
    });
  });

  describe('createCost', () => {
    it('creates cost with correct shape', async () => {
      const { module } = await createModule();
      const cost = await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 50,
        category: 'shipping',
        date: '2024-07-01',
        description: 'Shipping cost',
      });

      assert.ok(cost.id);
      assert.strictEqual(cost.amount, 50);
      assert.strictEqual(cost.category, 'shipping');
      assert.strictEqual(cost.description, 'Shipping cost');
    });
  });

  describe('createTask', () => {
    it('creates task with correct shape', async () => {
      const { module } = await createModule();
      const task = await module.createTask({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        title: 'List product',
        dueDate: '2024-07-10',
        priority: 'high',
        status: 'todo',
      });

      assert.ok(task.id);
      assert.strictEqual(task.title, 'List product');
      assert.strictEqual(task.priority, 'high');
      assert.strictEqual(task.status, 'todo');
    });

    it('defaults priority to medium and status to todo', async () => {
      const { module } = await createModule();
      const task = await module.createTask({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        title: 'Task',
      });
      assert.strictEqual(task.priority, 'medium');
      assert.strictEqual(task.status, 'todo');
    });
  });

  describe('profile isolation', () => {
    it('lists only products for given incomeProfileId', async () => {
      const { module } = await createModule();
      await module.createProduct({ userId: 'user-1', incomeProfileId: 'ip-1', name: 'A', purchasePrice: 50, purchaseDate: '2024-06-15', quantity: 1 });
      await module.createProduct({ userId: 'user-1', incomeProfileId: 'ip-2', name: 'B', purchasePrice: 50, purchaseDate: '2024-06-15', quantity: 1 });

      const ip1Products = await module.listProducts({ userId: 'user-1', incomeProfileId: 'ip-1' });
      assert.strictEqual(ip1Products.length, 1);
      assert.strictEqual(ip1Products[0].name, 'A');
    });
  });

  describe('cross-user isolation', () => {
    it('does not leak data between users', async () => {
      const { module } = await createModule('user-1');

      await module.createProduct({ userId: 'user-1', incomeProfileId: 'ip-1', name: 'User1 Product', purchasePrice: 50, purchaseDate: '2024-06-15', quantity: 1 });

      const user2Products = await module.listProducts({ userId: 'user-2' });
      assert.strictEqual(user2Products.length, 0);
    });
  });

  describe('getResellingAnalytics', () => {
    it('computes correct analytics', async () => {
      const { module } = await createModule();

      await module.createCost({ userId: 'user-1', incomeProfileId: 'ip-1', amount: 100, category: 'shipping', date: '2024-07-01', description: 'Cost 1' });
      await module.createCost({ userId: 'user-1', incomeProfileId: 'ip-1', amount: 50, category: 'packaging', date: '2024-07-01', description: 'Cost 2' });
      await module.createSale({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        productId: 'p-1',
        quantity: 1,
        salePrice: 300,
        platform: 'Vinted',
        commission: 20,
        shipping: 10,
        saleDate: '2024-07-01',
      });

      const analytics = await module.getResellingAnalytics({ userId: 'user-1' });

      assert.strictEqual(analytics.totalRevenue, 300);
      assert.strictEqual(analytics.totalCost, 150);
      assert.strictEqual(analytics.totalNet, 120);
      assert.strictEqual(analytics.totalSellingCosts, 30);
      assert.strictEqual(analytics.totalOperationalCost, 150);
      assert.strictEqual(analytics.totalSalesCount, 1);
      assert.strictEqual(analytics.totalCostsCount, 2);
      assert.ok(analytics.profitMargin > 0);
    });
  });

  describe('archiveProduct', () => {
    it('archives the product', async () => {
      const { module } = await createModule();
      const product = await module.createProduct({ userId: 'user-1', incomeProfileId: 'ip-1', name: 'T', purchasePrice: 50, purchaseDate: '2024-06-15', quantity: 1 });
      const archived = await module.archiveProduct({ productId: product.id });
      assert.strictEqual(archived.archived, true);

      const active = await module.listProducts({ userId: 'user-1' });
      assert.strictEqual(active.length, 0);
    });
  });

  describe('updateProduct', () => {
    it('updates allowed fields', async () => {
      const { module } = await createModule();
      const product = await module.createProduct({ userId: 'user-1', incomeProfileId: 'ip-1', name: 'T-Shirt', purchasePrice: 50, purchaseDate: '2024-06-15', quantity: 1 });
      const updated = await module.updateProduct({
        productId: product.id,
        updates: { name: 'T-Shirt Updated', notes: 'New note', status: 'listed' },
      });
      assert.strictEqual(updated.name, 'T-Shirt Updated');
      assert.strictEqual(updated.notes, 'New note');
      assert.strictEqual(updated.status, 'listed');
      assert.strictEqual(updated.userId, 'user-1');
    });
  });
});


describe('ResellingSale Financial Integration', () => {
  async function createFinancialModule(userId = 'user-1') {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const productRepo = new ResellingProductRepository(storage, userId, () => storage.keys());
    const orderRepo = new ResellingOrderRepository(storage, userId, () => storage.keys());
    const saleRepo = new ResellingSaleRepository(storage, userId, () => storage.keys());
    const costRepo = new ResellingCostRepository(storage, userId, () => storage.keys());
    const taskRepo = new ResellingTaskRepository(storage, userId, () => storage.keys());
    const txRepo = new TransactionRepository(storage, userId, () => storage.keys());
    const accountRepo = new AccountRepository(storage, userId, () => storage.keys());
    const appTx = new ApplicationTransaction(storage);
    const module = createResellingModule({
      resellingProductRepository: productRepo, resellingOrderRepository: orderRepo, resellingSaleRepository: saleRepo,
      resellingCostRepository: costRepo, resellingTaskRepository: taskRepo, transactionRepository: txRepo,
      accountRepository: accountRepo, applicationTransaction: appTx,
    });
    return { module, txRepo, accountRepo };
  }

  async function addAccount(accountRepo, id, userId = 'user-1') {
    await accountRepo.save({
      id, userId, name: id, type: 'bank', icon: 'landmark', color: '#0000FF', archived: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  it('snapshots product purchase cost when the sale is created', async () => {
    const { module, saleRepo } = await createModule();
    await module.createProduct({ userId:'user-1', incomeProfileId:'ip-1', name:'T-Shirt', purchasePrice:50, purchaseDate:'2024-06-15', quantity:10 });
    const products = await module.listProducts({ userId:'user-1', incomeProfileId:'ip-1' });
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:products[0].id, quantity:2,
      salePrice:150, saleDate:'2024-07-01', paymentStatus:'pending' });
    assert.strictEqual(sale.purchaseCost, 100);
    await module.updateProduct({ productId:products[0].id, updates:{ purchasePrice:90 } });
    const stored = await saleRepo.findById(sale.id);
    assert.strictEqual(stored.purchaseCost, 100);
  });

  it('creates exactly one income transaction for a paid sale', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:200, commission:10, shipping:15, otherCosts:5, saleDate:'2024-07-01',
      paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    assert.ok(sale.linkedTransactionId);
    const tx = (await txRepo.loadAll()).filter(t => !t.archived && t.metadata?.resellingSaleId === sale.id);
    assert.strictEqual(tx.length, 1);
    assert.strictEqual(tx[0].type, 'income');
    assert.strictEqual(tx[0].amount, 170);
    assert.strictEqual(tx[0].accountId, 'acc-1');
  });

  it('allows legacy sales without a currently available product', async () => {
    const { module } = await createFinancialModule();
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'legacy-product', quantity:1,
      salePrice:200, saleDate:'2024-07-01', paymentStatus:'pending' });
    assert.strictEqual(sale.purchaseCost, null);
  });

  it('rejects a paid sale whose net cash inflow is zero or negative', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    await assert.rejects(module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, commission:100, saleDate:'2024-07-01', paymentStatus:'paid', accountId:'acc-1' }), /VALIDATION_FAILED/);
    assert.strictEqual((await txRepo.loadAll()).length, 0);
  });

  it('does not create a transaction for an unpaid sale', async () => {
    const { module, txRepo } = await createFinancialModule();
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:200, saleDate:'2024-07-01', paymentStatus:'pending', saleStatus:'sold' });
    assert.strictEqual(sale.linkedTransactionId, '');
    assert.strictEqual((await txRepo.loadAll()).length, 0);
  });

  it('requires an account when creating a paid sale', async () => {
    const { module, txRepo } = await createFinancialModule();
    await assert.rejects(module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:200, saleDate:'2024-07-01', paymentStatus:'paid' }), /VALIDATION_FAILED/);
    assert.strictEqual((await txRepo.loadAll()).length, 0);
  });

  it('creates the transaction when an unpaid sale becomes paid', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'pending', saleStatus:'awaiting_payment' });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ paymentStatus:'paid', accountId:'acc-1' } });
    assert.ok(updated.linkedTransactionId);
    const tx = (await txRepo.loadAll()).find(t => t.metadata?.resellingSaleId === sale.id && !t.archived);
    assert.ok(tx);
    assert.strictEqual(tx.amount, 100);
    assert.strictEqual(tx.accountId, 'acc-1');
  });

  it('archives the transaction when a paid sale becomes unpaid', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ paymentStatus:'pending' } });
    assert.strictEqual(updated.linkedTransactionId, '');
    const tx = (await txRepo.loadAll()).find(t => t.metadata?.resellingSaleId === sale.id);
    assert.ok(tx);
    assert.strictEqual(tx.archived, true);
  });

  it('moves the financial transaction when a paid sale changes account', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1'); await addAccount(accountRepo, 'acc-2');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ accountId:'acc-2' } });
    assert.ok(updated.linkedTransactionId);
    const all = await txRepo.loadAll();
    assert.strictEqual(all.filter(t => t.metadata?.resellingSaleId === sale.id && !t.archived).length, 1);
    assert.strictEqual(all.find(t => t.metadata?.resellingSaleId === sale.id && !t.archived).accountId, 'acc-2');
    assert.strictEqual(all.filter(t => t.metadata?.resellingSaleId === sale.id && t.archived).length, 1);
  });

  it('repairs a paid sale when its linked transaction is missing', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({
      userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1'
    });
    await txRepo.save({ id:sale.linkedTransactionId, userId:'user-1', accountId:'acc-1', amount:100, type:'income',
      categoryId:null, description:'Reselling sale', date:'2024-07-01', notes:'',
      metadata:{resellingSaleId:sale.id}, archived:true, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ platform:'Vinted' } });
    const active = (await txRepo.loadAll()).filter(t => t.metadata?.resellingSaleId === sale.id && !t.archived);
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].amount, 100);
    assert.strictEqual(updated.linkedTransactionId, active[0].id);
  });

  it('does not duplicate the financial transaction on an unchanged paid sale update', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ saleStatus:'completed' } });
    assert.strictEqual(updated.linkedTransactionId, sale.linkedTransactionId);
    const active = (await txRepo.loadAll()).filter(t => t.metadata?.resellingSaleId === sale.id && !t.archived);
    assert.strictEqual(active.length, 1);
  });

  it('repairs a paid sale when the linked transaction is archived without another sale change', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    const original = await txRepo.findById(sale.linkedTransactionId);
    await txRepo.save({ ...original, archived:true, updatedAt:new Date().toISOString() });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ saleStatus:'completed' } });
    const all = await txRepo.loadAll();
    const active = all.filter(t => t.metadata?.resellingSaleId === sale.id && !t.archived);
    assert.strictEqual(active.length, 1);
    assert.notStrictEqual(updated.linkedTransactionId, original.id);
  });

  it('archives the financial transaction when a paid sale becomes refunded', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    await module.updateSale({ saleId:sale.id, updates:{ paymentStatus:'refunded' } });
    const tx = (await txRepo.loadAll()).find(t => t.metadata?.resellingSaleId === sale.id);
    assert.ok(tx);
    assert.strictEqual(tx.archived, true);
  });

  it('refreshes the purchase snapshot when sale quantity changes', async () => {
    const { module } = await createFinancialModule();
    await module.createProduct({ userId:'user-1', incomeProfileId:'ip-1', name:'Item', purchasePrice:25, purchaseDate:'2024-06-15', quantity:10 });
    const products = await module.listProducts({ userId:'user-1', incomeProfileId:'ip-1' });
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:products[0].id, quantity:2,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'pending' });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ quantity:3 } });
    assert.strictEqual(updated.purchaseCost, 75);
  });

  it('refreshes the financial transaction when a paid sale amount changes', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    const updated = await module.updateSale({ saleId:sale.id, updates:{ salePrice:120 } });
    assert.ok(updated.linkedTransactionId);
    const all = await txRepo.loadAll();
    const active = all.filter(t => t.metadata?.resellingSaleId === sale.id && !t.archived);
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].amount, 120);
  });

  it('archives the linked transaction when a paid sale is archived', async () => {
    const { module, txRepo, accountRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', saleStatus:'completed', accountId:'acc-1' });
    await module.archiveSale({ saleId:sale.id });
    const tx = (await txRepo.loadAll()).find(t => t.metadata?.resellingSaleId === sale.id);
    assert.ok(tx);
    assert.strictEqual(tx.archived, true);
  });

  it('rejects a paid sale linked to another user account', async () => {
    const { module, accountRepo, txRepo } = await createFinancialModule();
    await addAccount(accountRepo, 'acc-other', 'user-2');
    await assert.rejects(module.createSale({ userId:'user-1', incomeProfileId:'ip-1', productId:'p-1', quantity:1,
      salePrice:100, saleDate:'2024-07-01', paymentStatus:'paid', accountId:'acc-other' }), /NOT_FOUND/);
    assert.strictEqual((await txRepo.loadAll()).length, 0);
  });
});
