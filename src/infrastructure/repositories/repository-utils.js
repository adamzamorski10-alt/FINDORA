import { StorageAdapter } from '../storage/storage-adapter.js';

export function entityKey(prefix, userId, id) {
  if (prefix === 'user') {
    return `user:${id}`;
  }
  return `${prefix}:${userId}:${id}`;
}

export function userKeys(allKeys, prefix, userId) {
  const prefixStr = `${prefix}:${userId}:`;
  return allKeys.filter(key => key.startsWith(prefixStr));
}

export async function loadAll(storage, prefix, userId, listKeys) {
  const allKeys = await listKeys();
  const keys = userKeys(allKeys, prefix, userId);
  const entities = [];
  for (const key of keys) {
    const entity = await storage.get(key);
    if (entity !== null && entity !== undefined) {
      entities.push(entity);
    }
  }
  return entities;
}

export function checkOwnership(entity, userId) {
  if (!entity || entity.userId !== userId) {
    throw new Error('OWNERSHIP_VIOLATION');
  }
}