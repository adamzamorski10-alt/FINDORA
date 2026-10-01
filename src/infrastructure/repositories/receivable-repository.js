import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey, loadAll, checkOwnership } from './repository-utils.js';

export class ReceivableRepository {
  constructor(storageAdapter, userId, listKeys) {
    this.storage = storageAdapter;
    this.userId = userId;
    this.listKeys = listKeys;
  }

  async loadAll() {
    return await loadAll(this.storage, 'receivable', this.userId, this.listKeys);
  }

  async findById(id) {
    const key = entityKey('receivable', this.userId, id);
    return await this.storage.get(key);
  }

  async findByPerson(personId) {
    const all = await this.loadAll();
    return all.filter(r => r.personId === personId);
  }

  async save(entity) {
    checkOwnership(entity, this.userId);
    const key = entityKey('receivable', this.userId, entity.id);
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
