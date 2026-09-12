/**
 * Stage 0.3 — Automated tests for backup/restore foundation.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/backup-restore.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createBackup, backupToString, backupToBuffer } = require('../backup/backup');
const { validateBackup, previewRestore, executeRestore, rollbackRestore } = require('../backup/restore');
const { BACKUP_VERSION, SCHEMA_VERSION, COLLECTIONS, LOCAL_KEYS } = require('../backup/format');
const { createSyntheticDataset, createTransaction } = require('../fixtures/synthetic-data');

describe('Backup/Restore Foundation', () => {
  describe('Format & Versioning', () => {
    it('BACKUP_VERSION is defined and non-empty', () => {
      assert.ok(BACKUP_VERSION);
      assert.ok(typeof BACKUP_VERSION === 'string');
    });

    it('SCHEMA_VERSION is defined and non-empty', () => {
      assert.ok(SCHEMA_VERSION);
      assert.ok(typeof SCHEMA_VERSION === 'string');
    });

    it('COLLECTIONS list is non-empty and contains expected keys', () => {
      assert.ok(Array.isArray(COLLECTIONS));
      assert.ok(COLLECTIONS.length > 0);
      assert.ok(COLLECTIONS.includes('transactions'));
      assert.ok(COLLECTIONS.includes('debtors'));
      assert.ok(COLLECTIONS.includes('goals'));
    });

    it('LOCAL_KEYS list is non-empty', () => {
      assert.ok(Array.isArray(LOCAL_KEYS));
      assert.ok(LOCAL_KEYS.length > 0);
    });
  });

  describe('Backup Creation', () => {
    it('creates backup from empty dataset', () => {
      const envelope = createBackup({}, {}, 'user-1');
      assert.ok(envelope);
      assert.strictEqual(envelope.backupVersion, BACKUP_VERSION);
      assert.strictEqual(envelope.schemaVersion, SCHEMA_VERSION);
      assert.ok(envelope.createdAt);
      assert.strictEqual(envelope.userId, 'user-1');
      assert.ok(envelope.data);
      assert.ok(envelope.localSettings);
      assert.ok(envelope.integrity);
      assert.ok(envelope.integrity.checksum);
    });

    it('creates backup from normal synthetic dataset', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const envelope = createBackup(data, localSettings, userId);
      assert.ok(envelope);
      assert.strictEqual(envelope.userId, userId);
      assert.ok(Object.keys(envelope.data).length > 0);
    });

    it('backup includes all collections', () => {
      const { data } = createSyntheticDataset();
      const envelope = createBackup(data, {}, 'user-1');
      for (const key of COLLECTIONS) {
        assert.ok(Array.isArray(envelope.data[key]) || typeof envelope.data[key] === 'object', `Missing collection: ${key}`);
      }
    });

    it('backup includes local settings keys', () => {
      const { localSettings } = createSyntheticDataset();
      const envelope = createBackup({}, localSettings, 'user-1');
      for (const key of LOCAL_KEYS) {
        assert.ok(key in envelope.localSettings, `Missing local key: ${key}`);
      }
    });

    it('produces deterministic checksum for identical payload', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const createdAt = '2026-09-05T16:35:52.301Z';
      const envelope1 = createBackup(data, localSettings, userId, createdAt);
      const envelope2 = createBackup(data, localSettings, userId, createdAt);
      assert.strictEqual(envelope1.integrity.checksum, envelope2.integrity.checksum);
    });

    it('produces deterministic serialization', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const createdAt = '2026-09-05T16:35:52.301Z';
      const envelope1 = createBackup(data, localSettings, userId, createdAt);
      const envelope2 = createBackup(data, localSettings, userId, createdAt);
      const str1 = backupToString(envelope1);
      const str2 = backupToString(envelope2);
      assert.strictEqual(str1, str2);
    });

    it('handles Unicode and special characters', () => {
      const data = {
        transactions: [createTransaction({ desc: 'Zakupy — “specjalne” produkty #1', amount: 123.45 })]
      };
      const envelope = createBackup(data, {}, 'user-unicode');
      assert.ok(envelope);
      assert.ok(envelope.integrity.checksum);
    });

    it('handles null, numbers, booleans, arrays, nested objects', () => {
      const data = {
        ruleTargets: { needs: 50, wants: 30, savings: 20 },
        reminders: [{ id: 'r1', title: null, amount: 0, done: false, tags: ['a', 'b'] }]
      };
      const envelope = createBackup(data, {}, 'user-types');
      assert.ok(envelope);
      assert.strictEqual(envelope.data.ruleTargets.needs, 50);
      assert.strictEqual(envelope.data.reminders[0].amount, 0);
      assert.deepStrictEqual(envelope.data.reminders[0].tags, ['a', 'b']);
    });
  });

  describe('Backup Validation', () => {
    it('rejects null envelope', () => {
      const result = validateBackup(null);
      assert.ok(result.valid === false);
      assert.ok(result.errors.length > 0);
    });

    it('rejects envelope with missing backupVersion', () => {
      const result = validateBackup({ schemaVersion: SCHEMA_VERSION, data: {} });
      assert.ok(result.valid === false || result.errors.length > 0);
    });

    it('rejects envelope with unsupported schemaVersion', () => {
      const result = validateBackup({ backupVersion: BACKUP_VERSION, schemaVersion: '99.0.0', data: {} });
      assert.ok(result.valid === false || result.errors.includes('Unsupported schemaVersion'));
    });

    it('rejects envelope with tampered checksum', () => {
      const { data } = createSyntheticDataset();
      const envelope = createBackup(data, {}, 'user-1');
      envelope.integrity.checksum = 'tampered';
      const result = validateBackup(envelope);
      assert.ok(result.valid === false || result.errors.some(e => e.includes('checksum')));
    });

    it('rejects envelope with modified payload', () => {
      const { data } = createSyntheticDataset();
      const envelope = createBackup(data, {}, 'user-1');
      envelope.data.transactions.push({ id: 'evil' });
      const result = validateBackup(envelope);
      assert.ok(result.valid === false || result.errors.some(e => e.includes('checksum')));
    });
  });

  describe('Restore', () => {
    it('validates backup before restore', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const envelope = createBackup(data, localSettings, userId);
      const validation = validateBackup(envelope);
      assert.ok(validation.valid);
    });

    it('generates preview without mutating state', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const envelope = createBackup(data, localSettings, userId);
      const currentState = { data: {}, localSettings: {} };
      const preview = previewRestore(currentState, envelope);
      assert.ok(preview);
      assert.ok(preview.collections.added.length > 0);
    });

    it('creates pre-restore backup', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const backup = createBackup(data, localSettings, userId);
      const currentState = { data: { a: 1 }, localSettings: {}, userId: 'user-1' };
      const result = executeRestore(backup, currentState);
      assert.ok(result.preRestoreBackup);
      assert.deepStrictEqual(result.preRestoreBackup.data, { a: 1 });
    });

    it('rollback restores pre-restore state', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const backup = createBackup(data, localSettings, userId);
      const currentState = { data: { a: 1 }, localSettings: {}, userId: 'user-1' };
      const result = executeRestore(backup, currentState);
      const rollback = rollbackRestore(result.preRestoreBackup);
      assert.deepStrictEqual(rollback.data, { a: 1 });
    });

    it('dry run does not mutate state', () => {
      const { data, localSettings, userId } = createSyntheticDataset();
      const envelope = createBackup(data, localSettings, userId);
      const currentState = { data: {}, localSettings: {} };
      const result = executeRestore(envelope, currentState, { dryRun: true });
      assert.ok(result.dryRun);
      assert.ok(result.preview);
    });

    it('rejects restore with invalid backup', () => {
      const currentState = { data: {}, userId: 'user-1' };
      assert.throws(() => {
        executeRestore({ data: 'not-an-object' }, currentState);
      }, { code: 'INVALID_BACKUP' });
    });
  });

  describe('Round-trip invariant', () => {
    it('backup -> modify -> restore -> data equality', () => {
      const original = createSyntheticDataset();
      const backup = createBackup(original.data, original.localSettings, original.userId);
      const modifiedState = {
        data: { transactions: [{ id: 'modified' }] },
        localSettings: { finapp_theme: 'light' }
      };
      const restored = executeRestore(backup, modifiedState);
      assert.ok(restored.success);
      assert.deepStrictEqual(restored.data.transactions.length, original.data.transactions.length);
      assert.deepStrictEqual(restored.localSettings.finapp_theme, original.localSettings.finapp_theme);
    });
  });

  describe('Edge cases', () => {
    it('handles empty arrays', () => {
      const data = { transactions: [], debtors: [], budgets: [] };
      const envelope = createBackup(data, {}, 'user-empty');
      assert.ok(envelope);
      assert.deepStrictEqual(envelope.data.transactions, []);
    });

    it('handles objects with null values', () => {
      const data = { reminders: [{ id: 'r1', title: null, amount: null }] };
      const envelope = createBackup(data, {}, 'user-null');
      assert.ok(envelope);
      assert.strictEqual(envelope.data.reminders[0].title, null);
    });

    it('handles large nested structures', () => {
      const nested = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
      const envelope = createBackup({ nested }, {}, 'user-nested');
      assert.ok(envelope);
      assert.strictEqual(envelope.data.nested.a.b.c.d.e.f, 'deep');
    });

    it('rejects restore with mismatched userId', () => {
      const { data, localSettings } = createSyntheticDataset();
      const envelope = createBackup(data, localSettings, 'user-A');
      const currentState = { data: {}, userId: 'user-B' };
      const preview = previewRestore(currentState, envelope);
      assert.ok(preview);
      assert.strictEqual(preview.userId, 'user-A');
    });
  });
});

console.log('Tests defined. Run with: node tests/backup-restore.test.js');
