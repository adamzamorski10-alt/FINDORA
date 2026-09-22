import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey } from './repository-utils.js';

export class UserRepository {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  async findById(id) {
    const key = entityKey('user', id, id);
    return await this.storage.get(key);
  }

  async save(entity) {
    if (!entity || !entity.id) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    const key = entityKey('user', entity.id, entity.id);
    await this.storage.set(key, entity);
  }
}