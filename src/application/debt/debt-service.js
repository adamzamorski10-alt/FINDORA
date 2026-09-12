/**
 * Stage 1.4+ — Debt Service
 *
 * Bridge between application state and PersonRepository.
 */

(function() {
  'use strict';

  function create(personRepository, debtorRemainingCalculator, debtsTotalCalculator) {
    var personRepo = personRepository;

    function getAll() {
      return personRepo.loadAll();
    }

    function getByType(type) {
      return personRepo.findByType(type);
    }

    function getRemaining(personId) {
      return personRepo.findById(personId).then(function(person) {
        if (!person) {
          return Promise.reject(new Error('Person not found: ' + personId));
        }
        var calculator = window.DebtorRemainingCalculator;
        if (calculator) {
          return calculator.compute({ person: person });
        }
        var totalDebts = (person.debts || []).reduce(function(s, d) { return s + (d.amount || 0); }, 0);
        var totalRepaid = (person.repayments || []).reduce(function(s, r) { return s + (r.amount || 0); }, 0);
        return { remaining: totalDebts - totalRepaid, total: totalDebts, repaid: totalRepaid };
      });
    }

    function getTotal() {
      return personRepo.loadAll().then(function(people) {
        var calculator = window.DebtsTotalCalculator;
        if (calculator) {
          return calculator.compute({ people: people });
        }
        var total = 0;
        for (var i = 0; i < people.length; i++) {
          total += (people[i].debts || []).reduce(function(s, d) { return s + (d.amount || 0); }, 0);
        }
        return { total: total };
      });
    }

    function addRepayment(personId, amount, description) {
      return personRepo.findById(personId).then(function(person) {
        if (!person) {
          return Promise.reject(new Error('Person not found: ' + personId));
        }
        return personRepo.addRepayment(personId, { amount: amount, description: description });
      });
    }

    function addDebt(personId, amount, description) {
      return personRepo.findById(personId).then(function(person) {
        if (!person) {
          return Promise.reject(new Error('Person not found: ' + personId));
        }
        return personRepo.addDebt(personId, { amount: amount, description: description });
      });
    }

    function add(inputs) {
      var id = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var now = new Date().toISOString();
      var person = {
        id: id,
        userId: inputs.userId || null,
        name: inputs.name,
        type: inputs.type || 'debtor',
        balances: { total: 0, paid: 0, remaining: 0 },
        debts: [],
        repayments: [],
        createdAt: now,
        updatedAt: now
      };
      return personRepo.save(person);
    }

    function update(id, updates) {
      return personRepo.findById(id).then(function(existing) {
        if (!existing) {
          return Promise.reject(new Error('Person not found: ' + id));
        }
        return personRepo.save({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      });
    }

    function remove(id) {
      return personRepo.remove(id);
    }

    return {
      getAll: getAll,
      getByType: getByType,
      getRemaining: getRemaining,
      getTotal: getTotal,
      addRepayment: addRepayment,
      addDebt: addDebt,
      add: add,
      update: update,
      remove: remove
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.DebtService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
