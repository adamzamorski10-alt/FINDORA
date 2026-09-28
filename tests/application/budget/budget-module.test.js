import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBudgetModule } from '../../../src/application/budget/budget-module.js';
import { BudgetRepository } from '../../../src/infrastructure/repositories/budget-repository.js';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

function createModule(deps) {
  return createBudgetModule({
    budgetRepository: deps.budgetRepo,
    transactionRepository: deps.txRepo,
    categoryRepository: deps.categoryRepo,
  });
}

describe('BudgetModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createModule({
        budgetRepo: {},
        txRepo: {},
        categoryRepo: {},
      });
      assert.ok(module);
      assert.strictEqual(typeof module.createBudget, 'function');
      assert.strictEqual(typeof module.getBudgetProgress, 'function');
      assert.strictEqual(typeof module.updateBudget, 'function');
      assert.strictEqual(typeof module.archiveBudget, 'function');
    });
  });

  describe('createBudget', () => {
    it('creates budget with valid input', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });
      assert.strictEqual(budget.userId, 'user-1');
      assert.strictEqual(budget.categoryId, 'cat-1');
      assert.strictEqual(budget.amount, 500);
      assert.strictEqual(budget.period, 'monthly');
      assert.strictEqual(budget.archived, false);
      assert.ok(budget.id);
      assert.ok(budget.createdAt);
      assert.ok(budget.updatedAt);
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const module = createModule({ budgetRepo: {}, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.createBudget({ categoryId: 'cat-1', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for missing categoryId', async () => {
      const module = createModule({ budgetRepo: {}, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for zero amount', async () => {
      const module = createModule({ budgetRepo: {}, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 0 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for negative amount', async () => {
      const module = createModule({ budgetRepo: {}, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: -500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws NOT_FOUND for missing category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'missing', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('returns NOT_FOUND for category owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await storage.set('category:user-2:cat-2', { id: 'cat-2', userId: 'user-2', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-2', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for archived category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for duplicate budget per category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 300 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('rejects duplicate categoryId even after previous budget is archived', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const first = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });
      await module.archiveBudget({ budgetId: first.id });

      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 300 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const module = createModule({
        budgetRepo: {
          findByCategory: async () => [],
          save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
        },
        txRepo: {},
        categoryRepo: { findById: async () => ({ id: 'cat-1', userId: 'user-1', archived: false }) },
      });
      let thrown = false;
      try {
        await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('ignores caller-supplied immutable fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const budget = await module.createBudget({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 500,
        id: 'injected-id',
        archived: true,
        createdAt: '2020-01-01T00:00:00Z',
        updatedAt: '2020-01-01T00:00:00Z',
        period: 'weekly',
        extra: 'field',
      });

      assert.ok(budget.id !== 'injected-id');
      assert.strictEqual(budget.archived, false);
      assert.ok(budget.createdAt > '2020-01-01T00:00:00Z');
      assert.ok(budget.updatedAt > '2020-01-01T00:00:00Z');
      assert.strictEqual(budget.period, 'monthly');
      assert.ok(!('extra' in budget));
    });
  });

  describe('getBudgetProgress', () => {
    it('calculates progress correctly', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-20', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(progress.spent, 300);
      assert.strictEqual(progress.remaining, 200);
      assert.strictEqual(progress.overBudget, false);
    });

    it('excludes archived transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(progress.spent, 0);
    });

    it('excludes opening-balance transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(progress.spent, 0);
    });

    it('excludes goal-contribution transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-savings', amount: 500 });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-savings', description: 'Deposit', date: '2024-01-15', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(progress.spent, 0);
    });

    it('returns overBudget when spent exceeds amount', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 600, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(progress.spent, 600);
      assert.strictEqual(progress.remaining, -100);
      assert.strictEqual(progress.overBudget, true);
    });

    it('throws NOT_FOUND for missing budget', async () => {
      const module = createModule({ budgetRepo: { findById: async () => null }, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.getBudgetProgress({ budgetId: 'missing', monthKey: '2024-01' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid monthKey', async () => {
      const module = createModule({ budgetRepo: {}, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.getBudgetProgress({ budgetId: 'budget-1', monthKey: 'invalid' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const module = createModule({
        budgetRepo: { findById: async () => ({ id: 'budget-1', categoryId: 'cat-1', amount: 500 }) },
        txRepo: { findByMonth: async () => { throw new Error('STORAGE_UNAVAILABLE'); } },
        categoryRepo: {},
      });
      let thrown = false;
      try {
        await module.getBudgetProgress({ budgetId: 'budget-1', monthKey: '2024-01' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('returns NOT_FOUND for budget owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await storage.set('budget:user-2:budget-2', { id: 'budget-2', userId: 'user-2', categoryId: 'cat-1', amount: 500, period: 'monthly', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.getBudgetProgress({ budgetId: 'budget-2', monthKey: '2024-01' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('performs exactly one category lookup regardless of transaction count', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());

      let findByIdCalls = 0;
      const trackedCategoryRepo = {
        ...categoryRepo,
        findById: async (id) => {
          findByIdCalls++;
          return categoryRepo.findById(id);
        },
      };

      const module = createModule({ budgetRepo, txRepo, categoryRepo: trackedCategoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });
      findByIdCalls = 0;

      for (let i = 0; i < 20; i++) {
        await txRepo.save({ id: `tx-${i}`, userId: 'user-1', accountId: 'acc-1', amount: 10 + i, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      }

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(findByIdCalls, 1);
      assert.strictEqual(progress.spent, 390);
      assert.strictEqual(progress.remaining, 110);
      assert.strictEqual(progress.overBudget, false);
    });

    it('includes transactions from archived accounts in budget progress', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const account = { id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'landmark', color: '#0000FF', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: account.id, amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Test', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      await accountRepo.save({ ...account, archived: true });

      const progress = await module.getBudgetProgress({ budgetId: budget.id, monthKey: '2024-01' });
      assert.strictEqual(progress.spent, 200, 'archived account historical transactions remain in budget progress');
      assert.strictEqual(progress.remaining, 300);
    });
  });

  describe('updateBudget', () => {
    it('updates amount', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      const updated = await module.updateBudget({ budgetId: budget.id, amount: 800 });
      assert.strictEqual(updated.amount, 800);
      assert.strictEqual(updated.id, budget.id);
      assert.strictEqual(updated.categoryId, 'cat-1');
    });

    it('throws NOT_FOUND for missing budget', async () => {
      const module = createModule({ budgetRepo: { findById: async () => null }, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.updateBudget({ budgetId: 'missing', amount: 500 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for zero amount', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      let thrown = false;
      try {
        await module.updateBudget({ budgetId: budget.id, amount: 0 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const module = createModule({
        budgetRepo: {
          findById: async () => ({ id: 'budget-1', categoryId: 'cat-1', amount: 500, archived: false }),
          save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
        },
        txRepo: {},
        categoryRepo: {},
      });
      let thrown = false;
      try {
        await module.updateBudget({ budgetId: 'budget-1', amount: 800 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('returns NOT_FOUND for budget owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await storage.set('budget:user-2:budget-2', { id: 'budget-2', userId: 'user-2', categoryId: 'cat-1', amount: 500, period: 'monthly', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.updateBudget({ budgetId: 'budget-2', amount: 800 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('preserves immutable fields on update', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      const updated = await module.updateBudget({ budgetId: budget.id, amount: 800 });
      assert.strictEqual(updated.id, budget.id);
      assert.strictEqual(updated.userId, 'user-1');
      assert.strictEqual(updated.categoryId, 'cat-1');
      assert.strictEqual(updated.period, 'monthly');
      assert.strictEqual(updated.archived, false);
      assert.strictEqual(updated.createdAt, budget.createdAt);
      assert.ok(updated.updatedAt);
    });

    it('ignores caller-supplied immutable fields on update', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      const updated = await module.updateBudget({ budgetId: budget.id, amount: 800, userId: 'user-2', categoryId: 'cat-2', archived: true, createdAt: '2020-01-01T00:00:00Z', extra: 'field' });
      assert.strictEqual(updated.userId, 'user-1');
      assert.strictEqual(updated.categoryId, 'cat-1');
      assert.strictEqual(updated.archived, false);
      assert.strictEqual(updated.createdAt, budget.createdAt);
      assert.ok(!('extra' in updated));
    });
  });

  describe('archiveBudget', () => {
    it('archives an active budget', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      const archived = await module.archiveBudget({ budgetId: budget.id });
      assert.strictEqual(archived.archived, true);
      assert.ok(archived.updatedAt > '2024-01-01T00:00:00Z');
    });

    it('is idempotent for already archived budget', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', parentId: null, isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const budget = await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });
      await module.archiveBudget({ budgetId: budget.id });

      const result = await module.archiveBudget({ budgetId: budget.id });
      assert.strictEqual(result.archived, true);
    });

    it('throws NOT_FOUND for missing budget', async () => {
      const module = createModule({ budgetRepo: { findById: async () => null }, txRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.archiveBudget({ budgetId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const module = createModule({
        budgetRepo: {
          findById: async () => ({ id: 'budget-1', categoryId: 'cat-1', amount: 500, archived: false }),
          save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
        },
        txRepo: {},
        categoryRepo: {},
      });
      let thrown = false;
      try {
        await module.archiveBudget({ budgetId: 'budget-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('returns NOT_FOUND for budget owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ budgetRepo, txRepo, categoryRepo });

      await storage.set('budget:user-2:budget-2', { id: 'budget-2', userId: 'user-2', categoryId: 'cat-1', amount: 500, period: 'monthly', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await module.archiveBudget({ budgetId: 'budget-2' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });
  });
});
