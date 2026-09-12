/**
 * Stage 1.3 — Schema Migration Public API
 *
 * Pure migration framework: no Firebase, no DOM, no global state.
 */

const { MigrationRegistry } = require('./migration-registry');
const { Migrator } = require('./migrator');

const registry = new MigrationRegistry();
const migrator = new Migrator(registry);

function registerMigration(fromVersion, toVersion, options) {
  return registry.register(fromVersion, toVersion, options);
}

function migrate(data, options) {
  return migrator.migrate(data, options);
}

function detectVersion(data) {
  return migrator.detectVersion(data);
}

function getRegistry() {
  return registry;
}

module.exports = {
  registerMigration,
  migrate,
  detectVersion,
  getRegistry,
  CURRENT_SCHEMA_VERSION: require('./schema-version').CURRENT_SCHEMA_VERSION
};
