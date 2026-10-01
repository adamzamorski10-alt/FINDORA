import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PersonRepository } from '../../../src/infrastructure/repositories/person-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('PersonRepository (new API)', () => {
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
