import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGoalModule } from '../../../src/application/goal/goal-module.js';
import { GoalRepository } from '../../../src/infrastructure/repositories/goal-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

function createModule(deps) {
  return createGoalModule({
    goalRepository: deps.goalRepo,
    transactionRepository: deps.txRepo,
    categoryRepository: deps.categoryRepo,
    accountRepository: deps.accountRepo,
    applicationTransaction: deps.appTx,
  });
}

describe('GoalModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createModule({
        goalRepo: {},
        txRepo: {},
        categoryRepo: {},
        appTx: { run: async (fn) => fn() },
      });
      assert.ok(module);
      assert.strictEqual(typeof module.createGoal, 'function');
      assert.strictEqual(typeof module.updateGoal, 'function');
      assert.strictEqual(typeof module.depositToGoal, 'function');
      assert.strictEqual(typeof module.archiveGoal, 'function');
      assert.strictEqual(typeof module.rebuildGoalCurrent, 'function');
      assert.strictEqual(typeof module.getActiveGoals, 'function');
      assert.strictEqual(typeof module.getGoalEta, 'function');
      assert.strictEqual(typeof module.getRequiredDepositsThisMonth, 'function');
    });
  });

  describe('createGoal', () => {
    it('creates goal with valid input', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({
        userId: 'user-1',
        name: 'New Laptop',
        target: 5000,
        deadline: '2024-12-31',
        icon: 'laptop',
        color: '#0000FF',
        priority: 'medium',
      });

      assert.strictEqual(goal.userId, 'user-1');
      assert.strictEqual(goal.name, 'New Laptop');
      assert.strictEqual(goal.target, 5000);
      assert.strictEqual(goal.current, 0);
      assert.strictEqual(goal.currentLastRebuiltAt, null);
      assert.strictEqual(goal.deadline, '2024-12-31');
      assert.strictEqual(goal.icon, 'laptop');
      assert.strictEqual(goal.color, '#0000FF');
      assert.strictEqual(goal.priority, 'medium');
      assert.strictEqual(goal.archived, false);
      assert.ok(goal.id);
      assert.ok(goal.createdAt);
      assert.ok(goal.updatedAt);
    });

    it('creates goal with null deadline', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({
        userId: 'user-1',
        name: 'New Laptop',
        target: 5000,
        icon: 'laptop',
        color: '#0000FF',
        priority: 'medium',
      });

      assert.strictEqual(goal.deadline, null);
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty name', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: '', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for name exceeding 100 chars', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'a'.repeat(101), target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for zero target', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'Goal', target: 0, icon: 'star', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid deadline format', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, deadline: 'invalid', icon: 'star', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty icon', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: '', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty color', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid priority', async () => {
      const module = createModule({ goalRepo: {}, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'invalid' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const goalRepo = { save: async () => { throw new Error('STORAGE_UNAVAILABLE'); } };
      const module = createModule({ goalRepo, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });

  describe('updateGoal', () => {
    it('updates mutable fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });

      const updated = await module.updateGoal({ goalId: goal.id, updates: { name: 'New Goal', target: 2000 } });
      assert.strictEqual(updated.name, 'New Goal');
      assert.strictEqual(updated.target, 2000);
      assert.strictEqual(updated.id, goal.id);
      assert.strictEqual(updated.userId, 'user-1');
      assert.strictEqual(updated.current, 0);
      assert.strictEqual(updated.createdAt, goal.createdAt);
    });

    it('throws NOT_FOUND for missing goal', async () => {
      const module = createModule({ goalRepo: { findById: async () => null }, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.updateGoal({ goalId: 'missing', updates: { name: 'New' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for zero target', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });

      let thrown = false;
      try {
        await module.updateGoal({ goalId: goal.id, updates: { target: 0 } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const module = createModule({
        goalRepo: {
          findById: async () => ({ id: 'goal-1', userId: 'user-1', target: 1000, current: 0 }),
          save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
        },
        txRepo: {},
        categoryRepo: {},
        appTx: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.updateGoal({ goalId: 'goal-1', updates: { name: 'New' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('rejects priority update with VALIDATION_FAILED', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });

      let thrown = false;
      try {
        await module.updateGoal({ goalId: goal.id, updates: { priority: 'high' } });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);

      const unchanged = await goalRepo.findById(goal.id);
      assert.strictEqual(unchanged.priority, 'medium');
    });

    it('rejects arbitrary injected fields', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Goal', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });

      const updated = await module.updateGoal({ goalId: goal.id, updates: { name: 'New', arbitrary: 'injected' } });
      assert.strictEqual(updated.name, 'New');
      assert.strictEqual(updated.arbitrary, undefined);
    });
  });

  describe('depositToGoal', () => {
    it('creates contribution and updates Goal.current atomically', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const result = await module.depositToGoal({
        userId: 'user-1',
        goalId: goal.id,
        accountId: 'acc-1',
        amount: 100,
        date: '2024-01-15',
        description: 'Deposit',
      });

      assert.ok(result.transaction.id);
      assert.strictEqual(result.transaction.metadata.goalId, goal.id);
      assert.strictEqual(result.transaction.type, 'expense');
      assert.strictEqual(result.transaction.categoryId, 'cat-savings');
      assert.strictEqual(result.transaction.amount, 100);
      assert.strictEqual(result.goal.current, 100);
      assert.strictEqual(result.goal.currentLastRebuiltAt, null);
    });

    it('does not update currentLastRebuiltAt on deposit', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const result = await module.depositToGoal({
        userId: 'user-1',
        goalId: goal.id,
        accountId: 'acc-1',
        amount: 100,
        date: '2024-01-15',
      });

      assert.strictEqual(result.goal.current, 100);
      assert.strictEqual(result.goal.currentLastRebuiltAt, null);
    });

    it('rejects over-target deposit', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 900, date: '2024-01-15' });

      const result = await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-16' });
      assert.strictEqual(result.goal.current, 1000);
    });

    it('rejects deposit when current already equals target', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 1000, date: '2024-01-15' });

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 1, date: '2024-01-16' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);

      const updatedGoal = await goalRepo.findById(goal.id);
      assert.strictEqual(updatedGoal.current, 1000);
    });

    it('rolls back transaction when goal adjustment fails', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const failingGoalRepo = {
        findById: async (id) => goalRepo.findById(id),
        save: async () => { throw new Error('GOAL_SAVE_FAILED'); },
      };
      const moduleWithFailingRepo = createModule({ goalRepo: failingGoalRepo, txRepo, categoryRepo, accountRepo, appTx });

      let thrown = false;
      try {
        await moduleWithFailingRepo.depositToGoal({
          userId: 'user-1',
          goalId: goal.id,
          accountId: 'acc-1',
          amount: 100,
          date: '2024-01-15',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'GOAL_SAVE_FAILED');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
      const updatedGoal = await goalRepo.findById(goal.id);
      assert.strictEqual(updatedGoal.current, 0);
    });

    it('throws NOT_FOUND for missing goal', async () => {
      const module = createModule({
        goalRepo: { findById: async () => null },
        txRepo: {},
        categoryRepo: { findSystem: async () => [] },
        appTx: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: 'missing', accountId: 'acc-1', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for archived goal', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.archiveGoal({ goalId: goal.id });

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);
    });

    it('throws NOT_FOUND for missing account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'missing-acc', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });

    it('throws OWNERSHIP_VIOLATION for another users account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-2', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const otherAccount = { id: 'acc-other', userId: 'user-2', name: 'Other', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(otherAccount);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-other', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });

    it('throws ARCHIVED_ENTITY for archived account', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);
      await accountRepo.archive('acc-1');

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });
  });

  describe('archiveGoal', () => {
    it('archives an active goal', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const archived = await module.archiveGoal({ goalId: goal.id });
      assert.strictEqual(archived.archived, true);
      assert.ok(archived.updatedAt >= goal.updatedAt);
    });

    it('is idempotent for already archived goal', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.archiveGoal({ goalId: goal.id });

      const result = await module.archiveGoal({ goalId: goal.id });
      assert.strictEqual(result.archived, true);
    });

    it('throws NOT_FOUND for missing goal', async () => {
      const module = createModule({ goalRepo: { findById: async () => null }, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.archiveGoal({ goalId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE', async () => {
      const module = createModule({
        goalRepo: {
          findById: async () => ({ id: 'goal-1', userId: 'user-1', target: 1000, current: 0, archived: false }),
          save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
        },
        txRepo: {},
        categoryRepo: {},
        appTx: { run: async (fn) => fn() },
      });
      let thrown = false;
      try {
        await module.archiveGoal({ goalId: 'goal-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });
  });

  describe('rebuildGoalCurrent', () => {
    it('recalculates current from transactions', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-15' });

      const rebuilt = await module.rebuildGoalCurrent({ goalId: goal.id });
      assert.strictEqual(rebuilt.goal.current, 100);
      assert.ok(!rebuilt.rebuilt);
      assert.ok(rebuilt.goal.currentLastRebuiltAt);
    });

    it('returns rebuilt=false when current is already correct', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const rebuilt = await module.rebuildGoalCurrent({ goalId: goal.id });
      assert.strictEqual(rebuilt.goal.current, 0);
      assert.ok(!rebuilt.rebuilt);
      assert.ok(rebuilt.goal.currentLastRebuiltAt);
    });

    it('updates currentLastRebuiltAt when rebuild corrects current', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-15' });

      const beforeRebuild = await goalRepo.findById(goal.id);
      assert.strictEqual(beforeRebuild.current, 100);

      const rebuilt = await module.rebuildGoalCurrent({ goalId: goal.id });
      assert.strictEqual(rebuilt.goal.current, 100);
      assert.ok(!rebuilt.rebuilt);
      assert.ok(rebuilt.goal.currentLastRebuiltAt);
    });

    it('throws NOT_FOUND for missing goal', async () => {
      const module = createModule({ goalRepo: { findById: async () => null }, txRepo: {}, categoryRepo: {}, appTx: { run: async (fn) => fn() } });
      let thrown = false;
      try {
        await module.rebuildGoalCurrent({ goalId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });
  });

  describe('getActiveGoals', () => {
    it('returns non-archived goals sorted by priority then createdAt', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal1 = await module.createGoal({ userId: 'user-1', name: 'Low', target: 1000, icon: 'star', color: '#FF0000', priority: 'low' });
      const goal2 = await module.createGoal({ userId: 'user-1', name: 'High', target: 1000, icon: 'star', color: '#FF0000', priority: 'high' });
      const goal3 = await module.createGoal({ userId: 'user-1', name: 'Medium', target: 1000, icon: 'star', color: '#FF0000', priority: 'medium' });

      await module.archiveGoal({ goalId: goal1.id });

      const active = await module.getActiveGoals({ userId: 'user-1' });
      assert.strictEqual(active.length, 2);
      assert.strictEqual(active[0].id, goal2.id);
      assert.strictEqual(active[1].id, goal3.id);
    });

    it('returns empty array when no active goals', async () => {
      const module = createModule({
        goalRepo: { loadAll: async () => [] },
        txRepo: {},
        categoryRepo: {},
        appTx: { run: async (fn) => fn() },
      });
      const active = await module.getActiveGoals({ userId: 'user-1' });
      assert.deepEqual(active, []);
    });
  });

  describe('getGoalEta', () => {
    it('calculates ETA correctly', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, deadline: '2024-12-31', icon: 'laptop', color: '#0000FF', priority: 'medium' });
      await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-15' });

      const eta = await module.getGoalEta({ goalId: goal.id, currentDate: '2024-01-15' });
      assert.strictEqual(eta.remaining, 900);
      assert.ok(eta.monthsNeeded > 0);
      assert.ok(eta.etaDate);
      assert.ok(!eta.unknown);
    });

    it('returns unknown for goal with zero avgPerMonth', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, deadline: '2024-12-31', icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const eta = await module.getGoalEta({ goalId: goal.id, currentDate: '2024-01-15' });
      assert.ok(eta.unknown);
    });
  });

  describe('getRequiredDepositsThisMonth', () => {
    it('calculates required deposits for goals with deadlines', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1200, deadline: '2024-12-31', icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const required = await module.getRequiredDepositsThisMonth({ goals: [goal], currentDate: '2024-01-15' });
      assert.ok(required > 0);
    });

    it('returns 0 for goals without deadline', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const required = await module.getRequiredDepositsThisMonth({ goals: [goal], currentDate: '2024-01-15' });
      assert.strictEqual(required, 0);
    });
  });

  describe('ownership/isolation', () => {
    it('rejects deposit to another users goal', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-2', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const otherGoal = { id: 'goal-other', userId: 'user-2', name: 'Other', target: 1000, current: 0, deadline: null, icon: 'star', color: '#FF0000', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await goalRepo.save(otherGoal);

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: 'goal-other', accountId: 'acc-1', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'OWNERSHIP_VIOLATION');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });

    it('rejects deposit using another users savings category', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-2', () => storage.keys());
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, accountRepo, appTx });

      const otherSavings = { id: 'cat-other', userId: 'user-2', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(otherSavings);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const account = { id: 'acc-1', userId: 'user-1', name: 'Konto', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await accountRepo.save(account);

      let thrown = false;
      try {
        await module.depositToGoal({ userId: 'user-1', goalId: goal.id, accountId: 'acc-1', amount: 100, date: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 0);
    });

    it('another users contribution transaction does not affect current', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const otherTxRepo = new TransactionRepository(storage, 'user-2', () => storage.keys());
      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const appTx = new ApplicationTransaction(storage);
      const module = createModule({ goalRepo, txRepo, categoryRepo, appTx });

      const savingsCategory = { id: 'cat-savings', userId: 'user-1', name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#00FF00', parentId: null, isSystem: true, systemRole: 'savings', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      await categoryRepo.save(savingsCategory);

      const goal = await module.createGoal({ userId: 'user-1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#0000FF', priority: 'medium' });

      const otherTx = {
        id: 'tx-other',
        userId: 'user-2',
        accountId: 'acc-other',
        amount: 500,
        type: 'expense',
        categoryId: 'cat-savings',
        description: 'Other',
        date: '2024-01-15',
        notes: '',
        metadata: { goalId: goal.id },
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      await otherTxRepo.save(otherTx);

      const rebuilt = await module.rebuildGoalCurrent({ goalId: goal.id });
      assert.strictEqual(rebuilt.goal.current, 0);
      assert.ok(!rebuilt.rebuilt);
    });
  });
});
