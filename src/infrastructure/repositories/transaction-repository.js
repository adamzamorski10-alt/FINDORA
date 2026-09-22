import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey, loadAll, checkOwnership } from './repository-utils.js';

export class TransactionRepository {
  constructor(storageAdapter, userId, listKeys) {
    this.storage = storageAdapter;
    this.userId = userId;
    this.listKeys = listKeys;
  }

  async loadAll() {
    return await loadAll(this.storage, 'transaction', this.userId, this.listKeys);
  }

  async findById(id) {
    const key = entityKey('transaction', this.userId, id);
    return await this.storage.get(key);
  }

  async findByMonth(monthKey) {
    const all = await this.loadAll();
    return all.filter(tx => tx.date && tx.date.substring(0, 7) === monthKey);
  }

  async findByAccount(accountId) {
    const all = await this.loadAll();
    return all.filter(tx => tx.accountId === accountId);
  }

  async save(entity) {
    checkOwnership(entity, this.userId);
    const key = entityKey('transaction', this.userId, entity.id);
    await this.storage.set(key, entity);
  }

  async archive(id) {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error('NOT_FOUND');
    }
    entity.archived = true;
    entity.updatedAt = new Date().toISOString();
    await this.save(entity);
  }
}