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
}) {
  async function loadUserData(userId) {
    const [profile, accounts, categories, transactions, budgets, goals] = await Promise.all([
      userRepository.findById(userId),
      accountRepository.loadAll(),
      categoryRepository.loadAll(),
      transactionRepository.loadAll(),
      budgetRepository.findAll(),
      goalRepository.loadAll(),
    ]);

    return {
      profile: profile ? [profile] : [],
      accounts: accounts || [],
      categories: categories || [],
      transactions: transactions || [],
      budgets: budgets || [],
      goals: goals || [],
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
