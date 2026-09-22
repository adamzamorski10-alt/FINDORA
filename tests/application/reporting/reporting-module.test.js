import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createReportingModule } from '../../../src/application/reporting/reporting-module.mjs';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

function createModule(deps) {
  return createReportingModule({
    transactionRepository: deps.txRepo,
    accountRepository: deps.accountRepo,
    categoryRepository: deps.categoryRepo,
  });
}

describe('ReportingModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: {},
        categoryRepo: {},
      });
      assert.ok(module);
      assert.strictEqual(typeof module.getMonthlySummary, 'function');
      assert.strictEqual(typeof module.getMonthCategoryBreakdown, 'function');
      assert.strictEqual(typeof module.getAccountBalance, 'function');
    });
  });

  describe('getMonthlySummary', () => {
    it('computes income, expense, and net for month', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-salary', userId: 'user-1', name: 'Salary', type: 'income', icon: 'dollar', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-rent', userId: 'user-1', name: 'Rent', type: 'expense', icon: 'home', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-food', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 5000, type: 'income', categoryId: 'cat-salary', description: 'Salary', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 2000, type: 'expense', categoryId: 'cat-rent', description: 'Rent', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-3', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'expense', categoryId: 'cat-food', description: 'Food', date: '2026-09-03', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.income, 5000);
      assert.strictEqual(result.expense, 2500);
      assert.strictEqual(result.net, 2500);
      assert.strictEqual(result.transactionCount, 3);
    });

    it('returns zeros for empty month', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      const result = await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.income, 0);
      assert.strictEqual(result.expense, 0);
      assert.strictEqual(result.net, 0);
      assert.strictEqual(result.transactionCount, 0);
    });

    it('excludes archived transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Cat', type: 'expense', icon: 'x', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2026-09-01', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.expense, 200);
      assert.strictEqual(result.transactionCount, 1);
    });

    it('excludes opening-balance transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Cat', type: 'income', icon: 'x', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Opening', date: '2026-09-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.income, 500);
      assert.strictEqual(result.transactionCount, 1);
    });

    it('excludes goal-contribution transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#000000', isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Cat', type: 'expense', icon: 'x', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 300, type: 'expense', categoryId: 'cat-savings', description: 'Goal contribution', date: '2026-09-01', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.expense, 200);
      assert.strictEqual(result.transactionCount, 1);
    });

    it('throws VALIDATION_FAILED for invalid monthKey', async () => {
      const module = createModule({ txRepo: {}, accountRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.getMonthlySummary({ userId: 'user-1', monthKey: 'invalid' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE on transaction read failure', async () => {
      const module = createModule({
        txRepo: { findByMonth: async () => { throw new Error('STORAGE_UNAVAILABLE'); } },
        accountRepo: {},
        categoryRepo: {},
      });
      let thrown = false;
      try {
        await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('does not include transactions from another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepoUser1 = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo: txRepoUser1, accountRepo, categoryRepo });

      const txRepoUser2 = new TransactionRepository(storage, 'user-2', () => storage.keys());
      const categoryRepoUser2 = new CategoryRepository(storage, 'user-2', () => storage.keys());
      await categoryRepoUser2.save({ id: 'cat-2', userId: 'user-2', name: 'Cat2', type: 'expense', icon: 'x', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepoUser2.save({ id: 'tx-other', userId: 'user-2', accountId: 'acc-other', amount: 999, type: 'expense', categoryId: 'cat-2', description: 'Other', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthlySummary({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.expense, 0);
    });
  });

  describe('getMonthCategoryBreakdown', () => {
    it('returns category breakdown for both types by default', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-food', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-salary', userId: 'user-1', name: 'Salary', type: 'income', icon: 'dollar', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 300, type: 'expense', categoryId: 'cat-food', description: 'Food', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 5000, type: 'income', categoryId: 'cat-salary', description: 'Salary', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09' });
      assert.strictEqual(result.byCategory['cat-food'].total, 300);
      assert.strictEqual(result.byCategory['cat-food'].count, 1);
      assert.strictEqual(result.byCategory['cat-salary'].total, 5000);
      assert.strictEqual(result.byCategory['cat-salary'].count, 1);
    });

    it('filters by type when provided', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-food', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-salary', userId: 'user-1', name: 'Salary', type: 'income', icon: 'dollar', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 300, type: 'expense', categoryId: 'cat-food', description: 'Food', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 5000, type: 'income', categoryId: 'cat-salary', description: 'Salary', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09', type: 'expense' });
      assert.ok('cat-food' in result.byCategory);
      assert.ok(!('cat-salary' in result.byCategory));
    });

    it('uses uncategorized for null categoryId', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: null, description: 'No cat', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09' });
      assert.ok('uncategorized' in result.byCategory);
      assert.strictEqual(result.byCategory['uncategorized'].total, 100);
      assert.strictEqual(result.byCategory['uncategorized'].count, 1);
    });

    it('returns empty byCategory for empty month', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09' });
      assert.deepStrictEqual(result.byCategory, {});
    });

    it('excludes goal-contribution transactions from expense breakdown', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#000000', isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-food', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 300, type: 'expense', categoryId: 'cat-savings', description: 'Goal', date: '2026-09-01', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-food', description: 'Food', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09', type: 'expense' });
      assert.ok(!('cat-savings' in result.byCategory));
      assert.strictEqual(result.byCategory['cat-food'].total, 200);
    });

    it('does not exclude savings-category transactions from income breakdown when type=income', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#000000', isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-salary', userId: 'user-1', name: 'Salary', type: 'income', icon: 'dollar', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 300, type: 'expense', categoryId: 'cat-savings', description: 'Goal', date: '2026-09-01', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 5000, type: 'income', categoryId: 'cat-salary', description: 'Salary', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09', type: 'income' });
      assert.ok(!('cat-savings' in result.byCategory));
      assert.strictEqual(result.byCategory['cat-salary'].total, 5000);
    });

    it('excludes goal-contribution transactions from combined breakdown when type is omitted', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await categoryRepo.save({ id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#000000', isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-food', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await categoryRepo.save({ id: 'cat-salary', userId: 'user-1', name: 'Salary', type: 'income', icon: 'dollar', color: '#000000', isSystem: false, systemRole: null, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 300, type: 'expense', categoryId: 'cat-savings', description: 'Goal', date: '2026-09-01', notes: '', metadata: { goalId: 'goal-1' }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-food', description: 'Food', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-3', userId: 'user-1', accountId: 'acc-1', amount: 5000, type: 'income', categoryId: 'cat-salary', description: 'Salary', date: '2026-09-03', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09' });
      assert.ok(!('cat-savings' in result.byCategory));
      assert.strictEqual(result.byCategory['cat-food'].total, 200);
      assert.strictEqual(result.byCategory['cat-salary'].total, 5000);
    });

    it('throws VALIDATION_FAILED for invalid monthKey', async () => {
      const module = createModule({ txRepo: {}, accountRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: 'invalid' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid type', async () => {
      const module = createModule({ txRepo: {}, accountRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2026-09', type: 'invalid' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('getAccountBalance', () => {
    it('computes balance from non-archived transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2026-09-02', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getAccountBalance({ accountId: 'acc-1' });
      assert.strictEqual(result.accountId, 'acc-1');
      assert.strictEqual(result.balance, 800);
    });

    it('returns zero balance when no transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getAccountBalance({ accountId: 'acc-1' });
      assert.strictEqual(result.accountId, 'acc-1');
      assert.strictEqual(result.balance, 0);
    });

    it('allows negative balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 100, type: 'expense', categoryId: 'cat-1', description: 'Overdraft', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getAccountBalance({ accountId: 'acc-1' });
      assert.strictEqual(result.balance, -100);
    });

    it('excludes archived transactions from balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2026-09-01', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2026-09-02', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getAccountBalance({ accountId: 'acc-1' });
      assert.strictEqual(result.balance, 1000);
    });

    it('includes opening-balance transactions in balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Opening', date: '2026-09-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.getAccountBalance({ accountId: 'acc-1' });
      assert.strictEqual(result.balance, 500);
    });

    it('throws NOT_FOUND for missing account', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: { findById: async () => null },
        categoryRepo: {},
      });
      let thrown = false;
      try {
        await module.getAccountBalance({ accountId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty accountId', async () => {
      const module = createModule({ txRepo: {}, accountRepo: {}, categoryRepo: {} });
      let thrown = false;
      try {
        await module.getAccountBalance({ accountId: '' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE on account read failure', async () => {
      const module = createModule({
        txRepo: {},
        accountRepo: { findById: async () => { throw new Error('STORAGE_UNAVAILABLE'); } },
        categoryRepo: {},
      });
      let thrown = false;
      try {
        await module.getAccountBalance({ accountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE on transaction read failure', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ txRepo, accountRepo, categoryRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const failingTxRepo = {
        findByAccount: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
      };

      const moduleWithFailingTx = createModule({ txRepo: failingTxRepo, accountRepo, categoryRepo });
      let thrown = false;
      try {
        await moduleWithFailingTx.getAccountBalance({ accountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });
});
