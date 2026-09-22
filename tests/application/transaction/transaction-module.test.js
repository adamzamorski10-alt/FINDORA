import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTransactionModule } from '../../../src/application/transaction/transaction-module.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { GoalRepository } from '../../../src/infrastructure/repositories/goal-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

function createModule(deps) {
  return createTransactionModule({
    transactionRepository: deps.txRepo,
    accountRepository: deps.accountRepo,
    categoryRepository: deps.categoryRepo,
    goalRepository: deps.goalRepo,
    goalCurrentAdjuster: deps.goalCurrentAdjuster || deps.goalAdjuster,
    applicationTransaction: deps.applicationTransaction || deps.appTx,
  });
}

describe('TransactionModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createModule({
        transactionRepository: {},
        accountRepository: {},
        categoryRepository: {},
        goalRepository: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      assert.ok(module);
      assert.strictEqual(typeof module.createTransaction, 'function');
      assert.strictEqual(typeof module.updateTransaction, 'function');
      assert.strictEqual(typeof module.archiveTransaction, 'function');
      assert.strictEqual(typeof module.getTransactionsByMonth, 'function');
      assert.strictEqual(typeof module.getTransactionsByAccount, 'function');
    });
  });

  describe('createTransaction', () => {
    it('creates transaction with valid input', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const tx = await module.createTransaction({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 100,
        type: 'expense',
        categoryId: 'cat-1',
        description: 'Test',
        date: '2024-01-15',
      });

      assert.strictEqual(tx.userId, 'user-1');
      assert.strictEqual(tx.accountId, 'acc-1');
      assert.strictEqual(tx.amount, 100);
      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.categoryId, 'cat-1');
      assert.strictEqual(tx.description, 'Test');
      assert.strictEqual(tx.date, '2024-01-15');
      assert.strictEqual(tx.notes, '');
      assert.deepEqual(tx.metadata, {});
      assert.strictEqual(tx.archived, false);
      assert.ok(tx.id);
      assert.ok(tx.createdAt);
      assert.ok(tx.updatedAt);
    });

    it('normalizes omitted categoryId to null', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const tx = await module.createTransaction({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 100,
        type: 'expense',
        description: 'Test',
        date: '2024-01-15',
      });

      assert.strictEqual(tx.categoryId, null);
    });

    it('allows income transaction with income category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-income', userId: 'user-1', name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const tx = await module.createTransaction({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 100,
        type: 'income',
        categoryId: 'cat-income',
        description: 'Salary',
        date: '2024-01-15',
      });

      assert.strictEqual(tx.type, 'income');
      assert.strictEqual(tx.categoryId, 'cat-income');
    });

    it('allows expense transaction with expense category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-expense', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const tx = await module.createTransaction({
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 100,
        type: 'expense',
        categoryId: 'cat-expense',
        description: 'Groceries',
        date: '2024-01-15',
      });

      assert.strictEqual(tx.type, 'expense');
      assert.strictEqual(tx.categoryId, 'cat-expense');
    });

    it('rejects income transaction with expense category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-expense', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({
          userId: 'user-1',
          accountId: 'acc-1',
          amount: 100,
          type: 'income',
          categoryId: 'cat-expense',
          description: 'Test',
          date: '2024-01-15',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('rejects expense transaction with income category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-income', userId: 'user-1', name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({
          userId: 'user-1',
          accountId: 'acc-1',
          amount: 100,
          type: 'expense',
          categoryId: 'cat-income',
          description: 'Test',
          date: '2024-01-15',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ accountId: 'acc-1', amount: 100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for missing accountId', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', amount: 100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for zero amount', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 0, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for negative amount', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: -100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid type', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'transfer', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid date', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', description: 'Test', date: 'not-a-date' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for description exceeding 500 chars', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', description: 'a'.repeat(501), date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws NOT_FOUND for missing account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'missing', amount: 100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws ARCHIVED_ENTITY for archived account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);
    });

    it('returns NOT_FOUND for account not visible to current user scope', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await storage.set('account:user-2:acc-2', { id: 'acc-2', userId: 'user-2', name: 'Other', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-2', amount: 100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws NOT_FOUND for missing category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'missing', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for archived category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for goal contribution without savings category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 0, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', metadata: { goalId: 'goal-1' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for goal contribution with income type', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 0, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'income', categoryId: 'cat-savings', description: 'Test', date: '2024-01-15', metadata: { goalId: 'goal-1' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('creates goal contribution and adjusts Goal.current atomically', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = {
        adjust: async (goalId, delta) => {
          goalAdjustments.push({ goalId, delta });
          const goal = await goalRepo.findById(goalId);
          goal.current = (goal.current || 0) + delta;
          await goalRepo.save(goal);
        },
      };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 0, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const tx = await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', metadata: { goalId: 'goal-1' } });

      assert.strictEqual(tx.metadata.goalId, 'goal-1');
      const goal = await goalRepo.findById('goal-1');
      assert.strictEqual(goal.current, 100);
      assert.deepEqual(goalAdjustments, [{ goalId: 'goal-1', delta: 100 }]);
    });

    it('does not adjust Goal.current for non-goal transaction', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = { adjust: async (goalId, delta) => { goalAdjustments.push({ goalId, delta }); } };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15' });

      assert.deepEqual(goalAdjustments, []);
    });

    it('rolls back transaction when goal adjustment fails', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjuster = { adjust: async () => { throw new Error('GOAL_ERROR'); } };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 0, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', metadata: { goalId: 'goal-1' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'GOAL_ERROR');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
      const goal = await goalRepo.findById('goal-1');
      assert.strictEqual(goal.current, 0);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const txRepo = { save: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createModule({
        txRepo,
        accountRepo: { findById: async () => ({ id: 'acc-1', userId: 'user-1', archived: false }) },
        categoryRepo: { findById: async () => ({ id: 'cat-1', userId: 'user-1', archived: false, systemRole: null }) },
        goalRepo: { findById: async () => ({ id: 'goal-1', userId: 'user-1' }) },
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.createTransaction({ userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', description: 'Test', date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });

  describe('updateTransaction', () => {
    it('updates mutable fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Old', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const updated = await module.updateTransaction({ transactionId: 'tx-1', updates: { description: 'New', amount: 200 } });
      assert.strictEqual(updated.description, 'New');
      assert.strictEqual(updated.amount, 200);
      assert.strictEqual(updated.id, 'tx-1');
      assert.strictEqual(updated.userId, 'user-1');
    });

    it('preserves immutable fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Old', date: '2024-01-15', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const updated = await module.updateTransaction({ transactionId: 'tx-1', updates: { description: 'New' } });
      assert.strictEqual(updated.id, 'tx-1');
      assert.strictEqual(updated.userId, 'user-1');
      assert.strictEqual(updated.archived, true);
      assert.strictEqual(updated.createdAt, '2024-01-01T00:00:00Z');
    });

    it('throws NOT_FOUND for missing transaction', async () => {
      const module = createModule({
        txRepo: { findById: async () => null },
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.updateTransaction({ transactionId: 'missing', updates: { description: 'New' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('rejects opening balance update', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.updateTransaction({ transactionId: 'tx-1', updates: { description: 'Changed' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('adjusts Goal.current when goal contribution amount changes', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = {
        adjust: async (goalId, delta) => {
          goalAdjustments.push({ goalId, delta });
          const goal = await goalRepo.findById(goalId);
          goal.current = (goal.current || 0) + delta;
          await goalRepo.save(goal);
        },
      };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 100, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const updated = await module.updateTransaction({ transactionId: 'tx-1', updates: { amount: 200 } });
      assert.strictEqual(updated.amount, 200);
      const goal = await goalRepo.findById('goal-1');
      assert.strictEqual(goal.current, 200);
      assert.deepEqual(goalAdjustments, [{ goalId: 'goal-1', delta: 100 }]);
    });

    it('rolls back update when goal adjustment fails', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjuster = { adjust: async () => { throw new Error('GOAL_ERROR'); } };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 100, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.updateTransaction({ transactionId: 'tx-1', updates: { amount: 200 } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'GOAL_ERROR');
      }
      assert.ok(thrown);

      const tx = await txRepo.findById('tx-1');
      assert.strictEqual(tx.amount, 100);
      const goal = await goalRepo.findById('goal-1');
      assert.strictEqual(goal.current, 100);
    });

    it('does not call goal adjuster for transaction with metadata.goalId === null', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = {
        adjust: async (goalId, delta) => {
          goalAdjustments.push({ goalId, delta });
          const goal = await goalRepo.findById(goalId);
          goal.current = (goal.current || 0) + delta;
          await goalRepo.save(goal);
        },
      };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: { goalId: null }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const updated = await module.updateTransaction({ transactionId: 'tx-1', updates: { amount: 200 } });
      assert.strictEqual(updated.amount, 200);
      assert.deepEqual(goalAdjustments, []);
    });

    it('removes goal contribution when metadata.goalId is changed to null', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = {
        adjust: async (goalId, delta) => {
          goalAdjustments.push({ goalId, delta });
          const goal = await goalRepo.findById(goalId);
          goal.current = (goal.current || 0) + delta;
          await goalRepo.save(goal);
        },
      };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 100, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const updated = await module.updateTransaction({ transactionId: 'tx-1', updates: { metadata: { goalId: null } } });
      assert.strictEqual(updated.metadata.goalId, null);
      assert.deepEqual(goalAdjustments, [{ goalId: 'goal-1', delta: -100 }]);
    });

    it('adds goal contribution when metadata.goalId is changed from null to valid goalId', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = {
        adjust: async (goalId, delta) => {
          goalAdjustments.push({ goalId, delta });
          const goal = await goalRepo.findById(goalId);
          goal.current = (goal.current || 0) + delta;
          await goalRepo.save(goal);
        },
      };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 0, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: null }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const updated = await module.updateTransaction({ transactionId: 'tx-1', updates: { metadata: { goalId: 'goal-1' } } });
      assert.strictEqual(updated.metadata.goalId, 'goal-1');
      assert.deepEqual(goalAdjustments, [{ goalId: 'goal-1', delta: 100 }]);
    });
  });

  describe('archiveTransaction', () => {
    it('archives an active transaction', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const archived = await module.archiveTransaction({ transactionId: 'tx-1' });
      assert.strictEqual(archived.archived, true);
      assert.ok(archived.updatedAt > '2024-01-01T00:00:00Z');
    });

    it('is idempotent for already archived transaction', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.archiveTransaction({ transactionId: 'tx-1' });
      assert.strictEqual(result.archived, true);
    });

    it('throws NOT_FOUND for missing transaction', async () => {
      const module = createModule({
        txRepo: { findById: async () => null },
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.archiveTransaction({ transactionId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('decrements Goal.current for goal contribution transaction', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = {
        adjust: async (goalId, delta) => {
          goalAdjustments.push({ goalId, delta });
          const goal = await goalRepo.findById(goalId);
          goal.current = (goal.current || 0) + delta;
          await goalRepo.save(goal);
        },
      };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 100, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const archived = await module.archiveTransaction({ transactionId: 'tx-1' });
      assert.strictEqual(archived.archived, true);
      const goal = await goalRepo.findById('goal-1');
      assert.strictEqual(goal.current, 0);
      assert.deepEqual(goalAdjustments, [{ goalId: 'goal-1', delta: -100 }]);
    });

    it('rolls back archive when goal adjustment fails', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjuster = { adjust: async () => { throw new Error('GOAL_ERROR'); } };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Goal', target: 1000, current: 100, deadline: '2024-12-31', icon: '🎯', color: '#888888', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.archiveTransaction({ transactionId: 'tx-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'GOAL_ERROR');
      }
      assert.ok(thrown);

      const tx = await txRepo.findById('tx-1');
      assert.strictEqual(tx.archived, false);
      const goal = await goalRepo.findById('goal-1');
      assert.strictEqual(goal.current, 100);
    });

    it('does not adjust Goal.current for non-goal transaction', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const goalAdjustments = [];
      const goalAdjuster = { adjust: async (goalId, delta) => { goalAdjustments.push({ goalId, delta }); } };
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: goalAdjuster,
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const archived = await module.archiveTransaction({ transactionId: 'tx-1' });
      assert.strictEqual(archived.archived, true);
      assert.deepEqual(goalAdjustments, []);
    });
  });

  describe('getTransactionsByMonth', () => {
    it('returns transactions for a month', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-02-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const jan = await module.getTransactionsByMonth({ userId: 'user-1', monthKey: '2024-01' });
      assert.strictEqual(jan.length, 1);
      assert.strictEqual(jan[0].id, 'tx-1');
    });

    it('excludes archived transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const jan = await module.getTransactionsByMonth({ userId: 'user-1', monthKey: '2024-01' });
      assert.strictEqual(jan.length, 0);
    });

    it('sorts by date ascending then createdAt ascending', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'B', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'A', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const jan = await module.getTransactionsByMonth({ userId: 'user-1', monthKey: '2024-01' });
      assert.strictEqual(jan.length, 2);
      assert.strictEqual(jan[0].id, 'tx-2');
      assert.strictEqual(jan[1].id, 'tx-1');
    });

    it('throws VALIDATION_FAILED for invalid monthKey', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
        goalRepo: {},
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.getTransactionsByMonth({ userId: 'user-1', monthKey: 'invalid' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('getTransactionsByAccount', () => {
    it('returns transactions for an account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-2', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const acc1 = await module.getTransactionsByAccount({ accountId: 'acc-1' });
      assert.strictEqual(acc1.length, 1);
      assert.strictEqual(acc1[0].id, 'tx-1');
    });

    it('sorts by date descending', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'B', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'A', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const acc1 = await module.getTransactionsByAccount({ accountId: 'acc-1' });
      assert.strictEqual(acc1.length, 2);
      assert.strictEqual(acc1[0].id, 'tx-1');
      assert.strictEqual(acc1[1].id, 'tx-2');
    });

    it('throws NOT_FOUND for missing account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({
        txRepo,
        accountRepo,
        categoryRepo,
        goalRepo,
        goalCurrentAdjuster: { adjust: async () => {} },
        applicationTransaction: appTx,
      });

      let thrown = false;
      try {
        await module.getTransactionsByAccount({ accountId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });
  });
});

