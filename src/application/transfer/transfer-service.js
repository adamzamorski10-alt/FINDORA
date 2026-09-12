/**
 * Stage 1.4+ — Transfer Service
 *
 * Bridge between application state and TransferRepository.
 */

(function() {
  'use strict';

  function create(transferRepository, transactionService, accountRepository) {
    var transferRepo = transferRepository;
    var txService = transactionService;

    function getAll() {
      return transferRepo.loadAll();
    }

    function create(inputs) {
      var transferId = inputs.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      var today = new Date().toISOString().split('T')[0];

      return txService.add({
        amount: inputs.amount,
        type: 'expense',
        accountId: inputs.fromAccountId,
        description: 'Transfer: ' + (inputs.description || ''),
        date: today,
        tags: ['transfer'],
        metadata: { transferId: transferId }
      }).then(function(fromTx) {
        return txService.add({
          amount: inputs.amount,
          type: 'income',
          accountId: inputs.toAccountId,
          description: 'Transfer: ' + (inputs.description || ''),
          date: today,
          tags: ['transfer'],
          metadata: { transferId: transferId }
        }).then(function(toTx) {
          return transferRepo.save({
            id: transferId,
            userId: inputs.userId || null,
            fromAccountId: inputs.fromAccountId,
            toAccountId: inputs.toAccountId,
            amount: inputs.amount,
            description: typeof inputs.description === 'string' ? inputs.description : '',
            date: today,
            createdAt: today
          }).then(function(transfer) {
            return { transfer: transfer, fromTx: fromTx, toTx: toTx };
          });
        });
      });
    }

    function remove(id) {
      return transferRepo.remove(id);
    }

    return {
      getAll: getAll,
      create: create,
      remove: remove
    };
  }

  if (typeof window !== 'undefined' && window.document) {
    window.TransferService = { create: create };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { create: create };
  }
})();
