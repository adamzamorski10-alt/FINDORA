/**
 * Stage 5C — Backup creation service.
 *
 * Loads the current user's complete MVP dataset and produces
 * a validated, integrity-protected backup envelope.
 *
 * Does not write to storage or mutate production state.
 */

import { createEnvelope, BACKUP_VERSION, SCHEMA_VERSION } from './backup-format.js';

export function createBackupService({
  userRepository,
  accountRepository,
  categoryRepository,
  transactionRepository,
  budgetRepository,
  goalRepository,
  personRepository,
  receivableRepository,
  incomeProfileRepository,
  resellingProductRepository,
  resellingOrderRepository,
  resellingSaleRepository,
  resellingCostRepository,
  resellingTaskRepository,
  websitesClientRepository,
  websitesProjectRepository,
  websitesPaymentRepository,
}) {
  async function loadUserData(userId) {
    const loads = [
      userRepository.findById(userId),
      accountRepository.loadAll(),
      categoryRepository.loadAll(),
      transactionRepository.loadAll(),
      budgetRepository.findAll(),
      goalRepository.loadAll(),
      personRepository.loadAll(),
      receivableRepository.loadAll(),
      incomeProfileRepository.loadAll(),
    ];
    if (resellingProductRepository) loads.push(resellingProductRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (resellingOrderRepository) loads.push(resellingOrderRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (resellingSaleRepository) loads.push(resellingSaleRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (resellingCostRepository) loads.push(resellingCostRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (resellingTaskRepository) loads.push(resellingTaskRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (websitesClientRepository) loads.push(websitesClientRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (websitesProjectRepository) loads.push(websitesProjectRepository.loadAll()); else loads.push(Promise.resolve([]));
    if (websitesPaymentRepository) loads.push(websitesPaymentRepository.loadAll()); else loads.push(Promise.resolve([]));

    const [profile, accounts, categories, transactions, budgets, goals, people, receivables, incomeProfiles, resellingProducts, resellingOrders, resellingSales, resellingCosts, resellingTasks, websitesClients, websitesProjects, websitesPayments] = await Promise.all(loads);

    return {
      profile: profile ? [profile] : [],
      accounts: accounts || [],
      categories: categories || [],
      transactions: transactions || [],
      budgets: budgets || [],
      goals: goals || [],
      people: people || [],
      receivables: receivables || [],
      incomeProfiles: incomeProfiles || [],
      resellingProducts: resellingProducts || [],
      resellingOrders: resellingOrders || [],
      resellingSales: resellingSales || [],
      resellingCosts: resellingCosts || [],
      resellingTasks: resellingTasks || [],
      websitesClients: websitesClients || [],
      websitesProjects: websitesProjects || [],
      websitesPayments: websitesPayments || [],
    };
  }

  async function createBackup({ userId, createdAt, appVersion }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const data = await loadUserData(userId);

    const envelope = await createEnvelope({
      data,
      userId,
      createdAt,
      appVersion: appVersion || 'stage-5c',
    });

    return envelope;
  }

  async function backupToString(envelope) {
    return JSON.stringify(envelope, null, 2);
  }

  async function backupToBuffer(envelope) {
    const str = await backupToString(envelope);
    return new TextEncoder().encode(str);
  }

  return {
    createBackup,
    backupToString,
    backupToBuffer,
    BACKUP_VERSION,
    SCHEMA_VERSION,
  };
}
