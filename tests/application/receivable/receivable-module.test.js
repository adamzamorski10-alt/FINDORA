import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createReceivablesModule } from '../../../src/application/receivable/receivable-module.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { PersonRepository } from '../../../src/infrastructure/repositories/person-repository.js';
import { ReceivableRepository } from '../../../src/infrastructure/repositories/receivable-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';
import { CategoryRepository } from '../../../src/infrastructure/repositories/category-repository.js';
import { GoalRepository } from '../../../src/infrastructure/repositories/goal-repository.js';
import { createReportingModule } from '../../../src/application/reporting/reporting-module.mjs';
import { createSafeToSpendModule } from '../../../src/application/safe-to-spend/safe-to-spend-module.js';
import { compute as safeToSpendCompute } from '../../../src/domain/safe-to-spend/safe-to-spend-calculator.js';
import { compute as goalRequiredDepositCompute } from '../../../src/domain/goals/goal-required-deposit-calculator.js';

async function createModule(userId = 'user-1') {
  const storage = new InMemoryStorageAdapter();
  await storage.init();
  const personRepo = new PersonRepository(storage, userId, () => storage.keys());
  const receivableRepo = new ReceivableRepository(storage, userId, () => storage.keys());
  const txRepo = new TransactionRepository(storage, userId, () => storage.keys());
  const accountRepo = new AccountRepository(storage, userId, () => storage.keys());
  const appTx = new ApplicationTransaction(storage);

  return {
    module: createReceivablesModule({
      personRepository: personRepo,
      receivableRepository: receivableRepo,
      transactionRepository: txRepo,
      accountRepository: accountRepo,
      applicationTransaction: appTx,
    }),
    storage,
    personRepo,
    receivableRepo,
    txRepo,
    accountRepo,
    appTx,
  };
}

