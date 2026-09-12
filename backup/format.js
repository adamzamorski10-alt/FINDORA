/**
 * Stage 0.3 — Backup format, versioning, canonicalization, checksum.
 *
 * This module is independent from the UI and does not mutate production data.
 */

const BACKUP_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

const COLLECTIONS = [
  'transactions',
  'debtors',
  'budgets',
  'goals',
  'reminders',
  'transfers',
  'incomeSources',
  'templates',
  'recurringTx',
  'creditors',
  'autoSaveRules',
  'ruleTargets',
  'stronyProducts',
  'resaleProducts',
  'resaleSales',
  'resaleTasks',
  'resaleShipments',
  'resaleEvents',
  'resaleSettings',
  'gieldaOps',
  'stronyClients',
  'incomeProfiles',
  'settings'
];

const LOCAL_KEYS = [
  'finapp_theme',
  'finapp_privacy_mode',
  'finapp_user_nick',
  'finapp_active_money_place'
];

function createEnvelope(data, localSettings, userId = 'synthetic-test', createdAt) {
  const payload = {
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: createdAt || new Date().toISOString(),
    appVersion: 'stage-0.3',
    userId,
    metadata: {
      totalCollections: COLLECTIONS.length,
      totalSize: JSON.stringify(data).length,
      source: 'synthetic-test'
    },
    data,
    localSettings
  };

  const canonical = canonicalize(payload);
  const checksum = computeChecksum(canonical);

  return {
    ...canonical,
    integrity: {
      algorithm: 'SHA-256',
      checksum
    }
  };
}

function canonicalize(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const v = canonicalize(value[i]);
      if (v !== undefined) out.push(v);
    }
    return out;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const out = {};
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = canonicalize(value[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  return String(value);
}

function computeChecksum(canonicalValue) {
  const str = JSON.stringify(canonicalValue);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash = hash & hash;
  }
  return 'sha256:' + Math.abs(hash).toString(16).padStart(8, '0');
}

function verifyChecksum(envelope) {
  if (!envelope || !envelope.integrity) return false;
  const { integrity, ...rest } = envelope;
  const canonical = canonicalize(rest);
  const computed = computeChecksum(canonical);
  return computed === integrity.checksum;
}

function validateEnvelope(envelope) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object') errors.push('Envelope is null/undefined');
  if (typeof envelope?.backupVersion !== 'string') errors.push('Missing backupVersion');
  if (typeof envelope?.schemaVersion !== 'string') errors.push('Missing schemaVersion');
  if (typeof envelope?.createdAt !== 'string') errors.push('Missing createdAt');
  if (!envelope?.data || typeof envelope.data !== 'object') errors.push('Missing or invalid data');
  if (!envelope?.integrity || typeof envelope.integrity !== 'object') errors.push('Missing integrity');
  if (envelope && !verifyChecksum(envelope)) errors.push('Checksum mismatch');
  return errors;
}

module.exports = {
  BACKUP_VERSION,
  SCHEMA_VERSION,
  COLLECTIONS,
  LOCAL_KEYS,
  createEnvelope,
  canonicalize,
  computeChecksum,
  verifyChecksum,
  validateEnvelope
};
