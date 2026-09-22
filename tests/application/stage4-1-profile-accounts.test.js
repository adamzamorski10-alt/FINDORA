import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createUserModule } from '../../src/application/user/user-module.js';
import { createAccountModule } from '../../src/application/account/account-module.js';
import { UserRepository } from '../../src/infrastructure/repositories/user-repository.js';
import { AccountRepository } from '../../src/infrastructure/repositories/account-repository.js';
import { TransactionRepository } from '../../src/infrastructure/repositories/transaction-repository.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../src/infrastructure/storage/application-transaction.js';
import { createApplicationState } from '../../src/state/application-state-factory.js';

describe('Stage 4.1 — Profile + Accounts', () => {
  describe('profile bootstrap', () => {
    it('creates profile when missing', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const userRepo = new UserRepository(storage);
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const userModule = createUserModule({ userRepository: userRepo });
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      state.dispatch({ type: 'SET_USER_ID', userId: 'user-1' });
      state.dispatch({ type: 'SET_PROFILE_LOADING', loading: true });

      let profile;
      try {
        profile = await userModule.getProfile({ userId: 'user-1' });
      } catch (e) {
        if (e.message === 'NOT_FOUND') {
          profile = await userModule.createProfile({
            userId: 'user-1',
            settings: { currency: 'PLN', theme: 'system', privacyMode: false, excludeInvestmentsFromNetWorth: false },
          });
        } else {
          throw e;
        }
      }

      state.dispatch({ type: 'SET_USER_PROFILE', profile });

      assert.strictEqual(state.getState().session.profile.id, 'user-1');
      assert.strictEqual(state.getState().session.profile.settings.currency, 'PLN');
      assert.strictEqual(state.getState().session.profileLoading, false);
    });

    it('loads existing profile', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const userRepo = new UserRepository(storage);
      await userRepo.save({
        id: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        settings: { currency: 'EUR', theme: 'dark', privacyMode: true, excludeInvestmentsFromNetWorth: false },
      });

      const userModule = createUserModule({ userRepository: userRepo });
      const state = createApplicationState();

      const profile = await userModule.getProfile({ userId: 'user-1' });
      state.dispatch({ type: 'SET_USER_PROFILE', profile });

      assert.strictEqual(state.getState().session.profile.settings.currency, 'EUR');
    });

    it('transitions lifecycle through initialization', async () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'initializing' });
      assert.strictEqual(state.getState().lifecycle, 'initializing');
      state.dispatch({ type: 'SET_LIFECYCLE', lifecycle: 'ready' });
      assert.strictEqual(state.getState().lifecycle, 'ready');
    });

    it('enters error state on profile failure', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const userRepo = new UserRepository(storage);
      const userModule = createUserModule({ userRepository: userRepo });
      const state = createApplicationState();

      state.dispatch({ type: 'SET_USER_ID', userId: 'user-1' });
      state.dispatch({ type: 'SET_PROFILE_LOADING', loading: true });

      try {
        await userModule.getProfile({ userId: 'user-1' });
      } catch (e) {
        state.dispatch({ type: 'SET_PROFILE_ERROR', error: e.message });
      }

      assert.strictEqual(state.getState().session.profileError, 'NOT_FOUND');
      assert.strictEqual(state.getState().session.profileLoading, false);
    });
  });

  describe('account loading', () => {
    it('loads active accounts after profile init', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      state.dispatch({ type: 'SET_ACCOUNTS_LOADING', loading: true });
      const accounts = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts });
      state.dispatch({ type: 'SET_ACCOUNTS_LOADING', loading: false });

      assert.strictEqual(state.getState().accounts.loading, false);
      assert.ok(state.getState().accounts.items.some(a => a.name === 'Konto'));
    });

    it('excludes archived accounts from active list', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Active', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-2', userId: 'user-1', name: 'Archived', type: 'bank', icon: 'landmark', color: '#FF0000', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const accounts = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts });

      assert.strictEqual(state.getState().accounts.items.length, 1);
      assert.strictEqual(state.getState().accounts.items[0].name, 'Active');
    });

    it('represents empty account list', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      const accounts = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts });

      assert.strictEqual(state.getState().accounts.items.length, 0);
      assert.strictEqual(state.getState().accounts.error, null);
    });

    it('propagates account loading error', async () => {
      const state = createApplicationState();
      state.dispatch({ type: 'SET_ACCOUNTS_ERROR', error: 'STORAGE_UNAVAILABLE' });
      assert.strictEqual(state.getState().accounts.error, 'STORAGE_UNAVAILABLE');
      assert.strictEqual(state.getState().accounts.loading, false);
    });
  });

  describe('account creation', () => {
    it('creates account and refreshes list', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      state.dispatch({ type: 'SET_ACCOUNTS_LOADING', loading: true });
      const created = await accountModule.createAccount({
        userId: 'user-1',
        name: 'New Account',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });
      const refreshed = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });
      state.dispatch({ type: 'SET_ACCOUNTS_LOADING', loading: false });

      assert.ok(state.getState().accounts.items.some(a => a.name === 'New Account'));
      assert.ok(created.id);
    });

    it('validates account creation errors', async () => {
      const module = createAccountModule({
        accountRepository: {},
        transactionRepository: {},
        applicationTransaction: { run: async (fn) => fn() },
        openingBalanceCategoryId: 'cat-ob',
      });

      let thrown = false;
      try {
        await module.createAccount({ userId: '', name: 'Test', type: 'bank', icon: 'landmark', color: '#0000FF' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('account update', () => {
    it('updates account and refreshes list', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      const created = await accountModule.createAccount({
        userId: 'user-1',
        name: 'Old Name',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });

      const updated = await accountModule.updateAccount({
        accountId: created.id,
        updates: { name: 'New Name', color: '#FF0000' },
      });

      const refreshed = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });

      assert.strictEqual(state.getState().accounts.items[0].name, 'New Name');
      assert.strictEqual(updated.color, '#FF0000');
    });
  });

  describe('account archive', () => {
    it('archives account and removes from active list', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const accountModule = createAccountModule({ accountRepository: accountRepo, transactionRepository: txRepo, applicationTransaction: appTx, openingBalanceCategoryId: 'cat-ob' });
      const state = createApplicationState();

      const account = await accountModule.createAccount({
        userId: 'user-1',
        name: 'Unique Account',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
      });
      const afterCreate = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts: afterCreate });

      const initialCount = state.getState().accounts.items.length;
      assert.ok(initialCount >= 1);

      await accountModule.archiveAccount({ accountId: account.id });

      const refreshed = await accountModule.getActiveAccounts({ userId: 'user-1' });
      state.dispatch({ type: 'SET_ACCOUNTS', accounts: refreshed });

      assert.strictEqual(state.getState().accounts.items.length, initialCount - 1);
      assert.ok(!state.getState().accounts.items.some(a => a.id === account.id));
    });
  });

  describe('UI boundary', () => {
    it('views do not import repositories or storage', async () => {
      const fs = await import('fs');
      const viewsSource = fs.readFileSync('src/ui/views/accounts.js', 'utf8');
      assert.ok(!viewsSource.includes('accountRepository'));
      assert.ok(!viewsSource.includes('transactionRepository'));
      assert.ok(!viewsSource.includes('StorageAdapter'));
      assert.ok(!viewsSource.includes('IndexedDB'));
      assert.ok(!viewsSource.includes('localStorage'));
      assert.ok(!viewsSource.includes('window.'));
      assert.ok(!viewsSource.includes('dbData'));
      assert.ok(!viewsSource.includes('currentUser'));
    });
  });
});
