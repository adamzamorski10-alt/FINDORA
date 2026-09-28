import { UserRepository } from '../../infrastructure/repositories/user-repository.js';

export function createUserModule({ userRepository }) {
  const repo = userRepository;

  async function getProfile({ userId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const profile = await repo.findById(userId);
    if (profile === null) {
      throw new Error('NOT_FOUND');
    }
    return profile;
  }

  async function createProfile({ userId, settings }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const existing = await repo.findById(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const profile = {
      id: userId,
      createdAt: now,
      updatedAt: now,
      settings: settings || {
        currency: 'PLN',
        theme: 'system',
        accent: 'purple',
        privacyMode: false,
        excludeInvestmentsFromNetWorth: false,
      },
    };

    await repo.save(profile);
    return profile;
  }

  async function updateProfile({ userId, settings }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const existing = await repo.findById(userId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    const updated = {
      ...existing,
      settings: settings || existing.settings,
      updatedAt: new Date().toISOString(),
    };
    await repo.save(updated);
    return updated;
  }

  return {
    getProfile,
    createProfile,
    updateProfile,
  };
}