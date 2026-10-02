import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAccountModule } from '../../../src/application/account/account-module.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

describe('AccountModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createAccountModule({
        accountRepository: {},
        transactionRepository: {},
        applicationTransaction: { run: async (fn) => fn() },
        openingBalanceCategoryId: 'cat-ob',
      });
      assert.ok(module);
      assert.strictEqual(typeof module.createAccount, 'function');
      assert.strictEqual(typeof module.getAccount, 'function');
      assert.strictEqual(typeof module.getActiveAccounts, 'function');
      assert.strictEqual(typeof module.updateAccount, 'function');
      assert.strictEqual(typeof module.archiveAccount, 'function');
    });
  });

  describe('createAccount', () => {
    it('creates account with valid input', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      const account = await module.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      assert.strictEqual(account.userId, 'user-1');
      assert.strictEqual(account.name, 'Konto');
      assert.strictEqual(account.type, 'bank');
      assert.strictEqual(account.archived, false);
      assert.ok(account.id);
      assert.ok(account.createdAt);
      assert.ok(account.updatedAt);
    });

    it('creates opening-balance income transaction for positive balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      const account = await module.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        openingBalance: 500,
      });

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].type, 'income');
      assert.strictEqual(txs[0].amount, 500);
      assert.strictEqual(txs[0].metadata.openingBalance, true);
      assert.strictEqual(txs[0].accountId, account.id);
    });

    it('creates opening-balance transaction for decimal positive balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      const account = await module.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        openingBalance: 214.93,
      });

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].type, 'income');
      assert.strictEqual(txs[0].amount, 214.93);
      assert.strictEqual(txs[0].metadata.openingBalance, true);
      assert.strictEqual(txs[0].accountId, account.id);
    });

    it('creates opening-balance transaction for decimal negative balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      const account = await module.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        openingBalance: -100.50,
      });

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].type, 'expense');
      assert.strictEqual(txs[0].amount, 100.50);
      assert.strictEqual(txs[0].metadata.openingBalance, true);
    });

    it('does not create transaction for zero opening balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      const account = await module.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        openingBalance: -200,
      });

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].type, 'expense');
      assert.strictEqual(txs[0].amount, 200);
      assert.strictEqual(txs[0].metadata.openingBalance, true);
    });

    it('does not create transaction for zero opening balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      await module.createAccount({
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        openingBalance: 0,
      });

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty name', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: '', type: 'bank', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid type', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'investment', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for arbitrary invalid type', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'foo', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only userId', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: '   ', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only name', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: '   ', type: 'bank', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for whitespace-only icon', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: '   ', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for NaN opening balance', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: NaN });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for Infinity opening balance', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: Infinity });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('accepts lowercase hex color', async () => {
      const module = createAccountModule({
        accountRepository: { save: async () => {}, loadAll: async () => [] },
        transactionRepository: { save: async () => {}, loadAll: async () => [] },
        applicationTransaction: { run: async (fn) => fn() },
        openingBalanceCategoryId: 'cat-ob',
      });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#ff0000' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(!thrown);
    });

    it('does not leave partial state when opening-balance transaction fails', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const failingTxRepo = {
        ...txRepo,
        save: async () => { throw new Error('STORAGE_UNAVAILABLE'); }
      };
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: failingTxRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      try {
        await module.createAccount({
          userId: 'user-1',
          name: 'Konto',
          type: 'bank',
          icon: 'landmark',
          color: '#0000FF',
          openingBalance: 100,
        });
      } catch (e) {
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }

      const accounts = await accountRepo.loadAll();
      assert.strictEqual(accounts.length, 0);
      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });

    it('throws VALIDATION_FAILED for invalid color', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: 'red' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for non-finite openingBalance', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', openingBalance: NaN });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const appTx = { run: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.createAccount({ userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('seeds default accounts when no accounts exist', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      await module.createAccount({
        userId: 'user-1',
        name: 'Custom',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      const allAccounts = await accountRepo.loadAll();
      const names = allAccounts.map(a => a.name).sort();
      assert.deepStrictEqual(names, ['Custom', 'Inne', 'Konto', 'Skarbonka']);

      const konto = allAccounts.find(a => a.name === 'Konto');
      assert.strictEqual(konto.type, 'bank');
      assert.strictEqual(konto.userId, 'user-1');

      const skarbonka = allAccounts.find(a => a.name === 'Skarbonka');
      assert.strictEqual(skarbonka.type, 'savings');
      assert.strictEqual(skarbonka.userId, 'user-1');

      const inne = allAccounts.find(a => a.name === 'Inne');
      assert.strictEqual(inne.type, 'cash');
      assert.strictEqual(inne.userId, 'user-1');
    });

    it('does not duplicate existing default accounts', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      await accountRepo.save({
        id: 'existing-konto',
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: '🏦',
        color: '#4A90D9',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      await module.createAccount({
        userId: 'user-1',
        name: 'Custom',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      const allAccounts = await accountRepo.loadAll();
      assert.strictEqual(allAccounts.length, 4);
      const konto = allAccounts.find(a => a.name === 'Konto');
      assert.strictEqual(konto.id, 'existing-konto');
    });

    it('does not seed defaults when they already exist', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });

      await accountRepo.save({
        id: 'konto-1',
        userId: 'user-1',
        name: 'Konto',
        type: 'bank',
        icon: '🏦',
        color: '#4A90D9',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      await accountRepo.save({
        id: 'skarbonka-1',
        userId: 'user-1',
        name: 'Skarbonka',
        type: 'savings',
        icon: '💰',
        color: '#50C878',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      await accountRepo.save({
        id: 'inne-1',
        userId: 'user-1',
        name: 'Inne',
        type: 'cash',
        icon: '💼',
        color: '#888888',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      await module.createAccount({
        userId: 'user-1',
        name: 'Custom',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      const allAccounts = await accountRepo.loadAll();
      assert.strictEqual(allAccounts.length, 4);
    });
  });

  describe('getAccount', () => {
    it('returns account when found', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);
      const found = await module.getAccount({ accountId: 'acc-1' });
      assert.deepEqual(found, account);
    });

    it('returns null for missing account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const found = await module.getAccount({ accountId: 'missing' });
      assert.strictEqual(found, null);
    });

    it('returns null for account owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const otherRepo = new AccountRepository(storage, 'user-2', () => storage.keys());
      await otherRepo.save({ id: 'acc-2', userId: 'user-2', name: 'Other', type: 'bank', icon: 'landmark', color: '#FF0000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const found = await module.getAccount({ accountId: 'acc-2' });
      assert.strictEqual(found, null);
    });

    it('throws VALIDATION_FAILED for empty accountId', async () => {
      const module = createAccountModule({ accountRepository: {}, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.getAccount({ accountId: '' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('getActiveAccounts', () => {
    it('returns only non-archived accounts', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Active', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-2', userId: 'user-1', name: 'Archived', type: 'bank', icon: 'landmark', color: '#FF0000', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const active = await module.getActiveAccounts({ userId: 'user-1' });
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].id, 'acc-1');
    });

    it('returns empty array when no active accounts', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const active = await module.getActiveAccounts({ userId: 'user-1' });
      assert.deepEqual(active, []);
    });

    it('does not return accounts owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const otherRepo = new AccountRepository(storage, 'user-2', () => storage.keys());
      await otherRepo.save({ id: 'acc-other', userId: 'user-2', name: 'Other', type: 'bank', icon: 'landmark', color: '#FF0000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const active = await module.getActiveAccounts({ userId: 'user-1' });
      assert.strictEqual(active.length, 0);
    });
  });

  describe('updateAccount', () => {
    it('updates mutable fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const updated = await module.updateAccount({ accountId: 'acc-1', updates: { name: 'Nowe Konto', color: '#FF0000' } });
      assert.strictEqual(updated.name, 'Nowe Konto');
      assert.strictEqual(updated.color, '#FF0000');
      assert.strictEqual(updated.type, 'bank');
      assert.strictEqual(updated.id, 'acc-1');
    });

    it('preserves immutable fields on update', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const updated = await module.updateAccount({ accountId: 'acc-1', updates: { name: 'Nowe Konto' } });
      assert.strictEqual(updated.id, 'acc-1');
      assert.strictEqual(updated.userId, 'user-1');
      assert.strictEqual(updated.archived, true);
      assert.strictEqual(updated.createdAt, '2024-01-01T00:00:00Z');
    });

    it('throws NOT_FOUND for missing account', async () => {
      const accountRepo = { findById: async () => null };
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.updateAccount({ accountId: 'missing', updates: { name: 'X' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('rejects investment type', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      let thrown = false;
      try {
        await module.updateAccount({ accountId: 'acc-1', updates: { type: 'investment' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const accountRepo = { findById: async () => ({ id: 'acc-1' }), save: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.updateAccount({ accountId: 'acc-1', updates: { name: 'X' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });

  describe('archiveAccount', () => {
    it('archives an active account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const archived = await module.archiveAccount({ accountId: 'acc-1' });
      assert.strictEqual(archived.archived, true);
      assert.ok(archived.updatedAt > '2024-01-01T00:00:00Z');
    });

    it('is idempotent for already archived account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const result = await module.archiveAccount({ accountId: 'acc-1' });
      assert.strictEqual(result.archived, true);
    });

    it('throws NOT_FOUND for missing account', async () => {
      const accountRepo = { findById: async () => null };
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.archiveAccount({ accountId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const accountRepo = { findById: async () => ({ id: 'acc-1', archived: false }), save: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createAccountModule({ accountRepository: accountRepo, transactionRepository: {}, applicationTransaction: { run: async (fn) => fn() }, openingBalanceCategoryId: 'cat-ob' });
      let thrown = false;
      try {
        await module.archiveAccount({ accountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });
});