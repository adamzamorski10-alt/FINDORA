/**
 * Stage 1.6+ — IndexedDB Storage Adapter tests.
 *
 * Note: IndexedDB is only available in browsers.
 * These tests verify the module loads correctly in Node.js.
 * Full integration tests should run in a browser environment.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adapterCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'storage', 'indexeddb-storage-adapter.js'), 'utf8');

describe('IndexedDBStorageAdapter', () => {
  it('module loads without errors in Node.js', () => {
    var window = { indexedDB: null };
    var script = new Function('window', adapterCode);
    assert.doesNotThrow(function() { script(window); });
  });

  it('exposes required methods on window.IndexedDBStorageAdapter', () => {
    var window = { indexedDB: null };
    var script = new Function('window', adapterCode);
    script(window);
    var adapter = window.IndexedDBStorageAdapter;
    assert.ok(adapter);
    assert.ok(typeof adapter.init === 'function');
    assert.ok(typeof adapter.get === 'function');
    assert.ok(typeof adapter.set === 'function');
    assert.ok(typeof adapter.update === 'function');
    assert.ok(typeof adapter.updateMany === 'function');
    assert.ok(typeof adapter.remove === 'function');
    assert.ok(typeof adapter.listen === 'function');
    assert.ok(typeof adapter.listenRoot === 'function');
  });

  it('does not reference DataLayer, dbData, or Firebase', () => {
    assert.ok(!adapterCode.includes('DataLayer'), 'Should not reference DataLayer');
    assert.ok(!adapterCode.includes('dbData'), 'Should not reference dbData');
    assert.ok(!adapterCode.includes('firebase'), 'Should not reference Firebase');
    assert.ok(!adapterCode.includes('currentUserRef'), 'Should not reference currentUserRef');
  });
});
