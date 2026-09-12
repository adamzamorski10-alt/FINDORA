/**
 * Stage 1.4+ — Savings Service
 *
 * Bridge between application state and SavingsRuleRepository.
 */

(function() {
  'use strict';

  function create(savingsRuleRepository, goalRepository, transactionService) {
    var savingsRepo = savingsRuleRepository;
    var goalRepo = goalRepository;
    var txService = transactionService;

    function getAll() {
      return savingsRepo.loadAll();
    }

    function getActive() {
      return savingsRepo.findActive();
    }

    function getBySource(sourceId) {
      return savingsRepo.findBySource(sourceId);
    }

    function applyRules(incomeAmount, sourceId, date) {
      return savingsRepo.findBySource(sourceId).then(function(rules) {
        var activeRules = rules.filter(function(r) { return r.active; });
        var totalPercentage = activeRules.reduce(function(sum, r) { return sum + r.percentage; }, 0);
        if (totalPercentage > 100) {
          return Promise.reject(new Error('Total savings percentage exceeds 100%'));
        }

        var transactions = [];
        var promises = [];
        for (var i = 0; i < activeRules.length; i++) {
          var rule = activeRules[i];
          var amount = Math.round(incomeAmount * rule.percentage / 100);
          if (amount <= 0) continue;

          promises.push(
            txService.add({
              amount: amount,
              type: 'expense',
              accountId: sourceId,
              description: 'Auto-save: ' + (rule.label || rule.id),
              date: date,
              tags: ['autosave'],
              metadata: { savingsRuleId: rule.id, destinationGoalId: rule.destinationGoalId }
            }).then(function(tx) {
              transactions.push(tx);
              return goalRepo.findById(rule.destinationGoalId);
            }).then(function(goal) {
              if (goal) {
                return goalRepo.updateProgress(goal.id, goal.current + amount);
              }
            })
          );
        }
        return Promise.all(promises).then(function() {
          return transactions;
        });
      });
    }

    function add(inputs) {
      var id = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var now = new Date().toISOString();
      var rule = {
        id: id,
        userId: inputs.userId || null,
        sourceId: inputs.sourceId,
        percentage: inputs.percentage,
        destinationGoalId: inputs.destinationGoalId,
        label: typeof inputs.label === 'string' ? inputs.label : '',
        active: true,
        createdAt: now,
        updatedAt: now
      };
      return savingsRepo.save(rule);
    }

    function update(id, updates) {
      return savingsRepo.findById(id).then(function(existing) {
        if (!existing) {
          return Promise.reject(new Error('Savings rule not found: ' + id));
        }
        return savingsRepo.save({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      });
    }

    function remove(id) {
      return savingsRepo.remove(id);
    }

    return {
      getAll: getAll,
      getActive: getActive,
      getBySource: getBySource,
      applyRules: applyRules,
      add: add,
      update: update,
      remove: remove
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.SavingsService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
