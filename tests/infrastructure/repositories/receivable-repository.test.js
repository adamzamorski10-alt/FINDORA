import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PersonRepository } from '../../../src/infrastructure/repositories/person-repository.js';
import { ReceivableRepository } from '../../../src/infrastructure/repositories/receivable-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('PersonRepository', () => {
  it('loadAll returns empty array when no data', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new PersonRepository(storage, 'user-1', () => storage.keys());
    const result = await repo.loadAll();
    assert.deepStrictEqual(result, []);
  });

  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new PersonRepository(storage, 'user-1', () => storage.keys());
    const person = {
      id: 'person-1',
      userId: 'user-1',
      name: 'Jan',
      note: 'Test',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(person);
    const found = await repo.findById('person-1');
    assert.deepStrictEqual(found, person);
  });

  it('loadAll filters by userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo1 = new PersonRepository(storage, 'user-1', () => storage.keys());
    const repo2 = new PersonRepository(storage, 'user-2', () => storage.keys());
    await repo1.save({ id: 'p1', userId: 'user-1', name: 'A', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    await repo2.save({ id: 'p2', userId: 'user-2', name: 'B', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    const all = await repo1.loadAll();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].userId, 'user-1');
  });

  it('archive marks entity as archived', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new PersonRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'p1', userId: 'user-1', name: 'A', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    await repo.archive('p1');
    const found = await repo.findById('p1');
    assert.strictEqual(found.archived, true);
  });

  it('archive throws NOT_FOUND for missing id', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new PersonRepository(storage, 'user-1', () => storage.keys());
    await assert.rejects(() => repo.archive('nonexistent'), /NOT_FOUND/);
  });

  it('checkOwnership rejects mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new PersonRepository(storage, 'user-1', () => storage.keys());
    await assert.rejects(
      () => repo.save({ id: 'p1', userId: 'user-2', name: 'A', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }),
      /OWNERSHIP_VIOLATION/
    );
  });
});

describe('ReceivableRepository', () => {
  it('loadAll returns empty array when no data', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ReceivableRepository(storage, 'user-1', () => storage.keys());
    const result = await repo.loadAll();
    assert.deepStrictEqual(result, []);
  });

  it('save and findById roundtrip', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ReceivableRepository(storage, 'user-1', () => storage.keys());
    const receivable = {
      id: 'r1',
      userId: 'user-1',
      personId: 'person-1',
      amount: 100,
      remainingAmount: 100,
      description: 'Test',
      date: '2024-01-15',
      sourceAccountId: 'acc-1',
      dueDate: null,
      status: 'open',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(receivable);
    const found = await repo.findById('r1');
    assert.deepStrictEqual(found, receivable);
  });

  it('findByPerson filters by personId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ReceivableRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'r1', userId: 'user-1', personId: 'p1', amount: 100, remainingAmount: 100, description: 'A', date: '2024-01-15', sourceAccountId: 'acc-1', dueDate: null, status: 'open', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    await repo.save({ id: 'r2', userId: 'user-1', personId: 'p2', amount: 200, remainingAmount: 200, description: 'B', date: '2024-01-15', sourceAccountId: 'acc-1', dueDate: null, status: 'open', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    const forP1 = await repo.findByPerson('p1');
    assert.strictEqual(forP1.length, 1);
    assert.strictEqual(forP1[0].id, 'r1');
  });

  it('archive marks entity as archived', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ReceivableRepository(storage, 'user-1', () => storage.keys());
    await repo.save({ id: 'r1', userId: 'user-1', personId: 'p1', amount: 100, remainingAmount: 100, description: 'A', date: '2024-01-15', sourceAccountId: 'acc-1', dueDate: null, status: 'open', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
    await repo.archive('r1');
    const found = await repo.findById('r1');
    assert.strictEqual(found.archived, true);
  });

  it('archive throws NOT_FOUND for missing id', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ReceivableRepository(storage, 'user-1', () => storage.keys());
    await assert.rejects(() => repo.archive('nonexistent'), /NOT_FOUND/);
  });

  it('checkOwnership rejects mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new ReceivableRepository(storage, 'user-1', () => storage.keys());
    await assert.rejects(
      () => repo.save({ id: 'r1', userId: 'user-2', personId: 'p1', amount: 100, remainingAmount: 100, description: 'A', date: '2024-01-15', sourceAccountId: 'acc-1', dueDate: null, status: 'open', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }),
      /OWNERSHIP_VIOLATION/
    );
  });
});
