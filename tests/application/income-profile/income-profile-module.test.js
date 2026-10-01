import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createIncomeProfileModule } from '../../../src/application/income-profile/income-profile-module.js';
import { IncomeProfileRepository } from '../../../src/infrastructure/repositories/income-profile-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

describe('IncomeProfileModule', () => {
  const userId = 'user-1';

  function createModule() {
    const storage = new InMemoryStorageAdapter();
    const listKeys = () => storage.keys();
    const repo = new IncomeProfileRepository(storage, userId, listKeys);
    const appTx = new ApplicationTransaction(storage);

    return createIncomeProfileModule({
      incomeProfileRepository: repo,
      applicationTransaction: appTx,
    });
  }

  it('createProfile creates a profile with correct shape', async () => {
    const module = createModule();

    const profile = await module.createProfile({
      userId,
      type: 'reselling',
      name: 'Vinted',
      description: 'Reselling on Vinted',
    });

    assert.ok(profile.id);
    assert.strictEqual(profile.userId, userId);
    assert.strictEqual(profile.type, 'reselling');
    assert.strictEqual(profile.name, 'Vinted');
    assert.strictEqual(profile.description, 'Reselling on Vinted');
    assert.strictEqual(profile.archived, false);
    assert.ok(profile.createdAt);
    assert.ok(profile.updatedAt);
  });

  it('createProfile rejects unsupported types', async () => {
    const module = createModule();

    let threw = false;
    try {
      await module.createProfile({ userId, type: 'unknown', name: 'Test' });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });

  it('createProfile rejects duplicate names', async () => {
    const module = createModule();

    await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });

    let threw = false;
    try {
      await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });

  it('listProfiles returns only active profiles for user', async () => {
    const module = createModule();

    await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });
    await module.createProfile({ userId, type: 'websites', name: 'Freelance' });

    const profiles = await module.listProfiles({ userId });
    assert.strictEqual(profiles.length, 2);
    assert.ok(profiles.every(p => p.userId === userId && !p.archived));
  });

  it('getProfile returns profile by id', async () => {
    const module = createModule();

    const created = await module.createProfile({ userId, type: 'trading', name: 'Giełda' });
    const found = await module.getProfile({ profileId: created.id });

    assert.ok(found);
    assert.strictEqual(found.id, created.id);
    assert.strictEqual(found.name, 'Giełda');
  });

  it('updateProfile updates allowed fields', async () => {
    const module = createModule();

    const created = await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });
    const updated = await module.updateProfile({
      profileId: created.id,
      updates: { name: 'Vinted PL', description: 'Updated desc' },
    });

    assert.strictEqual(updated.name, 'Vinted PL');
    assert.strictEqual(updated.description, 'Updated desc');
    assert.strictEqual(updated.type, 'reselling');
  });

  it('updateProfile rejects type change', async () => {
    const module = createModule();

    const created = await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });

    let threw = false;
    try {
      await module.updateProfile({ profileId: created.id, updates: { type: 'websites' } });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });

  it('archiveProfile archives the profile', async () => {
    const module = createModule();

    const created = await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });
    const archived = await module.archiveProfile({ profileId: created.id });

    assert.strictEqual(archived.archived, true);

    const active = await module.listProfiles({ userId });
    assert.strictEqual(active.length, 0);
  });

  it('archived profiles do not appear in active list', async () => {
    const module = createModule();

    const created = await module.createProfile({ userId, type: 'reselling', name: 'Vinted' });
    await module.archiveProfile({ profileId: created.id });

    const active = await module.listProfiles({ userId });
    assert.strictEqual(active.length, 0);
  });

  it('cross-user isolation works', async () => {
    const module = createModule();

    await module.createProfile({ userId: 'user-1', type: 'reselling', name: 'Vinted' });
    const profiles = await module.listProfiles({ userId: 'user-2' });
    assert.strictEqual(profiles.length, 0);
  });

  it('no financial side effects from profile creation', async () => {
    const module = createModule();
    const storage = new InMemoryStorageAdapter();
    const repo = new IncomeProfileRepository(storage, userId, () => storage.keys());
    const appTx = new ApplicationTransaction(storage);
    const m = createIncomeProfileModule({
      incomeProfileRepository: repo,
      applicationTransaction: appTx,
    });

    await m.createProfile({ userId, type: 'reselling', name: 'Vinted' });

    const allKeys = storage.keys();
    assert.ok(allKeys.every(k => k.startsWith('incomeProfile:') || k.startsWith('user:')));
  });
});
