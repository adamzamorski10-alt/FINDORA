import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';
import { createIncomeProfile, validateProfileUpdate } from '../../domain/income-profile/income-profile-entity.js';
import { isSupportedProfileType } from '../../domain/income-profile/income-profile-types.js';

export function createIncomeProfileModule({
  incomeProfileRepository,
  applicationTransaction,
}) {
  const profileRepo = incomeProfileRepository;
  const appTx = applicationTransaction;

  async function createProfile({ userId, type, name, description }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!isSupportedProfileType(type)) {
      throw new Error('VALIDATION_FAILED');
    }

    const profile = createIncomeProfile({ userId, type, name, description });

    await appTx.run(async () => {
      const all = await profileRepo.loadAll();
      const duplicate = all.find(p => p.userId === userId && p.name.toLowerCase() === profile.name.toLowerCase() && !p.archived);
      if (duplicate) {
        throw new Error('VALIDATION_FAILED');
      }
      await profileRepo.save(profile);
    });

    return profile;
  }

  async function getProfile({ profileId }) {
    if (!profileId || typeof profileId !== 'string' || profileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    return await profileRepo.findById(profileId);
  }

  async function listProfiles({ userId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const all = await profileRepo.loadAll();
    return all.filter(profile => profile.userId === userId && !profile.archived);
  }

  async function listArchivedProfiles({ userId }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    const all = await profileRepo.loadAll();
    return all.filter(profile => profile.userId === userId && profile.archived);
  }

  async function updateProfile({ profileId, updates }) {
    if (!profileId || typeof profileId !== 'string' || profileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }
    if (!updates || typeof updates !== 'object') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await profileRepo.findById(profileId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    const updated = validateProfileUpdate({ existing, updates });

    await appTx.run(async () => {
      const all = await profileRepo.loadAll();
      const duplicate = all.find(p => p.userId === existing.userId && p.name.toLowerCase() === updated.name.toLowerCase() && p.id !== profileId && !p.archived);
      if (duplicate) {
        throw new Error('VALIDATION_FAILED');
      }
      await profileRepo.save(updated);
    });

    return updated;
  }

  async function archiveProfile({ profileId }) {
    if (!profileId || typeof profileId !== 'string' || profileId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const existing = await profileRepo.findById(profileId);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }
    if (existing.archived) {
      return existing;
    }

    await appTx.run(async () => {
      existing.archived = true;
      existing.updatedAt = new Date().toISOString();
      await profileRepo.save(existing);
    });
    return existing;
  }

  return {
    createProfile,
    getProfile,
    listProfiles,
    listArchivedProfiles,
    updateProfile,
    archiveProfile,
  };
}
