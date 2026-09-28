import { StorageAdapter } from '../storage/storage-adapter.js';
import { entityKey } from './repository-utils.js';

export class UserRepository {
  constructor(storageAdapter, userId) {
    this.storage = storageAdapter;
    this.userId = userId;
  }

  async findById(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const key = entityKey('user', id, id);
    const entity = await this.storage.get(key);
    if (entity && entity.id && this.userId && entity.id !== this.userId) {
      return null;
    }
    return entity;
  }

  async save(entity) {
    if (!entity || !entity.id) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    if (this.userId && entity.id !== this.userId) {
      throw new Error('OWNERSHIP_VIOLATION');
    }
    const key = entityKey('user', entity.id, entity.id);
    await this.storage.set(key, entity);
  }
}