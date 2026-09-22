import { StorageAdapter } from './storage-adapter.js';

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value);
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  const cloned = {};
  for (const key of Object.keys(value)) {
    cloned[key] = cloneValue(value[key]);
  }
  return cloned;
}

class InMemoryStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.store = new Map();
    this.txCtx = null;
  }

  _currentTx() {
    return this.txCtx;
  }

  async init() {
    // no-op
  }

  async get(key) {
    const tx = this._currentTx();
    if (tx) {
      if (tx.deleted.has(key)) return null;
      if (tx.writes.has(key)) {
        const value = tx.writes.get(key);
        return cloneValue(value);
      }
    }
    const stored = this.store.has(key) ? this.store.get(key) : null;
    return cloneValue(stored);
  }

  async set(key, value) {
    const tx = this._currentTx();
    const cloned = cloneValue(value);
    if (tx) {
      tx.writes.set(key, cloned);
      tx.deleted.delete(key);
    } else {
      this.store.set(key, cloned);
    }
  }

  async update(key, updater) {
    const current = await this.get(key);
    const updated = await updater(current);
    return this.set(key, updated);
  }

  async remove(key) {
    const tx = this._currentTx();
    if (tx) {
      tx.writes.delete(key);
      tx.deleted.add(key);
    } else {
      this.store.delete(key);
    }
  }

  keys() {
    const tx = this._currentTx();
    if (tx) {
      const all = new Set([...this.store.keys(), ...Array.from(tx.writes.keys())]);
      return Array.from(all);
    }
    return Array.from(this.store.keys());
  }

  beginTransaction() {
    if (this.txCtx !== null) {
      throw new Error('Storage adapter does not support concurrent transactions; beginTransaction called while another transaction is active');
    }
    const ctx = { writes: new Map(), deleted: new Set() };
    this.txCtx = ctx;
    return ctx;
  }

  commitTransaction(ctx) {
    if (this.txCtx !== ctx) {
      throw new Error('Transaction context mismatch during commit');
    }
    ctx.writes.forEach((value, key) => {
      this.store.set(key, cloneValue(value));
    });
    ctx.deleted.forEach((key) => {
      this.store.delete(key);
    });
    this.txCtx = null;
  }

  abortTransaction(ctx) {
    if (this.txCtx !== ctx) {
      throw new Error('Transaction context mismatch during abort');
    }
    this.txCtx = null;
  }
}

export { InMemoryStorageAdapter };
