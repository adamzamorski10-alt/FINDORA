/**
 * Stage 5C — Tests for backup service.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createAppKernel } from '../../../src/application/app-kernel.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('BackupService', () => {
  function createTestKernel(userId = 'backup-user-1') {
    const storage = new InMemoryStorageAdapter();
    const kernel = createAppKernel({ storageAdapter: storage, userId });
    return kernel;
  }

  it('creates backup with all entity types', async () => {
    const kernel = createTestKernel('backup-user-1');

    await kernel.modules.account.createAccount({
      userId: 'backup-user-1',
      name: 'Main Account',
      type: 'bank',
      icon: 'landmark',
      color: '#4A90D9',
      openingBalance: 1000,
    });

    await kernel.modules.category.createCategory({
      userId: 'backup-user-1',
      name: 'Food',
      type: 'expense',
      icon: 'shopping-cart',
      color: '#FF6B6B',
    });

    const backup = await kernel.modules.backup.createBackup({ userId: 'backup-user-1' });

    assert.strictEqual(backup.userId, 'backup-user-1');
    assert.strictEqual(backup.backupVersion, '1.0.0');
    assert.strictEqual(backup.schemaVersion, '1.0.0');
    assert.ok(backup.data.accounts.length > 0);
    assert.ok(backup.data.categories.length > 0);
  });

  it('includes archived entities', async () => {
    const kernel = createTestKernel('backup-user-2');

    const account = await kernel.modules.account.createAccount({
      userId: 'backup-user-2',
      name: 'To Archive',
      type: 'bank',
      icon: 'landmark',
      color: '#4A90D9',
    });

    await kernel.modules.account.archiveAccount({ accountId: account.id });

    const backup = await kernel.modules.backup.createBackup({ userId: 'backup-user-2' });
    assert.ok(backup.data.accounts.some(a => a.archived === true));
  });

  it('includes system categories', async () => {
    const kernel = createTestKernel('backup-user-3');

    await kernel.modules.category.seedSystemCategories({ userId: 'backup-user-3' });

    const backup = await kernel.modules.backup.createBackup({ userId: 'backup-user-3' });
    assert.ok(backup.data.categories.some(c => c.isSystem === true));
    assert.ok(backup.data.categories.some(c => c.systemRole === 'opening-balance'));
    assert.ok(backup.data.categories.some(c => c.systemRole === 'savings'));
  });

  it('includes opening-balance transactions', async () => {
    const kernel = createTestKernel('backup-user-4');

    await kernel.modules.account.createAccount({
      userId: 'backup-user-4',
      name: 'Main Account',
      type: 'bank',
      icon: 'landmark',
      color: '#4A90D9',
      openingBalance: 500,
    });

    const backup = await kernel.modules.backup.createBackup({ userId: 'backup-user-4' });
    assert.ok(backup.data.transactions.some(tx => tx.metadata && tx.metadata.openingBalance === true));
  });

  it('produces deterministic checksum for identical data', async () => {
    const kernel = createTestKernel('backup-user-5');

    await kernel.modules.account.createAccount({
      userId: 'backup-user-5',
      name: 'Main Account',
      type: 'bank',
      icon: 'landmark',
      color: '#4A90D9',
    });

    const fixedDate = '2026-01-01T00:00:00.000Z';
    const backup1 = await kernel.modules.backup.createBackup({ userId: 'backup-user-5', createdAt: fixedDate });
    const backup2 = await kernel.modules.backup.createBackup({ userId: 'backup-user-5', createdAt: fixedDate });

    assert.strictEqual(backup1.integrity.checksum, backup2.integrity.checksum);
  });
});

console.log('Tests defined.');
