import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository } from '../../../src/infrastructure/repositories/user-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('UserRepository', () => {
  it('save and findById returns user', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage);
    const user = {
      id: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      settings: {
        currency: 'PLN',
        theme: 'system',
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
    const repo = new UserRepository(storage);
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('save rejects for entity without id', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new UserRepository(storage);
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
    const repo = new UserRepository(storage);
    const user = {
      id: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      settings: { currency: 'PLN', theme: 'system', privacyMode: false, excludeInvestmentsFromNetWorth: false },
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
});