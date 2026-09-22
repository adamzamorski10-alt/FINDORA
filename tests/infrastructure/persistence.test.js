import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPersistence } from '../../src/infrastructure/persistence.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';

describe('createPersistence', () => {
  it('creates a persistence graph with all repositories', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const persistence = createPersistence({ storageAdapter: storage, userId: 'user-1' });

    assert.strictEqual(persistence.storage, storage);
    assert.strictEqual(persistence.userId, 'user-1');
    assert.ok(persistence.userRepository);
    assert.ok(persistence.accountRepository);
    assert.ok(persistence.categoryRepository);
    assert.ok(persistence.transactionRepository);
    assert.ok(persistence.budgetRepository);
    assert.ok(persistence.goalRepository);
  });

  it('propagates the same userId to all user-owned repositories', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const persistence = createPersistence({ storageAdapter: storage, userId: 'user-123' });

    assert.strictEqual(persistence.accountRepository.userId, 'user-123');
    assert.strictEqual(persistence.categoryRepository.userId, 'user-123');
    assert.strictEqual(persistence.transactionRepository.userId, 'user-123');
    assert.strictEqual(persistence.budgetRepository.userId, 'user-123');
    assert.strictEqual(persistence.goalRepository.userId, 'user-123');
  });

  it('wires repositories to use the injected storage adapter', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const persistence = createPersistence({ storageAdapter: storage, userId: 'user-1' });

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
    await persistence.accountRepository.save(account);
    const found = await persistence.accountRepository.findById('acc-1');
    assert.deepEqual(found, account);
  });

  it('supports two independent persistence graphs with isolation', async () => {
    const storageA = new InMemoryStorageAdapter();
    await storageA.init();
    const storageB = new InMemoryStorageAdapter();
    await storageB.init();

    const graphA = createPersistence({ storageAdapter: storageA, userId: 'user-A' });
    const graphB = createPersistence({ storageAdapter: storageB, userId: 'user-B' });

    await graphA.accountRepository.save({
      id: 'acc-1',
      userId: 'user-A',
      name: 'Account A',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    await graphB.accountRepository.save({
      id: 'acc-1',
      userId: 'user-B',
      name: 'Account B',
      type: 'bank',
      icon: 'landmark',
      color: '#FF0000',
      archived: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    const aAccounts = await graphA.accountRepository.loadAll();
    const bAccounts = await graphB.accountRepository.loadAll();

    assert.strictEqual(aAccounts.length, 1);
    assert.strictEqual(aAccounts[0].name, 'Account A');
    assert.strictEqual(bAccounts.length, 1);
    assert.strictEqual(bAccounts[0].name, 'Account B');
  });

  it('delegates initialize to the storage adapter', async () => {
    const storage = new InMemoryStorageAdapter();
    const persistence = createPersistence({ storageAdapter: storage, userId: 'user-1' });
    await persistence.initialize();
    assert.ok(true);
  });
});