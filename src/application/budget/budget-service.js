/**
 * Stage 1.4+ — Budget Service
 *
 * Bridge between application state and BudgetRepository.
 */

(function() {
  'use strict';

  function create(budgetRepository, transactionRepository) {
    var budgetRepo = budgetRepository;
    var txRepo = transactionRepository;

    function getAll() {
      return budgetRepo.loadAll();
    }

    function getById(id) {
      return budgetRepo.findById(id);
    }

    function getByCategory(categoryId) {
      return budgetRepo.findByCategory(categoryId);
    }

    function getProgress(budgetId, monthKey) {
      return budgetRepo.findById(budgetId).then(function(budget) {
        if (!budget) {
          return Promise.reject(new Error('Budget not found: ' + budgetId));
        }
        return txRepo.findByMonth(monthKey).then(function(monthTx) {
          var spent = 0;
          for (var i = 0; i < monthTx.length; i++) {
            if (monthTx[i].type === 'expense' && monthTx[i].categoryId === budget.categoryId) {
              spent += monthTx[i].amount;
            }
          }
          return {
            id: budget.id,
            categoryId: budget.categoryId,
            limit: budget.limit,
            spent: spent,
            remaining: budget.limit - spent,
            overBudget: spent > budget.limit
          };
        });
      });
    }

    function add(inputs) {
      var id = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var now = new Date().toISOString();
      var budget = {
        id: id,
        userId: inputs.userId || null,
        categoryId: inputs.categoryId,
        limit: inputs.limit,
        period: inputs.period || 'monthly',
        createdAt: now,
        updatedAt: now
      };
      return budgetRepo.save(budget);
    }

    function update(id, updates) {
      return budgetRepo.findById(id).then(function(existing) {
        if (!existing) {
          return Promise.reject(new Error('Budget not found: ' + id));
        }
        return budgetRepo.save({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      });
    }

    function remove(id) {
      return budgetRepo.remove(id);
    }

    return {
      getAll: getAll,
      getById: getById,
      getByCategory: getByCategory,
      getProgress: getProgress,
      add: add,
      update: update,
      remove: remove
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.BudgetService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
