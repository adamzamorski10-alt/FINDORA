/**
 * Stage 5C — Greenfield backup format, canonicalization, and integrity.
 *
 * Uses real SHA-256 via crypto.subtle.digest.
 * Preserves null; omits undefined.
 */

const BACKUP_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.0.0';

function canonicalize(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();

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

async function computeChecksum(canonicalValue) {
  const str = JSON.stringify(canonicalValue);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return 'sha256:' + hashHex;
}

async function createEnvelope({ data, userId, createdAt, appVersion = 'stage-5c' }) {
  const payload = {
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: createdAt || new Date().toISOString(),
    appVersion,
    userId: userId || null,
    metadata: {
      totalCollections: Object.keys(data || {}).length,
      totalSize: JSON.stringify(data).length,
      source: 'finora-greenfield'
    },
    data: data || {}
  };

  const canonical = canonicalize(payload);
  const checksum = await computeChecksum(canonical);

  return {
    ...canonical,
    integrity: {
      algorithm: 'SHA-256',
      checksum
    }
  };
}

function validateEnvelopeStructure(envelope) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object') {
    errors.push('Envelope is null/undefined');
    return errors;
  }
  if (typeof envelope.backupVersion !== 'string') errors.push('Missing backupVersion');
  if (typeof envelope.schemaVersion !== 'string') errors.push('Missing schemaVersion');
  if (typeof envelope.createdAt !== 'string') errors.push('Missing createdAt');
  if (!envelope.data || typeof envelope.data !== 'object') errors.push('Missing or invalid data');
  if (!envelope.integrity || typeof envelope.integrity !== 'object') errors.push('Missing integrity');
  if (typeof envelope.userId !== 'string' || envelope.userId.trim() === '') {
    errors.push('Missing or invalid userId');
  }
  return errors;
}

async function verifyIntegrity(envelope) {
  if (!envelope || !envelope.integrity || !envelope.integrity.checksum) {
    return false;
  }
  const { integrity, ...rest } = envelope;
  const canonical = canonicalize(rest);
  const computed = await computeChecksum(canonical);
  return computed === integrity.checksum;
}

export {
  BACKUP_VERSION,
  SCHEMA_VERSION,
  canonicalize,
  computeChecksum,
  createEnvelope,
  validateEnvelopeStructure,
  verifyIntegrity
};
