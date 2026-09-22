import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';

export function createTransactionModule({
  transactionRepository,
  accountRepository,
  categoryRepository,
  goalRepository,
  goalCurrentAdjuster,
  applicationTransaction,
}) {
  const txRepo = transactionRepository;
  const accountRepo = accountRepository;
  const categoryRepo = categoryRepository;
  const goalRepo = goalRepository;
  const goalAdjuster = goalCurrentAdjuster;
  const appTx = applicationTransaction;

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  async function validateReference(repo, id, userId, entityName) {
    const entity = await repo.findById(id);
    if (!entity) {
      throw new Error('NOT_FOUND');
    }
    if (entity.userId !== userId) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    return entity;
  }

  function validateDate(date) {
    if (!date || typeof date !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  async function createTransaction({
    userId,
    accountId,
    amount,
    type,
    categoryId,
    description,
    date,
    metadata,
    isOpeningBalance,
    openingBalanceCategoryId,
  }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!['income', 'expense'].includes(type)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!validateDate(date)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (typeof description !== 'string' || description.length > 500) {
      throw new Error('VALIDATION_FAILED');
    }

    const account = await validateReference(accountRepo, accountId, userId, 'account');
    if (account.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }

    let resolvedCategoryId = categoryId;
    if (resolvedCategoryId === undefined || resolvedCategoryId === null) {
      resolvedCategoryId = null;
    }
    if (resolvedCategoryId !== null) {
      const category = await validateReference(categoryRepo, resolvedCategoryId, userId, 'category');
      if (category.archived) {
        throw new Error('VALIDATION_FAILED');
      }
      if (category.type !== type) {
        throw new Error('VALIDATION_FAILED');
      }
    }

    if (isOpeningBalance) {
      if (!openingBalanceCategoryId || typeof openingBalanceCategoryId !== 'string') {
        throw new Error('VALIDATION_FAILED');
      }
      const openingCategory = await categoryRepo.findById(openingBalanceCategoryId);
      if (!openingCategory || openingCategory.userId !== userId || !openingCategory.isSystem || openingCategory.systemRole !== 'opening-balance') {
        throw new Error('VALIDATION_FAILED');
      }
      resolvedCategoryId = openingBalanceCategoryId;
    }

    const normalizedMetadata = metadata && typeof metadata === 'object' ? { ...metadata } : {};

    if (normalizedMetadata.goalId !== undefined && normalizedMetadata.goalId !== null) {
      if (resolvedCategoryId === null) {
        throw new Error('VALIDATION_FAILED');
      }
      const category = await categoryRepo.findById(resolvedCategoryId);
      if (!category || category.userId !== userId || category.systemRole !== 'savings') {
        throw new Error('VALIDATION_FAILED');
      }
      if (type !== 'expense') {
        throw new Error('VALIDATION_FAILED');
      }
      const goal = await validateReference(goalRepo, normalizedMetadata.goalId, userId, 'goal');
      if (!goal) {
        throw new Error('NOT_FOUND');
      }
    }

    const id = generateId();
    const now = new Date().toISOString();
    const transaction = {
      id,
      userId,
      accountId,
      amount,
      type,
      categoryId: resolvedCategoryId,
      description,
      date,
      notes: '',
      metadata: isOpeningBalance ? { ...normalizedMetadata, openingBalance: true } : normalizedMetadata,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await appTx.run(async () => {
      await txRepo.save(transaction);

      if (normalizedMetadata.goalId !== undefined && normalizedMetadata.goalId !== null) {
        await goalAdjuster.adjust(normalizedMetadata.goalId, amount);
      }
    });

    return transaction;
  }

  async function updateTransaction({ transactionId, updates }) {
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await txRepo.findById(transactionId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const allowedFields = ['accountId', 'amount', 'type', 'categoryId', 'description', 'date', 'metadata'];
    const actualUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        actualUpdates[field] = updates[field];
      }
    }

    if (actualUpdates.amount !== undefined && (typeof actualUpdates.amount !== 'number' || !Number.isFinite(actualUpdates.amount) || actualUpdates.amount <= 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.type !== undefined && !['income', 'expense'].includes(actualUpdates.type)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.date !== undefined && !validateDate(actualUpdates.date)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.description !== undefined && (typeof actualUpdates.description !== 'string' || actualUpdates.description.length > 500)) {
      throw new Error('VALIDATION_FAILED');
    }

    let resolvedAccountId = existing.accountId;
    if (actualUpdates.accountId !== undefined) {
      const newAccount = await validateReference(accountRepo, actualUpdates.accountId, existing.userId, 'account');
      if (newAccount.archived) {
        throw new Error('ARCHIVED_ENTITY');
      }
      resolvedAccountId = actualUpdates.accountId;
    }

    let resolvedCategoryId = existing.categoryId;
    if (actualUpdates.categoryId !== undefined) {
      if (actualUpdates.categoryId === null) {
        resolvedCategoryId = null;
      } else {
        const newCategory = await validateReference(categoryRepo, actualUpdates.categoryId, existing.userId, 'category');
        if (newCategory.archived) {
          throw new Error('VALIDATION_FAILED');
        }
        resolvedCategoryId = actualUpdates.categoryId;
      }
    }

    const typeChanged = actualUpdates.type !== undefined;
    const categoryChanged = actualUpdates.categoryId !== undefined;

    if (typeChanged || categoryChanged) {
      const finalType = actualUpdates.type !== undefined ? actualUpdates.type : existing.type;
      if (resolvedCategoryId !== null) {
        const category = await categoryRepo.findById(resolvedCategoryId);
        if (!category || category.userId !== existing.userId) {
          throw new Error('NOT_FOUND');
        }
        if (category.archived) {
          throw new Error('VALIDATION_FAILED');
        }
        if (category.type !== finalType) {
          throw new Error('VALIDATION_FAILED');
        }
      }
    }

    const updatedMetadata = actualUpdates.metadata !== undefined
      ? (actualUpdates.metadata && typeof actualUpdates.metadata === 'object' ? { ...actualUpdates.metadata } : actualUpdates.metadata)
      : existing.metadata;

    if (existing.metadata?.openingBalance) {
      throw new Error('VALIDATION_FAILED');
    }

    const updated = {
      ...existing,
      ...actualUpdates,
      accountId: resolvedAccountId,
      categoryId: resolvedCategoryId,
      metadata: updatedMetadata,
      id: existing.id,
      userId: existing.userId,
      archived: existing.archived,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await appTx.run(async () => {
      await txRepo.save(updated);

      const oldGoalId = existing.metadata?.goalId;
      const newGoalId = updated.metadata?.goalId;

      if (oldGoalId && newGoalId && oldGoalId !== newGoalId) {
        await goalAdjuster.adjust(oldGoalId, -existing.amount);
        await goalAdjuster.adjust(newGoalId, updated.amount);
      } else if (oldGoalId && !newGoalId) {
        await goalAdjuster.adjust(oldGoalId, -existing.amount);
      } else if (!oldGoalId && newGoalId) {
        await goalAdjuster.adjust(newGoalId, updated.amount);
      } else if (oldGoalId && newGoalId && oldGoalId === newGoalId) {
        const delta = updated.amount - existing.amount;
        if (delta !== 0) {
          await goalAdjuster.adjust(oldGoalId, delta);
        }
      }
    });

    return updated;
  }

  async function archiveTransaction({ transactionId }) {
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await txRepo.findById(transactionId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    let goalAdjustment = null;
    if (existing.metadata?.goalId) {
      const cat = await categoryRepo.findById(existing.categoryId);
      if (cat && cat.systemRole === 'savings') {
        goalAdjustment = { goalId: existing.metadata.goalId, delta: -existing.amount };
      }
    }

    const archived = {
      ...existing,
      archived: true,
      updatedAt: new Date().toISOString(),
    };

    await appTx.run(async () => {
      await txRepo.save(archived);

      if (goalAdjustment) {
        await goalAdjuster.adjust(goalAdjustment.goalId, goalAdjustment.delta);
      }
    });

    return archived;
  }

  async function getTransactionsByMonth({ userId, monthKey }) {
    if (!monthKey || typeof monthKey !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      throw new Error('VALIDATION_FAILED');
    }

    const transactions = await txRepo.findByMonth(monthKey);
    const nonArchived = transactions.filter(tx => !tx.archived);
    nonArchived.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });
    return nonArchived;
  }

  async function getTransactionsByAccount({ accountId }) {
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const account = await accountRepo.findById(accountId);
    if (!account) {
      throw new Error('NOT_FOUND');
    }

    const transactions = await txRepo.findByAccount(accountId);
    const nonArchived = transactions.filter(tx => !tx.archived);
    nonArchived.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      if (a.createdAt < b.createdAt) return 1;
      if (a.createdAt > b.createdAt) return -1;
      return 0;
    });
    return nonArchived;
  }

  return {
    createTransaction,
    updateTransaction,
    archiveTransaction,
    getTransactionsByMonth,
    getTransactionsByAccount,
  };
}
