/**
 * Stage 1.4+ — Reporting Service
 *
 * Bridge between application state and reporting calculators.
 */

(function() {
  'use strict';

  function create(transactionRepository, accountRepository) {
    var txRepo = transactionRepository;

    function getMonthlySummary(monthKey) {
      return txRepo.loadAll().then(function(transactions) {
        var monthTx = [];
        for (var i = 0; i < transactions.length; i++) {
          var tx = transactions[i];
          if (tx.date && tx.date.indexOf(monthKey) === 0 && !(tx.metadata && tx.metadata.excluded)) {
            monthTx.push(tx);
          }
        }

        var income = 0;
        var expense = 0;
        var expenseByCategory = {};
        var incomeByCategory = {};

        for (var i = 0; i < monthTx.length; i++) {
          var tx = monthTx[i];
          if (tx.type === 'income') {
            income += tx.amount;
            var ic = tx.categoryId || 'uncategorized';
            incomeByCategory[ic] = (incomeByCategory[ic] || 0) + tx.amount;
          } else if (tx.type === 'expense') {
            expense += tx.amount;
            var ec = tx.categoryId || 'uncategorized';
            expenseByCategory[ec] = (expenseByCategory[ec] || 0) + tx.amount;
          }
        }

        return {
          monthKey: monthKey,
          income: income,
          expense: expense,
          net: income - expense,
          byCategory: {
            expense: expenseByCategory,
            income: incomeByCategory
          }
        };
      });
    }

    function getWealthTrend(monthKeys) {
      return txRepo.loadAll().then(function(transactions) {
        var calculator = (typeof window !== 'undefined' && window.WealthMonthTransactionStatsCalculator) ? window.WealthMonthTransactionStatsCalculator : null;
        var trend = [];
        for (var i = 0; i < monthKeys.length; i++) {
          var mk = monthKeys[i];
          if (calculator) {
            var result = calculator.compute({ transactions: transactions, monthKey: mk });
            trend.push({ monthKey: mk, ...result });
          } else {
            var monthTx = transactions.filter(function(t) { return t.date && t.date.indexOf(mk) === 0 && !(t.metadata && t.metadata.excluded); });
            var inc = monthTx.filter(function(t) { return t.type === 'income'; }).reduce(function(s, t) { return s + t.amount; }, 0);
            var exp = monthTx.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + t.amount; }, 0);
            trend.push({ monthKey: mk, income: inc, expense: exp, net: inc - exp });
          }
        }
        return trend;
      });
    }

    function getCategoryTrend(categoryId, monthKeys) {
      return txRepo.loadAll().then(function(transactions) {
        var trend = [];
        for (var i = 0; i < monthKeys.length; i++) {
          var mk = monthKeys[i];
          var monthTx = transactions.filter(function(t) { return t.date && t.date.indexOf(mk) === 0 && !(t.metadata && t.metadata.excluded); });
          var amount = monthTx
            .filter(function(t) { return t.categoryId === categoryId; })
            .reduce(function(s, t) { return s + (t.type === 'expense' ? -t.amount : t.amount); }, 0);
          trend.push({ monthKey: mk, amount: amount });
        }
        return trend;
      });
    }

    return {
      getMonthlySummary: getMonthlySummary,
      getWealthTrend: getWealthTrend,
      getCategoryTrend: getCategoryTrend
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.ReportingService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
