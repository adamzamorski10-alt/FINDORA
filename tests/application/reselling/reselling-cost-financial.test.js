import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResellingModule } from '../../../src/application/reselling/reselling-module.js';
import { ResellingProductRepository } from '../../../src/infrastructure/repositories/reselling-product-repository.js';
import { ResellingOrderRepository } from '../../../src/infrastructure/repositories/reselling-order-repository.js';
import { ResellingSaleRepository } from '../../../src/infrastructure/repositories/reselling-sale-repository.js';
import { ResellingCostRepository } from '../../../src/infrastructure/repositories/reselling-cost-repository.js';
import { ResellingTaskRepository } from '../../../src/infrastructure/repositories/reselling-task-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';
import { createReportingModule } from '../../../src/application/reporting/reporting-module.mjs';
import { createSafeToSpendModule } from '../../../src/application/safe-to-spend/safe-to-spend-module.js';
import { compute as safeToSpendCompute } from '../../../src/domain/safe-to-spend/safe-to-spend-calculator.js';
import { compute as goalRequiredDepositCompute } from '../../../src/domain/goals/goal-required-deposit-calculator.js';

async function createModule(userId = 'user-1') {
  const storage = new InMemoryStorageAdapter();
  await storage.init();
  const productRepo = new ResellingProductRepository(storage, userId, () => storage.keys());
  const orderRepo = new ResellingOrderRepository(storage, userId, () => storage.keys());
  const saleRepo = new ResellingSaleRepository(storage, userId, () => storage.keys());
  const costRepo = new ResellingCostRepository(storage, userId, () => storage.keys());
  const taskRepo = new ResellingTaskRepository(storage, userId, () => storage.keys());
  const txRepo = new TransactionRepository(storage, userId, () => storage.keys());
  const accountRepo = new AccountRepository(storage, userId, () => storage.keys());
  const appTx = new ApplicationTransaction(storage);

  const module = createResellingModule({
    resellingProductRepository: productRepo,
    resellingOrderRepository: orderRepo,
    resellingSaleRepository: saleRepo,
    resellingCostRepository: costRepo,
    resellingTaskRepository: taskRepo,
    transactionRepository: txRepo,
    accountRepository: accountRepo,
    applicationTransaction: appTx,
  });

  const reporting = createReportingModule({
    transactionRepository: txRepo,
    accountRepository: accountRepo,
    categoryRepository: { loadAll: async () => [] },
  });

  const safeToSpend = createSafeToSpendModule({
    safeToSpendCalculator: { compute: safeToSpendCompute },
    accountRepository: accountRepo,
    transactionRepository: txRepo,
    goalRepository: { loadAll: async () => [] },
    goalRequiredDepositCalculator: { compute: goalRequiredDepositCompute },
  });

  return {
    module,
    storage,
    productRepo,
    orderRepo,
    saleRepo,
    costRepo,
    taskRepo,
    txRepo,
    accountRepo,
    appTx,
    reporting,
    safeToSpend,
  };
}

