/**
 * Stage 1.4+ — Transfer Service tests.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function createMockTransferRepository() {
  var data = [];
  var calls = [];

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.slice());
  }

  function findById(id) {
    calls.push({ method: 'findById', id });
    var found = data.find(function(t) { return t.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function save(transfer) {
    calls.push({ method: 'save', transfer: JSON.parse(JSON.stringify(transfer)) });
    data.push(transfer);
    return Promise.resolve(JSON.parse(JSON.stringify(transfer)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id });
    data = data.filter(function(t) { return t.id !== id; });
    return Promise.resolve();
  }

  return { loadAll: loadAll, findById: findById, save: save, remove: remove, calls: calls, setData: function(d) { data = d; } };
}

function createMockTransactionService() {
  var data = [];
  var calls = [];

  function add(tx) {
    calls.push({ method: 'add', tx: JSON.parse(JSON.stringify(tx)) });
    var saved = { ...tx, id: tx.id || 'tx-' + Date.now() };
    data.push(saved);
    return Promise.resolve(saved);
  }

  return { add: add, calls: calls, setData: function(d) { data = d; } };
}

function setupService(transferRepo, txService) {
  var window = { TransferService: null };
  var TransferService = require('../../src/application/transfer/transfer-service.js');
  window.TransferService = { create: TransferService.create };
  var service = window.TransferService.create(transferRepo, txService);
  return { service: service, window: window };
}

describe('TransferService', () => {
  describe('getAll()', () => {
    it('returns all transfers', async () => {
      var transferRepo = createMockTransferRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(transferRepo, txService);
      transferRepo.setData([{ id: 'tr-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, date: '2026-09-01' }]);

      var result = await service.getAll();
      assert.strictEqual(result.length, 1);
    });
  });

  describe('create()', () => {
    it('creates transfer with paired transactions', async () => {
      var transferRepo = createMockTransferRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(transferRepo, txService);

      var result = await service.create({ fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, description: 'Przelew' });
      assert.ok(result.transfer);
      assert.ok(result.fromTx);
      assert.ok(result.toTx);
      assert.strictEqual(result.transfer.amount, 100);
      assert.strictEqual(result.fromTx.type, 'expense');
      assert.strictEqual(result.toTx.type, 'income');
    });
  });

  describe('remove()', () => {
    it('removes transfer', async () => {
      var transferRepo = createMockTransferRepository();
      var txService = createMockTransactionService();
      var { service } = setupService(transferRepo, txService);
      transferRepo.setData([{ id: 'tr-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100, date: '2026-09-01' }]);

      await service.remove('tr-1');
      assert.strictEqual(transferRepo.calls.filter(function(c) { return c.method === 'remove'; }).length, 1);
    });
  });
});
