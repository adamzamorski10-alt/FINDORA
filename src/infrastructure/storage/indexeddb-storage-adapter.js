import { StorageAdapter } from './storage-adapter.js';

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  if (value === null || typeof value !== 'object') {
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

class IndexedDBStorageAdapter extends StorageAdapter {
  constructor(dbName = 'finora') {
    super();
    this.dbName = dbName;
    this.db = null;
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

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.db.onversionchange = () => {
          this._closing = true;
        };
        resolve();
      };

      request.onerror = () => {
        reject(new Error('STORAGE_UNAVAILABLE'));
      };
    });
  }

  async get(key) {
    this._guard();
    const tx = this._currentTx();
    if (tx) {
      if (tx.deletes.has(key)) return null;
      if (tx.writes.has(key)) {
        return cloneValue(tx.writes.get(key));
      }
    }

    const idbTx = this.db.transaction('kv', 'readonly');
    const store = idbTx.objectStore('kv');
    const req = store.get(key);
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return result?.value ?? null;
  }

  async set(key, value) {
    this._guard();
    const tx = this._currentTx();
    const cloned = cloneValue(value);
    if (tx) {
      tx.writes.set(key, cloned);
      tx.deletes.delete(key);
      return;
    }

    const idbTx = this.db.transaction('kv', 'readwrite');
    const store = idbTx.objectStore('kv');
    const req = store.put({ key, value: cloned });
    await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async update(key, updater) {
    this._guard();
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

    const idbTx = this.db.transaction('kv', 'readwrite');
    const store = idbTx.objectStore('kv');
    const req = store.delete(key);
    await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async keys() {
    this._guard();
    const tx = this._currentTx();
    if (tx) {
      const existing = await new Promise((resolve, reject) => {
        const idbTx = this.db.transaction('kv', 'readonly');
        const store = idbTx.objectStore('kv');
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const all = new Set([...existing, ...Array.from(tx.writes.keys())]);
      return Array.from(all).filter(key => !tx.deletes.has(key));
    }

    const idbTx = this.db.transaction('kv', 'readonly');
    const store = idbTx.objectStore('kv');
    const req = store.getAllKeys();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  beginTransaction() {
    this._guard();
    if (this.txStack.length > 0) {
      throw new Error('Storage adapter does not support concurrent transactions; beginTransaction called while another transaction is active');
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

    const idbTx = this.db.transaction('kv', 'readwrite');
    const store = idbTx.objectStore('kv');

    for (const key of ctx.deletes) {
      store.delete(key);
    }
    for (const [key, value] of ctx.writes) {
      store.put({ key, value });
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
    });
  }

  async abortTransaction(ctx) {
    const index = this.txStack.length - 1;
    if (index < 0 || this.txStack[index] !== ctx) {
      throw new Error('Transaction context mismatch during abort');
    }
    this.txStack.pop();
    // Buffer discarded; no IDB transaction was created yet
  }
}

export { IndexedDBStorageAdapter };
