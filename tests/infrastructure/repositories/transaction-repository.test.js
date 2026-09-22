import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('TransactionRepository', () => {
  it('save and loadAll returns transaction', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    const tx = {
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'acc-1',
      amount: 100,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Test',
      date: '2024-01-15',
      notes: '',
      metadata: {},
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(tx);
    const all = await repo.loadAll();
    assert.deepEqual(all, [tx]);
  });

  it('findById returns transaction', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    const tx = {
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'acc-1',
      amount: 100,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Test',
      date: '2024-01-15',
      notes: '',
      metadata: {},
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(tx);
    const found = await repo.findById('tx-1');
    assert.deepEqual(found, tx);
  });

  it('findById returns null for missing transaction', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('findByMonth filters correctly', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    await repo.save({
      id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    await repo.save({
      id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2024-02-15', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    await repo.save({
      id: 'tx-3', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2024-01-31', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    const jan = await repo.findByMonth('2024-01');
    assert.strictEqual(jan.length, 2);
  });

  it('findByMonth respects year boundary', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    await repo.save({
      id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2023-12-31', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    await repo.save({
      id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2024-01-01', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    const jan = await repo.findByMonth('2024-01');
    assert.strictEqual(jan.length, 1);
    assert.strictEqual(jan[0].date, '2024-01-01');
  });

  it('findByAccount filters correctly', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    await repo.save({
      id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    await repo.save({
      id: 'tx-2', userId: 'user-1', accountId: 'acc-2', amount: 100, type: 'expense',
      categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {},
      archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    const acc1 = await repo.findByAccount('acc-1');
    assert.strictEqual(acc1.length, 1);
    assert.strictEqual(acc1[0].id, 'tx-1');
  });

  it('archive sets archived=true', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    const tx = {
      id: 'tx-1',
      userId: 'user-1',
      accountId: 'acc-1',
      amount: 100,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Test',
      date: '2024-01-15',
      notes: '',
      metadata: {},
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(tx);
    await repo.archive('tx-1');
    const found = await repo.findById('tx-1');
    assert.strictEqual(found.archived, true);
  });

  it('user isolation: does not return another user transaction', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    const tx = {
      id: 'tx-1',
      userId: 'user-2',
      accountId: 'acc-1',
      amount: 100,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Test',
      date: '2024-01-15',
      notes: '',
      metadata: {},
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await storage.set('transaction:user-2:tx-1', tx);
    const all = await repo.loadAll();
    assert.strictEqual(all.length, 0);
  });

  it('save rejects OWNERSHIP_VIOLATION for mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new TransactionRepository(storage, 'user-1', () => storage.keys());
    const tx = {
      id: 'tx-1',
      userId: 'user-2',
      accountId: 'acc-1',
      amount: 100,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Test',
      date: '2024-01-15',
      notes: '',
      metadata: {},
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    let thrown = false;
    try {
      await repo.save(tx);
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION');
  });
});