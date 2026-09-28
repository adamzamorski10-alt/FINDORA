import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository } from '../../../src/infrastructure/repositories/user-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('UserRepository', () => {
  it('save and findById returns user', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage, 'user-1');
    const user = {
      id: 'user-1',
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
        settings: {
          currency: 'PLN',
          theme: 'system',
          accent: 'purple',
          privacyMode: false,
          excludeInvestmentsFromNetWorth: false,
        },
    };
    await repo.save(user);
    const found = await repo.findById('user-1');
    assert.deepEqual(found, user);
  });

  it('findById returns null for missing user', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage, 'user-1');
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('save rejects for entity without id', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage, 'user-1');
    let thrown = false;
    try {
      await repo.save({});
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION');
  });

  it('save overwrites existing user', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage, 'user-1');
    const user = {
      id: 'user-1',
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      settings: { currency: 'PLN', theme: 'system', accent: 'purple', privacyMode: false, excludeInvestmentsFromNetWorth: false },
    };
    await repo.save(user);
    const updated = {
      ...user,
      settings: { ...user.settings, theme: 'dark' },
    };
    await repo.save(updated);
    const found = await repo.findById('user-1');
    assert.deepEqual(found, updated);
  });

  it('findById returns null for entity belonging to different user', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage, 'user-1');
    const otherUser = {
      id: 'user-2',
      userId: 'user-2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      settings: {},
    };
    await storage.set('user:user-2', otherUser);
    const found = await repo.findById('user-2');
    assert.strictEqual(found, null);
  });

  it('save rejects entity whose id does not match repository owner', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage, 'user-1');
    const otherUser = {
      id: 'user-2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      settings: {},
    };
    let thrown = false;
    try {
      await repo.save(otherUser);
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION for mismatched id');
  });
});