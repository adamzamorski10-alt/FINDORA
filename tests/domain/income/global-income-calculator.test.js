import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGlobalIncome } from '../../../src/domain/income/global-income-calculator.js';

describe('GlobalIncomeCalculator', () => {
  it('aggregates active profile summaries without becoming a ledger', () => {
    const result = calculateGlobalIncome({
      profiles: [
        { id:'r1', type:'reselling', name:'Vinted', archived:false },
        { id:'w1', type:'websites', name:'Websites', archived:false },
        { id:'old', type:'reselling', name:'Old', archived:true },
      ],
      summaries: [
        { profileId:'r1', revenue:1000, costs:400, net:600, cashIn:900, cashOut:350 },
        { profileId:'w1', revenue:500, costs:100, net:400, cashIn:500, cashOut:100 },
      ],
    });

    assert.deepStrictEqual(result, {
      revenue:1500, costs:500, net:1000, cashIn:1400, cashOut:450,
      byProfile: [
        { profileId:'r1', type:'reselling', name:'Vinted', revenue:1000, costs:400, net:600, cashIn:900, cashOut:350 },
        { profileId:'w1', type:'websites', name:'Websites', revenue:500, costs:100, net:400, cashIn:500, cashOut:100 },
      ],
    });
  });

  it('does not let missing provider data create fake totals', () => {
    const result = calculateGlobalIncome({
      profiles: [{ id:'r1', type:'reselling', name:'Vinted', archived:false }],
      summaries: [],
    });
    assert.strictEqual(result.revenue, 0);
    assert.strictEqual(result.costs, 0);
    assert.strictEqual(result.net, 0);
  });

  it('ignores summaries for profiles that are not active', () => {
    const result = calculateGlobalIncome({
      profiles: [{ id:'r1', type:'reselling', name:'Vinted', archived:false }],
      summaries: [
        { profileId:'unknown', revenue:999, costs:1, net:998 },
        { profileId:'r1', revenue:100, costs:25 },
      ],
    });
    assert.strictEqual(result.revenue, 100);
    assert.strictEqual(result.costs, 25);
    assert.strictEqual(result.net, 75);
  });
});
