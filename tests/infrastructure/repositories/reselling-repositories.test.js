import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResellingProductRepository } from '../../../src/infrastructure/repositories/reselling-product-repository.js';
import { ResellingOrderRepository } from '../../../src/infrastructure/repositories/reselling-order-repository.js';
import { ResellingSaleRepository } from '../../../src/infrastructure/repositories/reselling-sale-repository.js';
import { ResellingCostRepository } from '../../../src/infrastructure/repositories/reselling-cost-repository.js';
import { ResellingTaskRepository } from '../../../src/infrastructure/repositories/reselling-task-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('ResellingProductRepository', () => {
  it('loadAll returns empty array when no data', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingProductRepository(storage, 'user-1', () => storage.keys());
    const result = await repo.loadAll();
    assert.deepStrictEqual(result, []);
  });

  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingProductRepository(storage, 'user-1', () => storage.keys());
    const product = {
      id: 'p-1',
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
      archived: false,
      createdAt: '2024-06-15T00:00:00Z',
      updatedAt: '2024-06-15T00:00:00Z',
    };
    await repo.save(product);
    const found = await repo.findById('p-1');
    assert.deepStrictEqual(found, product);
  });

  it('findByIncomeProfile filters by profile', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingProductRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'p-1', userId: 'user-1', incomeProfileId: 'ip-1', name: 'A', sku: '', platform: '', purchasePrice: 50, plannedSalePrice: null, purchaseDate: '2024-06-15', quantity: 1, location: '', notes: '', status: 'in_stock', archived: false, createdAt: '2024-06-15T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' });
    await repo.save({ id: 'p-2', userId: 'user-1', incomeProfileId: 'ip-2', name: 'B', sku: '', platform: '', purchasePrice: 50, plannedSalePrice: null, purchaseDate: '2024-06-15', quantity: 1, location: '', notes: '', status: 'in_stock', archived: false, createdAt: '2024-06-15T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' });
    const forIp1 = await repo.findByIncomeProfile('ip-1');
    assert.strictEqual(forIp1.length, 1);
    assert.strictEqual(forIp1[0].id, 'p-1');
  });

  it('archive marks entity as archived', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingProductRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'p-1', userId: 'user-1', incomeProfileId: 'ip-1', name: 'A', sku: '', platform: '', purchasePrice: 50, plannedSalePrice: null, purchaseDate: '2024-06-15', quantity: 1, location: '', notes: '', status: 'in_stock', archived: false, createdAt: '2024-06-15T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' });
    await repo.archive('p-1');
    const found = await repo.findById('p-1');
    assert.strictEqual(found.archived, true);
  });

  it('archive throws NOT_FOUND for missing id', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingProductRepository(storage, 'user-1', () => storage.keys());
    await assert.rejects(() => repo.archive('nonexistent'), /NOT_FOUND/);
  });

  it('checkOwnership rejects mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingProductRepository(storage, 'user-1', () => storage.keys());
    await assert.rejects(
      () => repo.save({ id: 'p-1', userId: 'user-2', incomeProfileId: 'ip-1', name: 'A', sku: '', platform: '', purchasePrice: 50, plannedSalePrice: null, purchaseDate: '2024-06-15', quantity: 1, location: '', notes: '', status: 'in_stock', archived: false, createdAt: '2024-06-15T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' }),
      /OWNERSHIP_VIOLATION/
    );
  });
});

