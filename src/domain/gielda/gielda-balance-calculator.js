/**
 * Stage 1.5I — Gielda Balance Domain Calculator
 *
 * Pure domain calculation for the net balance of stock-market operations.
 *
 * Formula:
 *   Σ(wplata.amount) - Σ(wyplata.amount) + Σ(zarobek.amount) - Σ(strata.amount)
 *
 * When `asOfDate` is supplied, only operations with a date <= asOfDate are included.
 * Dates are compared as lexical strings (YYYY-MM-DD). No Date parsing, no timezone conversion.
 *
 * This calculator operates ONLY on explicit input data.
 * It does not read globals, DOM, Firebase, or any external state.
 */

function compute(inputs) {
  const operations = inputs.operations;
  const asOfDate = inputs.asOfDate;

  if (asOfDate) {
    let bal = 0;
    operations.forEach(o => {
      if (!o.date || o.date > asOfDate) return;
      if (o.type === 'wplata') bal += o.amount;
      else if (o.type === 'wyplata') bal -= o.amount;
      else if (o.type === 'zarobek') bal += o.amount;
      else if (o.type === 'strata') bal -= o.amount;
    });
    return bal;
  }

  const dep = operations.filter(o => o.type === 'wplata').reduce((s, o) => s + o.amount, 0);
  const wit = operations.filter(o => o.type === 'wyplata').reduce((s, o) => s + o.amount, 0);
  const ear = operations.filter(o => o.type === 'zarobek').reduce((s, o) => s + o.amount, 0);
  const los = operations.filter(o => o.type === 'strata').reduce((s, o) => s + o.amount, 0);
  return dep - wit + ear - los;
}

export { compute };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compute };
}

if (typeof window !== 'undefined') {
  window.GieldaBalanceCalculator = { compute };
}
