/**
 * Stage 4 — Reselling Cost Repository
 */

import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey, loadAll, checkOwnership } from './repository-utils.js';

export class ResellingCostRepository {
  constructor(storageAdapter, userId, listKeys) {
    this.storage = storageAdapter;
    this.userId = userId;
    this.listKeys = listKeys;
  }

  async loadAll() {
    return await loadAll(this.storage, 'resellingCost', this.userId, this.listKeys);
  }

  async findById(id) {
    const key = entityKey('resellingCost', this.userId, id);
    return await this.storage.get(key);
  }

  async findByIncomeProfile(incomeProfileId) {
    const all = await this.loadAll();
    return all.filter(c => c.incomeProfileId === incomeProfileId);
  }

  async save(entity) {
    checkOwnership(entity, this.userId);
    const key = entityKey('resellingCost', this.userId, entity.id);
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
