/**
 * Stage 5C — Hostile audit ad-hoc verifications.
 * Run with: node tests/application/backup/stage5c-hostile-audit.cjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createAppKernel } from '../../../src/application/app-kernel.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { createRestoreService, validateRestoreBackup, RestoreError } from '../../../src/application/backup/restore-service.js';
import { canonicalize, verifyIntegrity, createEnvelope } from '../../../src/application/backup/backup-format.js';

describe('Stage5C Hostile Audit', () => {
  describe('frozen storage adapter API', () => {
    it('StorageAdapter base exposes only get/set/update/remove plus transaction boundary', () => {
      const adapter = new InMemoryStorageAdapter();
      const proto = Object.getPrototypeOf(Object.getPrototypeOf(adapter));
      const allowed = new Set(['get', 'set', 'update', 'remove', 'beginTransaction', 'commitTransaction', 'abortTransaction', 'init', 'constructor']);
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor') continue;
        assert.ok(allowed.has(key), `Unexpected canonical StorageAdapter method: ${key}`);
      }
    });
  });

  describe('canonicalization null semantics', () => {
    it('distinguishes { categoryId: null } from {}', () => {
      const a = canonicalize({ categoryId: null });
      const b = canonicalize({});
      assert.notDeepStrictEqual(a, b);
      assert.strictEqual(a.categoryId, null);
      assert.ok(!('categoryId' in b));
    });
  });

  describe('Goal.current rebuild ignores corrupted backup current', () => {
    it('rebuilds Goal.current from qualifying transactions after restore', async () => {
      const storage = new InMemoryStorageAdapter();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'hostile-goal-user', openingBalanceCategoryId: 'system-opening-balance' });

      await kernel.modules.category.seedSystemCategories({ userId: 'hostile-goal-user' });

      const account = await kernel.modules.account.createAccount({
        userId: 'hostile-goal-user',
        name: 'Main',
        type: 'bank',
        icon: 'landmark',
        color: '#000000',
      });

      const goal = await kernel.modules.goal.createGoal({
        userId: 'hostile-goal-user',
        name: 'Trip',
        target: 1000,
        deadline: '2027-01-01',
        icon: 'plane',
        color: '#0000FF',
        priority: 'medium',
      });

      await kernel.modules.goal.depositToGoal({
        userId: 'hostile-goal-user',
        goalId: goal.id,
        accountId: account.id,
        amount: 100,
        date: '2026-09-19',
        description: 'deposit',
      });

      const backup = await kernel.modules.backup.createBackup({ userId: 'hostile-goal-user' });
      const corruptedData = JSON.parse(JSON.stringify(backup.data));
      const corruptedGoal = corruptedData.goals.find(g => g.id === goal.id);
      assert.ok(corruptedGoal);
      corruptedGoal.current = 999999;

      const { createEnvelope: createEnvelope2 } = await import('../../../src/application/backup/backup-format.js');
      const corrupted = await createEnvelope2({
        data: corruptedData,
        userId: 'hostile-goal-user',
        createdAt: backup.createdAt,
        appVersion: backup.appVersion,
      });

      const restore = createRestoreService({
        storage: kernel.persistence.storage,
        appTx: kernel.appTx,
        listKeys: () => kernel.persistence.storage.keys(),
        userRepository: kernel.persistence.userRepository,
        accountRepository: kernel.persistence.accountRepository,
        categoryRepository: kernel.persistence.categoryRepository,
        transactionRepository: kernel.persistence.transactionRepository,
        budgetRepository: kernel.persistence.budgetRepository,
        goalRepository: kernel.persistence.goalRepository,
        goalModule: kernel.modules.goal,
        categoryModule: kernel.modules.category,
      });

      const result = await restore.executeRestore(corrupted, { userId: 'hostile-goal-user' });
      assert.strictEqual(result.success, true);

      const reloaded = await kernel.modules.goal.getActiveGoals({ userId: 'hostile-goal-user' });
      const reloadedGoal = reloaded.find(g => g.id === goal.id);
      assert.ok(reloadedGoal);
      assert.strictEqual(reloadedGoal.current, 100);
    });
  });

  describe('atomicity on failure inside restore', () => {
    it('does not mutate current data when restore throws before write', async () => {
      const storage = new InMemoryStorageAdapter();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'atomic-user', openingBalanceCategoryId: 'system-opening-balance' });

      await kernel.modules.account.createAccount({
        userId: 'atomic-user',
        name: 'Only',
        type: 'bank',
        icon: 'landmark',
        color: '#000000',
      });

      const badBackup = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'atomic-user',
        createdAt: '2026-01-01T00:00:00Z',
        data: {
          profile: [{ id: 'atomic-user', settings: {} }],
          accounts: [{ id: 'acc-bad', userId: 'atomic-user', name: 'Bad', type: 'bank', icon: 'landmark', color: '#000000', archived: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
        },
        integrity: { checksum: 'tampered' },
      };

      const restore = createRestoreService({
        storage: kernel.persistence.storage,
        appTx: kernel.appTx,
        listKeys: () => kernel.persistence.storage.keys(),
        userRepository: kernel.persistence.userRepository,
        accountRepository: kernel.persistence.accountRepository,
        categoryRepository: kernel.persistence.categoryRepository,
        transactionRepository: kernel.persistence.transactionRepository,
        budgetRepository: kernel.persistence.budgetRepository,
        goalRepository: kernel.persistence.goalRepository,
        goalModule: kernel.modules.goal,
        categoryModule: kernel.modules.category,
      });

      let threw = false;
      try {
        await restore.executeRestore(badBackup, { userId: 'atomic-user' });
      } catch (err) {
        threw = true;
      }
      assert.strictEqual(threw, true);

      const accounts = await kernel.modules.account.getActiveAccounts({ userId: 'atomic-user' });
      const names = accounts.map(a => a.name);
      assert.ok(names.includes('Only'));
      assert.ok(!names.includes('Bad'));
    });
  });

  describe('cross-user isolation', () => {
    it('rejects restore when backup userId does not match current user', async () => {
      const storage = new InMemoryStorageAdapter();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'user-B', openingBalanceCategoryId: 'system-opening-balance' });

      const envelope = {
        backupVersion: '1.0.0',
        schemaVersion: '1.0.0',
        userId: 'user-A',
        createdAt: '2026-01-01T00:00:00Z',
        data: {
          profile: [{ id: 'user-A', settings: {} }],
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
          goals: [],
        },
        integrity: { checksum: 'fake' },
      };

      const restore = createRestoreService({
        storage: kernel.persistence.storage,
        appTx: kernel.appTx,
        listKeys: () => kernel.persistence.storage.keys(),
        userRepository: kernel.persistence.userRepository,
        accountRepository: kernel.persistence.accountRepository,
        categoryRepository: kernel.persistence.categoryRepository,
        transactionRepository: kernel.persistence.transactionRepository,
        budgetRepository: kernel.persistence.budgetRepository,
        goalRepository: kernel.persistence.goalRepository,
        goalModule: kernel.modules.goal,
        categoryModule: kernel.modules.category,
      });

      const result = validateRestoreBackup(envelope, 'user-B');
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('userId mismatch')));
    });
  });

  describe('system category handling', () => {
    it('seeds missing system categories inside restore when backup lacks them', async () => {
      const storage = new InMemoryStorageAdapter();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'syscat-user', openingBalanceCategoryId: 'system-opening-balance' });

      const backup = await kernel.modules.backup.createBackup({ userId: 'syscat-user' });
      const stripped = JSON.parse(JSON.stringify(backup));
      stripped.data.categories = stripped.data.categories.filter(c => !c.isSystem);

      const restore = createRestoreService({
        storage: kernel.persistence.storage,
        appTx: kernel.appTx,
        listKeys: () => kernel.persistence.storage.keys(),
        userRepository: kernel.persistence.userRepository,
        accountRepository: kernel.persistence.accountRepository,
        categoryRepository: kernel.persistence.categoryRepository,
        transactionRepository: kernel.persistence.transactionRepository,
        budgetRepository: kernel.persistence.budgetRepository,
        goalRepository: kernel.persistence.goalRepository,
        goalModule: kernel.modules.goal,
        categoryModule: kernel.modules.category,
      });

      const result = await restore.executeRestore(stripped, { userId: 'syscat-user' });
      assert.strictEqual(result.success, true);

      const categories = await kernel.modules.category.getCategories({ userId: 'syscat-user' });
      const systemRoles = categories.filter(c => c.isSystem).map(c => c.systemRole).sort();
      assert.deepStrictEqual(systemRoles, ['opening-balance', 'savings']);
    });
  });

  describe('full replace semantics', () => {
    it('removes records that exist only in current dataset', async () => {
      const storage = new InMemoryStorageAdapter();
      const kernel = createAppKernel({ storageAdapter: storage, userId: 'replace-user', openingBalanceCategoryId: 'system-opening-balance' });

      await kernel.modules.category.seedSystemCategories({ userId: 'replace-user' });

      const keepAccount = await kernel.modules.account.createAccount({
        userId: 'replace-user',
        name: 'Keep',
        type: 'bank',
        icon: 'landmark',
        color: '#000000',
      });

      const dropAccount = await kernel.modules.account.createAccount({
        userId: 'replace-user',
        name: 'Drop',
        type: 'cash',
        icon: 'wallet',
        color: '#FF0000',
      });

      const backup = await kernel.modules.backup.createBackup({ userId: 'replace-user' });
      const replacementData = JSON.parse(JSON.stringify(backup.data));
      replacementData.accounts = replacementData.accounts.filter(a => a.id !== dropAccount.id);

      const { createEnvelope: createEnvelope2 } = await import('../../../src/application/backup/backup-format.js');
      const replacement = await createEnvelope2({
        data: replacementData,
        userId: 'replace-user',
        createdAt: backup.createdAt,
        appVersion: backup.appVersion,
      });

      const restore = createRestoreService({
        storage: kernel.persistence.storage,
        appTx: kernel.appTx,
        listKeys: () => kernel.persistence.storage.keys(),
        userRepository: kernel.persistence.userRepository,
        accountRepository: kernel.persistence.accountRepository,
        categoryRepository: kernel.persistence.categoryRepository,
        transactionRepository: kernel.persistence.transactionRepository,
        budgetRepository: kernel.persistence.budgetRepository,
        goalRepository: kernel.persistence.goalRepository,
        goalModule: kernel.modules.goal,
        categoryModule: kernel.modules.category,
      });

      const result = await restore.executeRestore(replacement, { userId: 'replace-user' });
      assert.strictEqual(result.success, true);

      const accounts = await kernel.modules.account.getActiveAccounts({ userId: 'replace-user' });
      const names = accounts.map(a => a.name).sort();
      assert.ok(names.includes('Keep'));
      assert.ok(!names.includes('Drop'));
      assert.strictEqual(names.length, 4); // Keep + 3 defaults
    });
  });

  describe('legacy contamination', () => {
    it('greenfield backup/restore code does not import legacy services', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const backupFiles = [
        'src/application/backup/backup-format.js',
        'src/application/backup/backup-service.js',
        'src/application/backup/restore-service.js',
        'src/ui/views/settings.js',
      ];

      for (const rel of backupFiles) {
        const abs = path.join(process.cwd(), rel);
        const content = fs.readFileSync(abs, 'utf8');
        assert.ok(!content.includes('window.dbData'), `${rel} references window.dbData`);
        assert.ok(!content.includes('window.currentUserRef'), `${rel} references window.currentUserRef`);
        assert.ok(!content.includes('DataLayer'), `${rel} references DataLayer`);
        assert.ok(!content.includes('FirebaseStorageAdapter'), `${rel} references FirebaseStorageAdapter`);
        assert.ok(!content.includes('productDisplay'), `${rel} references productDisplay`);
        assert.ok(!content.includes('_extracted'), `${rel} references _extracted`);
        assert.ok(!content.includes('index.html'), `${rel} references index.html`);
      }
    });
  });
});

console.log('Hostile audit tests defined.');
