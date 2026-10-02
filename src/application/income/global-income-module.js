import { calculateGlobalIncome } from '../../domain/income/global-income-calculator.js';

export function createGlobalIncomeModule({
  incomeProfileRepository,
  resellingModule,
}) {
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
      if (profile.type === 'reselling' && resellingModule) {
        const analytics = await resellingModule.getResellingAnalytics({
          userId,
          incomeProfileId: profile.id,
          period,
        });
        summaries.push({
          profileId: profile.id,
          revenue: analytics.totalRevenue,
          costs: analytics.totalCost,
          net: analytics.totalNet,
          cashIn: analytics.realizedRevenue,
          cashOut: analytics.realizedCost,
        });
      }
    }

    return calculateGlobalIncome({ profiles, summaries });
  }

  return { getGlobalIncome };
}
