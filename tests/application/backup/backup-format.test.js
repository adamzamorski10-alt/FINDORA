/**
 * Stage 5C — Tests for backup format, canonicalization, and integrity.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKUP_VERSION,
  SCHEMA_VERSION,
  canonicalize,
  createEnvelope,
  validateEnvelopeStructure,
  verifyIntegrity,
} from '../../../src/application/backup/backup-format.js';

describe('BackupFormat', () => {
  describe('constants', () => {
    it('has non-empty BACKUP_VERSION', () => {
      assert.ok(BACKUP_VERSION);
      assert.ok(typeof BACKUP_VERSION === 'string');
    });

    it('has non-empty SCHEMA_VERSION', () => {
      assert.ok(SCHEMA_VERSION);
      assert.ok(typeof SCHEMA_VERSION === 'string');
    });
  });

  describe('canonicalize', () => {
    it('preserves null', () => {
      assert.strictEqual(canonicalize(null), null);
    });

    it('omits undefined', () => {
      assert.strictEqual(canonicalize(undefined), undefined);
    });

    it('preserves strings', () => {
      assert.strictEqual(canonicalize('hello'), 'hello');
    });

    it('preserves finite numbers', () => {
      assert.strictEqual(canonicalize(42), 42);
      assert.strictEqual(canonicalize(-3.14), -3.14);
      assert.strictEqual(canonicalize(0), 0);
    });

    it('preserves booleans', () => {
      assert.strictEqual(canonicalize(true), true);
      assert.strictEqual(canonicalize(false), false);
    });

    it('sorts object keys recursively', () => {
      const input = { z: 1, a: 2, m: { c: 3, a: 4 } };
      const result = canonicalize(input);
      assert.deepStrictEqual(result, { a: 2, m: { a: 4, c: 3 }, z: 1 });
    });

    it('preserves array order', () => {
      const input = [3, 1, 2];
      assert.deepStrictEqual(canonicalize(input), [3, 1, 2]);
    });

    it('canonicalizes nested arrays', () => {
      const input = [[2, 1], [4, 3]];
      assert.deepStrictEqual(canonicalize(input), [[2, 1], [4, 3]]);
    });

    it('omits undefined values in objects', () => {
      const input = { a: 1, b: undefined, c: 3 };
      assert.deepStrictEqual(canonicalize(input), { a: 1, c: 3 });
    });

    it('omits undefined values in arrays', () => {
      const input = [1, undefined, 3];
      assert.deepStrictEqual(canonicalize(input), [1, 3]);
    });

    it('produces deterministic output for identical inputs', () => {
      const input = { z: 1, a: { y: 2, x: 3 } };
      const result1 = canonicalize(input);
      const result2 = canonicalize(input);
      assert.deepStrictEqual(result1, result2);
    });
  });

  describe('createEnvelope', () => {
    it('creates valid envelope', async () => {
      const envelope = await createEnvelope({ data: { accounts: [] }, userId: 'user-1' });
      assert.strictEqual(envelope.backupVersion, BACKUP_VERSION);
      assert.strictEqual(envelope.schemaVersion, SCHEMA_VERSION);
      assert.ok(envelope.createdAt);
      assert.strictEqual(envelope.userId, 'user-1');
      assert.ok(envelope.data);
      assert.ok(envelope.integrity);
      assert.ok(envelope.integrity.checksum);
    });

    it('creates deterministic checksum for identical payloads', async () => {
      const data = { accounts: [{ id: 'a1', name: 'Test' }] };
      const createdAt = '2026-09-05T16:35:52.301Z';
      const envelope1 = await createEnvelope({ data, userId: 'user-1', createdAt });
      const envelope2 = await createEnvelope({ data, userId: 'user-1', createdAt });
      assert.strictEqual(envelope1.integrity.checksum, envelope2.integrity.checksum);
    });

    it('includes all required collections in data', async () => {
      const data = {
        profile: [{ id: 'user-1', settings: {} }],
        accounts: [],
        categories: [],
        transactions: [],
        budgets: [],
        goals: [],
      };
      const envelope = await createEnvelope({ data, userId: 'user-1' });
      assert.ok(envelope.data.profile);
      assert.ok(Array.isArray(envelope.data.accounts));
      assert.ok(Array.isArray(envelope.data.categories));
      assert.ok(Array.isArray(envelope.data.transactions));
      assert.ok(Array.isArray(envelope.data.budgets));
      assert.ok(Array.isArray(envelope.data.goals));
    });
  });

  describe('validateEnvelopeStructure', () => {
    it('rejects null envelope', () => {
      const errors = validateEnvelopeStructure(null);
      assert.ok(errors.length > 0);
    });

    it('rejects envelope with missing backupVersion', () => {
      const errors = validateEnvelopeStructure({ schemaVersion: SCHEMA_VERSION, data: {} });
      assert.ok(errors.some(e => typeof e === 'string' && e.includes('backupVersion')));
    });

    it('rejects envelope with missing userId', () => {
      const errors = validateEnvelopeStructure({
        backupVersion: BACKUP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        data: {},
      });
      assert.ok(errors.some(e => typeof e === 'string' && e.includes('userId')));
    });

    it('accepts valid envelope', async () => {
      const envelope = await createEnvelope({ data: { accounts: [] }, userId: 'user-1' });
      const errors = validateEnvelopeStructure(envelope);
      assert.strictEqual(errors.length, 0);
    });
  });

  describe('integrity', () => {
    it('verifies checksum of valid envelope', async () => {
      const envelope = await createEnvelope({ data: { accounts: [] }, userId: 'user-1' });
      const valid = await verifyIntegrity(envelope);
      assert.strictEqual(valid, true);
    });

    it('rejects tampered checksum', async () => {
      const envelope = await createEnvelope({ data: { accounts: [] }, userId: 'user-1' });
      envelope.integrity.checksum = 'tampered';
      const valid = await verifyIntegrity(envelope);
      assert.strictEqual(valid, false);
    });

    it('rejects tampered payload', async () => {
      const envelope = await createEnvelope({ data: { accounts: [] }, userId: 'user-1' });
      envelope.data.accounts.push({ id: 'evil' });
      const valid = await verifyIntegrity(envelope);
      assert.strictEqual(valid, false);
    });
  });
});

console.log('Tests defined.');
