import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StorageAdapter } from '../../../src/infrastructure/storage/storage-adapter.js';

describe('StorageAdapter', () => {
  it('init() throws by default', async () => {
    const adapter = new StorageAdapter();
    await assert.rejects(() => adapter.init(), /not implemented/);
  });

  it('get() throws by default', async () => {
    const adapter = new StorageAdapter();
    await assert.rejects(() => adapter.get('key'), /not implemented/);
  });

  it('set() throws by default', async () => {
    const adapter = new StorageAdapter();
    await assert.rejects(() => adapter.set('key', 'val'), /not implemented/);
  });

  it('update() throws by default', async () => {
    const adapter = new StorageAdapter();
    await assert.rejects(() => adapter.update('key', () => {}), /not implemented/);
  });

  it('remove() throws by default', async () => {
    const adapter = new StorageAdapter();
    await assert.rejects(() => adapter.remove('key'), /not implemented/);
  });

  it('does not expose keys() on canonical interface', () => {
    const adapter = new StorageAdapter();
    assert.strictEqual(typeof adapter.keys, 'undefined');
  });

  it('canonical interface exposes exactly get/set/update/remove', () => {
    const adapter = new StorageAdapter();
    for (const op of ['get', 'set', 'update', 'remove']) {
      assert.strictEqual(typeof adapter[op], 'function');
    }
    assert.strictEqual(typeof adapter.keys, 'undefined');
  });
});
