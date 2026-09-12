/**
 * Stage 1.2B — Production wiring and integration tests.
 *
 * Verifies that the production bootstrap path correctly wires
 * the active StorageAdapter and that all modules use it.
 *
 * Run with: node tests/production-wiring.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storageAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'storage-adapter.js'), 'utf8');
const firebaseAdapterCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'firebase-storage-adapter.js'), 'utf8');
const compositionRootCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'composition-root.js'), 'utf8');
const dataLayerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'data-layer.js'), 'utf8');
const repoCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'repositories', 'dashboard-layouts-repository.js'), 'utf8');
const stateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'state', 'dashboard-layouts-state.js'), 'utf8');

describe('Production Wiring', () => {
  it('contract namespace is separate from active adapter', () => {
    const window = {};
    const script = new Function('window', storageAdapterCode);
    script(window);

    assert.ok(window.StorageAdapterContract, 'StorageAdapterContract should exist');
    assert.ok(typeof window.StorageAdapterContract.validateContract === 'function');
    assert.ok(typeof window.StorageAdapterContract.create === 'function');
    assert.strictEqual(window.StorageAdapter, null, 'Active adapter should be null initially');
  });

  it('composition root wires FirebaseStorageAdapter as active', () => {
    const window = {};
    new Function('window', storageAdapterCode)(window);
    new Function('window', firebaseAdapterCode)(window);
    new Function('window', compositionRootCode)(window);

    assert.ok(window.StorageAdapter, 'Active adapter should be set after composition root');
    assert.strictEqual(window.StorageAdapter, window.FirebaseStorageAdapter);
    assert.ok(typeof window.StorageAdapter.set === 'function');
    assert.ok(typeof window.StorageAdapter.get === 'function');
    assert.ok(typeof window.StorageAdapter.update === 'function');
    assert.ok(typeof window.StorageAdapter.updateMany === 'function');
    assert.ok(typeof window.StorageAdapter.remove === 'function');
    assert.ok(typeof window.StorageAdapter.listen === 'function');
  });

  it('DataLayer uses active StorageAdapter, not contract namespace', async () => {
    const window = {};
    const mockFirebase = {
      database: function() {
        return {
          ref: function() {
            return {
              child: function() {
                return {
                  set: function() { return Promise.resolve(); },
                  remove: function() { return Promise.resolve(); },
                  get: function() { return Promise.resolve({ val: function() { return null; } }); },
                  on: function() { return function() {}; },
                  once: function() { return Promise.resolve({ val: function() { return null; } }); }
                };
              },
              update: function() { return Promise.resolve(); }
            };
          }
        };
      },
      auth: function() {
        return {
          onAuthStateChanged: function() { return function() {}; },
          signInWithEmailAndPassword: function() { return Promise.resolve(); },
          createUserWithEmailAndPassword: function() { return Promise.resolve(); },
          signOut: function() { return Promise.resolve(); }
        };
      }
    };

    let activeAdapterCalls = [];
    const activeAdapter = {
      get: function() { activeAdapterCalls.push('get'); return Promise.resolve(null); },
      set: function() { activeAdapterCalls.push('set'); return Promise.resolve(); },
      update: function() { activeAdapterCalls.push('update'); return Promise.resolve(); },
      updateMany: function() { activeAdapterCalls.push('updateMany'); return Promise.resolve(); },
      remove: function() { activeAdapterCalls.push('remove'); return Promise.resolve(); },
      listen: function() { activeAdapterCalls.push('listen'); return function() {}; },
      listenRoot: function() { activeAdapterCalls.push('listenRoot'); return function() {}; }
    };

    window.firebase = mockFirebase;
    window.toast = function() {};
    window.console = console;
    window.localStorage = { getItem: function() { return null; } };

    new Function('window', storageAdapterCode)(window);
    window.setActiveStorageAdapter(activeAdapter, 'test');

    const script = new Function('window', dataLayerCode);
    script(window);

    window.currentUserRef = { child: function() { return {}; } };

    await window.save('test_key', { a: 1 });
    assert.ok(activeAdapterCalls.includes('set'), 'save() should call active adapter set()');

    await window.updateUserPaths({ 'path/a': { a: 1 } });
    assert.ok(activeAdapterCalls.includes('updateMany'), 'updateUserPaths() should call active adapter updateMany()');
  });

  it('repository uses active StorageAdapter, not Firebase directly', async () => {
    const window = {};
    const mockFirebase = {
      database: function() { return { ref: function() { return {}; } }; },
      auth: function() { return {}; }
    };

    let activeAdapterCalls = [];
    const activeAdapter = {
      get: function() { activeAdapterCalls.push('get'); return Promise.resolve(null); },
      set: function() { activeAdapterCalls.push('set'); return Promise.resolve(); },
      update: function() { activeAdapterCalls.push('update'); return Promise.resolve(); },
      updateMany: function() { activeAdapterCalls.push('updateMany'); return Promise.resolve(); },
      remove: function() { activeAdapterCalls.push('remove'); return Promise.resolve(); },
      listen: function() { activeAdapterCalls.push('listen'); return function() {}; },
      listenRoot: function() { activeAdapterCalls.push('listenRoot'); return function() {}; }
    };

    window.firebase = mockFirebase;
    window.console = console;
    window.DEFAULT_LAYOUTS = { home: ['a'] };
    window.WIDGET_REGISTRY = { a: { tab: 'home' } };

    new Function('window', storageAdapterCode)(window);
    new Function('window', stateCode)(window);
    window.setActiveStorageAdapter(activeAdapter, 'test');

    const repoScript = new Function('window', repoCode);
    repoScript(window);

    window.DashboardLayoutsState.initialize({
      home: { order: ['a'], hidden: [] }
    });

    await window.DashboardLayoutsRepository.saveTab('home', true);

    assert.ok(activeAdapterCalls.includes('set'), 'Repository should call active adapter set()');
    assert.ok(!activeAdapterCalls.includes('update'), 'Repository should not call update() for saveTab');
  });

  it('detects when contract namespace is assigned as active adapter', () => {
    const window = {};
    new Function('window', storageAdapterCode)(window);

    // Simulate the C-1 bug: assigning contract namespace as active adapter
    assert.throws(() => {
      window.setActiveStorageAdapter(window.StorageAdapterContract, 'contract');
    }, /missing methods: get/);
  });
});
