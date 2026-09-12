/**
 * Stage 1.3 — Schema Version
 *
 * Immutable semantic version for data schemas.
 * Provides parsing, comparison, and validation.
 */

const CURRENT_SCHEMA_VERSION = '2.0.0';

function parseVersion(version) {
  if (typeof version !== 'string') return null;
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    toString: function() {
      return version;
    }
  };
}

function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return NaN;
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

function isValidVersion(version) {
  return parseVersion(version) !== null;
}

function isFutureVersion(version, reference) {
  return compareVersions(version, reference) > 0;
}

function isOlderVersion(version, reference) {
  return compareVersions(version, reference) < 0;
}

function isCurrentVersion(version, reference) {
  return compareVersions(version, reference) === 0;
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  parseVersion,
  compareVersions,
  isValidVersion,
  isFutureVersion,
  isOlderVersion,
  isCurrentVersion
};
