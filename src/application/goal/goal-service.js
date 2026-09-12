/**
 * Stage 1.4+ — Goal Service
 *
 * Bridge between application state and GoalRepository.
 */

(function() {
  'use strict';

  function create(goalRepository, incomeProfileBalanceCalculator) {
    var goalRepo = goalRepository;

    function getAll() {
      return goalRepo.loadAll();
    }

    function getById(id) {
      return goalRepo.findById(id);
    }

    function getEta(goalId) {
      return goalRepo.findById(goalId).then(function(goal) {
        if (!goal) {
          return Promise.reject(new Error('Goal not found: ' + goalId));
        }

        var monthlySavings = 0;
        if (typeof window !== 'undefined' && window.incomeSources) {
          for (var i = 0; i < window.incomeSources.length; i++) {
            monthlySavings += window.incomeSources[i]._profileMonthly || 0;
          }
        }

        var calculator = (typeof window !== 'undefined' && window.GoalEtaCalculator) ? window.GoalEtaCalculator : null;
        if (!calculator) {
          return {
            id: goal.id,
            name: goal.name,
            target: goal.target,
            current: goal.current,
            deadline: goal.deadline,
            monthlySavings: monthlySavings
          };
        }

        return calculator.compute({
          goal: goal,
          monthlySavings: monthlySavings
        });
      });
    }

    function getRequiredDepositsThisMonth(monthKey) {
      return goalRepo.loadAll().then(function(goals) {
        var total = 0;
        var calculator = (typeof window !== 'undefined' && window.GoalEtaCalculator) ? window.GoalEtaCalculator : null;
        for (var i = 0; i < goals.length; i++) {
          var goal = goals[i];
          if (!goal.deadline) continue;
          var monthlySavings = 0;
          if (typeof window !== 'undefined' && window.incomeSources) {
            for (var j = 0; j < window.incomeSources.length; j++) {
              monthlySavings += window.incomeSources[j]._profileMonthly || 0;
            }
          }
          if (calculator && monthlySavings > 0) {
            var eta = calculator.compute({ goal: goal, monthlySavings: monthlySavings });
            if (eta.monthsRemaining !== null) {
              total += eta.requiredMonthly || 0;
            }
          }
        }
        return total;
      });
    }

    function add(inputs) {
      var id = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var now = new Date().toISOString();
      var goal = {
        id: id,
        userId: inputs.userId || null,
        name: inputs.name,
        target: inputs.target,
        current: inputs.current || 0,
        deadline: inputs.deadline || null,
        icon: inputs.icon || '🎯',
        color: inputs.color || '#888888',
        createdAt: now,
        updatedAt: now
      };
      return goalRepo.save(goal);
    }

    function update(id, updates) {
      return goalRepo.findById(id).then(function(existing) {
        if (!existing) {
          return Promise.reject(new Error('Goal not found: ' + id));
        }
        return goalRepo.save({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      });
    }

    function remove(id) {
      return goalRepo.remove(id);
    }

    function updateProgress(id, newAmount) {
      return goalRepo.updateProgress(id, newAmount);
    }

    return {
      getAll: getAll,
      getById: getById,
      getEta: getEta,
      getRequiredDepositsThisMonth: getRequiredDepositsThisMonth,
      add: add,
      update: update,
      remove: remove,
      updateProgress: updateProgress
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.GoalService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
