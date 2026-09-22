/**
 * Stage 5C — Restore service with validation, preview, and atomic execution.
 *
 * Restore replaces the current user's entire dataset.
 * All writes happen inside ONE ApplicationTransaction.
 * Goal.current is rebuilt inside the same transaction.
 * System categories are seeded inside the same transaction.
 */

import { validateEnvelopeStructure, verifyIntegrity, BACKUP_VERSION, SCHEMA_VERSION } from './backup-format.js';

export class RestoreError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export function validateRestoreBackup(envelope, currentUserId) {
  const structureErrors = validateEnvelopeStructure(envelope);
  if (structureErrors.length > 0) {
    return { valid: false, errors: structureErrors };
  }

  if (envelope.backupVersion !== BACKUP_VERSION) {
    return { valid: false, errors: [`Unsupported backupVersion: ${envelope.backupVersion}`] };
  }

  if (envelope.schemaVersion !== SCHEMA_VERSION) {
    return { valid: false, errors: [`Unsupported schemaVersion: ${envelope.schemaVersion}`] };
  }

  if (!envelope.userId || typeof envelope.userId !== 'string' || envelope.userId.trim() === '') {
    return { valid: false, errors: ['Missing or invalid userId'] };
  }

  if (currentUserId && envelope.userId !== currentUserId) {
    return { valid: false, errors: [`userId mismatch: backup is for "${envelope.userId}", current user is "${currentUserId}"`] };
  }

  const data = envelope.data || {};
  const requiredCollections = ['profile', 'accounts', 'categories', 'transactions', 'budgets', 'goals'];
  for (const collection of requiredCollections) {
    if (!Array.isArray(data[collection])) {
      return { valid: false, errors: [`Missing or invalid collection: ${collection}`] };
    }
  }

  const entityErrors = validateEntityShapes(data);
  if (entityErrors.length > 0) {
    return { valid: false, errors: entityErrors };
  }

  return { valid: true, errors: [] };
}

function validateEntityShapes(data) {
  const errors = [];

  if (data.profile && data.profile.length > 0) {
    const profile = data.profile[0];
    if (!profile.id || typeof profile.id !== 'string') {
      errors.push('Invalid profile: missing id');
    }
    if (profile.settings && typeof profile.settings !== 'object') {
      errors.push('Invalid profile: settings must be object');
    }
  }

  const accountIds = new Set();
  for (const account of data.accounts) {
    if (!account.id || !account.userId || !account.name || !account.type) {
      errors.push(`Invalid account: missing required fields (${account.id || 'unknown'})`);
    }
    if (accountIds.has(account.id)) {
      errors.push(`Duplicate account id: ${account.id}`);
    }
    accountIds.add(account.id);
  }

  const categoryIds = new Set();
  const systemRoles = new Set();
  for (const category of data.categories) {
    if (!category.id || !category.userId || !category.name || !category.type) {
      errors.push(`Invalid category: missing required fields (${category.id || 'unknown'})`);
    }
    if (categoryIds.has(category.id)) {
      errors.push(`Duplicate category id: ${category.id}`);
    }
    categoryIds.add(category.id);

    if (category.isSystem) {
      if (category.systemRole && systemRoles.has(category.systemRole)) {
        errors.push(`Duplicate system category role: ${category.systemRole}`);
      }
      if (category.systemRole) systemRoles.add(category.systemRole);
    }
  }

  const transactionIds = new Set();
  for (const tx of data.transactions) {
    if (!tx.id || !tx.userId || !tx.accountId || tx.amount === undefined || !tx.type || !tx.date) {
      errors.push(`Invalid transaction: missing required fields (${tx.id || 'unknown'})`);
    }
    if (transactionIds.has(tx.id)) {
      errors.push(`Duplicate transaction id: ${tx.id}`);
    }
    transactionIds.add(tx.id);

    if (!accountIds.has(tx.accountId)) {
      errors.push(`Transaction ${tx.id} references non-existent account ${tx.accountId}`);
    }

    if (tx.categoryId !== null && tx.categoryId !== undefined && !categoryIds.has(tx.categoryId)) {
      errors.push(`Transaction ${tx.id} references non-existent category ${tx.categoryId}`);
    }

    if (tx.metadata && tx.metadata.goalId !== undefined && tx.metadata.goalId !== null) {
      if (!data.goals.some(g => g.id === tx.metadata.goalId)) {
        errors.push(`Transaction ${tx.id} references non-existent goal ${tx.metadata.goalId}`);
      }
    }
  }

  const budgetIds = new Set();
  for (const budget of data.budgets) {
    if (!budget.id || !budget.userId || !budget.categoryId || budget.amount === undefined) {
      errors.push(`Invalid budget: missing required fields (${budget.id || 'unknown'})`);
    }
    if (budgetIds.has(budget.id)) {
      errors.push(`Duplicate budget id: ${budget.id}`);
    }
    budgetIds.add(budget.id);

    if (!categoryIds.has(budget.categoryId)) {
      errors.push(`Budget ${budget.id} references non-existent category ${budget.categoryId}`);
    }
  }

  const goalIds = new Set();
  for (const goal of data.goals) {
    if (!goal.id || !goal.userId || !goal.name || goal.target === undefined) {
      errors.push(`Invalid goal: missing required fields (${goal.id || 'unknown'})`);
    }
    if (goalIds.has(goal.id)) {
      errors.push(`Duplicate goal id: ${goal.id}`);
    }
    goalIds.add(goal.id);
  }

  return errors;
}

