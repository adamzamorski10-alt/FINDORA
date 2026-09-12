/**
 * Stage 1.4+ — Recurring Service
 *
 * Bridge between application state and RecurringRuleRepository.
 */

(function() {
  'use strict';

  function create(recurringRuleRepository, transactionService) {
    var recurringRepo = recurringRuleRepository;
    var txService = transactionService;

    function getAll() {
      return recurringRepo.loadAll();
    }

    function getActive() {
      return recurringRepo.findActive();
    }

    function isDue(rule) {
      var today = new Date().toISOString().split('T')[0];
      var nextDate = computeNextDate(rule);
      return nextDate <= today;
    }

  function computeNextDate(rule) {
    var today = new Date();
    var baseDate = rule.lastBooked ? new Date(rule.lastBooked) : new Date(rule.startDate);

    if (rule.frequency === 'monthly') {
      var targetDay = rule.dayOfMonth || 1;
      var date = new Date(baseDate.getFullYear(), baseDate.getMonth(), targetDay);
      if (date <= baseDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date.toISOString().split('T')[0];
    }

    if (rule.frequency === 'weekly') {
      var next = new Date(baseDate);
      next.setDate(next.getDate() + 7);
      while (next < today) {
        next.setDate(next.getDate() + 7);
      }
      return next.toISOString().split('T')[0];
    }

    if (rule.frequency === 'yearly') {
      var start = new Date(rule.startDate);
      var next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
      if (next < today) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next.toISOString().split('T')[0];
    }

    return null;
  }

    function getDueThisMonth(monthKey) {
      return recurringRepo.findActive().then(function(activeRules) {
        var due = [];
        for (var i = 0; i < activeRules.length; i++) {
          var rule = activeRules[i];
          var nextDate = computeNextDate(rule);
          if (nextDate && nextDate.indexOf(monthKey) === 0) {
            due.push(rule);
          }
        }
        return due;
      });
    }

    function book(ruleId) {
      return recurringRepo.findById(ruleId).then(function(rule) {
        if (!rule) {
          return Promise.reject(new Error('Recurring rule not found: ' + ruleId));
        }
        if (!isDue(rule)) {
          return Promise.reject(new Error('Recurring rule is not due: ' + ruleId));
        }
        var today = new Date().toISOString().split('T')[0];
        return txService.add({
          amount: rule.amount,
          type: rule.type,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          description: rule.description,
          date: today,
          tags: ['recurring'],
          metadata: { recurringRuleId: rule.id }
        }).then(function(tx) {
          return recurringRepo.updateLastBooked(ruleId, today).then(function() {
            return tx;
          });
        });
      });
    }

    function bookAllDue() {
      return getActive().then(function(activeRules) {
        var booked = [];
        var promises = [];
        for (var i = 0; i < activeRules.length; i++) {
          promises.push(
            book(activeRules[i].id).then(function(tx) {
              booked.push(tx);
            }).catch(function(err) {
              console.warn('Failed to book rule: ' + err.message);
            })
          );
        }
        return Promise.all(promises).then(function() {
          return booked;
        });
      });
    }

    function add(inputs) {
      var id = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var now = new Date().toISOString();
      var rule = {
        id: id,
        userId: inputs.userId || null,
        name: inputs.name,
        type: inputs.type || 'expense',
        amount: inputs.amount,
        categoryId: inputs.categoryId || null,
        accountId: inputs.accountId,
        description: typeof inputs.description === 'string' ? inputs.description : '',
        frequency: inputs.frequency || 'monthly',
        dayOfMonth: inputs.dayOfMonth || null,
        startDate: inputs.startDate,
        active: true,
        lastBooked: null,
        createdAt: now,
        updatedAt: now
      };
      return recurringRepo.save(rule);
    }

    function update(id, updates) {
      return recurringRepo.findById(id).then(function(existing) {
        if (!existing) {
          return Promise.reject(new Error('Recurring rule not found: ' + id));
        }
        return recurringRepo.save({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      });
    }

    function remove(id) {
      return recurringRepo.remove(id);
    }

    return {
      getAll: getAll,
      getActive: getActive,
      isDue: isDue,
      computeNextDate: computeNextDate,
      getDueThisMonth: getDueThisMonth,
      book: book,
      bookAllDue: bookAllDue,
      add: add,
      update: update,
      remove: remove
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.RecurringService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
