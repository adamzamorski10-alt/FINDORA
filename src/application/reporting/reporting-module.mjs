/**
 * Stage G4.8 — ReportingModule
 *
 * Read-model aggregation for reports.
 *
 * Frozen MVP-1 operations:
 *   getMonthlySummary
 *   getMonthCategoryBreakdown
 *   getAccountBalance
 *
 * No persistence. No mutation. No StorageAdapter access.
 */

export function createReportingModule({
  transactionRepository,
  accountRepository,
  categoryRepository,
}) {
  const txRepo = transactionRepository;
  const accountRepo = accountRepository;
  const categoryRepo = categoryRepository;

  function validateMonthKey(monthKey) {
    if (!monthKey || typeof monthKey !== 'string') return false;
    return /^\d{4}-\d{2}$/.test(monthKey);
  }

  async function loadCategoriesMap() {
    const categories = await categoryRepo.loadAll();
    const map = new Map();
    for (const category of categories) {
      map.set(category.id, category);
    }
    return map;
  }

  function isGoalContribution(tx, categoriesMap) {
    if (!tx.categoryId) return false;
    const category = categoriesMap.get(tx.categoryId);
    return category !== undefined && category.systemRole === 'savings';
  }

  function isReceivableTransaction(tx) {
    return tx.metadata && tx.metadata.receivableId !== undefined && tx.metadata.receivableId !== null;
  }

  function filterBaseReportingTransactions(transactions) {
    return transactions.filter(tx => {
      if (tx.archived) return false;
      if (tx.metadata && tx.metadata.openingBalance === true) return false;
      if (isReceivableTransaction(tx)) return false;
      return true;
    });
  }

  function filterExpenseReportingTransactions(transactions, categoriesMap) {
    return transactions.filter(tx => {
      if (tx.archived) return false;
      if (tx.metadata && tx.metadata.openingBalance === true) return false;
      if (isGoalContribution(tx, categoriesMap)) return false;
      if (isReceivableTransaction(tx)) return false;
      return true;
    });
  }

  async function getMonthlySummary({ userId, monthKey }) {
    if (!validateMonthKey(monthKey)) {
      throw new Error('VALIDATION_FAILED');
    }

    const transactions = await txRepo.findByMonth(monthKey);
    const categoriesMap = await loadCategoriesMap();
    const filtered = filterExpenseReportingTransactions(transactions, categoriesMap);

    let income = 0;
    let expense = 0;
    const transactionCount = filtered.length;

    for (const tx of filtered) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    }

    return {
      monthKey,
      income,
      expense,
      net: income - expense,
      transactionCount,
    };
  }

  async function getMonthCategoryBreakdown({ userId, monthKey, type }) {
    if (!validateMonthKey(monthKey)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (type !== undefined && type !== 'income' && type !== 'expense') {
      throw new Error('VALIDATION_FAILED');
    }

    const transactions = await txRepo.findByMonth(monthKey);
    const categoriesMap = await loadCategoriesMap();
    const baseFiltered = filterBaseReportingTransactions(transactions);
    const effectiveFiltered = type === 'income'
      ? baseFiltered
      : filterExpenseReportingTransactions(baseFiltered, categoriesMap);

    const byCategory = {};

    for (const tx of effectiveFiltered) {
      if (type !== undefined && tx.type !== type) continue;

      const key = tx.categoryId || 'uncategorized';
      if (!byCategory[key]) {
        byCategory[key] = { total: 0, count: 0 };
      }
      byCategory[key].total += tx.amount;
      byCategory[key].count += 1;
    }

    return {
      monthKey,
      byCategory,
    };
  }

  async function getAccountBalance({ accountId }) {
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const account = await accountRepo.findById(accountId);
    if (!account) {
      throw new Error('NOT_FOUND');
    }

    const transactions = await txRepo.findByAccount(accountId);
    const nonArchived = transactions.filter(tx => !tx.archived);

    let balance = 0;
    for (const tx of nonArchived) {
      if (tx.type === 'income') {
        balance += tx.amount;
      } else if (tx.type === 'expense') {
        balance -= tx.amount;
      }
    }

    return {
      accountId,
      balance,
    };
  }

  return {
    getMonthlySummary,
    getMonthCategoryBreakdown,
    getAccountBalance,
  };
}
