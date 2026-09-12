/**
 * Stage 1.4+ — Transaction Service tests.
 *
 * Uses Node.js built-in test runner: node:test
 * Run with: node tests/application/transaction-service.test.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceCode = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'application', 'transaction', 'transaction-service.js'), 'utf8');

function createMockRepository() {
  var calls = [];
  var data = {};

  function loadAll() {
    calls.push({ method: 'loadAll' });
    return Promise.resolve(data.all || []);
  }

  function findById(id) {
    calls.push({ method: 'findById', id: id });
    var found = (data.all || []).find(function(t) { return t.id === id; });
    return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
  }

  function findByMonth(monthKey) {
    calls.push({ method: 'findByMonth', monthKey: monthKey });
    var all = data.all || [];
    return Promise.resolve(all.filter(function(t) { return t.date && t.date.indexOf(monthKey) === 0; }));
  }

  function save(transaction) {
    calls.push({ method: 'save', transaction: JSON.parse(JSON.stringify(transaction)) });
    if (!data.all) data.all = [];
    var index = data.all.findIndex(function(t) { return t.id === transaction.id; });
    if (index >= 0) {
      data.all[index] = transaction;
    } else {
      data.all.push(transaction);
    }
    return Promise.resolve(JSON.parse(JSON.stringify(transaction)));
  }

  function remove(id) {
    calls.push({ method: 'remove', id: id });
    data.all = (data.all || []).filter(function(t) { return t.id !== id; });
    return Promise.resolve();
  }

  return {
    loadAll: loadAll,
    findById: findById,
    findByMonth: findByMonth,
    save: save,
    remove: remove,
    calls: calls,
    setData: function(all) { data.all = all; },
    reset: function() { data = {}; calls = []; }
  };
}

function setupService(mockRepo) {
  var window = {
    TransactionService: null,
  };

  var script = new Function('window', 'mockRepository', serviceCode + '\nwindow.TransactionService = window.TransactionService.create(mockRepository);');
  script(window, mockRepo);

  return window;
}

describe('TransactionService', () => {
  describe('getAll()', () => {
    it('returns all transactions from repository', async () => {
      var mock = createMockRepository();
      mock.setData([
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} },
        { id: 'tx-2', amount: 50, type: 'expense', accountId: 'acc-1', date: '2026-09-02', tags: [], notes: '', metadata: {} }
      ]);
      var window = setupService(mock);

      var result = await window.TransactionService.getAll();
      assert.strictEqual(result.length, 2);
    });
  });

  describe('getById()', () => {
    it('returns transaction when found', async () => {
      var mock = createMockRepository();
      mock.setData([
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ]);
      var window = setupService(mock);

      var result = await window.TransactionService.getById('tx-1');
      assert.ok(result);
      assert.strictEqual(result.id, 'tx-1');
    });

    it('returns null when not found', async () => {
      var mock = createMockRepository();
      mock.setData([]);
      var window = setupService(mock);

      var result = await window.TransactionService.getById('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('getByMonth()', () => {
    it('filters transactions by month', async () => {
      var mock = createMockRepository();
      mock.setData([
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} },
        { id: 'tx-2', amount: 50, type: 'expense', accountId: 'acc-1', date: '2026-08-01', tags: [], notes: '', metadata: {} }
      ]);
      var window = setupService(mock);

      var result = await window.TransactionService.getByMonth('2026-09');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'tx-1');
    });
  });

  describe('add()', () => {
    it('creates transaction with generated id', async () => {
      var mock = createMockRepository();
      mock.setData([]);
      var window = setupService(mock);

      var result = await window.TransactionService.add({
        amount: 100,
        type: 'income',
        accountId: 'acc-1',
        date: '2026-09-01',
        tags: [],
        notes: '',
        metadata: {}
      });

      assert.ok(result.id);
      assert.strictEqual(result.amount, 100);
    });

    it('uses provided id', async () => {
      var mock = createMockRepository();
      mock.setData([]);
      var window = setupService(mock);

      var result = await window.TransactionService.add({
        id: 'tx-custom',
        amount: 100,
        type: 'income',
        accountId: 'acc-1',
        date: '2026-09-01'
      });

      assert.strictEqual(result.id, 'tx-custom');
    });
  });

  describe('remove()', () => {
    it('removes transaction by id', async () => {
      var mock = createMockRepository();
      mock.setData([
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ]);
      var window = setupService(mock);

      await window.TransactionService.remove('tx-1');

      var removeCall = mock.calls.find(function(c) { return c.method === 'remove'; });
      assert.ok(removeCall);
      assert.strictEqual(removeCall.id, 'tx-1');
    });
  });

  describe('update()', () => {
    it('updates existing transaction', async () => {
      var mock = createMockRepository();
      mock.setData([
        { id: 'tx-1', amount: 100, type: 'income', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} }
      ]);
      var window = setupService(mock);

      var result = await window.TransactionService.update('tx-1', { amount: 200 });
      assert.strictEqual(result.amount, 200);
    });

    it('throws on nonexistent transaction', async () => {
      var mock = createMockRepository();
      mock.setData([]);
      var window = setupService(mock);

      await assert.rejects(
        function() { return window.TransactionService.update('nonexistent', { amount: 200 }); },
        /Transaction not found/
      );
    });
  });

  describe('getMonthlyBreakdown()', () => {
    it('computes expense and income by category', async () => {
      var mock = createMockRepository();
      mock.setData([
        { id: 'tx-1', amount: 100, type: 'expense', categoryId: 'cat-food', accountId: 'acc-1', date: '2026-09-01', tags: [], notes: '', metadata: {} },
        { id: 'tx-2', amount: 200, type: 'expense', categoryId: 'cat-food', accountId: 'acc-1', date: '2026-09-02', tags: [], notes: '', metadata: {} },
        { id: 'tx-3', amount: 500, type: 'income', categoryId: 'cat-salary', accountId: 'acc-1', date: '2026-09-03', tags: [], notes: '', metadata: {} }
      ]);
      var window = setupService(mock);

      var result = await window.TransactionService.getMonthlyBreakdown('2026-09');
      assert.strictEqual(result.expenseByCategory['cat-food'], 300);
      assert.strictEqual(result.incomeByCategory['cat-salary'], 500);
    });
  });
});
