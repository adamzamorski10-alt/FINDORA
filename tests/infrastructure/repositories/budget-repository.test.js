import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BudgetRepository } from '../../../src/infrastructure/repositories/budget-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('BudgetRepository', () => {
  it('save and findAll returns budget', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    const budget = {
      id: 'budget-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 500,
      period: 'monthly',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(budget);
    const all = await repo.findAll();
    assert.deepEqual(all, [budget]);
  });

  it('findById returns budget', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    const budget = {
      id: 'budget-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 500,
      period: 'monthly',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(budget);
    const found = await repo.findById('budget-1');
    assert.deepEqual(found, budget);
  });

  it('findById returns null for missing budget', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('findByCategory filters correctly', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    await repo.save({
      id: 'budget-1', userId: 'user-1', categoryId: 'cat-1', amount: 500,
      period: 'monthly', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    await repo.save({
      id: 'budget-2', userId: 'user-1', categoryId: 'cat-2', amount: 300,
      period: 'monthly', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    const cat1 = await repo.findByCategory('cat-1');
    assert.strictEqual(cat1.length, 1);
    assert.strictEqual(cat1[0].id, 'budget-1');
  });

  it('archive sets archived=true', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    const budget = {
      id: 'budget-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 500,
      period: 'monthly',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(budget);
    await repo.archive('budget-1');
    const found = await repo.findById('budget-1');
    assert.strictEqual(found.archived, true);
  });

  it('user isolation: does not return another user budget', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    const budget = {
      id: 'budget-1',
      userId: 'user-2',
      categoryId: 'cat-1',
      amount: 500,
      period: 'monthly',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await storage.set('budget:user-2:budget-1', budget);
    const all = await repo.findAll();
    assert.strictEqual(all.length, 0);
  });

  it('save rejects OWNERSHIP_VIOLATION for mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new BudgetRepository(storage, 'user-1', () => storage.keys());
    const budget = {
      id: 'budget-1',
      userId: 'user-2',
      categoryId: 'cat-1',
      amount: 500,
      period: 'monthly',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    let thrown = false;
    try {
      await repo.save(budget);
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION');
  });
});