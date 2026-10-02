/**
 * Global Income Domain Calculator
 *
 * Pure aggregation layer for income-profile summaries.
 * It never owns financial truth and never reads storage.
 *
 * Each provider supplies a normalized summary:
 * { profileId, revenue, costs, net, cashIn, cashOut }
 *
 * The calculator only aggregates these projections. Accounts/Transactions remain
 * the authoritative ledger for real cash movement.
 */

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function calculateGlobalIncome({ profiles = [], summaries = [] } = {}) {
  if (!Array.isArray(profiles) || !Array.isArray(summaries)) {
    throw new Error('VALIDATION_FAILED');
  }

  const activeProfiles = profiles.filter(profile =>
    profile &&
    typeof profile.id === 'string' &&
    profile.id &&
    !profile.archived
  );

  const summaryByProfile = new Map();
  for (const summary of summaries) {
    if (!summary || typeof summary.profileId !== 'string' || !summary.profileId) continue;
    summaryByProfile.set(summary.profileId, summary);
  }

  const byProfile = activeProfiles.map(profile => {
    const summary = summaryByProfile.get(profile.id) || {};
    const revenue = numberOrZero(summary.revenue);
    const costs = numberOrZero(summary.costs);
    const net = numberOrZero(summary.net ?? revenue - costs);
    const cashIn = numberOrZero(summary.cashIn);
    const cashOut = numberOrZero(summary.cashOut);

    return {
      profileId: profile.id,
      type: profile.type || 'unknown',
      name: profile.name || '',
      revenue,
      costs,
      net,
      cashIn,
      cashOut,
    };
  });

  return {
    revenue: byProfile.reduce((sum, item) => sum + item.revenue, 0),
    costs: byProfile.reduce((sum, item) => sum + item.costs, 0),
    net: byProfile.reduce((sum, item) => sum + item.net, 0),
    cashIn: byProfile.reduce((sum, item) => sum + item.cashIn, 0),
    cashOut: byProfile.reduce((sum, item) => sum + item.cashOut, 0),
    byProfile,
  };
}
