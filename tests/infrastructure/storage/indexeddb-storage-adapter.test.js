import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IndexedDBStorageAdapter } from '../../../src/infrastructure/storage/indexeddb-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

// IndexedDBStorageAdapter tests require a real browser/WebIDB environment.
// In Node.js, these tests skip because `indexedDB` is not available.
// Execute these tests in a browser or jsdom + fake-indexeddb environment.
const hasIndexedDB = typeof indexedDB !== 'undefined';

describe('IndexedDBStorageAdapter', () => {
  let adapter;

  const setup = async () => {
    if (!hasIndexedDB) {
      console.log('SKIP: IndexedDB not available in this environment');
      return false;
    }
    adapter = new IndexedDBStorageAdapter('finora-test-' + Date.now());
    await adapter.init();
    return true;
  };

  describe('basic operations', () => {
    it('init opens database', async () => {
      if (!(await setup())) return;
      // init completed without error
    });

    it('set then get returns value', async () => {
      if (!(await setup())) return;
      await adapter.set('key1', { data: true });
      assert.deepEqual(await adapter.get('key1'), { data: true });
    });

    it('get missing key returns null', async () => {
      if (!(await setup())) return;
      assert.strictEqual(await adapter.get('nonexistent'), null);
    });

    it('update existing value', async () => {
      if (!(await setup())) return;
      await adapter.set('key', { count: 1 });
      await adapter.update('key', (val) => ({ count: val.count + 1 }));
      assert.deepEqual(await adapter.get('key'), { count: 2 });
    });

    it('remove existing key', async () => {
      if (!(await setup())) return;
      await adapter.set('key', 'val');
      await adapter.remove('key');
      assert.strictEqual(await adapter.get('key'), null);
    });

    it('remove missing key does not throw', async () => {
      if (!(await setup())) return;
      await assert.doesNotReject(() => adapter.remove('missing'));
    });

    it('update creates entry when updater returns non-null for missing key', async () => {
      if (!(await setup())) return;
      await adapter.update('missing', () => ({ created: true }));
      assert.deepEqual(await adapter.get('missing'), { created: true });
    });
  });

  describe('persistence', () => {
    it('data survives close/reopen', async () => {
      if (!(await setup())) return;
      await adapter.set('persist-key', { value: 'survives' });
      // Simulate close by clearing in-memory references (in real app: adapter.close())
      // For IDB, data persists in the database; we re-init to verify
      const adapter2 = new IndexedDBStorageAdapter(adapter.dbName);
      await adapter2.init();
      assert.deepEqual(await adapter2.get('persist-key'), { value: 'survives' });
    });
  });

  describe('transactions', () => {
    it('successful transaction commits all writes', async () => {
      if (!(await setup())) return;
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('tx-key1', 'val1');
        await adapter.set('tx-key2', 'val2');
      });
      assert.strictEqual(await adapter.get('tx-key1'), 'val1');
      assert.strictEqual(await adapter.get('tx-key2'), 'val2');
    });

    it('failing transaction rolls back all writes', async () => {
      if (!(await setup())) return;
      const tx = new ApplicationTransaction(adapter);
      let error;
      try {
        await tx.run(async () => {
          await adapter.set('tx-key1', 'val1');
          throw new Error('simulated failure');
        });
      } catch (e) {
        error = e;
      }
      assert.ok(error);
      assert.strictEqual(await adapter.get('tx-key1'), null);
    });

    it('remove inside transaction rolls back on failure', async () => {
      if (!(await setup())) return;
      await adapter.set('tx-key', 'val');
      const tx = new ApplicationTransaction(adapter);
      try {
        await tx.run(async () => {
          await adapter.remove('tx-key');
          throw new Error('fail');
        });
      } catch (e) { }
      assert.strictEqual(await adapter.get('tx-key'), 'val');
    });
  });

  describe('isolation', () => {
    it('records under different keys do not collide', async () => {
      if (!(await setup())) return;
      await adapter.set('a', { id: 'a' });
      await adapter.set('b', { id: 'b' });
      assert.deepEqual(await adapter.get('a'), { id: 'a' });
      assert.deepEqual(await adapter.get('b'), { id: 'b' });
    });
  });

  describe('mutability', () => {
    it('get returns a copy, not a mutable internal reference', async () => {
      if (!(await setup())) return;
      await adapter.set('key', { prop: 'original' });
      const retrieved = await adapter.get('key');
      retrieved.prop = 'mutated';
      const again = await adapter.get('key');
      assert.deepEqual(again, { prop: 'original' });
    });

    it('nested object mutation does not bypass storage', async () => {
      if (!(await setup())) return;
      await adapter.set('key', { nested: { count: 1 } });
      const retrieved = await adapter.get('key');
      retrieved.nested.count = 999;
      const again = await adapter.get('key');
      assert.deepEqual(again, { nested: { count: 1 } });
    });

    it('array mutation does not bypass storage', async () => {
      if (!(await setup())) return;
      await adapter.set('key', [1, 2, 3]);
      const retrieved = await adapter.get('key');
      retrieved.push(4);
      const again = await adapter.get('key');
      assert.deepEqual(again, [1, 2, 3]);
    });

    it('transaction-buffered values are also isolated', async () => {
      if (!(await setup())) return;
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('key', { prop: 'original' });
        const retrieved = await adapter.get('key');
        retrieved.prop = 'mutated';
      });
      const afterTx = await adapter.get('key');
      assert.deepEqual(afterTx, { prop: 'original' });
    });
  });
});
