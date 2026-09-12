/**
 * Stage 1.4+ — Debt Service tests.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function createMockPersonRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function findById(id) {
    calls.push({ method: 'findById', id });
    var found = data.find(function(p) { return p.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function findByType(type) {
    calls.push({ method: 'findByType', type });
    return Promise.resolve(data.filter(function(p) { return p.type === type; }));
  }

  function save(person) {
    calls.push({ method: 'save', person: JSON.parse(JSON.stringify(person)) });
    var index = data.findIndex(function(p) { return p.id === person.id; });
    if (index >= 0) { data[index] = person; } else { data.push(person); }
    return Promise.resolve(JSON.parse(JSON.stringify(person)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(p) { return p.id !== id; });
    return Promise.resolve();
  }

  function addDebt(personId, debt) {
    calls.push({ method: 'addDebt', personId, debt: JSON.parse(JSON.stringify(debt)) });
    var person = data.find(function(p) { return p.id === personId; });
    if (!person) return Promise.reject(new Error('Person not found: ' + personId));
    person.debts = person.debts || [];
    person.debts.push({ ...debt, id: debt.id || 'debt-' + Date.now() });
    return Promise.resolve(JSON.parse(JSON.stringify(person)));
  }

  function addRepayment(personId, repayment) {
    calls.push({ method: 'addRepayment', personId, repayment: JSON.parse(JSON.stringify(repayment)) });
    var person = data.find(function(p) { return p.id === personId; });
    if (!person) return Promise.reject(new Error('Person not found: ' + personId));
    person.repayments = person.repayments || [];
    person.repayments.push({ ...repayment, id: repayment.id || 'repay-' + Date.now() });
    return Promise.resolve(JSON.parse(JSON.stringify(person)));
  }

  return { loadAll: loadAll, findById: findById, findByType: findByType, save: save, remove: remove, addDebt: addDebt, addRepayment: addRepayment, calls: calls, setData: function(d) { data = d; } };
}

function setupService(personRepo) {
  var window = { DebtService: null };
  var DebtService = require('../../src/application/debt/debt-service.js');
  window.DebtService = { create: DebtService.create };
  var service = window.DebtService.create(personRepo);
  return { service: service, window: window };
}

describe('DebtService', () => {
  describe('getAll()', () => {
    it('returns all people', async () => {
      var repo = createMockPersonRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'p1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }]);

      var result = await service.getAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('getByType()', () => {
    it('filters by type', async () => {
      var repo = createMockPersonRepository();
      var { service } = setupService(repo);
      repo.setData([
        { id: 'p1', name: 'Jan', type: 'debtor', debts: [], repayments: [] },
        { id: 'p2', name: 'Bank', type: 'creditor', debts: [], repayments: [] }
      ]);

      var result = await service.getByType('debtor');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].type, 'debtor');
    });
  });

  describe('add()', () => {
    it('creates new person', async () => {
      var repo = createMockPersonRepository();
      var { service } = setupService(repo);

      var result = await service.add({ name: 'Jan', type: 'debtor' });
      assert.ok(result.id);
      assert.strictEqual(result.type, 'debtor');
    });
  });

  describe('addDebt()', () => {
    it('adds debt to person', async () => {
      var repo = createMockPersonRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'p1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }]);

      var result = await service.addDebt('p1', 500, 'Loan');
      assert.ok(result.debts.length === 1);
      assert.strictEqual(result.debts[0].amount, 500);
    });
  });

  describe('addRepayment()', () => {
    it('adds repayment to person', async () => {
      var repo = createMockPersonRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'p1', name: 'Jan', type: 'debtor', debts: [{ id: 'd1', amount: 500, repaid: 0 }], repayments: [] }]);

      var result = await service.addRepayment('p1', 200, '');
      assert.ok(result.repayments.length === 1);
      assert.strictEqual(result.repayments[0].amount, 200);
    });
  });

  describe('remove()', () => {
    it('removes person', async () => {
      var repo = createMockPersonRepository();
      var { service } = setupService(repo);
      repo.setData([{ id: 'p1', name: 'Jan', type: 'debtor', debts: [], repayments: [] }]);

      await service.remove('p1');
      assert.strictEqual(repo.calls.filter(function(c) { return c.method === 'remove'; }).length, 1);
    });
  });
});
