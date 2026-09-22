import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createUserModule } from '../../src/application/user/user-module.js';
import { UserRepository } from '../../src/infrastructure/repositories/user-repository.js';
import { InMemoryStorageAdapter } from '../../src/infrastructure/storage/memory-storage-adapter.js';
import { createApplicationState } from '../../src/state/application-state-factory.js';
import fs from 'node:fs';

describe('Stage 4.6 — Settings Persistence', () => {
  describe('settings update flow', () => {
    it('successfully updates profile settings', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const userRepo = new UserRepository(storage);
      const userModule = createUserModule({ userRepository: userRepo });
      const state = createApplicationState();

      await userRepo.save({
        id: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        settings: { currency: 'PLN', theme: 'system', privacyMode: false, excludeInvestmentsFromNetWorth: false },
      });

      state.dispatch({ type: 'SET_USER_ID', userId: 'user-1' });
      const profile = await userModule.getProfile({ userId: 'user-1' });
      state.dispatch({ type: 'SET_USER_PROFILE', profile });

      const updated = await userModule.updateProfile({
        userId: 'user-1',
        settings: { currency: 'EUR', theme: 'dark', privacyMode: true, excludeInvestmentsFromNetWorth: true },
      });

      assert.strictEqual(updated.settings.currency, 'EUR');
      assert.strictEqual(updated.settings.theme, 'dark');
      assert.strictEqual(updated.settings.privacyMode, true);
      assert.strictEqual(updated.settings.excludeInvestmentsFromNetWorth, true);
    });

    it('reverts optimistic state on persistence failure', async () => {
      const storage = new InMemoryStorageAdapter();
      await storage.init();
      const userRepo = new UserRepository(storage);
      const userModule = createUserModule({ userRepository: userRepo });
      const state = createApplicationState();

      const persistedProfile = {
        id: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        settings: { currency: 'PLN', theme: 'system', privacyMode: false, excludeInvestmentsFromNetWorth: false },
      };
      await userRepo.save(persistedProfile);

      state.dispatch({ type: 'SET_USER_ID', userId: 'user-1' });
      const profile = await userModule.getProfile({ userId: 'user-1' });
      state.dispatch({ type: 'SET_USER_PROFILE', profile });

      state.dispatch({
        type: 'SET_USER_PROFILE',
        profile: { ...profile, settings: { ...profile.settings, currency: 'EUR' } },
      });
      assert.strictEqual(state.getState().session.profile.settings.currency, 'EUR');

      const failingRepo = {
        findById: async () => persistedProfile,
        save: async () => { throw new Error('STORAGE_UNAVAILABLE'); },
      };
      const failingModule = createUserModule({ userRepository: failingRepo });

      let thrown = false;
      try {
        await failingModule.updateProfile({ userId: 'user-1', settings: state.getState().session.profile.settings });
      } catch (e) {
        thrown = true;
      }
      assert.ok(thrown);

      const reloaded = await userModule.getProfile({ userId: 'user-1' });
      state.dispatch({ type: 'SET_USER_PROFILE', profile: reloaded });

      assert.strictEqual(state.getState().session.profile.settings.currency, 'PLN');
      assert.strictEqual(state.getState().session.profileError, null);
    });

    it('does not expose repository or storage access from settings view source', async () => {
      const viewsSource = fs.readFileSync('src/ui/views/settings.js', 'utf8');
      assert.ok(!viewsSource.includes('userRepository'));
      assert.ok(!viewsSource.includes('transactionRepository'));
      assert.ok(!viewsSource.includes('StorageAdapter'));
      assert.ok(!viewsSource.includes('IndexedDB'));
      assert.ok(!viewsSource.includes('localStorage'));
      assert.ok(!viewsSource.includes('window.StorageAdapter'));
      assert.ok(!viewsSource.includes('window.dbData'));
      assert.ok(!viewsSource.includes('window.currentUser'));
      assert.ok(!viewsSource.includes('DataLayer'));
      assert.ok(!viewsSource.includes('FirebaseStorageAdapter'));
      assert.ok(!viewsSource.includes('productDisplay'));
      assert.ok(!viewsSource.includes('_extracted'));
      assert.ok(!viewsSource.includes('index.html'));
    });
  });
});
