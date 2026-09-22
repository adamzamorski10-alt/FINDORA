import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('AccountRepository', () => {
  it('save and loadAll returns account', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Konto',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(account);
    const all = await repo.loadAll();
    assert.deepEqual(all, [account]);
  });

  it('findById returns account', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Konto',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(account);
    const found = await repo.findById('acc-1');
    assert.deepEqual(found, account);
  });

  it('findById returns null for missing account', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const found = await repo.findById('missing');
    assert.strictEqual(found, null);
  });

  it('archive sets archived=true', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Konto',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(account);
    await repo.archive('acc-1');
    const found = await repo.findById('acc-1');
    assert.strictEqual(found.archived, true);
  });

  it('loadAll returns archived accounts', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const account = {
      id: 'acc-1',
      userId: 'user-1',
      name: 'Konto',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await repo.save(account);
    const all = await repo.loadAll();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].archived, true);
  });

  it('user isolation: does not return another user account', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const account = {
      id: 'acc-1',
      userId: 'user-2',
      name: 'Other',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    await storage.set('account:user-2:acc-1', account);
    const all = await repo.loadAll();
    assert.strictEqual(all.length, 0);
  });

  it('save rejects OWNERSHIP_VIOLATION for mismatched userId', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const repo = new AccountRepository(storage, 'user-1', () => storage.keys());
    const account = {
      id: 'acc-1',
      userId: 'user-2',
      name: 'Other',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    let thrown = false;
    try {
      await repo.save(account);
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
    }
    assert.ok(thrown, 'Expected OWNERSHIP_VIOLATION');
  });
});