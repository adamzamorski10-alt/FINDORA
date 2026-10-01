/**
 * Stage 3 — Income Profile Type Registry
 *
 * Centralized registry of supported profile types.
 * UI and module code must use this registry instead of
 * hard-coded strings or if/else chains.
 */

export const SUPPORTED_PROFILE_TYPES = [
  {
    key: 'reselling',
    labelKey: 'incomeProfiles.type.reselling',
    descriptionKey: 'incomeProfiles.type.resellingDesc',
    defaultIcon: 'shopping-bag',
  },
  {
    key: 'websites',
    labelKey: 'incomeProfiles.type.websites',
    descriptionKey: 'incomeProfiles.type.websitesDesc',
    defaultIcon: 'globe',
  },
  {
    key: 'trading',
    labelKey: 'incomeProfiles.type.trading',
    descriptionKey: 'incomeProfiles.type.tradingDesc',
    defaultIcon: 'trending-up',
  },
];

export function getProfileType(key) {
  return SUPPORTED_PROFILE_TYPES.find(item => item.key === key) || null;
}

export function isSupportedProfileType(key) {
  return SUPPORTED_PROFILE_TYPES.some(item => item.key === key);
}
