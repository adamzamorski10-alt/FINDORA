import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppKernel } from '../../src/application/app-kernel.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';

describe('AppKernel', () => {
  describe('construction', () => {
    it('creates a kernel with real MemoryStorageAdapter', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });
      assert.ok(kernel);
      assert.ok(kernel.persistence);
      assert.ok(kernel.state);
      assert.ok(kernel.modules);
      assert.ok(kernel.dispose);
    });

    it('throws VALIDATION_FAILED for missing storageAdapter', () => {
      let thrown = false;
      try {
        createAppKernel({ storageAdapter: null, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty userId', () => {
      let thrown = false;
      try {
        createAppKernel({ storageAdapter: {}, userId: '', openingBalanceCategoryId: 'cat-ob' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only userId', () => {
      let thrown = false;
      try {
        createAppKernel({ storageAdapter: {}, userId: '   ', openingBalanceCategoryId: 'cat-ob' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('persistence', () => {
    it('exposes persistence with all expected repositories', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      assert.ok(kernel.persistence.storage);
      assert.strictEqual(kernel.persistence.userId, 'user-1');
      assert.ok(kernel.persistence.userRepository);
      assert.ok(kernel.persistence.accountRepository);
      assert.ok(kernel.persistence.categoryRepository);
      assert.ok(kernel.persistence.transactionRepository);
      assert.ok(kernel.persistence.budgetRepository);
      assert.ok(kernel.persistence.goalRepository);
    });

    it('persistence initialize succeeds', async () => {
      const storage = new InMemoryStorageAdapter();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });
      await kernel.persistence.initialize();
      assert.ok(true);
    });
  });

  describe('modules', () => {
    it('exposes all eight G4 modules', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      assert.ok(kernel.modules.user);
      assert.ok(kernel.modules.account);
      assert.ok(kernel.modules.category);
      assert.ok(kernel.modules.transaction);
      assert.ok(kernel.modules.budget);
      assert.ok(kernel.modules.goal);
      assert.ok(kernel.modules.safeToSpend);
      assert.ok(kernel.modules.reporting);
    });

    it('modules operate through the same composed graph', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      const account = await kernel.modules.account.createAccount({
        userId: 'user-1',
        name: 'Shared',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      const fromAccount = await kernel.modules.account.getAccount({ accountId: account.id });
      const fromTx = await kernel.modules.transaction.getTransactionsByAccount({ accountId: account.id });

      assert.strictEqual(fromAccount.id, account.id);
      assert.strictEqual(fromTx.length, 0);
    });
  });

  describe('application state', () => {
    it('creates an independent ApplicationState instance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      assert.ok(kernel.state.getState);
      assert.ok(kernel.state.subscribe);
      assert.ok(kernel.state.dispatch);
      assert.ok(kernel.state.ActionTypes);
    });

    it('ApplicationState starts with initial lifecycle', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      assert.strictEqual(kernel.state.getState().lifecycle, 'initial');
    });
  });

  describe('isolation', () => {
    it('multiple kernel instances are isolated', async () => {
      const storageA = new InMemoryStorageAdapter();
      const storageB = new InMemoryStorageAdapter();
      await storageA.init();
      await storageB.init();

      const kernelA = createAppKernel({ storageAdapter: storageA, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });
      const kernelB = createAppKernel({ storageAdapter: storageB, userId: 'user-2', openingBalanceCategoryId: 'cat-ob' });

      assert.strictEqual(kernelA.persistence.userId, 'user-1');
      assert.strictEqual(kernelB.persistence.userId, 'user-2');

      const accountA = await kernelA.modules.account.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });
      const accountB = await kernelB.modules.account.createAccount({
        userId: 'user-2',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      assert.strictEqual(accountA.userId, 'user-1');
      assert.strictEqual(accountB.userId, 'user-2');
      assert.notStrictEqual(accountA.id, accountB.id);
    });

    it('does not create global state', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });
      assert.strictEqual(typeof globalThis.AppState, 'undefined');
      assert.strictEqual(typeof globalThis.AppKernel, 'undefined');
    });
  });

  describe('integration', () => {
    it('creates an account and retrieves it through composed modules', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      const created = await kernel.modules.account.createAccount({
        userId: 'user-1',
        name: 'My Account',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      const found = await kernel.modules.account.getAccount({ accountId: created.id });
      assert.strictEqual(found.id, created.id);
      assert.strictEqual(found.name, 'My Account');
    });

    it('propagates storage errors', async () => {
      class ThrowingStorage {
        async init() {}
        async get() { throw new Error('STORAGE_UNAVAILABLE'); }
        async set() {}
        async update() {}
        async remove() {}
        keys() { return []; }
        beginTransaction() { return {}; }
        commitTransaction() {}
        abortTransaction() {}
      }
      const kernel = createAppKernel({ storageAdapter: new ThrowingStorage(), userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });

      let thrown = false;
      try {
        await kernel.modules.user.getProfile({ userId: 'user-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });

  describe('dispose', () => {
    it('dispose is callable', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-1', openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        kernel.dispose();
      } catch (e) {
        thrown = true;
      }
      assert.ok(!thrown);
    });
  });
});
