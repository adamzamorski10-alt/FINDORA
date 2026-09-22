import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

describe('ApplicationTransaction', () => {
  describe('with transactional adapter', () => {
    let adapter;

    beforeEach(async () => {
      adapter = new InMemoryStorageAdapter();
      await adapter.init();
    });

    it('commits all writes on success', async () => {
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set('k1', 'v1');
        await adapter.set('k2', 'v2');
      });
      assert.strictEqual(await adapter.get('k1'), 'v1');
      assert.strictEqual(await adapter.get('k2'), 'v2');
    });

    it('rolls back all writes on failure', async () => {
      const tx = new ApplicationTransaction(adapter);
      let caught;
      try {
        await tx.run(async () => {
          await adapter.set('k1', 'v1');
          await adapter.set('k2', 'v2');
          throw new Error('fail');
        });
      } catch (e) {
        caught = e;
      }
      assert.ok(caught);
      assert.strictEqual(await adapter.get('k1'), null);
      assert.strictEqual(await adapter.get('k2'), null);
    });

    it('rolls back partial writes when failure occurs mid-sequence', async () => {
      adapter.set('pre', 'existing');
      const tx = new ApplicationTransaction(adapter);
      try {
        await tx.run(async () => {
          await adapter.set('new1', 'val1');
          await adapter.update('pre', (v) => v + '-changed');
          await adapter.set('new2', 'val2');
          throw new Error('mid-sequence failure');
        });
      } catch (e) { }
      assert.strictEqual(await adapter.get('new1'), null);
      assert.strictEqual(await adapter.get('new2'), null);
      assert.strictEqual(await adapter.get('pre'), 'existing');
    });

    it('preserves pre-existing state outside transaction', async () => {
      await adapter.set('pre', 'pre-existing');
      const tx = new ApplicationTransaction(adapter);
      try {
        await tx.run(async () => {
          await adapter.set('pre', 'changed');
          await adapter.set('new', 'newval');
          throw new Error('fail');
        });
      } catch (e) { }
      assert.strictEqual(await adapter.get('pre'), 'pre-existing');
      assert.strictEqual(await adapter.get('new'), null);
    });

    it('propagates the original error, not abort errors', async () => {
      const tx = new ApplicationTransaction(adapter);
      const original = new Error('original error');
      let caught;
      try {
        await tx.run(async () => {
          await adapter.set('k', 'v');
          throw original;
        });
      } catch (e) {
        caught = e;
      }
      assert.strictEqual(caught, original);
    });

    it('supports nested callback reads of uncommitted state', async () => {
      const tx = new ApplicationTransaction(adapter);
      let readValue;
      await tx.run(async () => {
        await adapter.set('key', 'value');
        readValue = await adapter.get('key');
      });
      assert.strictEqual(readValue, 'value');
    });
  });

  describe('with non-transactional adapter', () => {
    it('rejects when adapter lacks transaction support', async () => {
      const simpleAdapter = {
        async init() {},
        async get(key) { return this.store?.[key] ?? null; },
        async set(key, value) { this.store = this.store || {}; this.store[key] = value; },
        async update(key, updater) { this.store = this.store || {}; this.store[key] = updater(this.store[key]); },
        async remove(key) { delete this.store[key]; },
      };
      const tx = new ApplicationTransaction(simpleAdapter);
      let caught;
      try {
        await tx.run(async () => {
          await simpleAdapter.set('k', 'v');
        });
      } catch (e) {
        caught = e;
      }
      assert.ok(caught);
      assert.strictEqual(caught.message, 'Storage adapter does not support transactions; ApplicationTransaction requires atomic boundary');
      assert.strictEqual(await simpleAdapter.get('k'), null);
    });
  });
});
