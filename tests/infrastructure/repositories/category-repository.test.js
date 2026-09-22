import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('CategoryRepository', () => {
  it('save and loadAll returns category', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const category = {
      id: 'cat-1',
      userId: 'user-1',
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(category);
    const all = await repo.loadAll();
    assert.deepEqual(all, [category]);
  });

  it('findById returns category', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const category = {
      id: 'cat-1',
      userId: 'user-1',
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(category);
    const found = await repo.findById('cat-1');
    assert.deepEqual(found, category);
  });

  it('findById returns null for missing category', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('findSystem returns only system categories', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const system = {
      id: 'cat-sys',
      userId: 'user-1',
      name: 'Savings',
      type: 'expense',
      icon: 'piggy-bank',
      color: '#00FF00',
      parentId: null,
      isSystem: true,
      systemRole: 'savings',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const userCat = {
      id: 'cat-user',
      userId: 'user-1',
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(system);
    await repo.save(userCat);
    const systemCats = await repo.findSystem();
    assert.deepEqual(systemCats, [system]);
  });

  it('archive sets archived=true', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const category = {
      id: 'cat-1',
      userId: 'user-1',
      name: 'Food',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(category);
    await repo.archive('cat-1');
    const found = await repo.findById('cat-1');
    assert.strictEqual(found.archived, true);
  });

  it('user isolation: does not return another user category', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const category = {
      id: 'cat-1',
      userId: 'user-2',
      name: 'Other',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await storage.set('category:user-2:cat-1', category);
    const all = await repo.loadAll();
    assert.strictEqual(all.length, 0);
  });

  it('save rejects OWNERSHIP_VIOLATION for mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new CategoryRepository(storage, 'user-1', () => storage.keys());
    const category = {
      id: 'cat-1',
      userId: 'user-2',
      name: 'Other',
      type: 'expense',
      icon: 'utensils',
      color: '#FF0000',
      parentId: null,
      isSystem: false,
      systemRole: null,
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    let thrown = false;
    try {
      await repo.save(category);
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION');
  });
});