export function computeRestorePreview(currentData, backupEnvelope) {
  const backupData = backupEnvelope.data || {};
  const current = currentData || {};

  const preview = {
    backupVersion: backupEnvelope.backupVersion,
    schemaVersion: backupEnvelope.schemaVersion,
    createdAt: backupEnvelope.createdAt,
    userId: backupEnvelope.userId,
    collections: {},
  };

  const collections = ['accounts', 'categories', 'transactions', 'budgets', 'goals'];
  for (const collection of collections) {
    const currentCount = Array.isArray(current[collection]) ? current[collection].length : 0;
    const backupCount = Array.isArray(backupData[collection]) ? backupData[collection].length : 0;
    preview.collections[collection] = {
      current: currentCount,
      backup: backupCount,
    };
  }

  if (current.profile && backupData.profile) {
    preview.profileChanged = JSON.stringify(current.profile) !== JSON.stringify(backupData.profile);
  }

  preview.warnings = [];

  return preview;
}

export function createPreRestoreSnapshot(currentData, userId) {
  return {
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: 'stage-5c-pre-restore',
    userId: userId || 'pre-restore',
    metadata: {
      totalCollections: Object.keys(currentData || {}).length,
      totalSize: JSON.stringify(currentData).length,
      source: 'pre-restore-snapshot'
    },
    data: JSON.parse(JSON.stringify(currentData || {})),
  };
}

