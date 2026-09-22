/**
 * Stage G4.7 — SafeToSpendModule
 *
 * Application service for Safe-to-Spend calculation orchestration.
 *
 * Frozen MVP-1 formula:
 *   safeTotal = freeFunds - goalsReq
 *   perDay    = safeTotal / daysLeft (daysLeft clamped to >= 1)
 *
 * No bills component in MVP-1.
 */

export function createSafeToSpendModule({
  safeToSpendCalculator,
  accountRepository,
  transactionRepository,
  goalRepository,
  goalRequiredDepositCalculator,
}) {
  const calculator = safeToSpendCalculator;
  const accountRepo = accountRepository;
  const txRepo = transactionRepository;
  const goalRepo = goalRepository;
  const depositCalculator = goalRequiredDepositCalculator;

  function validateDate(date) {
    if (!date || typeof date !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  async function computeAccountBalance(accountId) {
    const transactions = await txRepo.findByAccount(accountId);
    const nonArchived = transactions.filter(tx => !tx.archived);
    return nonArchived.reduce((sum, tx) => {
      if (tx.type === 'income') return sum + tx.amount;
      if (tx.type === 'expense') return sum - tx.amount;
      return sum;
    }, 0);
  }

  async function computeSafeAccountBalance(accountId) {
    const transactions = await txRepo.findByAccount(accountId);
    const nonArchived = transactions.filter(tx => !tx.archived);
    const nonOpeningBalance = nonArchived.filter(tx => !(tx.metadata && tx.metadata.openingBalance === true));
    return nonOpeningBalance.reduce((sum, tx) => {
      if (tx.type === 'income') return sum + tx.amount;
      if (tx.type === 'expense') return sum - tx.amount;
      return sum;
    }, 0);
  }

  async function computeFreeFunds() {
    const accounts = await accountRepo.loadAll();
    const spendable = accounts.filter(a => !a.archived && (a.type === 'bank' || a.type === 'cash'));

    let total = 0;
    for (const account of spendable) {
      total += await computeSafeAccountBalance(account.id);
    }

    return total;
  }

  async function computeGoalsReq(currentDate) {
    const goals = await goalRepo.loadAll();
    const now = currentDate ? new Date(currentDate) : new Date();

    if (!depositCalculator) {
      return 0;
    }

    return depositCalculator.compute({ goals, currentDate: now });
  }

  function computeDaysLeft(currentDate) {
    const now = currentDate ? new Date(currentDate) : new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diff = lastDay.getDate() - now.getDate();
    return Math.max(1, diff);
  }

  async function computeSafeToSpend({ freeFunds, goalsReq, daysLeft }) {
    const result = calculator.compute({
      freeFunds: typeof freeFunds === 'number' && Number.isFinite(freeFunds) ? freeFunds : 0,
      goalsReq: typeof goalsReq === 'number' && Number.isFinite(goalsReq) ? goalsReq : 0,
      daysLeft: typeof daysLeft === 'number' && Number.isFinite(daysLeft) ? daysLeft : 0,
    });

    return result;
  }

  async function computeForCurrentState({ currentDate } = {}) {
    const freeFunds = await computeFreeFunds();
    const goalsReq = await computeGoalsReq(currentDate);
    const daysLeft = computeDaysLeft(currentDate);

    const result = await computeSafeToSpend({ freeFunds, goalsReq, daysLeft });

    return {
      freeFunds,
      goalsReq,
      daysLeft,
      safeTotal: result.safeTotal,
      perDay: result.perDay,
    };
  }

  return {
    computeSafeToSpend,
    computeForCurrentState,
  };
}
