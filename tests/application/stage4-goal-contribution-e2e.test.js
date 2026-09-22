import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppKernel } from '../../src/application/app-kernel.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';

const DEV_USER_ID = 'dev-user';
const OPENING_BALANCE_CATEGORY_ID = 'system-opening-balance';
const SAVINGS_CATEGORY_ID = 'cat-savings';
const INCOME_CATEGORY_ID = 'cat-income';
const FIXED_DATE = '2024-09-15';
const FIXED_MONTH = '2024-09';

async function createKernel(storage) {
  const kernel = createAppKernel({
    storageAdapter: storage,
    userId: DEV_USER_ID,
    openingBalanceCategoryId: OPENING_BALANCE_CATEGORY_ID,
  });

  const now = new Date().toISOString();
  await kernel.persistence.categoryRepository.save({
    id: OPENING_BALANCE_CATEGORY_ID,
    userId: DEV_USER_ID,
    name: 'Opening Balance',
    type: 'expense',
    icon: 'circle',
    color: '#888888',
    parentId: null,
    isSystem: true,
    systemRole: 'opening-balance',
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  await kernel.persistence.categoryRepository.save({
    id: SAVINGS_CATEGORY_ID,
    userId: DEV_USER_ID,
    name: 'Savings',
    type: 'expense',
    icon: 'piggy-bank',
    color: '#00FF00',
    parentId: null,
    isSystem: true,
    systemRole: 'savings',
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  await kernel.persistence.categoryRepository.save({
    id: INCOME_CATEGORY_ID,
    userId: DEV_USER_ID,
    name: 'Salary',
    type: 'income',
    icon: 'briefcase',
    color: '#10B981',
    parentId: null,
    isSystem: false,
    systemRole: null,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  return kernel;
}

describe('Stage 4 — Goal Contribution End-to-End', () => {
  it('runs the full cross-feature goal contribution scenario', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules, persistence } = kernel;

    // 1. create/use a valid account
    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    // Seed account with known balance via income transaction
    await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 1000,
      type: 'income',
      categoryId: INCOME_CATEGORY_ID,
      description: 'Salary',
      date: FIXED_DATE,
    });

    // 2. create a goal
    const goal = await modules.goal.createGoal({
      userId: DEV_USER_ID,
      name: 'Laptop',
      target: 1000,
      deadline: '2025-12-31',
      icon: '💻',
      color: '#0000FF',
      priority: 'high',
    });

    // 3. make a goal contribution
    const contribution = await modules.goal.depositToGoal({
      userId: DEV_USER_ID,
      goalId: goal.id,
      accountId: account.id,
      amount: 200,
      date: FIXED_DATE,
      description: 'Goal deposit',
    });

    // 4. verify the persisted transaction
    assert.ok(contribution.transaction.id);
    assert.strictEqual(contribution.transaction.metadata.goalId, goal.id);
    assert.strictEqual(contribution.transaction.type, 'expense');
    assert.strictEqual(contribution.transaction.categoryId, SAVINGS_CATEGORY_ID);
    assert.strictEqual(contribution.transaction.amount, 200);
    assert.strictEqual(contribution.transaction.archived, false);

    // 5. verify Goal.current
    assert.strictEqual(contribution.goal.current, 200);

    // 6. verify goal progress/current value via direct repo read
    const goalFromRepo = await persistence.goalRepository.findById(goal.id);
    assert.strictEqual(goalFromRepo.current, 200);

    // 7. verify Reporting excludes the goal contribution from expense reporting
    const summary = await modules.reporting.getMonthlySummary({
      userId: DEV_USER_ID,
      monthKey: FIXED_MONTH,
    });
    assert.strictEqual(summary.income, 1000);
    assert.strictEqual(summary.expense, 0);
    assert.strictEqual(summary.net, 1000);
    assert.strictEqual(summary.transactionCount, 1);

    const breakdown = await modules.reporting.getMonthCategoryBreakdown({
      userId: DEV_USER_ID,
      monthKey: FIXED_MONTH,
      type: 'expense',
    });
    assert.ok(!breakdown.byCategory[SAVINGS_CATEGORY_ID]);

    // 8. verify Safe-to-Spend reflects the contribution correctly
    // freeFunds = 1000 - 200 = 800
    // goal remaining = 800, deadline 2025-12-31, currentDate 2024-09-15
    // monthsLeft = 16, goalsReq = ceil(800/16) = 50
    // safeTotal = 800 - 50 = 750
    // daysLeft for 2024-09-15 = 15
    // perDay = 750 / 15 = 50
    const safeToSpend = await modules.safeToSpend.computeForCurrentState({ currentDate: FIXED_DATE });
    assert.strictEqual(safeToSpend.freeFunds, 800);
    assert.strictEqual(safeToSpend.goalsReq, 50);
    assert.strictEqual(safeToSpend.safeTotal, 750);
    assert.strictEqual(safeToSpend.perDay, 50);
    assert.strictEqual(safeToSpend.daysLeft, 15);

    // 9. update the contribution amount
    const updatedTx = await modules.transaction.updateTransaction({
      transactionId: contribution.transaction.id,
      updates: { amount: 300 },
    });
    assert.strictEqual(updatedTx.amount, 300);

    // 10. verify Goal.current adjustment
    const goalAfterUpdate = await persistence.goalRepository.findById(goal.id);
    assert.strictEqual(goalAfterUpdate.current, 300);

    // 11. archive the contribution
    const archivedTx = await modules.transaction.archiveTransaction({
      transactionId: contribution.transaction.id,
    });
    assert.strictEqual(archivedTx.archived, true);

    // 12. verify Goal.current adjustment
    const goalAfterArchive = await persistence.goalRepository.findById(goal.id);
    assert.strictEqual(goalAfterArchive.current, 0);

    // 13. simulate/recreate the application boundary
    const kernel2 = await createKernel(storage);

    // 14. verify persisted consistency after reload-equivalent boundary
    const goalsAfterReload = await kernel2.modules.goal.getActiveGoals({ userId: DEV_USER_ID });
    assert.ok(goalsAfterReload.some(g => g.id === goal.id && g.current === 0));

    const allTxsAfterReload = await persistence.transactionRepository.loadAll();
    assert.ok(allTxsAfterReload.some(t => t.id === contribution.transaction.id && t.archived === true));

    const summaryAfterArchive = await kernel2.modules.reporting.getMonthlySummary({
      userId: DEV_USER_ID,
      monthKey: FIXED_MONTH,
    });
    assert.strictEqual(summaryAfterArchive.income, 1000);
    assert.strictEqual(summaryAfterArchive.expense, 0);
    assert.strictEqual(summaryAfterArchive.net, 1000);

    const safeToSpendAfterArchive = await kernel2.modules.safeToSpend.computeForCurrentState({ currentDate: FIXED_DATE });
    assert.strictEqual(safeToSpendAfterArchive.freeFunds, 1000);
    assert.strictEqual(safeToSpendAfterArchive.goalsReq, 63);
    assert.strictEqual(safeToSpendAfterArchive.safeTotal, 937);
    assert.strictEqual(safeToSpendAfterArchive.perDay, 937 / 15);
  });

  it('rejects over-target contribution and persists nothing', async () => {
    const storage = new InMemoryStorageAdapter();
    await storage.init();
    const kernel = await createKernel(storage);
    const { modules, persistence } = kernel;

    const account = await modules.account.createAccount({
      userId: DEV_USER_ID,
      name: 'Bank',
      type: 'bank',
      icon: 'landmark',
      color: '#0000FF',
    });

    await modules.transaction.createTransaction({
      userId: DEV_USER_ID,
      accountId: account.id,
      amount: 1000,
      type: 'income',
      categoryId: INCOME_CATEGORY_ID,
      description: 'Salary',
      date: FIXED_DATE,
    });

    const goal = await modules.goal.createGoal({
      userId: DEV_USER_ID,
      name: 'Laptop',
      target: 1000,
      deadline: '2025-12-31',
      icon: '💻',
      color: '#0000FF',
      priority: 'high',
    });

    await modules.goal.depositToGoal({
      userId: DEV_USER_ID,
      goalId: goal.id,
      accountId: account.id,
      amount: 1000,
      date: FIXED_DATE,
    });

    let thrown = false;
    try {
      await modules.goal.depositToGoal({
        userId: DEV_USER_ID,
        goalId: goal.id,
        accountId: account.id,
        amount: 1,
        date: FIXED_DATE,
      });
    } catch (e) {
      thrown = true;
      assert.strictEqual(e.message, 'VALIDATION_FAILED');
    }
    assert.ok(thrown);

    const txs = await persistence.transactionRepository.loadAll();
    assert.strictEqual(txs.length, 2); // income + first contribution only

    const goalAfter = await persistence.goalRepository.findById(goal.id);
    assert.strictEqual(goalAfter.current, 1000);
  });
});
