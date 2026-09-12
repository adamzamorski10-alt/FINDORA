/**
 * Stage 1.4+ — Service Factory
 *
 * Wires repositories to services with dependency injection.
 * All exports attached to `window` for backward compatibility.
 */

(function() {
  'use strict';

  function create(storageAdapter, userId) {
    var adapter = storageAdapter;
    var currentUserId = userId;
    var repos = {};
    var services = {};

    function getRepository(name) {
      if (!repos[name]) {
        var RepoClass;
        switch (name) {
          case 'transaction':
            RepoClass = window.TransactionRepository;
            break;
          case 'account':
            RepoClass = window.AccountRepository;
            break;
          case 'category':
            RepoClass = window.CategoryRepository;
            break;
          case 'budget':
            RepoClass = window.BudgetRepository;
            break;
          case 'goal':
            RepoClass = window.GoalRepository;
            break;
          case 'recurringRule':
            RepoClass = window.RecurringRuleRepository;
            break;
          case 'transfer':
            RepoClass = window.TransferRepository;
            break;
          case 'savingsRule':
            RepoClass = window.SavingsRuleRepository;
            break;
          case 'person':
            RepoClass = window.PersonRepository;
            break;
          default:
            throw new Error('Unknown repository: ' + name);
        }
        if (typeof RepoClass.create === 'function') {
          repos[name] = RepoClass.create(adapter, currentUserId);
        } else {
          repos[name] = new RepoClass(adapter, currentUserId);
        }
      }
      return repos[name];
    }

    function getTransactionService() {
      if (!services.transaction) {
        if (typeof window.TransactionService !== 'undefined' && window.TransactionService.create) {
          services.transaction = window.TransactionService.create(getRepository('transaction'));
        } else if (typeof window.TransactionServiceForCurrentState === 'function') {
          services.transaction = { computeForCurrentState: window.TransactionServiceForCurrentState };
        }
      }
      return services.transaction;
    }

    function getBudgetService() {
      if (!services.budget) {
        if (typeof window.BudgetService !== 'undefined' && window.BudgetService.create) {
          services.budget = window.BudgetService.create(getRepository('budget'), getRepository('transaction'));
        }
      }
      return services.budget;
    }

    function getGoalService() {
      if (!services.goal) {
        if (typeof window.GoalService !== 'undefined' && window.GoalService.create) {
          services.goal = window.GoalService.create(getRepository('goal'));
        }
      }
      return services.goal;
    }

    function getRecurringService() {
      if (!services.recurring) {
        if (typeof window.RecurringService !== 'undefined' && window.RecurringService.create) {
          services.recurring = window.RecurringService.create(getRepository('recurringRule'), getTransactionService());
        }
      }
      return services.recurring;
    }

    function getSavingsService() {
      if (!services.savings) {
        if (typeof window.SavingsService !== 'undefined' && window.SavingsService.create) {
          services.savings = window.SavingsService.create(getRepository('savingsRule'), getRepository('goal'), getTransactionService());
        }
      }
      return services.savings;
    }

    function getDebtService() {
      if (!services.debt) {
        if (typeof window.DebtService !== 'undefined' && window.DebtService.create) {
          services.debt = window.DebtService.create(getRepository('person'));
        }
      }
      return services.debt;
    }

    function getTransferService() {
      if (!services.transfer) {
        if (typeof window.TransferService !== 'undefined' && window.TransferService.create) {
          services.transfer = window.TransferService.create(getRepository('transfer'), getTransactionService());
        }
      }
      return services.transfer;
    }

    function getReportingService() {
      if (!services.reporting) {
        if (typeof window.ReportingService !== 'undefined' && window.ReportingService.create) {
          services.reporting = window.ReportingService.create(getRepository('transaction'), getRepository('account'));
        }
      }
      return services.reporting;
    }

    window.ServiceFactory = {
      create: create,
      getTransactionService: getTransactionService,
      getBudgetService: getBudgetService,
      getGoalService: getGoalService,
      getRecurringService: getRecurringService,
      getSavingsService: getSavingsService,
      getDebtService: getDebtService,
      getTransferService: getTransferService,
      getReportingService: getReportingService
    };

    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { create: create };
    }
  })();
