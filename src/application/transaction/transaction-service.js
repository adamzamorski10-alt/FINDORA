/**
 * Stage 1.4+ — Transaction Service
 *
 * Bridge between application state and TransactionRepository.
 *
 * This service delegates persistence to the repository and computation
 * to domain calculators. It does NOT manipulate the DOM, render UI,
 * call Firebase directly, or show toasts.
 */

(function() {
  'use strict';

  function create(repository) {
    var repo = repository;

    function getAll() {
      return repo.loadAll();
    }

    function getById(id) {
      return repo.findById(id);
    }

    function getByMonth(monthKey) {
      return repo.findByMonth(monthKey);
    }

    function add(inputs) {
      var id = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var now = new Date().toISOString();
      var transaction = {
        id: id,
        userId: inputs.userId || null,
        accountId: inputs.accountId,
        amount: inputs.amount,
        type: inputs.type,
        categoryId: inputs.categoryId || null,
        description: typeof inputs.description === 'string' ? inputs.description : '',
        date: inputs.date,
        tags: Array.isArray(inputs.tags) ? inputs.tags : [],
        notes: typeof inputs.notes === 'string' ? inputs.notes : '',
        metadata: inputs.metadata && typeof inputs.metadata === 'object' ? inputs.metadata : {},
        createdAt: now,
        updatedAt: now
      };
      return repo.save(transaction);
    }

    function remove(id) {
      return repo.remove(id);
    }

    function update(id, updates) {
      return repo.findById(id).then(function(existing) {
        if (!existing) {
          return Promise.reject(new Error('Transaction not found: ' + id));
        }
        var updated = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return repo.save(updated);
      });
    }

    function getMonthlyBreakdown(monthKey) {
      return getByMonth(monthKey).then(function(monthTx) {
        var expenseByCategory = {};
        var incomeByCategory = {};
        for (var i = 0; i < monthTx.length; i++) {
          var tx = monthTx[i];
          if (tx.type === 'expense') {
            expenseByCategory[tx.categoryId || 'uncategorized'] = (expenseByCategory[tx.categoryId || 'uncategorized'] || 0) + tx.amount;
          } else if (tx.type === 'income') {
            incomeByCategory[tx.categoryId || 'uncategorized'] = (incomeByCategory[tx.categoryId || 'uncategorized'] || 0) + tx.amount;
          }
        }
        return {
          expenseByCategory: expenseByCategory,
          incomeByCategory: incomeByCategory
        };
      });
    }

    return {
      getAll: getAll,
      getById: getById,
      getByMonth: getByMonth,
      add: add,
      remove: remove,
      update: update,
      getMonthlyBreakdown: getMonthlyBreakdown
    };
  }

  window.TransactionService = { create: create };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
