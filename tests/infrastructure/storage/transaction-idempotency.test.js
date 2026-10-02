import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

// Adapter that simulates IndexedDB behavior where oncomplete can fire twice
// (e.g., due to edge cases or double event firing in certain browser implementations)
class FlakyTransactionAdapter {
  constructor() {
    this.store = new Map();
    this.txStack = [];
    this._closing = false;
  }

  _currentTx() {
    return this.txStack[this.txStack.length - 1] || null;
  }

  _guard() {
    if (this._closing) {
      throw new Error('STORAGE_CLOSING');
    }
  }

  async init() {}

  async get(key) {
    this._guard();
    const tx = this._currentTx();
    if (tx) {
      if (tx.deletes.has(key)) return null;
      if (tx.writes.has(key)) return structuredClone(tx.writes.get(key));
    }
    return this.store.has(key) ? structuredClone(this.store.get(key)) : null;
  }

  async set(key, value) {
    this._guard();
    const tx = this._currentTx();
    if (tx) {
      tx.writes.set(key, structuredClone(value));
      tx.deletes.delete(key);
      return;
    }
    this.store.set(key, structuredClone(value));
  }

  async update(key, updater) {
    const current = await this.get(key);
    const updated = await updater(current);
    return this.set(key, updated);
  }

  async remove(key) {
    this._guard();
    const tx = this._currentTx();
    if (tx) {
      tx.writes.delete(key);
      tx.deletes.add(key);
      return;
    }
    this.store.delete(key);
  }

  beginTransaction() {
    this._guard();
    if (this.txStack.length > 0) {
      throw new Error('beginTransaction called while another transaction is active');
    }
    const ctx = { writes: new Map(), deletes: new Set() };
    this.txStack.push(ctx);
    return ctx;
  }

  async commitTransaction(ctx) {
    const index = this.txStack.length - 1;
    if (index < 0 || this.txStack[index] !== ctx) {
      throw new Error('Transaction context mismatch during commit');
    }

    this._guard();
    let done = false;

    // Simulate IDB transaction that could fire oncomplete twice
    const idbTx = {
      oncomplete: null,
      onerror: null,
      onabort: null,
    };

    // Apply writes synchronously (simulating IDB behavior)
    for (const key of ctx.deletes) {
      this.store.delete(key);
    }
    for (const [key, value] of ctx.writes) {
      this.store.set(key, structuredClone(value));
    }

    await new Promise((resolve, reject) => {
      const finish = (err) => {
        if (done) return;
        done = true;
        this.txStack.pop();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      idbTx.oncomplete = () => finish(null);
      idbTx.onerror = () => finish(idbTx.error || new Error('Transaction commit failed'));
      idbTx.onabort = () => finish(new Error('Transaction aborted during commit'));

      // Simulate oncomplete firing twice (edge case)
      idbTx.oncomplete();
      idbTx.oncomplete();
    });
  }

  async abortTransaction(ctx) {
    const index = this.txStack.length - 1;
    if (index < 0 || this.txStack[index] !== ctx) {
      throw new Error('Transaction context mismatch during abort');
    }
    this.txStack.pop();
  }
}

describe('ApplicationTransaction with flaky transaction completion', () => {
  it('commits successfully despite duplicate oncomplete events', async () => {
    const adapter = new FlakyTransactionAdapter();
    await adapter.init();
    const tx = new ApplicationTransaction(adapter);

    await tx.run(async () => {
      await adapter.set('k1', 'v1');
      await adapter.set('k2', 'v2');
    });

    assert.strictEqual(await adapter.get('k1'), 'v1');
    assert.strictEqual(await adapter.get('k2'), 'v2');
    assert.strictEqual(adapter.txStack.length, 0);
  });

  it('rolls back on error despite duplicate oncomplete events', async () => {
    const adapter = new FlakyTransactionAdapter();
    await adapter.init();
    const tx = new ApplicationTransaction(adapter);

    let caught;
    try {
      await tx.run(async () => {
        await adapter.set('k1', 'v1');
        throw new Error('simulated failure');
      });
    } catch (e) {
      caught = e;
    }

    assert.ok(caught);
    assert.strictEqual(await adapter.get('k1'), null);
    assert.strictEqual(adapter.txStack.length, 0);
  });

  it('supports multiple sequential transactions after idempotent completion', async () => {
    const adapter = new FlakyTransactionAdapter();
    await adapter.init();

    for (let i = 0; i < 5; i++) {
      const tx = new ApplicationTransaction(adapter);
      await tx.run(async () => {
        await adapter.set(`key-${i}`, `value-${i}`);
      });
    }

    assert.strictEqual(adapter.txStack.length, 0);
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(await adapter.get(`key-${i}`), `value-${i}`);
    }
  });

  it('detects STORAGE_CLOSING and rejects operations', async () => {
    const adapter = new FlakyTransactionAdapter();
    await adapter.init();
    adapter._closing = true;

    const tx = new ApplicationTransaction(adapter);
    let caught;
    try {
      await tx.run(async () => {
        await adapter.set('k1', 'v1');
      });
    } catch (e) {
      caught = e;
    }

    assert.ok(caught);
    assert.strictEqual(caught.message, 'STORAGE_CLOSING');
  });
});
