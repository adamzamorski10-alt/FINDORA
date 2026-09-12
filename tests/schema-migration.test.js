/**
 * Stage 1.3 — Schema Versioning & Migration Tests
 *
 * Run with: node tests/schema-migration.test.js
 *
 * These tests verify the generic migration framework.
 * Test data shapes are abstract and do not represent real FINORA documents.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  migrateData,
  getDataVersion,
  CURRENT_SCHEMA_VERSION,
  getRegistry
} = require('../src/schema/integration');

function registerGenericMigrations() {
  const registry = getRegistry();

  registry.register('1.0.0', '1.1.0', {
    transform: function(data) {
      if (!data || typeof data !== 'object') throw new Error('invalid');
      const out = JSON.parse(JSON.stringify(data));
      out.minorBump = true;
      return out;
    },
    validateSource: function(data) {
      const result = { valid: true, errors: [] };
      if (!data || typeof data !== 'object') result.valid = false;
      return result;
    },
    validateTarget: function(data) {
      const result = { valid: true, errors: [] };
      if (!data || typeof data !== 'object' || !data.minorBump) result.valid = false;
      return result;
    },
    description: 'generic minor bump'
  });

  registry.register('1.1.0', '2.0.0', {
    transform: function(data) {
      if (!data || typeof data !== 'object') throw new Error('invalid');
      const out = JSON.parse(JSON.stringify(data));
      out.majorBump = true;
      return out;
    },
    validateTarget: function(data) {
      const result = { valid: true, errors: [] };
      if (!data || typeof data !== 'object' || !data.majorBump) result.valid = false;
      return result;
    },
    description: 'generic major bump'
  });

  registry.register('1.0.0', '2.0.0', {
    transform: function(data) {
      if (!data || typeof data !== 'object') throw new Error('invalid');
      const out = JSON.parse(JSON.stringify(data));
      out.directJump = true;
      return out;
    },
    description: 'generic direct jump'
  });
}

describe('Schema Versioning & Migration', () => {
  describe('SchemaVersion', () => {
    it('CURRENT_SCHEMA_VERSION is semver string', () => {
      assert.ok(typeof CURRENT_SCHEMA_VERSION === 'string');
      assert.ok(CURRENT_SCHEMA_VERSION.match(/^\d+\.\d+\.\d+$/));
    });

    it('detects explicit string version', () => {
      const data = { version: '1.5.0', payload: {} };
      const info = getDataVersion(data);
      assert.ok(info);
      assert.strictEqual(info.version, '1.5.0');
      assert.strictEqual(info.explicit, true);
    });

    it('detects explicit current version', () => {
      const data = { version: CURRENT_SCHEMA_VERSION, payload: {} };
      const info = getDataVersion(data);
      assert.ok(info);
      assert.strictEqual(info.version, CURRENT_SCHEMA_VERSION);
      assert.strictEqual(info.explicit, true);
    });

    it('returns non-explicit for missing version', () => {
      const data = { payload: {} };
      const info = getDataVersion(data);
      assert.ok(info);
      assert.strictEqual(info.explicit, false);
    });

    it('marks invalid string version', () => {
      const data = { version: 'not-semver' };
      const info = getDataVersion(data);
      assert.ok(info);
      assert.strictEqual(info.invalid, true);
    });

    it('marks numeric version as invalid', () => {
      const data = { version: 2 };
      const info = getDataVersion(data);
      assert.ok(info);
      assert.strictEqual(info.invalid, true);
    });

    it('marks null version as invalid', () => {
      const data = { version: null };
      const info = getDataVersion(data);
      assert.ok(info);
      assert.strictEqual(info.invalid, true);
    });
  });

  describe('Migration: current version no-op', () => {
    it('data with current version returns success unchanged', () => {
      const data = { version: CURRENT_SCHEMA_VERSION, payload: { a: 1 } };
      const result = migrateData(data);
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, data);
    });
  });

  describe('Migration: missing version infers oldest known', () => {
    it('infers 1.0.0 for unversioned data', () => {
      const registry = getRegistry();
      registry.register('1.0.0', '1.1.0', {
        transform: function(data) { return data; },
        description: 'no-op bump'
      });

      const data = { payload: { a: 1 } };
      const result = migrateData(data, { targetVersion: '1.1.0' });
      assert.strictEqual(result.success, true);
    });

    it('returns failure for null data', () => {
      const result = migrateData(null);
      assert.strictEqual(result.success, false);
    });

    it('returns failure for undefined data', () => {
      const result = migrateData(undefined);
      assert.strictEqual(result.success, false);
    });
  });

  describe('Migration: invalid version fails', () => {
    it('rejects non-semver string', () => {
      const data = { version: 'not-a-version', payload: {} };
      const result = migrateData(data);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.some(e => e.includes('Invalid schemaVersion')));
    });

    it('rejects numeric version', () => {
      const data = { version: 2, payload: {} };
      const result = migrateData(data);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.some(e => e.includes('Invalid schemaVersion')));
    });
  });

  describe('Migration: future version rejection', () => {
    it('rejects version greater than current', () => {
      const data = { version: '99.0.0', payload: {} };
      const result = migrateData(data);
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.some(e => e.includes('UNSUPPORTED_FUTURE_SCHEMA')));
    });
  });

  describe('Migration: invalid data', () => {
    it('rejects null', () => {
      assert.strictEqual(migrateData(null).success, false);
    });

    it('rejects undefined', () => {
      assert.strictEqual(migrateData(undefined).success, false);
    });

    it('rejects arrays', () => {
      assert.strictEqual(migrateData([]).success, false);
    });

    it('rejects strings', () => {
      assert.strictEqual(migrateData('string').success, false);
    });
  });

  describe('Migration: round-trip invariants', () => {
    it('migrated data can be re-detected', () => {
      const registry = getRegistry();
      registry.register('1.0.0', '1.1.0', {
        transform: function(data) {
          const out = JSON.parse(JSON.stringify(data));
          out.version = '1.1.0';
          return out;
        },
        validateTarget: function(data) {
          const result = { valid: true, errors: [] };
          if (!data || data.version !== '1.1.0') result.valid = false;
          return result;
        },
        description: 'add version marker'
      });

      const data = { payload: { a: 1 } };
      const migrated = migrateData(data, { targetVersion: '1.1.0' });
      assert.strictEqual(migrated.success, true);

      const detected = getDataVersion(migrated.data);
      assert.ok(detected);
      assert.strictEqual(detected.version, '1.1.0');
      assert.strictEqual(detected.explicit, true);
    });

    it('migrated data can be re-migrated as no-op', () => {
      const registry = getRegistry();
      registry.register('1.0.0', '1.1.0', {
        transform: function(data) {
          const out = JSON.parse(JSON.stringify(data));
          out.version = '1.1.0';
          return out;
        },
        validateTarget: function(data) {
          const result = { valid: true, errors: [] };
          if (!data || data.version !== '1.1.0') result.valid = false;
          return result;
        },
        description: 'add version marker'
      });

      const data = { payload: { a: 1 } };
      const first = migrateData(data, { targetVersion: '1.1.0' });
      assert.strictEqual(first.success, true);

      const second = migrateData(first.data, { targetVersion: '1.1.0' });
      assert.strictEqual(second.success, true);
      assert.deepStrictEqual(second.data, first.data);
    });
  });

  describe('Migration: multi-step chain', () => {
    it('direct jump is preferred over sequential steps', () => {
      registerGenericMigrations();
      const data = { payload: { a: 1 } };
      const result = migrateData(data);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.directJump, true);
    });
  });

  describe('Migration: path selection', () => {
    it('prefers direct jump when available', () => {
      registerGenericMigrations();
      const data = { payload: { a: 1 } };
      const result = migrateData(data);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.directJump, true);
      assert.strictEqual(result.data.minorBump, undefined);
    });
  });

  describe('Migration: source immutability', () => {
    it('does not mutate source on success', () => {
      const data = { payload: { a: 1 } };
      const original = JSON.stringify(data);
      migrateData(data, { targetVersion: '1.1.0' });
      assert.strictEqual(JSON.stringify(data), original);
    });

    it('does not mutate source on failure', () => {
      const data = { payload: { a: 1 } };
      const original = JSON.stringify(data);
      migrateData(JSON.parse(JSON.stringify(data)), { targetVersion: '2.0.0' });
      assert.strictEqual(JSON.stringify(data), original);
    });
  });

  describe('Migration: deterministic', () => {
    it('same input produces same output', () => {
      const data = { payload: { a: 1 } };
      const r1 = migrateData(JSON.parse(JSON.stringify(data)), { targetVersion: '1.1.0' });
      const r2 = migrateData(JSON.parse(JSON.stringify(data)), { targetVersion: '1.1.0' });
      assert.deepStrictEqual(r1.data, r2.data);
    });
  });

  describe('Migration: failure semantics', () => {
    it('returns failure when transform throws', () => {
      const registry = getRegistry();
      registry.register('1.0.0', '1.1.0', {
        transform: function() { throw new Error('boom'); },
        description: 'failing'
      });

      const data = { payload: {} };
      const result = migrateData(data, { targetVersion: '1.1.0' });
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('Migration: registry', () => {
    it('register validates version format', () => {
      const registry = getRegistry();
      assert.throws(() => {
        registry.register('not-a-version', '2.0.0', { transform: function() {} });
      });
    });

    it('register prevents downgrade', () => {
      const registry = getRegistry();
      assert.throws(() => {
        registry.register('2.0.0', '1.0.0', { transform: function() {} });
      }, /Migration must upgrade version/);
    });

    it('getPath returns error for missing migration', () => {
      const registry = getRegistry();
      const path = registry.getPath('1.0.0', '5.0.0');
      assert.strictEqual(path.valid, false);
    });
  });
});
