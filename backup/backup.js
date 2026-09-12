/**
 * Stage 0.3 — Backup creation.
 *
 * Produces a versioned, integrity-protected backup envelope.
 * Does not write to Firebase or mutate production state.
 */

const { createEnvelope, validateEnvelope, SCHEMA_VERSION } = require('./format');

function createBackup(data, localSettings, userId = 'synthetic-test', createdAt) {
  const envelope = createEnvelope(data, localSettings, userId, createdAt);
  const validationErrors = validateEnvelope(envelope);
  if (validationErrors.length > 0) {
    throw new Error('Invalid backup envelope: ' + validationErrors.join(', '));
  }
  return envelope;
}

function backupToString(envelope) {
  return JSON.stringify(envelope, null, 2);
}

function backupToBuffer(envelope) {
  return Buffer.from(backupToString(envelope), 'utf8');
}

module.exports = {
  createBackup,
  backupToString,
  backupToBuffer
};
