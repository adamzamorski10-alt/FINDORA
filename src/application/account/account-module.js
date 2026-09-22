import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';

export function createAccountModule({ accountRepository, transactionRepository, applicationTransaction, openingBalanceCategoryId }) {
  const accountRepo = accountRepository;
  const txRepo = transactionRepository;
  const appTx = applicationTransaction;

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function todayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function validateHexColor(color) {
    if (!color || typeof color !== 'string') return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  async function createAccount({ userId, name, type, icon, color, openingBalance }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 100) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!['cash', 'bank', 'savings'].includes(type)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!icon || typeof icon !== 'string' || icon.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!validateHexColor(color)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (openingBalance !== undefined && (typeof openingBalance !== 'number' || !Number.isFinite(openingBalance))) {
      throw new Error('VALIDATION_FAILED');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const account = {
      id,
      userId,
      name: name.trim(),
      type,
      icon: icon.trim(),
      color: color.trim(),
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await appTx.run(async () => {
      await accountRepo.save(account);

      const allAccounts = await accountRepo.loadAll();
      const existingNames = new Set(allAccounts.map(a => a.name));

      const defaults = [
        { name: 'Konto', type: 'bank', icon: 'landmark', color: '#4A90D9' },
        { name: 'Skarbonka', type: 'savings', icon: 'piggy-bank', color: '#50C878' },
        { name: 'Inne', type: 'cash', icon: 'wallet', color: '#888888' },
      ];

      for (const def of defaults) {
        if (!existingNames.has(def.name)) {
          await accountRepo.save({
            id: generateId(),
            userId,
            name: def.name,
            type: def.type,
            icon: def.icon,
            color: def.color,
            archived: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      if (openingBalance !== undefined && openingBalance !== 0) {
        const txType = openingBalance < 0 ? 'expense' : 'income';
        const amount = Math.abs(openingBalance);
        const transaction = {
          id: generateId(),
          userId,
          accountId: id,
          amount,
          type: txType,
          categoryId: openingBalanceCategoryId,
          description: 'Opening balance',
          date: todayDate(),
          notes: '',
          metadata: { openingBalance: true },
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        await txRepo.save(transaction);
      }
    });

    return account;
  }

  async function getAccount({ accountId }) {
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await accountRepo.findById(accountId);
  }

  async function getActiveAccounts({ userId }) {
    const all = await accountRepo.loadAll();
    return all.filter(account => !account.archived);
  }

  async function updateAccount({ accountId, updates }) {
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const allowedFields = ['name', 'icon', 'color', 'type'];
    const actualUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        actualUpdates[field] = updates[field];
      }
    }

    if (actualUpdates.type !== undefined && !['cash', 'bank', 'savings'].includes(actualUpdates.type)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.name !== undefined && (!actualUpdates.name || actualUpdates.name.trim() === '' || actualUpdates.name.length > 100)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.icon !== undefined && (!actualUpdates.icon || actualUpdates.icon.trim() === '')) {
      throw new Error('VALIDATION_FAILED');
    }
    if (actualUpdates.color !== undefined && !validateHexColor(actualUpdates.color)) {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await accountRepo.findById(accountId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = {
      ...existing,
      ...actualUpdates,
      id: existing.id,
      userId: existing.userId,
      archived: existing.archived,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await accountRepo.save(updated);
    return updated;
  }

  async function archiveAccount({ accountId }) {
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const existing = await accountRepo.findById(accountId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }
    existing.archived = true;
    existing.updatedAt = new Date().toISOString();
    await accountRepo.save(existing);
    return existing;
  }

  return {
    createAccount,
    getAccount,
    getActiveAccounts,
    updateAccount,
    archiveAccount,
  };
}