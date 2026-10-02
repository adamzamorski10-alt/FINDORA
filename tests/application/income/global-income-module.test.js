import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGlobalIncomeModule } from '../../../src/application/income/global-income-module.js';

describe('GlobalIncomeModule', () => {
  it('aggregates reselling profiles through the provider contract', async () => {
    const incomeProfileRepository = {
      async loadAll() {
        return [
          { id:'r1', userId:'u1', type:'reselling', name:'Vinted', archived:false },
          { id:'w1', userId:'u1', type:'websites', name:'Websites', archived:false },
          { id:'old', userId:'u1', type:'reselling', name:'Old', archived:true },
        ];
      },
    };
    const module = createGlobalIncomeModule({
      incomeProfileRepository,
      providers: { reselling: { getSummary: async ({ incomeProfileId }) => {
        assert.strictEqual(incomeProfileId, 'r1');
        return { revenue:1000, costs:400, net:600, cashIn:900, cashOut:250 };
      } } },
    });
    const result = await module.getGlobalIncome({ userId:'u1' });

    assert.strictEqual(result.revenue, 1000);
    assert.strictEqual(result.costs, 400);
    assert.strictEqual(result.net, 600);
    assert.strictEqual(result.cashIn, 900);
    assert.strictEqual(result.cashOut, 250);
    assert.strictEqual(result.byProfile.length, 2);
  });

  it('can scope aggregation to one profile', async () => {
    const incomeProfileRepository = {
      async loadAll() {
        return [
          { id:'r1', userId:'u1', type:'reselling', name:'Vinted', archived:false },
          { id:'r2', userId:'u1', type:'reselling', name:'Allegro', archived:false },
        ];
      },
    };
    const module = createGlobalIncomeModule({
      incomeProfileRepository,
      providers: { reselling: { getSummary: async ({ incomeProfileId }) => ({ revenue: incomeProfileId === 'r1' ? 100 : 200, costs:20, net: incomeProfileId === 'r1' ? 80 : 180, cashIn:90, cashOut:10 }) } },
    });
    const result = await module.getGlobalIncome({ userId:'u1', incomeProfileId:'r2' });
    assert.strictEqual(result.revenue, 200);
    assert.strictEqual(result.byProfile.length, 1);
    assert.strictEqual(result.byProfile[0].profileId, 'r2');
  });


  it('rejects a foreign or archived profile scope instead of returning a misleading zero', async () => {
    const incomeProfileRepository = {
      async loadAll() {
        return [
          { id:'r1', userId:'u1', type:'reselling', name:'Vinted', archived:false },
          { id:'r2', userId:'u2', type:'reselling', name:'Other', archived:false },
          { id:'old', userId:'u1', type:'reselling', name:'Old', archived:true },
        ];
      },
    };
    const module = createGlobalIncomeModule({ incomeProfileRepository, providers: {} });
    await assert.rejects(module.getGlobalIncome({ userId:'u1', incomeProfileId:'r2' }), /NOT_FOUND/);
    await assert.rejects(module.getGlobalIncome({ userId:'u1', incomeProfileId:'old' }), /ARCHIVED_ENTITY/);
  });
});
