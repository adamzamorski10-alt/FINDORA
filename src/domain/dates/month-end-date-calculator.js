/**
 * Stage 1.5P — Month End Date Domain Calculator
 *
 * Pure domain calculation for the last day of a month given a YYYY-MM key.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(mKey) {
  const [y, m] = mKey.split('-').map(Number);
  const d = new Date(y, m, 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.MonthEndDateCalculator = { compute };
}
