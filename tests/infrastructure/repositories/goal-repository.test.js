import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GoalRepository } from '../../../src/infrastructure/repositories/goal-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('GoalRepository', () => {
  it('save and loadAll returns goal', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new GoalRepository(storage, 'user-1', () => storage.keys());
    const goal = {
      id: 'goal-1',
      userId: 'user-1',
      name: 'New Laptop',
      target: 5000,
      current: 0,
      currentLastRebuiltAt: null,
      deadline: '2024-12-31',
      icon: 'laptop',
      color: '#0000FF',
      priority: 'medium',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(goal);
    const all = await repo.loadAll();
    assert.deepEqual(all, [goal]);
  });

  it('findById returns goal', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new GoalRepository(storage, 'user-1', () => storage.keys());
    const goal = {
      id: 'goal-1',
      userId: 'user-1',
      name: 'New Laptop',
      target: 5000,
      current: 0,
      currentLastRebuiltAt: null,
      deadline: '2024-12-31',
      icon: 'laptop',
      color: '#0000FF',
      priority: 'medium',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(goal);
    const found = await repo.findById('goal-1');
    assert.deepEqual(found, goal);
  });

  it('findById returns null for missing goal', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new GoalRepository(storage, 'user-1', () => storage.keys());
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('archive sets archived=true', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new GoalRepository(storage, 'user-1', () => storage.keys());
    const goal = {
      id: 'goal-1',
      userId: 'user-1',
      name: 'New Laptop',
      target: 5000,
      current: 0,
      currentLastRebuiltAt: null,
      deadline: '2024-12-31',
      icon: 'laptop',
      color: '#0000FF',
      priority: 'medium',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(goal);
    await repo.archive('goal-1');
    const found = await repo.findById('goal-1');
    assert.strictEqual(found.archived, true);
  });

  it('user isolation: does not return another user goal', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new GoalRepository(storage, 'user-1', () => storage.keys());
    const goal = {
      id: 'goal-1',
      userId: 'user-2',
      name: 'Other',
      target: 1000,
      current: 0,
      currentLastRebuiltAt: null,
      deadline: null,
      icon: 'star',
      color: '#FF0000',
      priority: 'low',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await storage.set('goal:user-2:goal-1', goal);
    const all = await repo.loadAll();
    assert.strictEqual(all.length, 0);
  });

  it('save rejects OWNERSHIP_VIOLATION for mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new GoalRepository(storage, 'user-1', () => storage.keys());
    const goal = {
      id: 'goal-1',
      userId: 'user-2',
      name: 'Other',
      target: 1000,
      current: 0,
      currentLastRebuiltAt: null,
      deadline: null,
      icon: 'star',
      color: '#FF0000',
      priority: 'low',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    let thrown = false;
    try {
      await repo.save(goal);
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION');
  });
});