describe('ReceivablesModule', () => {
  describe('construction', () => {
    it('creates a module with all public methods', async () => {
      const { module } = await createModule();
      assert.ok(module);
      assert.strictEqual(typeof module.createPerson, 'function');
      assert.strictEqual(typeof module.createReceivable, 'function');
      assert.strictEqual(typeof module.recordRepayment, 'function');
      assert.strictEqual(typeof module.forgiveReceivable, 'function');
      assert.strictEqual(typeof module.archivePerson, 'function');
      assert.strictEqual(typeof module.archiveReceivable, 'function');
      assert.strictEqual(typeof module.getPerson, 'function');
      assert.strictEqual(typeof module.getPersons, 'function');
      assert.strictEqual(typeof module.getReceivables, 'function');
      assert.strictEqual(typeof module.getReceivable, 'function');
      assert.strictEqual(typeof module.getPersonHistory, 'function');
    });
  });

  describe('createPerson', () => {
    it('creates person with valid input', async () => {
      const { module } = await createModule();
      const person = await module.createPerson({ userId: 'user-1', name: 'Alice' });
      assert.ok(person.id);
      assert.strictEqual(person.userId, 'user-1');
      assert.strictEqual(person.name, 'Alice');
      assert.strictEqual(person.note, '');
      assert.strictEqual(person.archived, false);
      assert.ok(person.createdAt);
      assert.ok(person.updatedAt);
    });

    it('trims name and note', async () => {
      const { module } = await createModule();
      const person = await module.createPerson({ userId: 'user-1', name: '  Bob  ', note: '  Note  ' });
      assert.strictEqual(person.name, 'Bob');
      assert.strictEqual(person.note, 'Note');
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const { module } = await createModule();
      let thrown = false;
      try {
        await module.createPerson({ name: 'Alice' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for empty name', async () => {
      const { module } = await createModule();
      let thrown = false;
      try {
        await module.createPerson({ userId: 'user-1', name: '' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for name longer than 100', async () => {
      const { module } = await createModule();
      let thrown = false;
      try {
        await module.createPerson({ userId: 'user-1', name: 'a'.repeat(101) });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid note type', async () => {
      const { module } = await createModule();
      let thrown = false;
      try {
        await module.createPerson({ userId: 'user-1', name: 'Alice', note: 123 });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('createReceivable', () => {
    it('creates receivable with correct state and linked expense transaction', async () => {
      const { module, personRepo, accountRepo, txRepo } = await createModule();
      const person = await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const result = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-1',
        dueDate: '2024-07-15',
      });

      assert.ok(result.receivable.id);
      assert.strictEqual(result.receivable.userId, 'user-1');
      assert.strictEqual(result.receivable.personId, 'p-1');
      assert.strictEqual(result.receivable.amount, 500);
      assert.strictEqual(result.receivable.remainingAmount, 500);
      assert.strictEqual(result.receivable.status, 'open');
      assert.strictEqual(result.receivable.archived, false);
      assert.strictEqual(result.receivable.description, 'Loan to Alice');
      assert.strictEqual(result.receivable.date, '2024-06-15');
      assert.strictEqual(result.receivable.sourceAccountId, 'acc-1');
      assert.strictEqual(result.receivable.dueDate, '2024-07-15');

      assert.ok(result.transaction.id);
      assert.strictEqual(result.transaction.userId, 'user-1');
      assert.strictEqual(result.transaction.accountId, 'acc-1');
      assert.strictEqual(result.transaction.amount, 500);
      assert.strictEqual(result.transaction.type, 'expense');
      assert.strictEqual(result.transaction.categoryId, null);
      assert.strictEqual(result.transaction.description, 'Loan to Alice');
      assert.strictEqual(result.transaction.date, '2024-06-15');
      assert.strictEqual(result.transaction.metadata.receivableId, result.receivable.id);
      assert.strictEqual(result.transaction.archived, false);

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 1);
    });

    it('throws VALIDATION_FAILED for missing person', async () => {
      const { module, accountRepo } = await createModule();
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'missing', amount: 100, description: 'Loan', date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws ARCHIVED_ENTITY for archived person', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: 100, description: 'Loan', date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for missing account', async () => {
      const { module, personRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: 100, description: 'Loan', date: '2024-06-15', sourceAccountId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('throws ARCHIVED_ENTITY for archived account', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: 100, description: 'Loan', date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid amount', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: -100, description: 'Loan', date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for invalid date', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: 100, description: 'Loan', date: 'invalid', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for description longer than 500', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: 100, description: 'a'.repeat(501), date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });
  });

  describe('recordRepayment', () => {
    it('partial repayment updates remaining and keeps status open', async () => {
      const { module, personRepo, accountRepo, txRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      assert.strictEqual(result.receivable.remainingAmount, 300);
      assert.strictEqual(result.receivable.status, 'partially_paid');
      assert.strictEqual(result.transaction.amount, 200);
      assert.strictEqual(result.transaction.type, 'income');
      assert.strictEqual(result.transaction.accountId, 'acc-dest');
      assert.strictEqual(result.transaction.metadata.receivableId, receivable.id);
      assert.strictEqual(result.transaction.description, 'Repayment for Loan to Alice');
      assert.strictEqual(result.transaction.date, '2024-07-01');
      assert.strictEqual(result.transaction.archived, false);
    });

    it('full repayment sets remaining to 0 and status to paid', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      assert.strictEqual(result.receivable.remainingAmount, 0);
      assert.strictEqual(result.receivable.status, 'paid');
    });

    it('over-repayment is rejected', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 600,
          destinationAccountId: 'acc-dest',
          date: '2024-07-01',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('cannot repay an already paid receivable', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          destinationAccountId: 'acc-dest',
          date: '2024-07-02',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('duplicate protection: cannot repay beyond remaining after full repayment', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 1,
          destinationAccountId: 'acc-dest',
          date: '2024-07-02',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws ARCHIVED_ENTITY for archived receivable', async () => {
      const { module, personRepo, accountRepo, receivableRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await receivableRepo.archive(receivable.id);

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          destinationAccountId: 'acc-dest',
          date: '2024-07-01',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);
    });
  });

  describe('forgiveReceivable', () => {
    it('partial forgiveness updates remaining and keeps status open', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        note: 'Partial forgiveness',
      });

      assert.strictEqual(result.receivable.remainingAmount, 300);
      assert.strictEqual(result.receivable.status, 'partially_forgiven');
    });

    it('full forgiveness sets remaining to 0 and status to forgiven', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        note: 'Full forgiveness',
      });

      assert.strictEqual(result.receivable.remainingAmount, 0);
      assert.strictEqual(result.receivable.status, 'forgiven');
    });

    it('does not create any account transaction', async () => {
      const { module, personRepo, accountRepo, txRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        note: 'Full forgiveness',
      });

      const txs = await txRepo.loadAll();
      assert.strictEqual(txs.length, 1);
      assert.strictEqual(txs[0].type, 'expense');
    });

    it('throws VALIDATION_FAILED for over-forgiveness', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      let thrown = false;
      try {
        await module.forgiveReceivable({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 600,
          note: 'Too much',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws ARCHIVED_ENTITY for archived receivable', async () => {
      const { module, personRepo, accountRepo, receivableRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await receivableRepo.archive(receivable.id);

      let thrown = false;
      try {
        await module.forgiveReceivable({ userId: 'user-1', receivableId: receivable.id, amount: 100, note: 'X' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'ARCHIVED_ENTITY');
      }
      assert.ok(thrown);
    });
  });

  describe('archivePerson', () => {
    it('archives person and all open receivables', async () => {
      const { module, personRepo, receivableRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await personRepo.save({ id: 'p-2', userId: 'user-1', name: 'Bob', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable: r1 } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const { receivable: r2 } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 300,
        description: 'Another loan to Alice',
        date: '2024-07-01',
        sourceAccountId: 'acc-source',
      });

      const { receivable: r3 } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-2',
        amount: 200,
        description: 'Loan to Bob',
        date: '2024-07-10',
        sourceAccountId: 'acc-source',
      });

      await module.archivePerson({ userId: 'user-1', personId: 'p-1' });

      const person1 = await personRepo.findById('p-1');
      assert.strictEqual(person1.archived, true);

      const person2 = await personRepo.findById('p-2');
      assert.strictEqual(person2.archived, false);

      const rec1 = await receivableRepo.findById(r1.id);
      assert.strictEqual(rec1.archived, true);

      const rec2 = await receivableRepo.findById(r2.id);
      assert.strictEqual(rec2.archived, true);

      const rec3 = await receivableRepo.findById(r3.id);
      assert.strictEqual(rec3.archived, false);
    });

    it('is idempotent for already archived person', async () => {
      const { module, personRepo } = await createModule();
      const person = await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const result = await module.archivePerson({ userId: 'user-1', personId: 'p-1' });
      assert.strictEqual(result.archived, true);
    });
  });

  describe('archiveReceivable', () => {
    it('archives single receivable without affecting others', async () => {
      const { module, personRepo, accountRepo, receivableRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable: r1 } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const { receivable: r2 } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 300,
        description: 'Another loan to Alice',
        date: '2024-07-01',
        sourceAccountId: 'acc-source',
      });

      await module.archiveReceivable({ userId: 'user-1', receivableId: r1.id });

      const rec1 = await receivableRepo.findById(r1.id);
      assert.strictEqual(rec1.archived, true);

      const rec2 = await receivableRepo.findById(r2.id);
      assert.strictEqual(rec2.archived, false);
    });
  });

  describe('getPersonHistory', () => {
    it('returns person, receivables, and related transactions sorted by date', async () => {
      const { module, personRepo, accountRepo, txRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      const history = await module.getPersonHistory({ personId: 'p-1' });

      assert.strictEqual(history.person.id, 'p-1');
      assert.strictEqual(history.person.name, 'Alice');
      assert.strictEqual(history.receivables.length, 1);
      assert.strictEqual(history.receivables[0].id, receivable.id);
      assert.strictEqual(history.transactions.length, 2);
      assert.strictEqual(history.transactions[0].type, 'expense');
      assert.strictEqual(history.transactions[1].type, 'income');
      assert.strictEqual(history.transactions[0].date, '2024-06-15');
      assert.strictEqual(history.transactions[1].date, '2024-07-01');
    });
  });

  describe('cross-user isolation', () => {
    it('user A cannot access user B person', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const personRepoA = new PersonRepository(storage, 'user-1', () => storage.keys());
      const personRepoB = new PersonRepository(storage, 'user-2', () => storage.keys());
      const moduleA = createReceivablesModule({
        personRepository: personRepoA,
        receivableRepository: new ReceivableRepository(storage, 'user-1', () => storage.keys()),
        transactionRepository: new TransactionRepository(storage, 'user-1', () => storage.keys()),
        accountRepository: new AccountRepository(storage, 'user-1', () => storage.keys()),
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const personB = await personRepoB.save({ id: 'p-b', userId: 'user-2', name: 'Eve', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const found = await moduleA.getPerson({ personId: 'p-b' });
      assert.strictEqual(found, null);
    });

    it('user A cannot access user B receivable', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const personRepoA = new PersonRepository(storage, 'user-1', () => storage.keys());
      const receivableRepoA = new ReceivableRepository(storage, 'user-1', () => storage.keys());
      const personRepoB = new PersonRepository(storage, 'user-2', () => storage.keys());
      const accountRepoB = new AccountRepository(storage, 'user-2', () => storage.keys());
      const moduleA = createReceivablesModule({
        personRepository: personRepoA,
        receivableRepository: receivableRepoA,
        transactionRepository: new TransactionRepository(storage, 'user-1', () => storage.keys()),
        accountRepository: new AccountRepository(storage, 'user-1', () => storage.keys()),
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const personB = await personRepoB.save({ id: 'p-b', userId: 'user-2', name: 'Eve', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepoB.save({ id: 'acc-b', userId: 'user-2', name: 'BankB', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const receivableRepoB = new ReceivableRepository(storage, 'user-2', () => storage.keys());
      const txRepoB = new TransactionRepository(storage, 'user-2', () => storage.keys());
      const moduleB = createReceivablesModule({
        personRepository: personRepoB,
        receivableRepository: receivableRepoB,
        transactionRepository: txRepoB,
        accountRepository: accountRepoB,
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const { receivable: receivableB } = await moduleB.createReceivable({
        userId: 'user-2',
        personId: 'p-b',
        amount: 500,
        description: 'Loan to Eve',
        date: '2024-06-15',
        sourceAccountId: 'acc-b',
      });

      const found = await moduleA.getReceivable({ receivableId: receivableB.id });
      assert.strictEqual(found, null);
    });
  });

  describe('account ownership validation', () => {
    it('rejects receivable creation with account owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const personRepoA = new PersonRepository(storage, 'user-1', () => storage.keys());
      const personRepoB = new PersonRepository(storage, 'user-2', () => storage.keys());
      const moduleA = createReceivablesModule({
        personRepository: personRepoA,
        receivableRepository: new ReceivableRepository(storage, 'user-1', () => storage.keys()),
        transactionRepository: new TransactionRepository(storage, 'user-1', () => storage.keys()),
        accountRepository: new AccountRepository(storage, 'user-1', () => storage.keys()),
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const personA = await personRepoA.save({ id: 'p-a', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const accountB = await personRepoB.save({ id: 'acc-b', userId: 'user-2', name: 'BankB', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      let thrown = false;
      try {
        await moduleA.createReceivable({
          userId: 'user-1',
          personId: 'p-a',
          amount: 500,
          description: 'Loan',
          date: '2024-06-15',
          sourceAccountId: 'acc-b',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });

    it('rejects repayment with destination account owned by another user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const personRepoA = new PersonRepository(storage, 'user-1', () => storage.keys());
      const personRepoB = new PersonRepository(storage, 'user-2', () => storage.keys());
      const accountRepoA = new AccountRepository(storage, 'user-1', () => storage.keys());
      const accountRepoB = new AccountRepository(storage, 'user-2', () => storage.keys());
      const moduleA = createReceivablesModule({
        personRepository: personRepoA,
        receivableRepository: new ReceivableRepository(storage, 'user-1', () => storage.keys()),
        transactionRepository: new TransactionRepository(storage, 'user-1', () => storage.keys()),
        accountRepository: accountRepoA,
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const personA = await personRepoA.save({ id: 'p-a', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepoA.save({ id: 'acc-a', userId: 'user-1', name: 'BankA', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      const accountB = await accountRepoB.save({ id: 'acc-b', userId: 'user-2', name: 'BankB', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await moduleA.createReceivable({
        userId: 'user-1',
        personId: 'p-a',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-a',
      });

      let thrown = false;
      try {
        await moduleA.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          destinationAccountId: 'acc-b',
          date: '2024-07-01',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown);
    });
  });

  describe('reporting semantics', () => {
    it('excludes receivable expense from monthly summary', async () => {
      const { module, personRepo, accountRepo, txRepo, storage } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-09-15',
        sourceAccountId: 'acc-1',
      });

      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const reporting = createReportingModule({
        transactionRepository: txRepo,
        accountRepository: accountRepo,
        categoryRepository: categoryRepo,
      });

      const summary = await reporting.getMonthlySummary({ userId: 'user-1', monthKey: '2024-09' });
      assert.strictEqual(summary.expense, 0);
      assert.strictEqual(summary.income, 0);
      assert.strictEqual(summary.transactionCount, 0);
    });

    it('excludes receivable income from monthly summary', async () => {
      const { module, personRepo, accountRepo, txRepo, storage } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-09-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-09-20',
      });

      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const reporting = createReportingModule({
        transactionRepository: txRepo,
        accountRepository: accountRepo,
        categoryRepository: categoryRepo,
      });

      const summary = await reporting.getMonthlySummary({ userId: 'user-1', monthKey: '2024-09' });
      assert.strictEqual(summary.expense, 0);
      assert.strictEqual(summary.income, 0);
    });

    it('excludes receivable transactions from month category breakdown', async () => {
      const { module, personRepo, accountRepo, txRepo, storage } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-09-15',
        sourceAccountId: 'acc-source',
      });

      const categoryRepo = new CategoryRepository(storage, 'user-1', () => storage.keys());
      const reporting = createReportingModule({
        transactionRepository: txRepo,
        accountRepository: accountRepo,
        categoryRepository: categoryRepo,
      });

      const breakdown = await reporting.getMonthCategoryBreakdown({ userId: 'user-1', monthKey: '2024-09' });
      assert.deepStrictEqual(breakdown.byCategory, {});
    });
  });

  describe('safe-to-spend integration', () => {
    it('receivable expense tx reduces free funds', async () => {
      const { module, personRepo, accountRepo, txRepo, storage } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-2', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const stsModule = createSafeToSpendModule({
        safeToSpendCalculator: { compute: safeToSpendCompute },
        accountRepository: accountRepo,
        transactionRepository: txRepo,
        goalRepository: goalRepo,
        goalRequiredDepositCalculator: { compute: goalRequiredDepositCompute },
      });

      const before = await stsModule.computeForCurrentState({ currentDate: '2024-09-15' });
      assert.strictEqual(before.freeFunds, 0);

      await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-09-15',
        sourceAccountId: 'acc-1',
      });

      const afterReceivable = await stsModule.computeForCurrentState({ currentDate: '2024-09-15' });
      assert.strictEqual(afterReceivable.freeFunds, -500);
    });

    it('repayment income tx increases free funds', async () => {
      const { module, personRepo, accountRepo, txRepo, storage } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const goalRepo = new GoalRepository(storage, 'user-1', () => storage.keys());
      const stsModule = createSafeToSpendModule({
        safeToSpendCalculator: { compute: safeToSpendCompute },
        accountRepository: accountRepo,
        transactionRepository: txRepo,
        goalRepository: goalRepo,
        goalRequiredDepositCalculator: { compute: goalRequiredDepositCompute },
      });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-09-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 300,
        destinationAccountId: 'acc-dest',
        date: '2024-09-20',
      });

      const after = await stsModule.computeForCurrentState({ currentDate: '2024-09-15' });
      assert.strictEqual(after.freeFunds, -200);
    });
  });

  describe('persistence/reload', () => {
    it('data survives reload via storage', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const personRepo1 = new PersonRepository(storage, 'user-1', () => storage.keys());
      const receivableRepo1 = new ReceivableRepository(storage, 'user-1', () => storage.keys());
      const txRepo1 = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo1 = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module1 = createReceivablesModule({
        personRepository: personRepo1,
        receivableRepository: receivableRepo1,
        transactionRepository: txRepo1,
        accountRepository: accountRepo1,
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const person = await personRepo1.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo1.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo1.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module1.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan to Alice',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module1.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      const personRepo2 = new PersonRepository(storage, 'user-1', () => storage.keys());
      const receivableRepo2 = new ReceivableRepository(storage, 'user-1', () => storage.keys());
      const txRepo2 = new TransactionRepository(storage, 'user-1', () => storage.keys());
      const accountRepo2 = new AccountRepository(storage, 'user-1', () => storage.keys());
      const module2 = createReceivablesModule({
        personRepository: personRepo2,
        receivableRepository: receivableRepo2,
        transactionRepository: txRepo2,
        accountRepository: accountRepo2,
        applicationTransaction: new ApplicationTransaction(storage),
      });

      const persons = await personRepo2.loadAll();
      assert.strictEqual(persons.length, 1);
      assert.strictEqual(persons[0].name, 'Alice');

      const rec = await receivableRepo2.findById(receivable.id);
      assert.ok(rec);
      assert.strictEqual(rec.remainingAmount, 300);
      assert.strictEqual(rec.status, 'partially_paid');

      const txs = await txRepo2.loadAll();
      assert.strictEqual(txs.length, 2);
      assert.strictEqual(txs[0].type, 'expense');
      assert.strictEqual(txs[1].type, 'income');
    });
  });

  describe('status model', () => {
    it('partial repayment sets partially_paid', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });
      assert.strictEqual(receivable.status, 'open');

      const result = await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });
      assert.strictEqual(result.receivable.status, 'partially_paid');
      assert.strictEqual(result.receivable.remainingAmount, 300);
    });

    it('full repayment sets paid', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });
      assert.strictEqual(result.receivable.status, 'paid');
      assert.strictEqual(result.receivable.remainingAmount, 0);
    });

    it('partial forgiveness sets partially_forgiven', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        note: 'Partial',
      });
      assert.strictEqual(result.receivable.status, 'partially_forgiven');
      assert.strictEqual(result.receivable.remainingAmount, 300);
    });

    it('full forgiveness sets forgiven', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        note: 'Full',
      });
      assert.strictEqual(result.receivable.status, 'forgiven');
      assert.strictEqual(result.receivable.remainingAmount, 0);
    });

    it('cannot repay after paid', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          destinationAccountId: 'acc-dest',
          date: '2024-07-02',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('cannot forgive after forgiven', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        note: 'Full',
      });

      let thrown = false;
      try {
        await module.forgiveReceivable({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          note: 'X',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('cannot repay after forgiven', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        note: 'Full',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          destinationAccountId: 'acc-dest',
          date: '2024-07-02',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('cannot forgive after paid', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        destinationAccountId: 'acc-source',
        date: '2024-07-01',
      });

      let thrown = false;
      try {
        await module.forgiveReceivable({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 100,
          note: 'X',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('mixed partial repayment then partial forgiveness', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      const afterRepay = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 100,
        note: 'Partial',
      });
      assert.strictEqual(afterRepay.receivable.remainingAmount, 200);
      assert.strictEqual(afterRepay.receivable.status, 'partially_forgiven');
    });

    it('repayment after partially_forgiven is allowed', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        note: 'Partial',
      });

      const result = await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 100,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });
      assert.strictEqual(result.receivable.remainingAmount, 200);
      assert.strictEqual(result.receivable.status, 'partially_paid');
    });

    it('forgiveness after partially_paid is allowed', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-source',
        date: '2024-07-01',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 100,
        note: 'Partial',
      });
      assert.strictEqual(result.receivable.remainingAmount, 200);
      assert.strictEqual(result.receivable.status, 'partially_forgiven');
    });
  });

  describe('edge cases', () => {
    it('throws VALIDATION_FAILED for zero amount', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: 0, description: 'Loan', date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for negative amount', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-1', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      let thrown = false;
      try {
        await module.createReceivable({ userId: 'user-1', personId: 'p-1', amount: -100, description: 'Loan', date: '2024-06-15', sourceAccountId: 'acc-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for repayment of zero', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 0,
          destinationAccountId: 'acc-dest',
          date: '2024-07-01',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for negative repayment', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      let thrown = false;
      try {
        await module.recordRepayment({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: -100,
          destinationAccountId: 'acc-dest',
          date: '2024-07-01',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for forgiveness of zero', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      let thrown = false;
      try {
        await module.forgiveReceivable({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: 0,
          note: 'X',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('throws VALIDATION_FAILED for negative forgiveness', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      let thrown = false;
      try {
        await module.forgiveReceivable({
          userId: 'user-1',
          receivableId: receivable.id,
          amount: -100,
          note: 'X',
        });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown);
    });

    it('forgiveness equals outstanding sets forgiven', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 500,
        note: 'Full',
      });
      assert.strictEqual(result.receivable.status, 'forgiven');
      assert.strictEqual(result.receivable.remainingAmount, 0);
    });

    it('repayment after partially_paid is allowed', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-dest', userId: 'user-1', name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF00', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-01',
      });

      const result = await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-dest',
        date: '2024-07-02',
      });
      assert.strictEqual(result.receivable.remainingAmount, 100);
      assert.strictEqual(result.receivable.status, 'partially_paid');
    });

    it('forgiveness after partially_paid is allowed', async () => {
      const { module, personRepo, accountRepo } = await createModule();
      await personRepo.save({ id: 'p-1', userId: 'user-1', name: 'Alice', note: '', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });
      await accountRepo.save({ id: 'acc-source', userId: 'user-1', name: 'Bank', type: 'bank', icon: 'bank', color: '#000000', archived: false, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' });

      const { receivable } = await module.createReceivable({
        userId: 'user-1',
        personId: 'p-1',
        amount: 500,
        description: 'Loan',
        date: '2024-06-15',
        sourceAccountId: 'acc-source',
      });

      await module.recordRepayment({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 200,
        destinationAccountId: 'acc-source',
        date: '2024-07-01',
      });

      const result = await module.forgiveReceivable({
        userId: 'user-1',
        receivableId: receivable.id,
        amount: 100,
        note: 'Partial',
      });
      assert.strictEqual(result.receivable.remainingAmount, 200);
      assert.strictEqual(result.receivable.status, 'partially_forgiven');
    });
  });
});
