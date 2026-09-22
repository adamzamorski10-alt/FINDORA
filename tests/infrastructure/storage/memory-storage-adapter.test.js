import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

describe('InMemoryStorageAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  describe('init', () => {
    it('resolves without error', async () => {
      await adapter.init();
    });
  });

  describe('get / set', () => {
    it('returns null for missing key', async () => {
      await adapter.init();
      assert.strictEqual(await adapter.get('missing'), null);
    });

    it('set then get returns value', async () => {
      await adapter.init();
      await adapter.set('key', { data: true });
      assert.deepEqual(await adapter.get('key'), { data: true });
    });

    it('overwrites existing value', async () => {
      await adapter.init();
      await adapter.set('key', 'old');
      await adapter.set('key', 'new');
      assert.strictEqual(await adapter.get('key'), 'new');
    });

    it('stores different types independently', async () => {
      await adapter.init();
      await adapter.set('str', 'hello');
      await adapter.set('num', 42);
      await adapter.set('obj', { a: 1 });
      await adapter.set('arr', [1, 2, 3]);
      assert.strictEqual(await adapter.get('str'), 'hello');
      assert.strictEqual(await adapter.get('num'), 42);
      assert.deepEqual(await adapter.get('obj'), { a: 1 });
      assert.deepEqual(await adapter.get('arr'), [1, 2, 3]);
    });
  });

  describe('update', () => {
    it('updates existing value', async () => {
      await adapter.init();
      await adapter.set('key', { count: 1 });
      await adapter.update('key', (val) => ({ count: val.count + 1 }));
      assert.deepEqual(await adapter.get('key'), { count: 2 });
    });

    it('creates value when updater returns non-null for missing key', async () => {
      await adapter.init();
      await adapter.update('missing', () => ({ created: true }));
      assert.deepEqual(await adapter.get('missing'), { created: true });
    });

    it('sets null when updater returns null for missing key', async () => {
      await adapter.init();
      await adapter.update('missing', () => null);
      assert.strictEqual(await adapter.get('missing'), null);
    });
  });

  describe('remove', () => {
    it('removes existing key', async () => {
      await adapter.init();
      await adapter.set('key', 'val');
      await adapter.remove('key');
      assert.strictEqual(await adapter.get('key'), null);
    });

    it('remove missing key does not throw', async () => {
      await adapter.init();
      await assert.doesNotReject(() => adapter.remove('missing'));
    });

    it('removed key can be set again', async () => {
      await adapter.init();
      await adapter.set('key', 'v1');
      await adapter.remove('key');
      await adapter.set('key', 'v2');
      assert.strictEqual(await adapter.get('key'), 'v2');
    });
  });

  describe('isolation', () => {
    it('records under different keys do not collide', async () => {
      await adapter.init();
      await adapter.set('a', { id: 'a' });
      await adapter.set('b', { id: 'b' });
      assert.deepEqual(await adapter.get('a'), { id: 'a' });
      assert.deepEqual(await adapter.get('b'), { id: 'b' });
    });
  });

  describe('ApplicationTransaction — concurrency', () => {
    it('rejects overlapping transactions', async () => {
      await adapter.init();
      const tx1 = new ApplicationTransaction(adapter);
      let tx1Error;
      try {
        await tx1.run(async () => {
          await adapter.set('key', 'tx1-value');
          // Start tx2 while tx1 is still active
          const tx2 = new ApplicationTransaction(adapter);
          try {
            await tx2.run(async () => {
              await adapter.set('key', 'tx2-value');
            });
          } catch (e) {
            tx1Error = e;
          }
        });
      } catch (e) {
        tx1Error = e;
      }
      assert.ok(tx1Error);
      assert.strictEqual(tx1Error.message, 'Storage adapter does not support concurrent transactions; beginTransaction called while another transaction is active');
    });

    it('failed transaction does not contaminate subsequent transaction', async () => {
      await adapter.init();
      const tx1 = new ApplicationTransaction(adapter);
      try {
        await tx1.run(async () => {
          await adapter.set('key', 'tx1-value');
          throw new Error('tx1 fails');
        });
      } catch (e) { }

      const tx2 = new ApplicationTransaction(adapter);
      await tx2.run(async () => {
        await adapter.set('key', 'tx2-value');
      });

      assert.strictEqual(await adapter.get('key'), 'tx2-value');
    });
  });

  describe('mutability', () => {
    it('get returns a copy, not a mutable internal reference', async () => {
      await adapter.init();
      await adapter.set('key', { prop: 'original' });
      const retrieved = await adapter.get('key');
      retrieved.prop = 'mutated';
      const again = await adapter.get('key');
      assert.deepEqual(again, { prop: 'original' });
    });

    it('nested object mutation does not bypass storage', async () => {
      await adapter.init();
      await adapter.set('key', { nested: { count: 1 } });
      const retrieved = await adapter.get('key');
      retrieved.nested.count = 999;
      const again = await adapter.get('key');
      assert.deepEqual(again, { nested: { count: 1 } });
    });

    it('array mutation does not bypass storage', async () => {
      await adapter.init();
      await adapter.set('key', [1, 2, 3]);
      const retrieved = await adapter.get('key');
      retrieved.push(4);
      const again = await adapter.get('key');
      assert.deepEqual(again, [1, 2, 3]);
    });

    it('transaction-buffered values are also isolated', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('key', { prop: 'original' });
        const retrieved = await adapter.get('key');
        retrieved.prop = 'mutated';
      });
      const afterTx = await adapter.get('key');
      assert.deepEqual(afterTx, { prop: 'original' });
    });

    it('set stores a copy, so later external mutation does not affect stored value', async () => {
      await adapter.init();
      const original = { prop: 'original' };
      await adapter.set('key', original);
      original.prop = 'external-mutation';
      const stored = await adapter.get('key');
      assert.deepEqual(stored, { prop: 'original' });
    });
  });

  describe('ApplicationTransaction — success', () => {
    it('commits all writes', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('key1', 'val1');
        await adapter.set('key2', 'val2');
      });
      assert.strictEqual(await adapter.get('key1'), 'val1');
      assert.strictEqual(await adapter.get('key2'), 'val2');
    });

    it('commits updates', async () => {
      await adapter.init();
      await adapter.set('key', { count: 0 });
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.update('key', (val) => ({ count: val.count + 1 }));
      });
      assert.deepEqual(await adapter.get('key'), { count: 1 });
    });

    it('commits removals', async () => {
      await adapter.init();
      await adapter.set('key', 'val');
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.remove('key');
      });
      assert.strictEqual(await adapter.get('key'), null);
    });

    it('commits mixed operations', async () => {
      await adapter.init();
      await adapter.set('existing', 'old');
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('new', 'newval');
        await adapter.update('existing', (val) => val + '-updated');
        await adapter.remove('existing');
      });
      assert.strictEqual(await adapter.get('new'), 'newval');
      assert.strictEqual(await adapter.get('existing'), null);
    });
  });

  describe('ApplicationTransaction — failure', () => {
    it('rolls back all writes on error', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      let error;
      try {
        await tx.run(async () => {
          await adapter.set('key1', 'val1');
          await adapter.set('key2', 'val2');
          throw new Error('simulated failure');
        });
      } catch (e) {
        error = e;
      }
      assert.ok(error, 'error should propagate');
      assert.strictEqual(await adapter.get('key1'), null);
      assert.strictEqual(await adapter.get('key2'), null);
    });

    it('rolls back updates on error', async () => {
      await adapter.init();
      await adapter.set('key', { count: 0 });
      const tx = new ApplicationTransaction(adapter);
      try {
        await tx.run(async () => {
          await adapter.update('key', (val) => ({ count: val.count + 1 }));
          throw new Error('fail');
        });
      } catch (e) { }
      assert.deepEqual(await adapter.get('key'), { count: 0 });
    });

    it('rolls back removals on error', async () => {
      await adapter.init();
      await adapter.set('key', 'val');
      const tx = new ApplicationTransaction(adapter);
      try {
        await tx.run(async () => {
          await adapter.remove('key');
          throw new Error('fail');
        });
      } catch (e) { }
      assert.strictEqual(await adapter.get('key'), 'val');
    });

    it('restores pre-existing state when mixed operations fail', async () => {
      await adapter.init();
      await adapter.set('existing', 'original');
      const tx = new ApplicationTransaction(adapter);
      try {
        await tx.run(async () => {
          await adapter.set('new', 'newval');
          await adapter.set('existing', 'changed');
          throw new Error('fail');
        });
      } catch (e) { }
      assert.strictEqual(await adapter.get('new'), null);
      assert.strictEqual(await adapter.get('existing'), 'original');
    });

    it('propagates original error, not abort error', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      const original = new Error('original failure');
      let caught;
      try {
        await tx.run(async () => {
          await adapter.set('key', 'val');
          throw original;
        });
      } catch (e) {
        caught = e;
      }
      assert.strictEqual(caught, original);
    });

    it('rethrows storage errors from within transaction', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      let caught;
      try {
        await tx.run(async () => {
          await adapter.set('key', 'val');
          throw new Error('STORAGE_UNAVAILABLE');
        });
      } catch (e) {
        caught = e;
      }
      assert.ok(caught);
      assert.strictEqual(caught.message, 'STORAGE_UNAVAILABLE');
    });
  });

  describe('ApplicationTransaction — isolation', () => {
    it('reads inside tx see uncommitted writes', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('key', 'value');
        assert.strictEqual(await adapter.get('key'), 'value');
      });
    });

    it('committed writes are visible outside transaction', async () => {
      await adapter.init();
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('key', 'value');
      });
      assert.strictEqual(await adapter.get('key'), 'value');
    });
  });

  describe('ApplicationTransaction — fallback', () => {
    it('rejects when adapter lacks transaction support', async () => {
      const noTxAdapter = {
        async init() {},
        async get(key) { return this.store?.[key] ?? null; },
        async set(key, value) { this.store = this.store || {}; this.store[key] = value; },
        async update(key, updater) { this.store = this.store || {}; this.store[key] = updater(this.store[key]); },
        async remove(key) { delete this.store[key]; },
      };
      const tx = new ApplicationTransaction(noTxAdapter);
      let caught;
      try {
        await tx.run(async () => {
          await noTxAdapter.set('key', 'val');
        });
      } catch (e) {
        caught = e;
      }
      assert.ok(caught);
      assert.strictEqual(caught.message, 'Storage adapter does not support transactions; ApplicationTransaction requires atomic boundary');
      assert.strictEqual(await noTxAdapter.get('key'), null);
    });
  });
});
