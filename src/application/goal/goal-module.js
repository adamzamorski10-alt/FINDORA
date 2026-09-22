export function createGoalModule({ goalRepository, transactionRepository, categoryRepository, accountRepository, applicationTransaction }) {
  const goalRepo = goalRepository;
  const txRepo = transactionRepository;
  const categoryRepo = categoryRepository;
  const accountRepo = accountRepository;
  const appTx = applicationTransaction;

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function validateDate(date) {
    if (!date || typeof date !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  async function calculateGoalCurrent(goalId) {
    const allTransactions = await txRepo.loadAll();
    const relevant = [];
    for (const tx of allTransactions) {
      if (tx.archived) continue;
      if (tx.metadata?.goalId !== goalId) continue;
      const category = await categoryRepo.findById(tx.categoryId);
      if (!category || category.systemRole !== 'savings') continue;
      relevant.push(tx);
    }
    return relevant.reduce((sum, tx) => sum + tx.amount, 0);
  }

  async function adjust(goalId) {
    const goal = await goalRepo.findById(goalId);
    if (!goal) {
      throw new Error('NOT_FOUND');
    }

    const current = await calculateGoalCurrent(goalId);
    const now = new Date().toISOString();

    const updated = {
      ...goal,
      current,
      updatedAt: now,
    };

    await goalRepo.save(updated);
    return updated;
  }

  async function createGoal({ userId, name, target, deadline, icon, color, priority }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 100) {
      throw new Error('VALIDATION_FAILED');
    }
    if (target === undefined || typeof target !== 'number' || !Number.isFinite(target) || target <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    if (deadline !== undefined && deadline !== null && !validateDate(deadline)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!icon || typeof icon !== 'string' || icon.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!color || typeof color !== 'string' || color.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!['low', 'medium', 'high'].includes(priority)) {
      throw new Error('VALIDATION_FAILED');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const goal = {
      id,
      userId,
      name: name.trim(),
      target,
      current: 0,
      currentLastRebuiltAt: null,
      deadline: deadline || null,
      icon: icon.trim(),
      color: color.trim(),
      priority,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await goalRepo.save(goal);
    return goal;
  }

  async function updateGoal({ goalId, updates }) {
    if (!goalId || typeof goalId !== 'string' || goalId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await goalRepo.findById(goalId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const allowedFields = ['name', 'target', 'deadline', 'icon', 'color'];
    const actualUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        actualUpdates[field] = updates[field];
      }
    }

    if (updates.priority !== undefined) {
      throw new Error('VALIDATION_FAILED');
    }

    if (actualUpdates.name !== undefined && (!actualUpdates.name || actualUpdates.name.trim() === '' || actualUpdates.name.length > 100)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.target !== undefined && (typeof actualUpdates.target !== 'number' || !Number.isFinite(actualUpdates.target) || actualUpdates.target <= 0)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.deadline !== undefined && actualUpdates.deadline !== null && !validateDate(actualUpdates.deadline)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.icon !== undefined && (!actualUpdates.icon || actualUpdates.icon.trim() === '')) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.color !== undefined && (!actualUpdates.color || actualUpdates.color.trim() === '')) {
      throw new Error('VALIDATION_FAILED');
    }

    const updated = {
      ...existing,
      ...actualUpdates,
      id: existing.id,
      userId: existing.userId,
      current: existing.current,
      currentLastRebuiltAt: existing.currentLastRebuiltAt,
      archived: existing.archived,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await goalRepo.save(updated);
    return updated;
  }

  async function depositToGoal({ userId, goalId, accountId, amount, date, description }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!goalId || typeof goalId !== 'string' || goalId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!validateDate(date)) {
      throw new Error('VALIDATION_FAILED');
    }

    const goal = await goalRepo.findById(goalId);
    if (!goal) {
      throw new Error('NOT_FOUND');
    }
    if (goal.userId !== userId) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    if (goal.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }

    const account = await accountRepo.findById(accountId);
    if (!account) {
      throw new Error('NOT_FOUND');
    }
    if (account.userId !== userId) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    if (account.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }

    if (amount > goal.target - goal.current) {
      throw new Error('VALIDATION_FAILED');
    }

    const savingsCategory = await categoryRepo.findSystem().then(cats => cats.find(c => c.systemRole === 'savings'));
    if (!savingsCategory || savingsCategory.userId !== userId) {
      throw new Error('NOT_FOUND');
    }

    const transaction = {
      id: generateId(),
      userId,
      accountId,
      amount,
      type: 'expense',
      categoryId: savingsCategory.id,
      description: description || '',
      date,
      notes: '',
      metadata: { goalId },
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let savedTransaction;
    let rebuiltGoal;
    await appTx.run(async () => {
      savedTransaction = await txRepo.save(transaction);
      if (!savedTransaction) {
        savedTransaction = transaction;
      }
      rebuiltGoal = await adjust(goalId);
    });

    return {
      transaction: savedTransaction,
      goal: rebuiltGoal,
    };
  }

  async function archiveGoal({ goalId }) {
    if (!goalId || typeof goalId !== 'string' || goalId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await goalRepo.findById(goalId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await goalRepo.save(existing);
    return existing;
  }

  async function rebuildGoalCurrent({ goalId }) {
    if (!goalId || typeof goalId !== 'string' || goalId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const goal = await goalRepo.findById(goalId);
    if (!goal) {
      throw new Error('NOT_FOUND');
    }

    const calculatedCurrent = await calculateGoalCurrent(goalId);
    const needsRebuild = calculatedCurrent !== goal.current;
    const now = new Date().toISOString();

    const updated = {
      ...goal,
      current: calculatedCurrent,
      currentLastRebuiltAt: now,
      updatedAt: now,
    };

    await goalRepo.save(updated);
    return { goal: updated, rebuilt: needsRebuild };
  }

  async function getActiveGoals({ userId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const all = await goalRepo.loadAll();
    const active = all.filter(goal => !goal.archived);
    active.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });
    return active;
  }

  async function getGoalEta({ goalId, currentDate }) {
    if (!goalId || typeof goalId !== 'string' || goalId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const goal = await goalRepo.findById(goalId);
    if (!goal) {
      throw new Error('NOT_FOUND');
    }

    const remaining = goal.target - goal.current;
    if (remaining <= 0) {
      return { goalId, remaining: 0, monthsNeeded: null, avgPerMonth: null, etaDate: null, unknown: true };
    }

    const allTransactions = await txRepo.loadAll();
    const qualifying = [];
    for (const tx of allTransactions) {
      if (tx.archived) continue;
      if (tx.metadata?.goalId !== goalId) continue;
      const category = await categoryRepo.findById(tx.categoryId);
      if (!category || category.systemRole !== 'savings') continue;
      qualifying.push(tx);
    }

    if (qualifying.length === 0) {
      return { goalId, remaining, monthsNeeded: null, avgPerMonth: null, etaDate: null, unknown: true };
    }

    const sortedDates = qualifying.map(tx => tx.date).sort();
    const firstDate = new Date(sortedDates[0]);
    const now = currentDate ? new Date(currentDate) : new Date();
    const monthsSpan = Math.max(1, (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth()) + 1);

    const totalSaved = qualifying.reduce((sum, tx) => sum + tx.amount, 0);
    const avgPerMonth = totalSaved / monthsSpan;

    if (avgPerMonth <= 0) {
      return { goalId, remaining, monthsNeeded: null, avgPerMonth: 0, etaDate: null, unknown: true };
    }

    const monthsNeeded = Math.ceil(remaining / avgPerMonth);
    const etaDate = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, 1);
    const etaDateStr = etaDate.toISOString().split('T')[0];

    return {
      goalId,
      remaining,
      monthsNeeded,
      avgPerMonth,
      etaDate: etaDateStr,
      unknown: false,
    };
  }

  async function getRequiredDepositsThisMonth({ goals, currentDate }) {
    if (!Array.isArray(goals)) {
      return 0;
    }

    const now = currentDate ? new Date(currentDate) : new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let total = 0;
    for (const goal of goals) {
      if (goal.archived) continue;
      const remaining = goal.target - goal.current;
      if (remaining <= 0) continue;
      if (!goal.deadline) continue;

      const deadline = new Date(goal.deadline);
      const deadlineYear = deadline.getFullYear();
      const deadlineMonth = deadline.getMonth();

      if (deadlineYear < currentYear || (deadlineYear === currentYear && deadlineMonth < currentMonth)) {
        total += remaining;
      } else {
        const monthsLeft = (deadlineYear - currentYear) * 12 + (deadlineMonth - currentMonth) + 1;
        total += Math.ceil(remaining / Math.max(1, monthsLeft));
      }
    }

    return total;
  }

  return {
    createGoal,
    updateGoal,
    depositToGoal,
    archiveGoal,
    rebuildGoalCurrent,
    getActiveGoals,
    getGoalEta,
    getRequiredDepositsThisMonth,
    adjust,
  };
}
