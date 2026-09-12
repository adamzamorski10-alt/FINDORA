/**
 * Stage 1.3 — Migration Registry
 *
 * Central registry for schema migrations.
 * Migrations are registered as sequential version pairs.
 * The registry validates migration paths and prevents gaps.
 */

const { Migration } = require('./migration');
const { parseVersion, compareVersions } = require('./schema-version');

class MigrationRegistry {
  constructor() {
    this.migrations = new Map();
    this.currentVersion = '1.0.0';
  }

  register(fromVersion, toVersion, options) {
    if (!parseVersion(fromVersion) || !parseVersion(toVersion)) {
      throw new Error('Invalid migration versions: ' + fromVersion + ' -> ' + toVersion);
    }
    if (compareVersions(toVersion, fromVersion) <= 0) {
      throw new Error('Migration must upgrade version: ' + fromVersion + ' -> ' + toVersion);
    }

    const migration = new Migration({
      fromVersion: fromVersion,
      toVersion: toVersion,
      transform: options.transform,
      validateSource: options.validateSource || null,
      validateTarget: options.validateTarget || null,
      description: options.description || ''
    });

    const key = fromVersion + '->' + toVersion;
    this.migrations.set(key, migration);
    return this;
  }

  getMigration(fromVersion, toVersion) {
    const key = fromVersion + '->' + toVersion;
    return this.migrations.get(key) || null;
  }

  hasMigration(fromVersion, toVersion) {
    return this.migrations.has(fromVersion + '->' + toVersion);
  }

  getPath(fromVersion, toVersion) {
    if (!parseVersion(fromVersion) || !parseVersion(toVersion)) {
      return { path: [], valid: false, error: 'Invalid version: ' + fromVersion + ' -> ' + toVersion };
    }

    if (compareVersions(fromVersion, toVersion) >= 0) {
      return { path: [], valid: false, error: 'Source version >= target version' };
    }

    const path = [];
    let current = fromVersion;

    while (compareVersions(current, toVersion) < 0) {
      const key = current + '->' + toVersion;
      const migration = this.migrations.get(key);
      if (migration) {
        path.push({ from: current, to: toVersion, migration: migration });
        break;
      }

      let nextVersion = null;
      let minDiff = Infinity;

      for (const [mKey, m] of this.migrations) {
        const [from, to] = mKey.split('->');
        if (from === current && compareVersions(to, toVersion) < 0) {
          const diff = compareVersions(to, toVersion);
          if (diff < minDiff) {
            minDiff = diff;
            nextVersion = to;
          }
        }
      }

      if (!nextVersion) {
        return { path: [], valid: false, error: 'No migration path from ' + current + ' towards ' + toVersion };
      }

      const stepKey = current + '->' + nextVersion;
      const step = this.migrations.get(stepKey);
      if (!step) {
        return { path: [], valid: false, error: 'Missing migration step: ' + current + ' -> ' + nextVersion };
      }

      path.push({ from: current, to: nextVersion, migration: step });
      current = nextVersion;
    }

    return { path: path, valid: true, error: null };
  }

  setCurrentVersion(version) {
    if (!parseVersion(version)) {
      throw new Error('Invalid version: ' + version);
    }
    this.currentVersion = version;
  }

  getCurrentVersion() {
    return this.currentVersion;
  }
}

module.exports = { MigrationRegistry };
