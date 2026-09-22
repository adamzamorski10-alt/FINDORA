class StorageAdapter {
  async init() {
    throw new Error('StorageAdapter.init() not implemented');
  }

  async get(key) {
    throw new Error('StorageAdapter.get() not implemented');
  }

  async set(key, value) {
    throw new Error('StorageAdapter.set() not implemented');
  }

  async update(key, updater) {
    throw new Error('StorageAdapter.update() not implemented');
  }

  async remove(key) {
    throw new Error('StorageAdapter.remove() not implemented');
  }

  beginTransaction() {
    return null;
  }

  async commitTransaction(ctx) {
    // no-op for adapters without transaction support
  }

  async abortTransaction(ctx) {
    throw new Error('StorageAdapter.abortTransaction() not implemented');
  }
}

export { StorageAdapter };
