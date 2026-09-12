/**
 * Stage 1.2B — Storage Adapter Contract tests.
 *
 * Validates that adapters implement the required contract.
 * Run with: node tests/storage-adapter.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storageAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'storage-adapter.js'), 'utf8');
const mockAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'mock-storage-adapter.js'), 'utf8');

function setupStorageAdapter() {
  const window = {};
  const script = new Function('window', storageAdapterCode);
  script(window);
  return window;
}

function setupMockAdapter() {
  const window = {};
  const script = new Function('window', mockAdapterCode);
  script(window);
  return window;
}

describe('StorageAdapterContract', () => {
  it('validates contract with valid adapter', () => {
    const window = setupStorageAdapter();
    const validAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      updateMany: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.doesNotThrow(() => window.StorageAdapterContract.create(validAdapter, 'test'));
  });

  it('rejects adapter missing get', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      set: function() {},
      update: function() {},
      updateMany: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.throws(() => window.StorageAdapterContract.create(invalidAdapter, 'test'), /missing methods: get/);
  });

  it('rejects adapter missing set', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      get: function() {},
      update: function() {},
      updateMany: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.throws(() => window.StorageAdapterContract.create(invalidAdapter, 'test'), /missing methods: set/);
  });

  it('rejects adapter missing update', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      get: function() {},
      set: function() {},
      updateMany: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.throws(() => window.StorageAdapterContract.create(invalidAdapter, 'test'), /missing methods: update/);
  });

  it('rejects adapter missing updateMany', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.throws(() => window.StorageAdapterContract.create(invalidAdapter, 'test'), /missing methods: updateMany/);
  });

  it('rejects adapter missing remove', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      updateMany: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.throws(() => window.StorageAdapterContract.create(invalidAdapter, 'test'), /missing methods: remove/);
  });

  it('rejects adapter missing listen', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      updateMany: function() {},
      remove: function() {},
    };
    assert.throws(() => window.StorageAdapterContract.create(invalidAdapter, 'test'), /missing methods: listen/);
  });

  it('setActiveStorageAdapter validates contract before setting', () => {
    const window = setupStorageAdapter();
    const invalidAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    assert.throws(() => window.setActiveStorageAdapter(invalidAdapter, 'test'), /missing methods: updateMany/);
    assert.strictEqual(window.StorageAdapter, null);
  });

  it('setActiveStorageAdapter sets active adapter on success', () => {
    const window = setupStorageAdapter();
    const validAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      updateMany: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    window.setActiveStorageAdapter(validAdapter, 'test');
    assert.strictEqual(window.StorageAdapter, validAdapter);
  });

  it('getActiveStorageAdapter throws when no adapter set', () => {
    const window = setupStorageAdapter();
    assert.throws(() => window.getActiveStorageAdapter(), /No active adapter configured/);
  });

  it('getActiveStorageAdapter returns active adapter', () => {
    const window = setupStorageAdapter();
    const validAdapter = {
      get: function() {},
      set: function() {},
      update: function() {},
      updateMany: function() {},
      remove: function() {},
      listen: function() {},
      listenRoot: function() {},
    };
    window.setActiveStorageAdapter(validAdapter, 'test');
    assert.strictEqual(window.getActiveStorageAdapter(), validAdapter);
  });

  it('setActiveStorageAdapter rejects null', () => {
    const window = setupStorageAdapter();
    assert.throws(() => window.setActiveStorageAdapter(null, 'test'), /Cannot set active adapter to null/);
    assert.strictEqual(window.StorageAdapter, null);
  });

  it('setActiveStorageAdapter rejects undefined', () => {
    const window = setupStorageAdapter();
    assert.throws(() => window.setActiveStorageAdapter(undefined, 'test'), /Cannot set active adapter to undefined/);
    assert.strictEqual(window.StorageAdapter, null);
  });

  it('setActiveStorageAdapter allows re-initialization', () => {
    const window = setupStorageAdapter();
    const adapterA = {
      get: function() {}, set: function() {}, update: function() {},
      updateMany: function() {}, remove: function() {}, listen: function() {},
      listenRoot: function() {}
    };
    const adapterB = {
      get: function() {}, set: function() {}, update: function() {},
      updateMany: function() {}, remove: function() {}, listen: function() {},
      listenRoot: function() {}
    };
    window.setActiveStorageAdapter(adapterA, 'a');
    assert.strictEqual(window.StorageAdapter, adapterA);
    window.setActiveStorageAdapter(adapterB, 'b');
    assert.strictEqual(window.StorageAdapter, adapterB);
  });
});

describe('MockStorageAdapter', () => {
  it('get returns null for missing path', async () => {
    const window = setupMockAdapter();
    const result = await window.MockStorageAdapter.get('nonexistent');
    assert.strictEqual(result, null);
  });

  it('get returns value for existing path', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });
    const result = await window.MockStorageAdapter.get('test');
    assert.deepStrictEqual(result, { a: 1 });
  });

  it('set stores value', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { b: 2 });
    const result = await window.MockStorageAdapter.get('test');
    assert.deepStrictEqual(result, { b: 2 });
  });

  it('update merges with existing object', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1, b: 2 });
    await window.MockStorageAdapter.update('test', { b: 3, c: 4 });
    const result = await window.MockStorageAdapter.get('test');
    assert.deepStrictEqual(result, { a: 1, b: 3, c: 4 });
  });

  it('update replaces non-object value', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', 'string');
    await window.MockStorageAdapter.update('test', { a: 1 });
    const result = await window.MockStorageAdapter.get('test');
    assert.deepStrictEqual(result, { a: 1 });
  });

  it('updateMany updates multiple paths', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('path/a', { a: 1 });
    await window.MockStorageAdapter.set('path/b', { b: 2 });
    await window.MockStorageAdapter.updateMany({
      'path/a': { a: 2 },
      'path/b': { b: 3 },
      'path/c': { c: 4 }
    });
    assert.deepStrictEqual(await window.MockStorageAdapter.get('path/a'), { a: 2 });
    assert.deepStrictEqual(await window.MockStorageAdapter.get('path/b'), { b: 3 });
    assert.deepStrictEqual(await window.MockStorageAdapter.get('path/c'), { c: 4 });
  });

  it('updateMany applies all changes atomically', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('path/a', { a: 1 });
    await window.MockStorageAdapter.set('path/b', { b: 2 });

    let threw = false;
    let aAfter = null;
    let bAfter = null;

    const atomicAdapter = {
      get: function(path) { return window.MockStorageAdapter.get(path); },
      set: function(path, value) { return window.MockStorageAdapter.set(path, value); },
      update: function(path, values) { return window.MockStorageAdapter.update(path, values); },
      updateMany: function(updates) {
        if (updates['path/b']) {
          throw new Error('Simulated updateMany failure');
        }
        return window.MockStorageAdapter.updateMany(updates);
      },
      remove: function(path) { return window.MockStorageAdapter.remove(path); },
      listen: function() { return function() {}; }
    };

    try {
      await atomicAdapter.updateMany({
        'path/a': { a: 99 },
        'path/b': { b: 99 }
      });
    } catch (e) {
      threw = true;
    }

    aAfter = await window.MockStorageAdapter.get('path/a');
    bAfter = await window.MockStorageAdapter.get('path/b');

    assert.strictEqual(threw, true, 'updateMany should throw on failure');
    assert.deepStrictEqual(aAfter, { a: 1 }, 'Partial changes must not remain after failed updateMany');
    assert.deepStrictEqual(bAfter, { b: 2 }, 'Partial changes must not remain after failed updateMany');
  });

  it('remove deletes value', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });
    await window.MockStorageAdapter.remove('test');
    const result = await window.MockStorageAdapter.get('test');
    assert.strictEqual(result, null);
  });

  it('listen calls callback with current value asynchronously', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let received = null;
    window.MockStorageAdapter.listen('test', function(value) {
      received = value;
    });

    assert.strictEqual(received, null, 'Callback must not fire synchronously');
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received, { a: 1 });
  });

  it('listen triggers on value change', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let received = null;
    const unsub = window.MockStorageAdapter.listen('test', function(value) {
      received = value;
    });

    window.MockStorageAdapter.trigger('test', { a: 2 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received, { a: 2 });

    unsub();
  });

  it('unsubscribe stops listener', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let count = 0;
    const unsub = window.MockStorageAdapter.listen('test', function() {
      count++;
    });

    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 1, 'Immediate callback on subscribe');

    window.MockStorageAdapter.trigger('test', { a: 2 });
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 2, 'Callback fires on value change');

    unsub();
    window.MockStorageAdapter.trigger('test', { a: 3 });
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 2, 'Unsubscribed listener does not fire');
  });

  it('reset clears all data', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test1', { a: 1 });
    await window.MockStorageAdapter.set('test2', { b: 2 });
    window.MockStorageAdapter.reset();

    assert.strictEqual(await window.MockStorageAdapter.get('test1'), null);
    assert.strictEqual(await window.MockStorageAdapter.get('test2'), null);
  });

  it('listen callback receives plain value, not snapshot', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let received = null;
    await new Promise(function(resolve) {
      window.MockStorageAdapter.listen('test', function(value) {
        received = value;
        resolve();
      });
    });

    assert.deepStrictEqual(received, { a: 1 });
    assert.strictEqual(typeof received.val, 'undefined', 'Value must not be a snapshot');
  });

  it('listen rejects empty path', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let errCalled = false;
    const unsub = window.MockStorageAdapter.listen('', function() {}, function(err) {
      errCalled = true;
      assert.ok(err instanceof Error);
    });

    assert.strictEqual(errCalled, true, 'errCallback must be called for empty path');
    assert.strictEqual(typeof unsub, 'function');

    await window.MockStorageAdapter.set('test', { a: 2 });
    assert.deepStrictEqual(await window.MockStorageAdapter.get('test'), { a: 2 });
  });

  it('listen initial callback is asynchronous', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let received = null;
    window.MockStorageAdapter.listen('test', function(value) {
      received = value;
    });

    assert.strictEqual(received, null, 'Callback must not fire synchronously');
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(received, { a: 1 });
  });

  it('listen unsubscribe prevents later callbacks', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('test', { a: 1 });

    let count = 0;
    const unsub = window.MockStorageAdapter.listen('test', function() {
      count++;
    });

    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 1, 'Initial callback fires on subscribe');

    window.MockStorageAdapter.trigger('test', { a: 2 });
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 2, 'Callback fires on value change');

    unsub();
    window.MockStorageAdapter.trigger('test', { a: 3 });
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(count, 2, 'Unsubscribed listener does not fire');
  });

  it('multiple listeners remain isolated', async () => {
    const window = setupMockAdapter();
    await window.MockStorageAdapter.set('path/a', { a: 1 });
    await window.MockStorageAdapter.set('path/b', { b: 2 });

    let receivedA = null;
    let receivedB = null;
    const unsubA = window.MockStorageAdapter.listen('path/a', function(value) {
      receivedA = value;
    });
    const unsubB = window.MockStorageAdapter.listen('path/b', function(value) {
      receivedB = value;
    });

    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(receivedA, { a: 1 });
    assert.deepStrictEqual(receivedB, { b: 2 });

    window.MockStorageAdapter.trigger('path/a', { a: 99 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(receivedA, { a: 99 });
    assert.deepStrictEqual(receivedB, { b: 2 }, 'Listener B must not be affected by changes to A');

    unsubA();
    window.MockStorageAdapter.trigger('path/a', { a: 100 });
    await new Promise(r => setTimeout(r, 10));
    assert.deepStrictEqual(receivedA, { a: 99 }, 'Unsubscribed listener A must not fire');
    assert.deepStrictEqual(receivedB, { b: 2 }, 'Listener B must still be unaffected');
  });
});