export function createRestoreService({
  storage,
  appTx,
  listKeys,
  userRepository,
  accountRepository,
  categoryRepository,
  transactionRepository,
  budgetRepository,
  goalRepository,
  goalModule,
  categoryModule,
}) {
  async function executeRestore(backupEnvelope, options = {}) {
    const currentUserId = options.userId || backupEnvelope.userId;

    const validation = validateRestoreBackup(backupEnvelope, currentUserId);
    if (!validation.valid) {
      throw new RestoreError('Invalid backup: ' + validation.errors.join(', '), 'INVALID_BACKUP');
    }

    const integrityValid = await verifyIntegrity(backupEnvelope);
    if (!integrityValid) {
      throw new RestoreError('Invalid backup: checksum verification failed', 'INVALID_CHECKSUM');
    }

    if (options.dryRun) {
      const currentData = await loadCurrentData(currentUserId);
      return {
        success: true,
        dryRun: true,
        preview: computeRestorePreview(currentData, backupEnvelope),
      };
    }

    const preRestore = createPreRestoreSnapshot(await loadCurrentData(currentUserId), currentUserId);

    try {
      await appTx.run(async () => {
        const currentKeys = await listKeys();
        const userPrefix = `user:${currentUserId}:`;
        const entityPrefixes = [
          `account:${currentUserId}:`,
          `category:${currentUserId}:`,
          `transaction:${currentUserId}:`,
          `budget:${currentUserId}:`,
          `goal:${currentUserId}:`,
        ];

        const keysToRemove = currentKeys.filter(key => {
          if (key === `user:${currentUserId}`) return true;
          for (const prefix of entityPrefixes) {
            if (key.startsWith(prefix)) return true;
          }
          return false;
        });

        for (const key of keysToRemove) {
          await storage.remove(key);
        }

        const backupData = backupEnvelope.data || {};

        if (backupData.profile && backupData.profile.length > 0) {
          await storage.set(`user:${currentUserId}`, backupData.profile[0]);
        }

        for (const account of backupData.accounts) {
          const key = `account:${currentUserId}:${account.id}`;
          await storage.set(key, account);
        }

        for (const category of backupData.categories) {
          const key = `category:${currentUserId}:${category.id}`;
          await storage.set(key, category);
        }

        for (const transaction of backupData.transactions) {
          const key = `transaction:${currentUserId}:${transaction.id}`;
          await storage.set(key, transaction);
        }

        for (const budget of backupData.budgets) {
          const key = `budget:${currentUserId}:${budget.id}`;
          await storage.set(key, budget);
        }

        for (const goal of backupData.goals) {
          const key = `goal:${currentUserId}:${goal.id}`;
          await storage.set(key, goal);
        }

        const hasSystemCategories = backupData.categories.some(c => c.isSystem && c.systemRole);
        if (!hasSystemCategories) {
          const seeded = await categoryModule.seedSystemCategories({ userId: currentUserId });
        }

        const activeGoals = backupData.goals.filter(g => !g.archived);
        for (const goal of activeGoals) {
          await goalModule.rebuildGoalCurrent({ goalId: goal.id });
        }
      });

      return {
        success: true,
        preRestoreBackup: preRestore,
        restoredAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        preRestoreBackup: preRestore,
        error: err.message || 'Restore failed',
        rollbackAvailable: true,
      };
    }
  }

  async function rollbackRestore(preRestoreSnapshot) {
    if (!preRestoreSnapshot) {
      throw new RestoreError('No pre-restore snapshot available for rollback', 'NO_ROLLBACK');
    }

    const currentUserId = preRestoreSnapshot.userId;
    if (!currentUserId) {
      throw new RestoreError('Invalid pre-restore snapshot: missing userId', 'INVALID_ROLLBACK');
    }

    await appTx.run(async () => {
      const currentKeys = await listKeys();
      const userPrefix = `user:${currentUserId}:`;
      const entityPrefixes = [
        `account:${currentUserId}:`,
        `category:${currentUserId}:`,
        `transaction:${currentUserId}:`,
        `budget:${currentUserId}:`,
        `goal:${currentUserId}:`,
      ];

      const keysToRemove = currentKeys.filter(key => {
        if (key === `user:${currentUserId}`) return true;
        for (const prefix of entityPrefixes) {
          if (key.startsWith(prefix)) return true;
        }
        return false;
      });

      for (const key of keysToRemove) {
        await storage.remove(key);
      }

      const snapshotData = preRestoreSnapshot.data || {};

      if (snapshotData.profile && snapshotData.profile.length > 0) {
        await storage.set(`user:${currentUserId}`, snapshotData.profile[0]);
      }

      for (const account of snapshotData.accounts) {
        const key = `account:${currentUserId}:${account.id}`;
        await storage.set(key, account);
      }

      for (const category of snapshotData.categories) {
        const key = `category:${currentUserId}:${category.id}`;
        await storage.set(key, category);
      }

      for (const transaction of snapshotData.transactions) {
        const key = `transaction:${currentUserId}:${transaction.id}`;
        await storage.set(key, transaction);
      }

      for (const budget of snapshotData.budgets) {
        const key = `budget:${currentUserId}:${budget.id}`;
        await storage.set(key, budget);
      }

      for (const goal of snapshotData.goals) {
        const key = `goal:${currentUserId}:${goal.id}`;
        await storage.set(key, goal);
      }
    });

    return {
      success: true,
      rolledBackAt: new Date().toISOString(),
    };
  }

  async function loadCurrentData(userId) {
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

  return {
    executeRestore,
    rollbackRestore,
    validateRestoreBackup,
    computeRestorePreview,
    createPreRestoreSnapshot,
  };
}
