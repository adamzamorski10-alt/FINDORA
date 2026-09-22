import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTransactionModule } from '../../src/application/transaction/transaction-module.js';
import { TransactionRepository } from '../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../src/infrastructure/repositories/account-repository.js';
import { CategoryRepository } from '../../src/infrastructure/repositories/category-repository.js';
import { GoalRepository } from '../../src/infrastructure/repositories/goal-repository.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../src/infrastructure/storage/application-transaction.js';
import { createApplicationState } from '../../src/state/application-state-factory.js';

class FakeGoalAdjuster {
  async adjust() {}
}

describe('Stage 4.2 — Transactions', () => {
  describe('transaction creation', () => {
    it('creates a transaction and loads by month', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createTransactionModule({
        transactionRepository: txRepo,
        accountRepository: accountRepo,
        categoryRepository: categoryRepo,
        goalRepository: goalRepo,
        goalCurrentAdjuster: new FakeGoalAdjuster(),
        applicationTransaction: appTx,
      });
      const state = createApplicationState();

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const created = await module.createTransaction({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 100,
        type: 'income',
        description: 'Salary',
        date: '2024-09-01',
      });

      assert.ok(created.id);
      assert.strictEqual(created.amount, 100);

      const monthTx = await module.getTransactionsByMonth({ userId: 'user-1', monthKey: '2024-09' });
      assert.ok(monthTx.some(t => t.id === created.id));
    });

    it('validates required fields', async () => {
      const module = createTransactionModule({
        transactionRepository: {},
        accountRepository: {},
        categoryRepository: {},
        goalRepository: {},
        goalCurrentAdjuster: new FakeGoalAdjuster(),
        applicationTransaction: { run: async (fn) => fn() },
      });

      let thrown = false;
      try {
        await module.createTransaction({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('transaction state wiring', () => {
    it('loads transactions into state', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createTransactionModule({
        transactionRepository: txRepo,
        accountRepository: accountRepo,
        categoryRepository: categoryRepo,
        goalRepository: goalRepo,
        goalCurrentAdjuster: new FakeGoalAdjuster(),
        applicationTransaction: appTx,
      });
      const state = createApplicationState();

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 50, type: 'expense', description: 'Lunch', date: '2024-09-15' });

      state.dispatch({ type: 'SET_TRANSACTIONS_LOADING', loading: true });
      const txs = await module.getTransactionsByMonth({ userId: 'user-1', monthKey: '2024-09' });
      state.dispatch({ type: 'SET_TRANSACTIONS', transactions: txs });
      state.dispatch({ type: 'SET_TRANSACTIONS_LOADING', loading: false });

      assert.strictEqual(state.getState().transactions.loading, false);
      assert.ok(state.getState().transactions.items.some(t => t.description === 'Lunch'));
    });

    it('supports transaction form workflow', () => {
      const state = createApplicationState();

      state.dispatch({ type: 'SET_TRANSACTION_FORM', form: { accountId: 'acc-1', amount: '25', type: 'expense' } });
      assert.strictEqual(state.getState().transactionForm.accountId, 'acc-1');
      assert.strictEqual(state.getState().transactionForm.amount, '25');

      state.dispatch({ type: 'RESET_TRANSACTION_FORM' });
      assert.strictEqual(state.getState().transactionForm.accountId, '');
      assert.strictEqual(state.getState().transactionForm.type, 'expense');
    });
  });
});
