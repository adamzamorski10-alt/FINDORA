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
  const requiredCollections = ['profile', 'accounts', 'categories', 'transactions', 'budgets', 'goals', 'people', 'receivables', 'incomeProfiles', 'resellingProducts', 'resellingOrders', 'resellingSales', 'resellingCosts', 'resellingTasks'];
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

  const personIds = new Set();
  for (const person of data.people) {
    if (!person.id || !person.userId || !person.name) {
      errors.push(`Invalid person: missing required fields (${person.id || 'unknown'})`);
    }
    if (personIds.has(person.id)) {
      errors.push(`Duplicate person id: ${person.id}`);
    }
    personIds.add(person.id);
  }

  const receivableIds = new Set();
  for (const receivable of data.receivables) {
    if (!receivable.id || !receivable.userId || !receivable.personId || receivable.amount === undefined || !receivable.description || !receivable.date || !receivable.sourceAccountId) {
      errors.push(`Invalid receivable: missing required fields (${receivable.id || 'unknown'})`);
    }
    if (receivableIds.has(receivable.id)) {
      errors.push(`Duplicate receivable id: ${receivable.id}`);
    }
    receivableIds.add(receivable.id);
    if (!personIds.has(receivable.personId)) {
      errors.push(`Receivable ${receivable.id} references non-existent person ${receivable.personId}`);
    }
  }

  const resellingProductIds = new Set();
  for (const product of data.resellingProducts) {
    if (!product.id || !product.userId || !product.incomeProfileId || !product.name || product.purchasePrice === undefined || !product.purchaseDate || product.quantity === undefined) {
      errors.push(`Invalid reselling product: missing required fields (${product.id || 'unknown'})`);
    }
    if (resellingProductIds.has(product.id)) {
      errors.push(`Duplicate reselling product id: ${product.id}`);
    }
    resellingProductIds.add(product.id);
  }

  const resellingOrderIds = new Set();
  for (const order of data.resellingOrders) {
    if (!order.id || !order.userId || !order.incomeProfileId || !order.orderNumber || !order.date || !order.items || order.items.length === 0) {
      errors.push(`Invalid reselling order: missing required fields (${order.id || 'unknown'})`);
    }
    if (resellingOrderIds.has(order.id)) {
      errors.push(`Duplicate reselling order id: ${order.id}`);
    }
    resellingOrderIds.add(order.id);
  }

  const resellingSaleIds = new Set();
  for (const sale of data.resellingSales) {
    if (!sale.id || !sale.userId || !sale.incomeProfileId || !sale.productId || sale.quantity === undefined || sale.salePrice === undefined || !sale.saleDate) {
      errors.push(`Invalid reselling sale: missing required fields (${sale.id || 'unknown'})`);
    }
    if (resellingSaleIds.has(sale.id)) {
      errors.push(`Duplicate reselling sale id: ${sale.id}`);
    }
    resellingSaleIds.add(sale.id);
    if (!resellingProductIds.has(sale.productId)) {
      errors.push(`Reselling sale ${sale.id} references non-existent product ${sale.productId}`);
    }
  }

  const resellingCostIds = new Set();
  for (const cost of data.resellingCosts) {
    if (!cost.id || !cost.userId || !cost.incomeProfileId || cost.amount === undefined || !cost.category || !cost.date || !cost.description) {
      errors.push(`Invalid reselling cost: missing required fields (${cost.id || 'unknown'})`);
    }
    if (resellingCostIds.has(cost.id)) {
      errors.push(`Duplicate reselling cost id: ${cost.id}`);
    }
    resellingCostIds.add(cost.id);
  }

  const resellingTaskIds = new Set();
  for (const task of data.resellingTasks) {
    if (!task.id || !task.userId || !task.incomeProfileId || !task.title) {
      errors.push(`Invalid reselling task: missing required fields (${task.id || 'unknown'})`);
    }
    if (resellingTaskIds.has(task.id)) {
      errors.push(`Duplicate reselling task id: ${task.id}`);
    }
    resellingTaskIds.add(task.id);
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

  const collections = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'people', 'receivables', 'incomeProfiles', 'resellingProducts', 'resellingOrders', 'resellingSales', 'resellingCosts', 'resellingTasks', 'websitesClients', 'websitesProjects'];
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
  personRepository,
  receivableRepository,
  incomeProfileRepository,
  resellingProductRepository,
  resellingOrderRepository,
  resellingSaleRepository,
  resellingCostRepository,
  resellingTaskRepository,
  goalModule,
  categoryModule,
} = {}) {
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
          `person:${currentUserId}:`,
          `receivable:${currentUserId}:`,
          `incomeProfile:${currentUserId}:`,
          `resellingProduct:${currentUserId}:`,
          `resellingOrder:${currentUserId}:`,
          `resellingSale:${currentUserId}:`,
          `resellingCost:${currentUserId}:`,
          `resellingTask:${currentUserId}:`,
          `websitesClient:${currentUserId}:`,
          `websitesProject:${currentUserId}:`,
          `websitesPayment:${currentUserId}:`,
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

        for (const person of backupData.people) {
          const key = `person:${currentUserId}:${person.id}`;
          await storage.set(key, person);
        }

        for (const receivable of backupData.receivables) {
          const key = `receivable:${currentUserId}:${receivable.id}`;
          await storage.set(key, receivable);
        }

        for (const incomeProfile of backupData.incomeProfiles) {
          const key = `incomeProfile:${currentUserId}:${incomeProfile.id}`;
          await storage.set(key, incomeProfile);
        }

        for (const product of backupData.resellingProducts) {
          const key = `resellingProduct:${currentUserId}:${product.id}`;
          await storage.set(key, product);
        }

        for (const order of backupData.resellingOrders) {
          const key = `resellingOrder:${currentUserId}:${order.id}`;
          await storage.set(key, order);
        }

        for (const sale of backupData.resellingSales) {
          const key = `resellingSale:${currentUserId}:${sale.id}`;
          await storage.set(key, sale);
        }

        for (const cost of backupData.resellingCosts) {
          const key = `resellingCost:${currentUserId}:${cost.id}`;
          await storage.set(key, cost);
        }

        for (const task of backupData.resellingTasks) {
          const key = `resellingTask:${currentUserId}:${task.id}`;
          await storage.set(key, task);
        }

        for (const client of (backupData.websitesClients || [])) {
          await storage.set(`websitesClient:${currentUserId}:${client.id}`, client);
        }

        for (const project of (backupData.websitesProjects || [])) {
          await storage.set(`websitesProject:${currentUserId}:${project.id}`, project);
        }
        for (const payment of (backupData.websitesPayments || [])) {
          await storage.set(`websitesPayment:${currentUserId}:${payment.id}`, payment);
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
        `person:${currentUserId}:`,
        `receivable:${currentUserId}:`,
        `incomeProfile:${currentUserId}:`,
        `resellingProduct:${currentUserId}:`,
        `resellingOrder:${currentUserId}:`,
        `resellingSale:${currentUserId}:`,
        `resellingCost:${currentUserId}:`,
        `resellingTask:${currentUserId}:`,
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

      for (const person of snapshotData.people) {
        const key = `person:${currentUserId}:${person.id}`;
        await storage.set(key, person);
      }

      for (const receivable of snapshotData.receivables) {
        const key = `receivable:${currentUserId}:${receivable.id}`;
        await storage.set(key, receivable);
      }

      for (const incomeProfile of snapshotData.incomeProfiles) {
        const key = `incomeProfile:${currentUserId}:${incomeProfile.id}`;
        await storage.set(key, incomeProfile);
      }

      for (const product of snapshotData.resellingProducts) {
        const key = `resellingProduct:${currentUserId}:${product.id}`;
        await storage.set(key, product);
      }

      for (const order of snapshotData.resellingOrders) {
        const key = `resellingOrder:${currentUserId}:${order.id}`;
        await storage.set(key, order);
      }

      for (const sale of snapshotData.resellingSales) {
        const key = `resellingSale:${currentUserId}:${sale.id}`;
        await storage.set(key, sale);
      }

      for (const cost of snapshotData.resellingCosts) {
        const key = `resellingCost:${currentUserId}:${cost.id}`;
        await storage.set(key, cost);
      }

      for (const task of snapshotData.resellingTasks) {
        const key = `resellingTask:${currentUserId}:${task.id}`;
        await storage.set(key, task);
      }
      for (const client of snapshotData.websitesClients || []) {
        await storage.set(`websitesClient:${currentUserId}:${client.id}`, client);
      }
      for (const project of snapshotData.websitesProjects || []) {
        await storage.set(`websitesProject:${currentUserId}:${project.id}`, project);
      }
      for (const payment of snapshotData.websitesPayments || []) {
        await storage.set(`websitesPayment:${currentUserId}:${payment.id}`, payment);
      }
    });

    return {
      success: true,
      rolledBackAt: new Date().toISOString(),
    };
  }

  async function loadCurrentData(userId) {
    const loads = [
      userRepository ? userRepository.findById(userId) : Promise.resolve(null),
      accountRepository ? accountRepository.loadAll() : Promise.resolve([]),
      categoryRepository ? categoryRepository.loadAll() : Promise.resolve([]),
      transactionRepository ? transactionRepository.loadAll() : Promise.resolve([]),
      budgetRepository ? budgetRepository.findAll() : Promise.resolve([]),
      goalRepository ? goalRepository.loadAll() : Promise.resolve([]),
      personRepository ? personRepository.loadAll() : Promise.resolve([]),
      receivableRepository ? receivableRepository.loadAll() : Promise.resolve([]),
      incomeProfileRepository ? incomeProfileRepository.loadAll() : Promise.resolve([]),
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
      websitesClients: websitesClients || [],
      websitesProjects: websitesProjects || [],
      websitesPayments: websitesPayments || [],
      resellingProducts: resellingProducts || [],
      resellingOrders: resellingOrders || [],
      resellingSales: resellingSales || [],
      resellingCosts: resellingCosts || [],
      resellingTasks: resellingTasks || [],
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
