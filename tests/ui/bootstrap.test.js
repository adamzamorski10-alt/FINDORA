import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Bootstrap', () => {
  it('creates AppKernel with expected development user context', async () => {
    const bootstrapSource = fs.readFileSync('src/ui/bootstrap.js', 'utf8');
    assert.ok(bootstrapSource.includes('createAppKernel'));
    assert.ok(bootstrapSource.includes('IndexedDBStorageAdapter'));
    assert.ok(bootstrapSource.includes('DEV_USER_ID'));
    assert.ok(bootstrapSource.includes('DEV_OPENING_BALANCE_CATEGORY_ID'));
  });

  it('does not import legacy services or window globals', async () => {
    const bootstrapSource = fs.readFileSync('src/ui/bootstrap.js', 'utf8');
    assert.ok(!bootstrapSource.includes('window.'));
    assert.ok(!bootstrapSource.includes('dbData'));
    assert.ok(!bootstrapSource.includes('currentUser'));
    assert.ok(!bootstrapSource.includes('Firebase'));
    assert.ok(!bootstrapSource.includes('data-layer'));
    assert.ok(!bootstrapSource.includes('user-data-loader'));
    assert.ok(!bootstrapSource.includes('legacy'));
  });
});
