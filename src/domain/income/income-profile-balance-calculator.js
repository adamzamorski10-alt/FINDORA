/**
 * Stage 1.5K — Income Profile Balance Domain Calculator
 *
 * Pure domain calculation for the balance of a single income profile.
 *
 * For regular profiles: base balance + net of non-transfer transactions.
 * For Gielda profiles: returns the explicitly supplied gielda balance.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const profile = inputs.profile;
  const transactions = inputs.transactions;
  const gieldaBalance = inputs.gieldaBalance;

  if (!profile) return 0;

  if (profile.id === 'gielda') {
    return gieldaBalance;
  }

  const base = Number(profile.balance) || 0;

  const txNet = (transactions || [])
    .filter(t => t._sourceId === profile.id && !t._transfer)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  return base + txNet;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.IncomeProfileBalanceCalculator = { compute };
}
