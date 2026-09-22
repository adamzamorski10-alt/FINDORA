export function createBudgetModule({ budgetRepository, transactionRepository, categoryRepository }) {
  const budgetRepo = budgetRepository;
  const txRepo = transactionRepository;
  const categoryRepo = categoryRepository;

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  async function createBudget({ userId, categoryId, amount }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }

    const category = await categoryRepo.findById(categoryId);
    if (!category) {
      throw new Error('NOT_FOUND');
    }
    if (category.userId !== userId) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    if (category.archived) {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await budgetRepo.findByCategory(categoryId);
    if (existing.length > 0) {
      throw new Error('VALIDATION_FAILED');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const budget = {
      id,
      userId,
      categoryId,
      amount,
      period: 'monthly',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await budgetRepo.save(budget);
    return budget;
  }

  async function getBudgetProgress({ budgetId, monthKey }) {
    if (!budgetId || typeof budgetId !== 'string' || budgetId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!monthKey || typeof monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(monthKey)) {
      throw new Error('VALIDATION_FAILED');
    }

    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new Error('NOT_FOUND');
    }

    const transactions = await txRepo.findByMonth(monthKey);
    const relevant = [];
    for (const tx of transactions) {
      if (tx.archived) continue;
      if (tx.metadata?.openingBalance) continue;
      if (tx.categoryId !== budget.categoryId) continue;
      if (tx.type !== 'expense') continue;

      const category = await categoryRepo.findById(tx.categoryId);
      if (category && category.systemRole === 'savings') continue;

      relevant.push(tx);
    }

    const spent = relevant.reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = budget.amount - spent;
    const overBudget = spent > budget.amount;

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      amount: budget.amount,
      spent,
      remaining,
      overBudget,
    };
  }

  async function updateBudget({ budgetId, amount }) {
    if (!budgetId || typeof budgetId !== 'string' || budgetId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await budgetRepo.findById(budgetId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = {
      ...existing,
      amount,
      updatedAt: new Date().toISOString(),
    };

    await budgetRepo.save(updated);
    return updated;
  }

  async function archiveBudget({ budgetId }) {
    if (!budgetId || typeof budgetId !== 'string' || budgetId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await budgetRepo.findById(budgetId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await budgetRepo.save(existing);
    return existing;
  }

  async function getBudgets({ userId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const all = await budgetRepo.findAll();
    return all.filter(b => b.userId === userId);
  }

  return {
    createBudget,
    getBudgetProgress,
    getBudgets,
    updateBudget,
    archiveBudget,
  };
}
