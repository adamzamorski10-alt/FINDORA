import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createUserModule } from '../../../src/application/user/user-module.js';
import { UserRepository } from '../../../src/infrastructure/repositories/user-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';

describe('UserModule', () => {
  describe('construction', () => {
    it('creates a module with an injected UserRepository', async () => {
      const repo = { findById: async () => null };
      const module = createUserModule({ userRepository: repo });
      assert.ok(module);
      assert.strictEqual(typeof module.getProfile, 'function');
    });

    it('does not instantiate its own repository', async () => {
      let constructed = false;
      const repo = {
        findById: async () => ({ id: 'user-1' }),
        get constructedCount() { constructed = true; return 0; }
      };
      const module = createUserModule({ userRepository: repo });
      await module.getProfile({ userId: 'user-1' });
      assert.strictEqual(constructed, false);
    });

    it('supports multiple independent module instances', async () => {
      const repoA = { findById: async () => ({ id: 'user-A' }) };
      const repoB = { findById: async () => ({ id: 'user-B' }) };
      const moduleA = createUserModule({ userRepository: repoA });
      const moduleB = createUserModule({ userRepository: repoB });

      const profileA = await moduleA.getProfile({ userId: 'user-A' });
      const profileB = await moduleB.getProfile({ userId: 'user-B' });

      assert.strictEqual(profileA.id, 'user-A');
      assert.strictEqual(profileB.id, 'user-B');
    });
  });

  describe('getProfile', () => {
    it('returns user profile for valid userId', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const repo = new UserRepository(storage);
      const module = createUserModule({ userRepository: repo });

      const user = {
        id: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        settings: {
          currency: 'PLN',
          theme: 'system',
          privacyMode: false,
          excludeInvestmentsFromNetWorth: false,
        },
      };
      await repo.save(user);
      const profile = await module.getProfile({ userId: 'user-1' });
      assert.deepEqual(profile, user);
    });

    it('throws NOT_FOUND for missing user', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const repo = new UserRepository(storage);
      const module = createUserModule({ userRepository: repo });

      let thrown = false;
      try {
        await module.getProfile({ userId: 'missing' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'NOT_FOUND');
      }
      assert.ok(thrown, 'Expected NOT_FOUND');
    });

    it('throws VALIDATION_FAILED for empty userId', async () => {
      const repo = { findById: async () => null };
      const module = createUserModule({ userRepository: repo });

      let thrown = false;
      try {
        await module.getProfile({ userId: '' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown, 'Expected VALIDATION_FAILED');
    });

    it('throws VALIDATION_FAILED for whitespace-only userId', async () => {
      const repo = { findById: async () => null };
      const module = createUserModule({ userRepository: repo });

      let thrown = false;
      try {
        await module.getProfile({ userId: '   ' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown, 'Expected VALIDATION_FAILED');
    });

    it('throws VALIDATION_FAILED for missing userId', async () => {
      const repo = { findById: async () => null };
      const module = createUserModule({ userRepository: repo });

      let thrown = false;
      try {
        await module.getProfile({});
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'VALIDATION_FAILED');
      }
      assert.ok(thrown, 'Expected VALIDATION_FAILED');
    });

    it('propagates repository errors', async () => {
      const repo = {
        findById: async () => {
          throw new Error('STORAGE_UNAVAILABLE');
        }
      };
      const module = createUserModule({ userRepository: repo });

      let thrown = false;
      try {
        await module.getProfile({ userId: 'user-1' });
      } catch (e) {
        thrown = true;
        assert.strictEqual(e.message, 'STORAGE_UNAVAILABLE');
      }
      assert.ok(thrown, 'Expected STORAGE_UNAVAILABLE');
    });
  });
});