describe('ResellingCost Financial Integration', () => {
  describe('Case A — paid cost creates financial movement', async () => {
    it('creates exactly one expense transaction when cost is paid with accountId', async () => {
      const { module, accountRepo, txRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cost = await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      assert.strictEqual(cost.paymentStatus, 'paid');
      assert.ok(cost.linkedTransactionId, 'linkedTransactionId should be set');

      const allTx = await txRepo.loadAll();
      const costTx = allTx.find(tx => tx.metadata && tx.metadata.resellingCostId === cost.id);
      assert.ok(costTx, 'linked transaction should exist');
      assert.strictEqual(costTx.type, 'expense');
      assert.strictEqual(costTx.amount, 20);
      assert.strictEqual(costTx.accountId, 'acc-1');
    });

    it('decreases account balance by exactly the cost amount', async () => {
      const { module, accountRepo, txRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await txRepo.save({
        id: 'tx-open',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 1000,
        type: 'income',
        categoryId: null,
        description: 'Opening',
        date: '2024-09-01',
        notes: '',
        metadata: {},
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      const allTx = await txRepo.loadAll();
      const nonArchived = allTx.filter(tx => !tx.archived);
      const balance = nonArchived.reduce((sum, tx) => {
        if (tx.type === 'income') return sum + tx.amount;
        if (tx.type === 'expense') return sum - tx.amount;
        return sum;
      }, 0);
      assert.strictEqual(balance, 980);
    });
  });

  describe('Case B — unpaid cost does not create financial movement', async () => {
    it('does not create transaction when cost is unpaid', async () => {
      const { module, txRepo } = await createModule();

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        paymentStatus: 'unpaid',
      });

      const allTx = await txRepo.loadAll();
      assert.strictEqual(allTx.length, 0, 'no transactions should be created for unpaid cost');
    });

    it('does not create transaction when cost has no accountId', async () => {
      const { module, txRepo } = await createModule();

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        paymentStatus: 'paid',
      });

      const allTx = await txRepo.loadAll();
      assert.strictEqual(allTx.length, 0, 'no transactions without accountId');
    });
  });

  describe('Case C — persistence and state transitions', async () => {
    it('creates transaction when unpaid cost is updated to paid', async () => {
      const { module, costRepo, txRepo, accountRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cost = await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'unpaid',
      });

      assert.strictEqual(cost.linkedTransactionId, '');

      const updated = await module.updateCost({
        costId: cost.id,
        updates: { paymentStatus: 'paid' },
      });

      assert.strictEqual(updated.paymentStatus, 'paid');
      assert.ok(updated.linkedTransactionId, 'linkedTransactionId should be set after marking as paid');

      const allTx = await txRepo.loadAll();
      const costTx = allTx.find(tx => tx.metadata && tx.metadata.resellingCostId === cost.id && !tx.archived);
      assert.ok(costTx, 'transaction should exist after marking as paid');
    });

    it('archives transaction when paid cost is updated to unpaid', async () => {
      const { module, costRepo, txRepo, accountRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cost = await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      assert.ok(cost.linkedTransactionId);

      const updated = await module.updateCost({
        costId: cost.id,
        updates: { paymentStatus: 'unpaid' },
      });

      assert.strictEqual(updated.paymentStatus, 'unpaid');
      assert.strictEqual(updated.linkedTransactionId, '');

      const allTx = await txRepo.loadAll();
      const costTx = allTx.find(tx => tx.metadata && tx.metadata.resellingCostId === cost.id);
      assert.ok(costTx, 'transaction should still exist but be archived');
      assert.strictEqual(costTx.archived, true);
    });

    it('archives linked transaction when cost is archived', async () => {
      const { module, costRepo, txRepo, accountRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cost = await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      await module.archiveCost({ costId: cost.id });

      const allTx = await txRepo.loadAll();
      const costTx = allTx.find(tx => tx.metadata && tx.metadata.resellingCostId === cost.id);
      assert.ok(costTx);
      assert.strictEqual(costTx.archived, true);
    });
  });

  describe('Case D — Reports no double counting', async () => {
    it('reports include reselling cost transactions but not reselling costs directly', async () => {
      const { module, txRepo, accountRepo, reporting } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      const summary = await reporting.getMonthlySummary({ userId: 'user-1', monthKey: '2024-09' });
      assert.strictEqual(summary.expense, 20, 'reports should see the expense through transaction');
      assert.strictEqual(summary.income, 0);
    });
  });

  describe('Case E — Safe-to-Spend correct cash impact', async () => {
    it('safe-to-spend reflects paid reselling cost', async () => {
      const { module, accountRepo, txRepo, safeToSpend } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await txRepo.save({
        id: 'tx-open',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 1000,
        type: 'income',
        categoryId: null,
        description: 'Opening',
        date: '2024-09-01',
        notes: '',
        metadata: {},
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      const result = await safeToSpend.computeForCurrentState({ currentDate: '2024-09-15' });
      assert.strictEqual(result.freeFunds, 980, 'freeFunds should reflect cash outflow');
    });

    it('safe-to-spend does not reflect unpaid reselling cost', async () => {
      const { module, accountRepo, txRepo, safeToSpend } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await txRepo.save({
        id: 'tx-open',
        userId: 'user-1',
        accountId: 'acc-1',
        amount: 1000,
        type: 'income',
        categoryId: null,
        description: 'Opening',
        date: '2024-09-01',
        notes: '',
        metadata: {},
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Advertising',
        paymentStatus: 'unpaid',
      });

      const result = await safeToSpend.computeForCurrentState({ currentDate: '2024-09-15' });
      assert.strictEqual(result.freeFunds, 1000, 'freeFunds should not reflect unpaid cost');
    });
  });

  describe('Case F — Reselling Analytics profit semantics', async () => {
    it('analytics count all costs as operational costs regardless of payment status', async () => {
      const { module } = await createModule();

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Ad',
        paymentStatus: 'paid',
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 10,
        category: 'shipping',
        date: '2024-09-15',
        description: 'Ship',
        paymentStatus: 'unpaid',
      });

      const analytics = await module.getResellingAnalytics({ userId: 'user-1', incomeProfileId: 'ip-1' });
      assert.strictEqual(analytics.totalCost, 30);
      assert.strictEqual(analytics.totalCostsCount, 2);
    });

    it('analytics do not double count when cost has linked transaction', async () => {
      const { module, accountRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-1',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Ad',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      const analytics = await module.getResellingAnalytics({ userId: 'user-1', incomeProfileId: 'ip-1' });
      assert.strictEqual(analytics.totalCost, 20);
      assert.strictEqual(analytics.totalCostsCount, 1);
    });
  });

  describe('Cross-profile isolation', () => {
    it('cost in one profile does not affect analytics of another', async () => {
      const { module, accountRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-vinted',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Vinted Ad',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-electronics',
        amount: 10,
        category: 'shipping',
        date: '2024-09-15',
        description: 'Electronics Ship',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      const vintedAnalytics = await module.getResellingAnalytics({ userId: 'user-1', incomeProfileId: 'ip-vinted' });
      const electronicsAnalytics = await module.getResellingAnalytics({ userId: 'user-1', incomeProfileId: 'ip-electronics' });

      assert.strictEqual(vintedAnalytics.totalCost, 20);
      assert.strictEqual(electronicsAnalytics.totalCost, 10);
    });

    it('financial transactions from reselling remain global and not duplicated', async () => {
      const { module, accountRepo, txRepo } = await createModule();
      await accountRepo.save({
        id: 'acc-1',
        userId: 'user-1',
        name: 'Bank',
        type: 'bank',
        icon: 'landmark',
        color: '#0000FF',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-vinted',
        amount: 20,
        category: 'advertising',
        date: '2024-09-15',
        description: 'Vinted Ad',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      await module.createCost({
        userId: 'user-1',
        incomeProfileId: 'ip-electronics',
        amount: 10,
        category: 'shipping',
        date: '2024-09-15',
        description: 'Electronics Ship',
        accountId: 'acc-1',
        paymentStatus: 'paid',
      });

      const allTx = await txRepo.loadAll();
      assert.strictEqual(allTx.length, 2, 'exactly two global financial transactions');
    });
  });
});
