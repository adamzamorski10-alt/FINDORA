import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBudgetModule } from '../../src/application/budget/budget-module.js';
import { BudgetRepository } from '../../src/infrastructure/repositories/budget-repository.js';
import { TransactionRepository } from '../../src/infrastructure/repositories/transaction-repository.js';
import { CategoryRepository } from '../../src/infrastructure/repositories/category-repository.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';
import { createApplicationState } from '../../src/state/application-state-factory.js';

describe('Stage 4.3 — Budgets', () => {
  describe('budget creation', () => {
    it('creates a budget and loads all budgets', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createBudgetModule({
        budgetRepository: budgetRepo,
        transactionRepository: txRepo,
        categoryRepository: categoryRepo,
      });
      const state = createApplicationState();

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const created = await module.createBudget({
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 500,
      });

      assert.ok(created.id);
      assert.strictEqual(created.amount, 500);

      const budgets = await module.getBudgets({ userId: 'user-1' });
      assert.ok(budgets.some(b => b.id === created.id));
    });

    it('validates required fields', async () => {
      const module = createBudgetModule({
        budgetRepository: {},
        transactionRepository: {},
        categoryRepository: {},
      });

      let thrown = false;
      try {
        await module.createBudget({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('budget state wiring', () => {
    it('loads budgets into state', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const budgetRepo = new BudgetRepository(storage, 'user-1', () => storage.keys());
      const module = createBudgetModule({
        budgetRepository: budgetRepo,
        transactionRepository: txRepo,
        categoryRepository: categoryRepo,
      });
      const state = createApplicationState();

      await categoryRepo.save({ id: 'cat-1', userId: 'user-1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await module.createBudget({ userId: 'user-1', categoryId: 'cat-1', amount: 500 });

      state.dispatch({ type: 'SET_BUDGETS_LOADING', loading: true });
      const budgets = await module.getBudgets({ userId: 'user-1' });
      state.dispatch({ type: 'SET_BUDGETS', budgets });
      state.dispatch({ type: 'SET_BUDGETS_LOADING', loading: false });

      assert.strictEqual(state.getState().budgets.loading, false);
      assert.ok(state.getState().budgets.items.some(b => b.amount === 500));
    });

    it('supports budget form workflow', () => {
      const state = createApplicationState();

      state.dispatch({ type: 'SET_BUDGET_FORM', form: { categoryId: 'cat-1', amount: '500' } });
      assert.strictEqual(state.getState().budgetForm.categoryId, 'cat-1');
      assert.strictEqual(state.getState().budgetForm.amount, '500');

      state.dispatch({ type: 'RESET_BUDGET_FORM' });
      assert.strictEqual(state.getState().budgetForm.categoryId, '');
      assert.strictEqual(state.getState().budgetForm.period, 'monthly');
    });
  });
});
