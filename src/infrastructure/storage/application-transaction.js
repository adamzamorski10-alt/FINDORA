import { StorageAdapter } from './storage-adapter.js';

class ApplicationTransaction {
  constructor(storageAdapter) {
    this.adapter = storageAdapter;
  }

  async run(callback) {
    if (typeof this.adapter.beginTransaction !== 'function') {
      throw new Error('Storage adapter does not support transactions; ApplicationTransaction requires atomic boundary');
    }

    const ctx = this.adapter.beginTransaction();
    try {
      await callback();
      await this.adapter.commitTransaction(ctx);
    } catch (err) {
      try {
        await this.adapter.abortTransaction(ctx);
      } catch (abortErr) {
        // abort errors are secondary; the original error is the primary failure
      }
      throw err;
    }
  }
}

export { ApplicationTransaction };