describe('ResellingOrderRepository', () => {
  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingOrderRepository(storage, 'user-1', () => storage.keys());
    const order = {
      id: 'o-1',
      userId: 'user-1',
      incomeProfileId: 'ip-1',
      orderNumber: 'ORD-001',
      supplier: 'Supplier A',
      platform: 'Allegro',
      date: '2024-06-15',
      items: [{ productId: 'p-1', quantity: 5, purchasePrice: 50 }],
      shipping: 20,
      additionalCosts: 0,
      totalCost: 270,
      status: 'ordered',
      tracking: 'TRK-123',
      notes: 'Note',
      archived: false,
      createdAt: '2024-06-15T00:00:00Z',
      updatedAt: '2024-06-15T00:00:00Z',
    };
    await repo.save(order);
    const found = await repo.findById('o-1');
    assert.deepStrictEqual(found, order);
  });

  it('findByIncomeProfile filters by profile', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingOrderRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'o-1', userId: 'user-1', incomeProfileId: 'ip-1', orderNumber: 'A', date: '2024-06-15', items: [{ productId: 'p-1', quantity: 1, purchasePrice: 50 }], shipping: 0, additionalCosts: 0, totalCost: 50, status: 'ordered', tracking: '', notes: '', archived: false, createdAt: '2024-06-15T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' });
    const found = await repo.findByIncomeProfile('ip-1');
    assert.strictEqual(found.length, 1);
  });
});

describe('ResellingSaleRepository', () => {
  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingSaleRepository(storage, 'user-1', () => storage.keys());
    const sale = {
      id: 's-1',
      userId: 'user-1',
      incomeProfileId: 'ip-1',
      productId: 'p-1',
      quantity: 2,
      salePrice: 200,
      platform: 'Vinted',
      commission: 10,
      shipping: 15,
      otherCosts: 0,
      netAmount: 175,
      saleDate: '2024-07-01',
      paymentStatus: 'paid',
      saleStatus: 'completed',
      accountId: '',
      linkedTransactionId: '',
      archived: false,
      createdAt: '2024-07-01T00:00:00Z',
      updatedAt: '2024-07-01T00:00:00Z',
    };
    await repo.save(sale);
    const found = await repo.findById('s-1');
    assert.deepStrictEqual(found, sale);
  });
});

describe('ResellingCostRepository', () => {
  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingCostRepository(storage, 'user-1', () => storage.keys());
    const cost = {
      id: 'c-1',
      userId: 'user-1',
      incomeProfileId: 'ip-1',
      amount: 50,
      category: 'shipping',
      date: '2024-07-01',
      description: 'Shipping cost',
      accountId: '',
      linkedProductId: '',
      linkedSaleId: '',
      linkedOrderId: '',
      archived: false,
      createdAt: '2024-07-01T00:00:00Z',
      updatedAt: '2024-07-01T00:00:00Z',
    };
    await repo.save(cost);
    const found = await repo.findById('c-1');
    assert.deepStrictEqual(found, cost);
  });

  it('findByIncomeProfile filters by profile', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingCostRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'c-1', userId: 'user-1', incomeProfileId: 'ip-1', amount: 50, category: 'shipping', date: '2024-07-01', description: 'A', accountId: '', linkedProductId: '', linkedSaleId: '', linkedOrderId: '', archived: false, createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' });
    const found = await repo.findByIncomeProfile('ip-1');
    assert.strictEqual(found.length, 1);
  });
});

describe('ResellingTaskRepository', () => {
  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingTaskRepository(storage, 'user-1', () => storage.keys());
    const task = {
      id: 't-1',
      userId: 'user-1',
      incomeProfileId: 'ip-1',
      title: 'List product on Vinted',
      dueDate: '2024-07-10',
      priority: 'high',
      status: 'todo',
      linkedProductId: '',
      linkedSaleId: '',
      linkedOrderId: '',
      note: 'Remember to take good photos',
      archived: false,
      createdAt: '2024-07-01T00:00:00Z',
      updatedAt: '2024-07-01T00:00:00Z',
    };
    await repo.save(task);
    const found = await repo.findById('t-1');
    assert.deepStrictEqual(found, task);
  });

  it('findByIncomeProfile filters by profile', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ResellingTaskRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 't-1', userId: 'user-1', incomeProfileId: 'ip-1', title: 'Task A', dueDate: '', priority: 'medium', status: 'todo', linkedProductId: '', linkedSaleId: '', linkedOrderId: '', note: '', archived: false, createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' });
    const found = await repo.findByIncomeProfile('ip-1');
    assert.strictEqual(found.length, 1);
  });
});
