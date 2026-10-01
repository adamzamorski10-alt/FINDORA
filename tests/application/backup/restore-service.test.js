/**
 * Stage 5C — Tests for restore service.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createAppKernel } from '../../../src/application/app-kernel.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import {
  createRestoreService,
  validateRestoreBackup,
  computeRestorePreview,
  createPreRestoreSnapshot,
  RestoreError,
} from '../../../src/application/backup/restore-service.js';

describe('RestoreService', () => {
  function createTestKernel(userId = 'restore-user-1') {
    const storage = new InMemoryStorageAdapter();
    const kernel = createAppKernel({ storageAdapter: storage, userId });
    return kernel;
  }

  function createRestore(kernel) {
    return createRestoreService({
      storage: kernel.persistence.storage,
      appTx: kernel.appTx,
      listKeys: () => kernel.persistence.storage.keys(),
      userRepository: kernel.persistence.userRepository,
      accountRepository: kernel.persistence.accountRepository,
      categoryRepository: kernel.persistence.categoryRepository,
      transactionRepository: kernel.persistence.transactionRepository,
      budgetRepository: kernel.persistence.budgetRepository,
      goalRepository: kernel.persistence.goalRepository,
      personRepository: kernel.persistence.personRepository,
      receivableRepository: kernel.persistence.receivableRepository,
      goalModule: kernel.modules.goal,
      categoryModule: kernel.modules.category,
    });
  }

  describe('validateRestoreBackup', () => {
    it('rejects null envelope', () => {
      const result = validateRestoreBackup(null, 'user-1');
      assert.strictEqual(result.valid, false);
    });

    it('rejects envelope with wrong userId', () => {
      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'user-A',
        createdAt: '2026-01-01T00:00:00Z',
        data: {
          profile: [],
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
        },
        integrity: { checksum: 'fake' },
      };
      const result = validateRestoreBackup(envelope, 'user-B');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('userId mismatch')));
    });

    it('rejects envelope with missing collections', () => {
      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        data: {},
        integrity: { checksum: 'fake' },
      };
      const result = validateRestoreBackup(envelope, 'user-1');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Missing or invalid collection')));
    });

    it('rejects envelope with duplicate account IDs', () => {
      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        data: {
          profile: [{ id: 'user-1', settings: {} }],
          accounts: [
            { id: 'acc-1', userId: 'user-1', name: 'A', type: 'bank', icon: 'landmark', color: '#000', archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
            { id: 'acc-1', userId: 'user-1', name: 'B', type: 'bank', icon: 'landmark', color: '#000', archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
          ],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
          people: [],
          receivables: [],
          incomeProfiles: [],
          resellingProducts: [],
          resellingOrders: [],
          resellingSales: [],
          resellingCosts: [],
          resellingTasks: [],
        },
        integrity: { checksum: 'fake' },
      };
      const result = validateRestoreBackup(envelope, 'user-1');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Duplicate account id')));
    });

    it('rejects transaction with invalid account reference', () => {
      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'user-1',
        createdAt: '2026-01-01T00:00:00Z',
        data: {
          profile: [{ id: 'user-1', settings: {} }],
          accounts: [
            { id: 'acc-1', userId: 'user-1', name: 'A', type: 'bank', icon: 'landmark', color: '#000', archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
          ],
          categories: [],
          transactions: [
            { id: 'tx-1', userId: 'user-1', accountId: 'acc-nonexistent', amount: 100, type: 'expense', categoryId: null, description: 'Test', date: '2026-01-01', notes: '', metadata: {}, archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
          ],
          budgets: [],
          goals: [],
          people: [],
          receivables: [],
          incomeProfiles: [],
          resellingProducts: [],
          resellingOrders: [],
          resellingSales: [],
          resellingCosts: [],
          resellingTasks: [],
        },
        integrity: { checksum: 'fake' },
      };
      const result = validateRestoreBackup(envelope, 'user-1');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('references non-existent account')));
    });
  });

  describe('executeRestore', () => {
    it('replaces all user data atomically', async () => {
      const kernel = createTestKernel('restore-user-1');

      await kernel.modules.account.createAccount({
        userId: 'restore-user-1',
        name: 'Original Account',
        type: 'bank',
        icon: 'landmark',
        color: '#4A90D9',
      });

      const backup = await kernel.modules.backup.createBackup({ userId: 'restore-user-1' });

      await kernel.modules.account.createAccount({
        userId: 'restore-user-1',
        name: 'New Account',
        type: 'bank',
        icon: 'landmark',
        color: '#FF0000',
      });

      const restoreService = createRestore(kernel);

      const result = await restoreService.executeRestore(backup, { userId: 'restore-user-1' });
      assert.strictEqual(result.success, true);

      const accounts = await kernel.modules.account.getActiveAccounts({ userId: 'restore-user-1' });
      const accountNames = accounts.map(a => a.name).sort();
      assert.ok(accountNames.includes('Original Account'));
      assert.ok(accountNames.includes('Konto'));
      assert.ok(accountNames.includes('Skarbonka'));
      assert.ok(accountNames.includes('Inne'));
      assert.strictEqual(accountNames.length, 4);
    });

    it('preserves original state on validation failure', async () => {
      const kernel = createTestKernel('restore-user-2');

      await kernel.modules.account.createAccount({
        userId: 'restore-user-2',
        name: 'Original Account',
        type: 'bank',
        icon: 'landmark',
        color: '#4A90D9',
      });

      const invalidBackup = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'restore-user-2',
        createdAt: '2026-01-01T00:00:00Z',
        data: {
          profile: [{ id: 'restore-user-2', settings: {} }],
          accounts: [
            { id: 'acc-invalid', userId: 'restore-user-2', name: 'X', type: 'bank', icon: 'landmark', color: '#000', archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
          ],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
        },
        integrity: { checksum: 'fake' },
      };

      const restoreService = createRestore(kernel);

      let result;
      let threw = false;
      try {
        result = await restoreService.executeRestore(invalidBackup, { userId: 'restore-user-2' });
      } catch (err) {
        threw = true;
      }

      assert.strictEqual(threw, true);

      const accounts = await kernel.modules.account.getActiveAccounts({ userId: 'restore-user-2' });
      const accountNames = accounts.map(a => a.name).sort();
      assert.ok(accountNames.includes('Original Account'));
      assert.ok(accountNames.includes('Konto'));
    });

    it('supports dry run', async () => {
      const kernel = createTestKernel('restore-user-3');

      const backup = await kernel.modules.backup.createBackup({ userId: 'restore-user-3' });

      const restoreService = createRestore(kernel);

      const result = await restoreService.executeRestore(backup, { userId: 'restore-user-3', dryRun: true });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.dryRun, true);
      assert.ok(result.preview);
    });

    it('restores people and receivables with reference integrity', async () => {
      const kernel = createTestKernel('restore-user-4');

      const person = await kernel.modules.receivable.createPerson({
        userId: 'restore-user-4',
        name: 'Jan',
        note: 'Test',
      });

      const account = await kernel.modules.account.createAccount({
        userId: 'restore-user-4',
        name: 'Main Account',
        type: 'bank',
        icon: 'landmark',
        color: '#4A90D9',
      });

      await kernel.modules.receivable.createReceivable({
        userId: 'restore-user-4',
        personId: person.id,
        amount: 100,
        description: 'Test receivable',
        date: '2024-01-15',
        sourceAccountId: account.id,
      });

      const backup = await kernel.modules.backup.createBackup({ userId: 'restore-user-4' });

      await kernel.modules.receivable.archivePerson({ userId: 'restore-user-4', personId: person.id });

      const restoreService = createRestore(kernel);
      const result = await restoreService.executeRestore(backup, { userId: 'restore-user-4' });
      assert.strictEqual(result.success, true);

      const restoredPerson = await kernel.modules.receivable.getPerson({ personId: person.id });
      assert.ok(restoredPerson);
      assert.strictEqual(restoredPerson.archived, false);

      const restoredReceivables = await kernel.modules.receivable.getReceivables({ personId: person.id });
      assert.strictEqual(restoredReceivables.length, 1);
      assert.strictEqual(restoredReceivables[0].archived, false);
    });
  });

  describe('rollbackRestore', () => {
    it('rolls back to pre-restore snapshot', async () => {
      const kernel = createTestKernel('rollback-user-1');

      await kernel.modules.account.createAccount({
        userId: 'rollback-user-1',
        name: 'Original Account',
        type: 'bank',
        icon: 'landmark',
        color: '#4A90D9',
      });

      const backup = await kernel.modules.backup.createBackup({ userId: 'rollback-user-1' });

      const restoreService = createRestore(kernel);

      const restoreResult = await restoreService.executeRestore(backup, { userId: 'rollback-user-1' });
      assert.strictEqual(restoreResult.success, true);
      assert.ok(restoreResult.preRestoreBackup);

      await kernel.modules.account.createAccount({
        userId: 'rollback-user-1',
        name: 'New Account',
        type: 'bank',
        icon: 'landmark',
        color: '#FF0000',
      });

      const rollbackResult = await restoreService.rollbackRestore(restoreResult.preRestoreBackup);
      assert.strictEqual(rollbackResult.success, true);

      const accounts = await kernel.modules.account.getActiveAccounts({ userId: 'rollback-user-1' });
      const accountNames = accounts.map(a => a.name).sort();
      assert.ok(accountNames.includes('Original Account'));
      assert.ok(accountNames.includes('Konto'));
      assert.strictEqual(accountNames.length, 4);
    });
  });
});

console.log('Tests defined.');
