import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';

export function createReceivablesModule({
  personRepository,
  receivableRepository,
  transactionRepository,
  accountRepository,
  applicationTransaction,
}) {
  const personRepo = personRepository;
  const receivableRepo = receivableRepository;
  const txRepo = transactionRepository;
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

  async function createPerson({ userId, name, note }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!name || typeof name !== 'string' || name.trim() === '' || name.length > 100) {
      throw new Error('VALIDATION_FAILED');
    }
    if (note !== undefined && note !== null && typeof note !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }

    const id = generateId();
    const now = new Date().toISOString();
    const person = {
      id,
      userId,
      name: name.trim(),
      note: note ? String(note).trim() : '',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await personRepo.save(person);
    return person;
  }

  async function createReceivable({ userId, personId, amount, description, date, sourceAccountId, dueDate }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!personId || typeof personId !== 'string' || personId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!description || typeof description !== 'string' || description.trim() === '' || description.length > 500) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!validateDate(date)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!sourceAccountId || typeof sourceAccountId !== 'string' || sourceAccountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (dueDate !== undefined && dueDate !== null && !validateDate(dueDate)) {
      throw new Error('VALIDATION_FAILED');
    }

    const person = await validateReference(personRepo, personId, userId, 'person');
    if (person.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }

    const account = await validateReference(accountRepo, sourceAccountId, userId, 'account');
    if (account.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }

    const id = generateId();
    const now = new Date().toISOString();

    const receivable = {
      id,
      userId,
      personId,
      amount,
      remainingAmount: amount,
      description: description.trim(),
      date,
      sourceAccountId,
      dueDate: dueDate || null,
      status: 'open',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    const transaction = {
      id: generateId(),
      userId,
      accountId: sourceAccountId,
      amount,
      type: 'expense',
      categoryId: null,
      description: description.trim(),
      date,
      notes: '',
      metadata: { receivableId: id },
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    await appTx.run(async () => {
      await receivableRepo.save(receivable);
      await txRepo.save(transaction);
    });

    return { receivable, transaction };
  }

  async function recordRepayment({ userId, receivableId, amount, destinationAccountId, date, description }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!receivableId || typeof receivableId !== 'string' || receivableId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!destinationAccountId || typeof destinationAccountId !== 'string' || destinationAccountId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!validateDate(date)) {
      throw new Error('VALIDATION_FAILED');
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }

    const receivable = await validateReference(receivableRepo, receivableId, userId, 'receivable');
    if (receivable.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }
    if (receivable.status === 'paid' || receivable.status === 'forgiven') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount > receivable.remainingAmount) {
      throw new Error('VALIDATION_FAILED');
    }

    const destinationAccount = await validateReference(accountRepo, destinationAccountId, userId, 'account');
    if (destinationAccount.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }

    const now = new Date().toISOString();
    const newRemaining = receivable.remainingAmount - amount;
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const transaction = {
      id: generateId(),
      userId,
      accountId: destinationAccountId,
      amount,
      type: 'income',
      categoryId: null,
      description: description ? description.trim() : `Repayment for ${receivable.description}`,
      date,
      notes: '',
      metadata: { receivableId },
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    const updatedReceivable = {
      ...receivable,
      remainingAmount: newRemaining,
      status: newStatus,
      updatedAt: now,
    };

    await appTx.run(async () => {
      await txRepo.save(transaction);
      await receivableRepo.save(updatedReceivable);
    });

    return { transaction, receivable: updatedReceivable };
  }

  async function forgiveReceivable({ userId, receivableId, amount, note }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!receivableId || typeof receivableId !== 'string' || receivableId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount === undefined || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('VALIDATION_FAILED');
    }
    if (note !== undefined && note !== null && typeof note !== 'string') {
      throw new Error('VALIDATION_FAILED');
    }

    const receivable = await validateReference(receivableRepo, receivableId, userId, 'receivable');
    if (receivable.archived) {
      throw new Error('ARCHIVED_ENTITY');
    }
    if (receivable.status === 'paid' || receivable.status === 'forgiven') {
      throw new Error('VALIDATION_FAILED');
    }
    if (amount > receivable.remainingAmount) {
      throw new Error('VALIDATION_FAILED');
    }

    const now = new Date().toISOString();
    const newRemaining = receivable.remainingAmount - amount;
    const newStatus = newRemaining === 0 ? 'forgiven' : 'partially_forgiven';

    const updatedReceivable = {
      ...receivable,
      remainingAmount: newRemaining,
      status: newStatus,
      updatedAt: now,
    };

    await receivableRepo.save(updatedReceivable);
    return { receivable: updatedReceivable };
  }

  async function archivePerson({ userId, personId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!personId || typeof personId !== 'string' || personId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const person = await validateReference(personRepo, personId, userId, 'person');
    if (person.archived) {
      return person;
    }

    person.archived = true;
    person.updatedAt = new Date().toISOString();
    await personRepo.save(person);

    const receivables = await receivableRepo.findByPerson(personId);
    for (const receivable of receivables) {
      if (!receivable.archived) {
        receivable.archived = true;
        receivable.updatedAt = new Date().toISOString();
        await receivableRepo.save(receivable);
      }
    }

    return person;
  }

  async function archiveReceivable({ userId, receivableId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!receivableId || typeof receivableId !== 'string' || receivableId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    return await receivableRepo.archive(receivableId);
  }

  async function getPerson({ personId }) {
    if (!personId || typeof personId !== 'string' || personId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await personRepo.findById(personId);
  }

  async function getPersons({ userId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const all = await personRepo.loadAll();
    return all.filter(p => p.userId === userId && !p.archived);
  }

  async function getReceivables({ personId }) {
    if (!personId || typeof personId !== 'string' || personId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await receivableRepo.findByPerson(personId);
  }

  async function getReceivable({ receivableId }) {
    if (!receivableId || typeof receivableId !== 'string' || receivableId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await receivableRepo.findById(receivableId);
  }

  async function getPersonHistory({ personId }) {
    if (!personId || typeof personId !== 'string' || personId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const person = await personRepo.findById(personId);
    if (!person) {
      throw new Error('NOT_FOUND');
    }

    const receivables = await receivableRepo.findByPerson(personId);
    const receivableIds = receivables.map(r => r.id);

    const allTransactions = await txRepo.loadAll();
    const relevantTransactions = allTransactions.filter(tx => {
      if (tx.archived) return false;
      return receivableIds.includes(tx.metadata?.receivableId);
    });

    relevantTransactions.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });

    return {
      person,
      receivables,
      transactions: relevantTransactions,
    };
  }

  return {
    createPerson,
    createReceivable,
    recordRepayment,
    forgiveReceivable,
    archivePerson,
    archiveReceivable,
    getPerson,
    getPersons,
    getReceivables,
    getReceivable,
    getPersonHistory,
  };
}
