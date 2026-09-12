/**
 * Stage 1.3 — Migration types and MigrationResult.
 *
 * Pure data structures for migration metadata and results.
 */

class MigrationResult {
  constructor(options) {
    this.success = options.success !== undefined ? options.success : false;
    this.data = options.data !== undefined ? options.data : null;
    this.fromVersion = options.fromVersion || null;
    this.toVersion = options.toVersion || null;
    this.errors = options.errors || [];
    this.warnings = options.warnings || [];
    this.mutatedSource = options.mutatedSource || false;
  }

  static success(data, fromVersion, toVersion) {
    return new MigrationResult({
      success: true,
      data: data,
      fromVersion: fromVersion,
      toVersion: toVersion,
      mutatedSource: false
    });
  }

  static failure(errors, fromVersion, toVersion) {
    return new MigrationResult({
      success: false,
      errors: Array.isArray(errors) ? errors : [String(errors)],
      fromVersion: fromVersion,
      toVersion: toVersion
    });
  }

  static unsupportedFuture(version) {
    return new MigrationResult({
      success: false,
      errors: ['UNSUPPORTED_FUTURE_SCHEMA: ' + version],
      fromVersion: version,
      toVersion: null
    });
  }
}

class Migration {
  constructor(options) {
    this.fromVersion = options.fromVersion;
    this.toVersion = options.toVersion;
    this.transform = options.transform;
    this.validateSource = options.validateSource || null;
    this.validateTarget = options.validateTarget || null;
    this.description = options.description || '';
  }

  apply(source) {
    const result = {
      success: false,
      data: null,
      errors: [],
      warnings: [],
      mutatedSource: false
    };

    if (!source || typeof source !== 'object') {
      result.errors.push('Invalid source: expected object');
      return result;
    }

    if (this.validateSource) {
      const sourceValidation = this.validateSource(source);
      if (!sourceValidation.valid) {
        result.errors = sourceValidation.errors;
        return result;
      }
    }

    const sourceSnapshot = JSON.parse(JSON.stringify(source));

    try {
      const transformed = this.transform(source);
      if (transformed === undefined || transformed === null) {
        result.errors.push('Migration transform returned null/undefined');
        return result;
      }

      if (this.validateTarget) {
        const targetValidation = this.validateTarget(transformed);
        if (!targetValidation.valid) {
          result.errors = targetValidation.errors;
          return result;
        }
      }

      result.success = true;
      result.data = transformed;
      result.mutatedSource = JSON.stringify(source) !== JSON.stringify(sourceSnapshot);
    } catch (err) {
      result.errors.push('Migration threw: ' + (err && err.message ? err.message : String(err)));
    }

    return result;
  }
}

module.exports = {
  MigrationResult,
  Migration
};
