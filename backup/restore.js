/**
 * Stage 0.3 — Restore foundation.
 *
 * Restore is validated, previewable, confirmable, and rollback-safe.
 * Does not write to Firebase or mutate production state in this stage.
 */

const { validateEnvelope, canonicalize, SCHEMA_VERSION } = require('./format');

class RestoreError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function validateBackup(envelope) {
  const errors = validateEnvelope(envelope);
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (envelope.schemaVersion !== SCHEMA_VERSION) {
    return { valid: false, errors: [`Unsupported schemaVersion: ${envelope.schemaVersion}`] };
  }

  if (!envelope.userId || typeof envelope.userId !== 'string') {
    return { valid: false, errors: ['Missing or invalid userId'] };
  }

  return { valid: true, errors: [] };
}

function computeDiff(currentData, backupData) {
  const diff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: []
  };

  const allKeys = new Set([
    ...Object.keys(currentData || {}),
    ...Object.keys(backupData || {})
  ]);

  for (const key of allKeys) {
    const current = currentData[key];
    const backup = backupData[key];

    if (current === undefined && backup !== undefined) {
      diff.added.push(key);
    } else if (current !== undefined && backup === undefined) {
      diff.removed.push(key);
    } else if (JSON.stringify(current) !== JSON.stringify(backup)) {
      diff.modified.push({ key, current, backup });
    } else {
      diff.unchanged.push(key);
    }
  }

  return diff;
}

function previewRestore(currentState, backupEnvelope) {
  const currentData = currentState.data || {};
  const backupData = backupEnvelope.data || {};

  const diff = computeDiff(currentData, backupData);
  const localDiff = computeDiff(currentState.localSettings || {}, backupEnvelope.localSettings || {});

  return {
    backupVersion: backupEnvelope.backupVersion,
    schemaVersion: backupEnvelope.schemaVersion,
    createdAt: backupEnvelope.createdAt,
    userId: backupEnvelope.userId,
    collections: {
      added: diff.added,
      removed: diff.removed,
      modified: diff.modified.length,
      unchanged: diff.unchanged.length
    },
    localSettings: {
      added: localDiff.added,
      removed: localDiff.removed,
      modified: localDiff.modified.length,
      unchanged: localDiff.unchanged.length
    },
    warnings: []
  };
}

function createPreRestoreBackup(currentState) {
  const payload = {
    backupVersion: '1.0.0',
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: 'stage-0.3-pre-restore',
    userId: currentState.userId || 'pre-restore',
    metadata: {
      totalCollections: Object.keys(currentState.data || {}).length,
      totalSize: JSON.stringify(currentState.data).length,
      source: 'pre-restore-backup'
    },
    data: currentState.data,
    localSettings: currentState.localSettings
  };
  return payload;
}

function executeRestore(backupEnvelope, currentState, options = {}) {
  const preRestore = createPreRestoreBackup(currentState);

  const validation = validateBackup(backupEnvelope);
  if (!validation.valid) {
    throw new RestoreError('Invalid backup: ' + validation.errors.join(', '), 'INVALID_BACKUP');
  }

  if (options.dryRun) {
    return { success: true, dryRun: true, preview: previewRestore(currentState, backupEnvelope) };
  }

  try {
    const restoredData = JSON.parse(JSON.stringify(backupEnvelope.data || {}));
    const restoredLocal = JSON.parse(JSON.stringify(backupEnvelope.localSettings || {}));

    return {
      success: true,
      preRestoreBackup: preRestore,
      data: restoredData,
      localSettings: restoredLocal,
      restoredAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      preRestoreBackup: preRestore,
      error: err.message,
      rollbackAvailable: true
    };
  }
}

function rollbackRestore(preRestoreBackup) {
  if (!preRestoreBackup) {
    throw new RestoreError('No pre-restore backup available for rollback', 'NO_ROLLBACK');
  }
  return {
    success: true,
    data: preRestoreBackup.data,
    localSettings: preRestoreBackup.localSettings,
    rolledBackAt: new Date().toISOString()
  };
}

module.exports = {
  RestoreError,
  validateBackup,
  computeDiff,
  previewRestore,
  createPreRestoreBackup,
  executeRestore,
  rollbackRestore
};
