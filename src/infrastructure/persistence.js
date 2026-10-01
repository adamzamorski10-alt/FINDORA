import { UserRepository } from './repositories/user-repository.js';
import { AccountRepository } from './repositories/account-repository.js';
import { CategoryRepository } from './repositories/category-repository.js';
import { TransactionRepository } from './repositories/transaction-repository.js';
import { BudgetRepository } from './repositories/budget-repository.js';
import { GoalRepository } from './repositories/goal-repository.js';
import { PersonRepository } from './repositories/person-repository.js';
import { ReceivableRepository } from './repositories/receivable-repository.js';
import { IncomeProfileRepository } from './repositories/income-profile-repository.js';
import { ResellingProductRepository } from './repositories/reselling-product-repository.js';
import { ResellingOrderRepository } from './repositories/reselling-order-repository.js';
import { ResellingSaleRepository } from './repositories/reselling-sale-repository.js';
import { ResellingCostRepository } from './repositories/reselling-cost-repository.js';
import { ResellingTaskRepository } from './repositories/reselling-task-repository.js';

export function createPersistence({ storageAdapter, userId }) {
  const listKeys = () => storageAdapter.keys();

  const repositories = {
    userRepository: new UserRepository(storageAdapter, userId),
    accountRepository: new AccountRepository(storageAdapter, userId, listKeys),
    categoryRepository: new CategoryRepository(storageAdapter, userId, listKeys),
    transactionRepository: new TransactionRepository(storageAdapter, userId, listKeys),
    budgetRepository: new BudgetRepository(storageAdapter, userId, listKeys),
    goalRepository: new GoalRepository(storageAdapter, userId, listKeys),
    personRepository: new PersonRepository(storageAdapter, userId, listKeys),
    receivableRepository: new ReceivableRepository(storageAdapter, userId, listKeys),
    incomeProfileRepository: new IncomeProfileRepository(storageAdapter, userId, listKeys),
    resellingProductRepository: new ResellingProductRepository(storageAdapter, userId, listKeys),
    resellingOrderRepository: new ResellingOrderRepository(storageAdapter, userId, listKeys),
    resellingSaleRepository: new ResellingSaleRepository(storageAdapter, userId, listKeys),
    resellingCostRepository: new ResellingCostRepository(storageAdapter, userId, listKeys),
    resellingTaskRepository: new ResellingTaskRepository(storageAdapter, userId, listKeys),
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