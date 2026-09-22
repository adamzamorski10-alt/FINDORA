import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey, loadAll, checkOwnership } from './repository-utils.js';

export class BudgetRepository {
  constructor(storageAdapter, userId, listKeys) {
    this.storage = storageAdapter;
    this.userId = userId;
    this.listKeys = listKeys;
  }

  async findAll() {
    return await loadAll(this.storage, 'budget', this.userId, this.listKeys);
  }

  async findById(id) {
    const key = entityKey('budget', this.userId, id);
    return await this.storage.get(key);
  }

  async findByCategory(categoryId) {
    const all = await this.findAll();
    return all.filter(budget => budget.categoryId === categoryId);
  }

  async save(entity) {
    checkOwnership(entity, this.userId);
    const key = entityKey('budget', this.userId, entity.id);
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