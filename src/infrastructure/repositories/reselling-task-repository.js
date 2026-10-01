/**
 * Stage 4 — Reselling Task Repository
 */

import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey, loadAll, checkOwnership } from './repository-utils.js';

export class ResellingTaskRepository {
  constructor(storageAdapter, userId, listKeys) {
    this.storage = storageAdapter;
    this.userId = userId;
    this.listKeys = listKeys;
  }

  async loadAll() {
    return await loadAll(this.storage, 'resellingTask', this.userId, this.listKeys);
  }

  async findById(id) {
    const key = entityKey('resellingTask', this.userId, id);
    return await this.storage.get(key);
  }

  async findByIncomeProfile(incomeProfileId) {
    const all = await this.loadAll();
    return all.filter(t => t.incomeProfileId === incomeProfileId);
  }

  async save(entity) {
    checkOwnership(entity, this.userId);
    const key = entityKey('resellingTask', this.userId, entity.id);
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
