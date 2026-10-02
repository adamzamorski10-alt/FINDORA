import { calculateGlobalIncome } from '../../domain/income/global-income-calculator.js';

/**
 * Global Income application service.
 * Providers expose normalized summaries; this module never creates a second ledger.
 */
export function createGlobalIncomeModule({ incomeProfileRepository, providers = {} } = {}) {
  if (!incomeProfileRepository) throw new Error('DEPENDENCY_MISSING');

  async function getGlobalIncome({ userId, period, incomeProfileId } = {}) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('VALIDATION_FAILED');
    }

    const allProfiles = await incomeProfileRepository.loadAll();
    if (incomeProfileId) {
      const selectedProfile = allProfiles.find(profile => profile.id === incomeProfileId);
      if (!selectedProfile || selectedProfile.userId !== userId) throw new Error('NOT_FOUND');
      if (selectedProfile.archived) throw new Error('ARCHIVED_ENTITY');
    }

    const profiles = allProfiles
      .filter(profile => profile.userId === userId && !profile.archived)
      .filter(profile => !incomeProfileId || profile.id === incomeProfileId);

    const summaries = [];
    for (const profile of profiles) {
      const provider = providers[profile.type];
      if (!provider || typeof provider.getSummary !== 'function') continue;
      const summary = await provider.getSummary({ userId, incomeProfileId: profile.id, period });
      if (!summary || typeof summary !== 'object') continue;
      summaries.push({ ...summary, profileId: profile.id });
    }

    return calculateGlobalIncome({ profiles, summaries });
  }

  return { getGlobalIncome };
}
