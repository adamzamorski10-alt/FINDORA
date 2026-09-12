/**
 * Stage 1.5G — Source Net Domain Calculator
 *
 * Pure domain calculation for net earnings (income - expense) of a single
 * income source in a given month (YYYY-MM).
 *
 * This calculator delegates the per-source monthly calculation to the shared
 * SourceMonthlyEarningsCalculator and returns only the net value.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const calculator = inputs.calculator;
  if (!calculator) {
    throw new Error('SourceMonthlyEarningsCalculator not available');
  }

  const result = calculator.compute({
    source: inputs.source,
    mKey: inputs.mKey,
    transactions: inputs.transactions,
    gieldaOps: inputs.gieldaOps,
  });

  return result.net;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.SourceNetCalculator = { compute };
}
