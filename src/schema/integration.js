/**
 * Stage 1.3 — Schema Migration Public API
 *
 * Pure migration framework: no Firebase, no DOM, no global state.
 *
 * The framework is intentionally provided without default domain migrations.
 * Consumers should register migrations specific to their data models.
 */

const { registerMigration, migrate, detectVersion, getRegistry, CURRENT_SCHEMA_VERSION } = require('./index');

getRegistry().setCurrentVersion(CURRENT_SCHEMA_VERSION);

function migrateData(data, options) {
  return migrate(data, options);
}

function getDataVersion(data) {
  return detectVersion(data);
}

module.exports = {
  migrateData,
  getDataVersion,
  CURRENT_SCHEMA_VERSION,
  getRegistry
};
