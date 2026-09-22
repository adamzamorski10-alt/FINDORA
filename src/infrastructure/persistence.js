import { UserRepository } from './repositories/user-repository.js';
import { AccountRepository } from './repositories/account-repository.js';
import { CategoryRepository } from './repositories/category-repository.js';
import { TransactionRepository } from './repositories/transaction-repository.js';
import { BudgetRepository } from './repositories/budget-repository.js';
import { GoalRepository } from './repositories/goal-repository.js';

export function createPersistence({ storageAdapter, userId }) {
  const listKeys = () => storageAdapter.keys();

  const repositories = {
    userRepository: new UserRepository(storageAdapter),
    accountRepository: new AccountRepository(storageAdapter, userId, listKeys),
    categoryRepository: new CategoryRepository(storageAdapter, userId, listKeys),
    transactionRepository: new TransactionRepository(storageAdapter, userId, listKeys),
    budgetRepository: new BudgetRepository(storageAdapter, userId, listKeys),
    goalRepository: new GoalRepository(storageAdapter, userId, listKeys),
  };

  return {
    storage: storageAdapter,
    userId,
    listKeys,
    ...repositories,
    async initialize() {
      await storageAdapter.init();
    },
  };
}