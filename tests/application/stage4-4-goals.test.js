import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGoalModule } from '../../src/application/goal/goal-module.js';
import { GoalRepository } from '../../src/infrastructure/repositories/goal-repository.js';
import { TransactionRepository } from '../../src/infrastructure/repositories/transaction-repository.js';
import { CategoryRepository } from '../../src/infrastructure/repositories/category-repository.js';
import { AccountRepository } from '../../src/infrastructure/repositories/account-repository.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../src/infrastructure/storage/application-transaction.js';
import { createApplicationState } from '../../src/state/application-state-factory.js';

describe('Stage 4.4 — Goals', () => {
  describe('goal creation', () => {
    it('creates a goal and loads active goals', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createGoalModule({
        goalRepository: goalRepo,
        transactionRepository: txRepo,
        categoryRepository: categoryRepo,
        accountRepository: accountRepo,
        applicationTransaction: appTx,
      });
      const state = createApplicationState();

      const created = await module.createGoal({
        userId: 'user-1',
        name: 'Vacation',
        target: 1000,
        deadline: '2025-12-31',
        icon: '✈️',
        color: '#00BFFF',
        priority: 'high',
      });

      assert.ok(created.id);
      assert.strictEqual(created.name, 'Vacation');

      const goals = await module.getActiveGoals({ userId: 'user-1' });
      assert.ok(goals.some(g => g.id === created.id));
    });

    it('validates required fields', async () => {
      const module = createGoalModule({
        goalRepository: {},
        transactionRepository: {},
        categoryRepository: {},
        accountRepository: {},
        applicationTransaction: { run: async (fn) => fn() },
      });

      let thrown = false;
      try {
        await module.createGoal({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('goal state wiring', () => {
    it('loads goals into state', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createGoalModule({
        goalRepository: goalRepo,
        transactionRepository: txRepo,
        categoryRepository: categoryRepo,
        accountRepository: accountRepo,
        applicationTransaction: appTx,
      });
      const state = createApplicationState();

      await module.createGoal({
        userId: 'user-1',
        name: 'Trip',
        target: 500,
        deadline: '2025-06-30',
        icon: '🏖️',
        color: '#FFD700',
        priority: 'medium',
      });

      state.dispatch({ type: 'SET_GOALS_LOADING', loading: true });
      const goals = await module.getActiveGoals({ userId: 'user-1' });
      state.dispatch({ type: 'SET_GOALS', goals });
      state.dispatch({ type: 'SET_GOALS_LOADING', loading: false });

      assert.strictEqual(state.getState().goals.loading, false);
      assert.ok(state.getState().goals.items.some(g => g.name === 'Trip'));
    });

    it('supports goal form workflow', () => {
      const state = createApplicationState();

      state.dispatch({ type: 'SET_GOAL_FORM', form: { name: 'Trip', target: '500' } });
      assert.strictEqual(state.getState().goalForm.name, 'Trip');
      assert.strictEqual(state.getState().goalForm.target, '500');

      state.dispatch({ type: 'RESET_GOAL_FORM' });
      assert.strictEqual(state.getState().goalForm.name, '');
      assert.strictEqual(state.getState().goalForm.priority, 'medium');
    });
  });
});
