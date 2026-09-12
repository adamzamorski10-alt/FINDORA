/**
 * Stage 1.3 — Schema Validator
 *
 * Pure validation functions for data schemas.
 * No Firebase, no DOM, no global state.
 *
 * Validators are intentionally generic. Domain-specific validators
 * should be defined alongside their migrations.
 */

class SchemaValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
  }

  addError(message) {
    this.valid = false;
    this.errors.push(message);
    return this;
  }

  addWarning(message) {
    this.warnings.push(message);
    return this;
  }

  static ok() {
    return new SchemaValidationResult();
  }

  static error(message) {
    const result = new SchemaValidationResult();
    result.addError(message);
    return result;
  }
}

function validateObject(data, label) {
  const result = SchemaValidationResult.ok();
  if (!data || typeof data !== 'object') {
    result.addError((label || 'Data') + ' must be an object');
  }
  return result;
}

module.exports = {
  SchemaValidationResult,
  validateObject
};
