import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSafeToSpendModule } from '../../../src/application/safe-to-spend/safe-to-spend-module.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { GoalRepository } from '../../../src/infrastructure/repositories/goal-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { compute as safeToSpendCompute } from '../../../src/domain/safe-to-spend/safe-to-spend-calculator.js';

import { compute as goalRequiredDepositCompute } from '../../../src/domain/goals/goal-required-deposit-calculator.js';

function createModule(deps) {
  return createSafeToSpendModule({
    safeToSpendCalculator: deps.calculator || { compute: safeToSpendCompute },
    accountRepository: deps.accountRepo,
    transactionRepository: deps.txRepo,
    goalRepository: deps.goalRepo,
    goalRequiredDepositCalculator: deps.depositCalculator || { compute: goalRequiredDepositCompute },
  });
}

describe('SafeToSpendModule', () => {
  describe('construction', () => {
    it('creates a module with injected dependencies', async () => {
      const module = createModule({
        accountRepo: {},
        txRepo: {},
        goalRepo: {},
      });
      assert.ok(module);
      assert.strictEqual(typeof module.computeSafeToSpend, 'function');
      assert.strictEqual(typeof module.computeForCurrentState, 'function');
    });
  });

  describe('computeSafeToSpend', () => {
    it('computes safeTotal and perDay correctly', async () => {
      const module = createModule({ accountRepo: {}, txRepo: {}, goalRepo: {} });
      const result = await module.computeSafeToSpend({ freeFunds: 1000, goalsReq: 200, daysLeft: 10 });
      assert.strictEqual(result.safeTotal, 800);
      assert.strictEqual(result.perDay, 80);
    });

    it('clamps daysLeft to minimum 1', async () => {
      const module = createModule({ accountRepo: {}, txRepo: {}, goalRepo: {} });
      const result = await module.computeSafeToSpend({ freeFunds: 1000, goalsReq: 200, daysLeft: 0 });
      assert.strictEqual(result.safeTotal, 800);
      assert.strictEqual(result.perDay, 800);
    });

    it('allows negative safeTotal', async () => {
      const module = createModule({ accountRepo: {}, txRepo: {}, goalRepo: {} });
      const result = await module.computeSafeToSpend({ freeFunds: 100, goalsReq: 200, daysLeft: 10 });
      assert.strictEqual(result.safeTotal, -100);
      assert.strictEqual(result.perDay, -10);
    });

    it('defaults invalid freeFunds to 0 without throwing', async () => {
      const module = createModule({ accountRepo: {}, txRepo: {}, goalRepo: {} });
      const result = await module.computeSafeToSpend({ freeFunds: 'invalid', goalsReq: 200, daysLeft: 10 });
      assert.strictEqual(result.safeTotal, -200);
      assert.strictEqual(result.perDay, -20);
    });

    it('defaults invalid goalsReq to 0 without throwing', async () => {
      const module = createModule({ accountRepo: {}, txRepo: {}, goalRepo: {} });
      const result = await module.computeSafeToSpend({ freeFunds: 1000, goalsReq: NaN, daysLeft: 10 });
      assert.strictEqual(result.safeTotal, 1000);
      assert.strictEqual(result.perDay, 100);
    });

    it('defaults invalid daysLeft to 0 (clamped to 1) without throwing', async () => {
      const module = createModule({ accountRepo: {}, txRepo: {}, goalRepo: {} });
      const result = await module.computeSafeToSpend({ freeFunds: 1000, goalsReq: 200, daysLeft: null });
      assert.strictEqual(result.safeTotal, 800);
      assert.strictEqual(result.perDay, 800);
    });
  });

  describe('computeForCurrentState', () => {
    it('computes safe-to-spend from current state', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 1000);
      assert.strictEqual(result.goalsReq, 0);
      assert.ok(result.daysLeft >= 1);
      assert.strictEqual(result.safeTotal, 1000);
      assert.ok(result.perDay > 0);
    });

    it('excludes archived accounts from freeFunds', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-2', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-2', amount: 300, type: 'income', categoryId: 'cat-1', description: 'Cash', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 500);
    });

    it('excludes savings accounts from freeFunds', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-2', userId: 'user-1', name: 'Savings', type: 'savings', icon: 'piggy-bank', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-2', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Savings', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 500);
    });

    it('excludes archived transactions from balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2024-01-15', notes: '', metadata: {}, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 1000);
    });

    it('subtracts expense transactions from account balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 800);
    });

    it('includes multiple accounts in freeFunds', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-2', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-2', amount: 200, type: 'income', categoryId: 'cat-1', description: 'Cash', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 700);
    });

    it('returns zero freeFunds when no spendable accounts', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 0);
      assert.strictEqual(result.goalsReq, 0);
      assert.strictEqual(result.safeTotal, 0);
    });

    it('computes goalsReq from active goals with deadlines', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 0, deadline: '2024-06-30', icon: 'laptop', color: '#0000FF', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.ok(result.goalsReq > 0);
      assert.strictEqual(result.safeTotal, -result.goalsReq);
    });

    it('excludes archived goals from goalsReq', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 0, deadline: '2024-06-30', icon: 'laptop', color: '#0000FF', priority: 'medium', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.goalsReq, 0);
    });

    it('excludes goals without deadline from goalsReq', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 0, deadline: null, icon: 'laptop', color: '#0000FF', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.goalsReq, 0);
    });

    it('excludes already-reached goals from goalsReq', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 1000, deadline: '2024-06-30', icon: 'laptop', color: '#0000FF', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.goalsReq, 0);
    });

    it('adds full remaining for past-deadline goals', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 200, deadline: '2023-12-31', icon: 'laptop', color: '#0000FF', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.goalsReq, 800);
    });

    it('handles multiple goals correctly', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 0, deadline: '2024-06-30', icon: 'laptop', color: '#0000FF', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-2', userId: 'user-1', name: 'Phone', target: 500, current: 100, deadline: '2024-06-30', icon: 'phone', color: '#FF0000', priority: 'high', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.ok(result.goalsReq > 0);
    });

    it('clamps daysLeft to minimum 1', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-31' });
      assert.ok(result.daysLeft >= 1);
    });

    it('propagates STORAGE_UNAVAILABLE on account read failure', async () => {
      const module = createModule({
        accountRepo: { loadAll: async () => { throw new Error('STORAGE_UNAVAILABLE'); } },
        txRepo: {},
        goalRepo: {},
      });
      let thrown = false;
      try {
        await module.computeForCurrentState({ currentDate: '2024-01-15' });
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
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const failingTxRepo = {
        findByAccount: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
      };

      const moduleWithFailingTx = createModule({ accountRepo, txRepo: failingTxRepo, goalRepo });
      let thrown = false;
      try {
        await moduleWithFailingTx.computeForCurrentState({ currentDate: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('propagates STORAGE_UNAVAILABLE on goal read failure', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const failingGoalRepo = {
        loadAll: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
      };

      const moduleWithFailingGoal = createModule({ accountRepo, txRepo, goalRepo: failingGoalRepo });
      let thrown = false;
      try {
        await moduleWithFailingGoal.computeForCurrentState({ currentDate: '2024-01-15' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown);
    });

    it('does not include bills in calculation', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.safeTotal, 1000);
    });

    it('returns correct result with zero goalsReq', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.safeTotal, 1000);
      assert.ok(result.perDay > 0);
    });

    it('excludes positive opening balance from freeFunds', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 0);
      assert.strictEqual(result.safeTotal, 0);
    });

    it('excludes negative opening balance from freeFunds', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'expense', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 0);
      assert.strictEqual(result.safeTotal, 0);
    });

    it('excludes opening balance but includes ordinary income and expense', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-ob', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-2', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2024-01-16', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 300);
      assert.strictEqual(result.safeTotal, 300);
    });

    it('excludes opening balance from freeFunds but goal requirements still apply', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-ob', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await goalRepo.save({ id: 'goal-1', userId: 'user-1', name: 'Laptop', target: 1000, current: 0, deadline: '2024-06-30', icon: 'laptop', color: '#0000FF', priority: 'medium', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 0);
      assert.ok(result.goalsReq > 0);
      assert.strictEqual(result.safeTotal, -result.goalsReq);
    });

    it('excludes archived opening balance from freeFunds', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-ob', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 500, type: 'income', categoryId: 'cat-1', description: 'Salary', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, 500);
      assert.strictEqual(result.safeTotal, 500);
    });

    it('preserves account balance including opening balance', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const accountRepo = new AccountRepository(storage, 'user-1', () => storage.keys());
      const txRepo = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const module = createModule({ accountRepo, txRepo, goalRepo });

      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-ob', userId: 'user-1', accountId: 'acc-1', amount: 1000, type: 'income', categoryId: 'cat-ob', description: 'Opening', date: '2024-01-01', notes: '', metadata: { openingBalance: true }, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await txRepo.save({ id: 'tx-1', userId: 'user-1', accountId: 'acc-1', amount: 200, type: 'expense', categoryId: 'cat-1', description: 'Food', date: '2024-01-15', notes: '', metadata: {}, archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.computeForCurrentState({ currentDate: '2024-01-15' });
      assert.strictEqual(result.freeFunds, -200);
      assert.strictEqual(result.safeTotal, -200);
    });
  });
});
