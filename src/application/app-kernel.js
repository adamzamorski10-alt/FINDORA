/**
 * Stage 2.X — AppKernel (Composition Root)
 *
 * Minimal greenfield composition root.
 * Owns ONLY dependency wiring and lifecycle ownership.
 * NO business logic. NO domain rules. NO browser/legacy dependencies.
 *
 * Dependency chain:
 *   AppKernel
 *    → createPersistence
 *       → StorageAdapter
 *       → Repositories
 *    → ApplicationTransaction
 *    → G4 Application Modules
 *    → ApplicationState
 */

import { createPersistence } from '../infrastructure/persistence.js';
import { ApplicationTransaction } from '../infrastructure/storage/application-transaction.js';
import { createUserModule } from './user/user-module.js';
import { createAccountModule } from './account/account-module.js';
import { createCategoryModule } from './category/category-module.js';
import { createTransactionModule } from './transaction/transaction-module.js';
import { createBudgetModule } from './budget/budget-module.js';
import { createGoalModule } from './goal/goal-module.js';
import { createSafeToSpendModule } from './safe-to-spend/safe-to-spend-module.js';
import { createReportingModule } from './reporting/reporting-module.mjs';
import { createApplicationState } from '../state/application-state-factory.js';
import { compute as safeToSpendCompute } from '../domain/safe-to-spend/safe-to-spend-calculator.js';
import { compute as goalRequiredDepositCompute } from '../domain/goals/goal-required-deposit-calculator.js';
import { createBackupService } from './backup/backup-service.js';
import { createRestoreService } from './backup/restore-service.js';

export function createAppKernel({ storageAdapter, userId, openingBalanceCategoryId }) {
  if (!storageAdapter) {
    throw new Error('VALIDATION_FAILED');
  }
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('VALIDATION_FAILED');
  }

  const persistence = createPersistence({ storageAdapter, userId });

  const appTx = new ApplicationTransaction(storageAdapter);

  const goalModule = createGoalModule({
    goalRepository: persistence.goalRepository,
    transactionRepository: persistence.transactionRepository,
    categoryRepository: persistence.categoryRepository,
    accountRepository: persistence.accountRepository,
    applicationTransaction: appTx,
  });

  const state = createApplicationState();

  const categoryModule = createCategoryModule({
    categoryRepository: persistence.categoryRepository,
    budgetRepository: persistence.budgetRepository,
  });

  const backupService = createBackupService({
    userRepository: persistence.userRepository,
    accountRepository: persistence.accountRepository,
    categoryRepository: persistence.categoryRepository,
    transactionRepository: persistence.transactionRepository,
    budgetRepository: persistence.budgetRepository,
    goalRepository: persistence.goalRepository,
  });

  const restoreService = createRestoreService({
    storage: persistence.storage,
    appTx,
    listKeys: persistence.listKeys,
    userRepository: persistence.userRepository,
    accountRepository: persistence.accountRepository,
    categoryRepository: persistence.categoryRepository,
    transactionRepository: persistence.transactionRepository,
    budgetRepository: persistence.budgetRepository,
    goalRepository: persistence.goalRepository,
    goalModule,
    categoryModule,
  });

  const modules = {
    user: createUserModule({
      userRepository: persistence.userRepository,
    }),
    account: createAccountModule({
      accountRepository: persistence.accountRepository,
      transactionRepository: persistence.transactionRepository,
      applicationTransaction: appTx,
      openingBalanceCategoryId,
    }),
    category: categoryModule,
    transaction: createTransactionModule({
      transactionRepository: persistence.transactionRepository,
      accountRepository: persistence.accountRepository,
      categoryRepository: persistence.categoryRepository,
      goalRepository: persistence.goalRepository,
      goalCurrentAdjuster: { adjust: goalModule.adjust },
      applicationTransaction: appTx,
    }),
    budget: createBudgetModule({
      budgetRepository: persistence.budgetRepository,
      transactionRepository: persistence.transactionRepository,
      categoryRepository: persistence.categoryRepository,
    }),
    goal: goalModule,
    safeToSpend: createSafeToSpendModule({
      safeToSpendCalculator: { compute: safeToSpendCompute },
      accountRepository: persistence.accountRepository,
      transactionRepository: persistence.transactionRepository,
      goalRepository: persistence.goalRepository,
      goalRequiredDepositCalculator: { compute: goalRequiredDepositCompute },
    }),
    reporting: createReportingModule({
      transactionRepository: persistence.transactionRepository,
      accountRepository: persistence.accountRepository,
      categoryRepository: persistence.categoryRepository,
    }),
    backup: backupService,
    restore: restoreService,
  };

  return {
    persistence,
    state,
    modules,
    appTx,
    dispose() {
      // Stage 1: no listeners to release.
      // Future stages may add cleanup here.
    },
  };
}
