/**
 * Stage 1.3 — Migrator
 *
 * Orchestrates schema migrations.
 * Pure logic: no Firebase, no DOM, no global state, no I/O.
 */

const { MigrationResult } = require('./migration');
const { parseVersion, compareVersions, isFutureVersion, isCurrentVersion, CURRENT_SCHEMA_VERSION } = require('./schema-version');

class Migrator {
  constructor(registry) {
    this.registry = registry;
  }

  detectVersion(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    if (typeof data.version === 'string' && parseVersion(data.version)) {
      return { version: data.version, explicit: true };
    }
    if (data.version !== undefined) {
      return { version: data.version, explicit: true, invalid: true };
    }
    return { version: null, explicit: false };
  }

  migrate(data, options) {
    options = options || {};
    const targetVersion = options.targetVersion || CURRENT_SCHEMA_VERSION;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return MigrationResult.failure(['Invalid data: expected object'], null, targetVersion);
    }

    const versionInfo = this.detectVersion(data);
    let currentVersion;
    let fromVersion;

    if (!versionInfo) {
      return MigrationResult.failure(['Invalid data: expected object'], null, targetVersion);
    }

    if (versionInfo.invalid) {
      return MigrationResult.failure(['Invalid schemaVersion: ' + versionInfo.version], versionInfo.version, targetVersion);
    }

    if (versionInfo.explicit) {
      currentVersion = versionInfo.version;
    } else {
      currentVersion = '1.0.0';
    }

    fromVersion = currentVersion;

    if (isCurrentVersion(currentVersion, targetVersion)) {
      return MigrationResult.success(data, currentVersion, targetVersion);
    }

    if (isFutureVersion(currentVersion, targetVersion)) {
      return MigrationResult.unsupportedFuture(currentVersion);
    }

    const pathResult = this.registry.getPath(currentVersion, targetVersion);

    if (!pathResult.valid) {
      return MigrationResult.failure([pathResult.error], currentVersion, targetVersion);
    }

    let currentData = JSON.parse(JSON.stringify(data));
    let migrationFromVersion = currentVersion;

    for (const step of pathResult.path) {
      const migrationResult = step.migration.apply(currentData);

      if (!migrationResult.success) {
        return MigrationResult.failure(
          migrationResult.errors,
          migrationFromVersion,
          targetVersion
        );
      }

      currentData = migrationResult.data;
      migrationFromVersion = step.to;
    }

    return MigrationResult.success(currentData, fromVersion, targetVersion);
  }
}

module.exports = { Migrator };
