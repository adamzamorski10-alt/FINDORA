import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResellingModule } from '../../../src/application/reselling/reselling-module.js';
import { ResellingProductRepository } from '../../../src/infrastructure/repositories/reselling-product-repository.js';
import { ResellingOrderRepository } from '../../../src/infrastructure/repositories/reselling-order-repository.js';
import { ResellingSaleRepository } from '../../../src/infrastructure/repositories/reselling-sale-repository.js';
import { ResellingCostRepository } from '../../../src/infrastructure/repositories/reselling-cost-repository.js';
import { ResellingTaskRepository } from '../../../src/infrastructure/repositories/reselling-task-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';

async function createModule() {
  const storage = new InMemoryStorageAdapter();
  await storage.init();
  const userId = 'user-1';
  const productRepo = new ResellingProductRepository(storage, userId, () => storage.keys());
  const orderRepo = new ResellingOrderRepository(storage, userId, () => storage.keys());
  const saleRepo = new ResellingSaleRepository(storage, userId, () => storage.keys());
  const costRepo = new ResellingCostRepository(storage, userId, () => storage.keys());
  const taskRepo = new ResellingTaskRepository(storage, userId, () => storage.keys());
  const txRepo = new TransactionRepository(storage, userId, () => storage.keys());
  const accountRepo = new AccountRepository(storage, userId, () => storage.keys());
  const applicationTransaction = new ApplicationTransaction(storage);
  const module = createResellingModule({
    resellingProductRepository: productRepo,
    resellingOrderRepository: orderRepo,
    resellingSaleRepository: saleRepo,
    resellingCostRepository: costRepo,
    resellingTaskRepository: taskRepo,
    transactionRepository: txRepo,
    accountRepository: accountRepo,
    applicationTransaction,
  });
  return { module, saleRepo, txRepo, accountRepo };
}

async function addAccount(accountRepo, id, userId = 'user-1', archived = false) {
  await accountRepo.save({
    id, userId, name: id, type: 'bank', icon: 'landmark', color: '#0000FF',
    archived, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
}

function saleInput(overrides = {}) {
  return {
    userId: 'user-1',
    incomeProfileId: 'ip-1',
    productId: 'product-1',
    quantity: 1,
    salePrice: 100,
    platform: 'Vinted',
    commission: 5,
    shipping: 2,
    otherCosts: 1,
    saleDate: '2024-09-15',
    paymentStatus: 'pending',
    ...overrides,
  };
}

describe('Reselling Sale Financial Integration', () => {
  it('creates exactly one income transaction for a paid sale', async () => {
    const { module, txRepo, accountRepo } = await createModule();
    await addAccount(accountRepo, 'acc-1');

    const sale = await module.createSale(saleInput({ paymentStatus: 'paid', accountId: 'acc-1' }));
    const tx = (await txRepo.loadAll()).filter(t => t.metadata?.resellingSaleId === sale.id);

    assert.ok(sale.linkedTransactionId);
    assert.equal(tx.length, 1);
    assert.equal(tx[0].type, 'income');
    assert.equal(tx[0].amount, 100);
    assert.equal(tx[0].accountId, 'acc-1');
  });

  it('does not create a transaction for an unpaid sale', async () => {
    const { module, txRepo } = await createModule();
    const sale = await module.createSale(saleInput());
    assert.equal(sale.linkedTransactionId, '');
    assert.equal((await txRepo.loadAll()).length, 0);
  });

  it('rejects a paid sale without an account', async () => {
    const { module } = await createModule();
    await assert.rejects(
      module.createSale(saleInput({ paymentStatus: 'paid' })),
      { message: 'VALIDATION_FAILED' }
    );
  });

  it('rejects a paid sale using another user account', async () => {
    const { module, accountRepo } = await createModule();
    await addAccount(accountRepo, 'foreign', 'user-2');
    await assert.rejects(
      module.createSale(saleInput({ paymentStatus: 'paid', accountId: 'foreign' })),
      { message: 'NOT_FOUND' }
    );
  });

  it('creates the transaction on pending to paid and does not duplicate on unchanged update', async () => {
    const { module, txRepo, accountRepo } = await createModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale(saleInput());
    const paid = await module.updateSale({ saleId: sale.id, updates: { paymentStatus: 'paid', accountId: 'acc-1' } });
    assert.ok(paid.linkedTransactionId);

    await module.updateSale({ saleId: sale.id, updates: { paymentStatus: 'paid', accountId: 'acc-1' } });
    const tx = (await txRepo.loadAll()).filter(t => t.metadata?.resellingSaleId === sale.id);
    assert.equal(tx.length, 1);
    assert.equal(tx[0].archived, false);
  });

  it('replaces the linked transaction when paid sale amount or account changes', async () => {
    const { module, txRepo, accountRepo } = await createModule();
    await addAccount(accountRepo, 'acc-1');
    await addAccount(accountRepo, 'acc-2');
    const sale = await module.createSale(saleInput({ paymentStatus: 'paid', accountId: 'acc-1' }));

    const updated = await module.updateSale({
      saleId: sale.id,
      updates: { salePrice: 120, accountId: 'acc-2' },
    });

    const tx = (await txRepo.loadAll()).filter(t => t.metadata?.resellingSaleId === sale.id);
    assert.equal(tx.length, 2);
    assert.equal(tx.filter(t => !t.archived).length, 1);
    assert.equal(tx.find(t => !t.archived).amount, 120);
    assert.equal(tx.find(t => !t.archived).accountId, 'acc-2');
    assert.equal(updated.linkedTransactionId, tx.find(t => !t.archived).id);
  });

  it('archives the linked transaction when a paid sale becomes unpaid', async () => {
    const { module, txRepo, accountRepo } = await createModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale(saleInput({ paymentStatus: 'paid', accountId: 'acc-1' }));
    const updated = await module.updateSale({ saleId: sale.id, updates: { paymentStatus: 'pending' } });

    const tx = (await txRepo.loadAll()).find(t => t.metadata?.resellingSaleId === sale.id);
    assert.equal(updated.linkedTransactionId, '');
    assert.equal(tx.archived, true);
  });

  it('archives the linked transaction when the sale is archived', async () => {
    const { module, txRepo, accountRepo } = await createModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale(saleInput({ paymentStatus: 'paid', accountId: 'acc-1' }));
    await module.archiveSale({ saleId: sale.id });

    const tx = (await txRepo.loadAll()).find(t => t.metadata?.resellingSaleId === sale.id);
    assert.equal(tx.archived, true);
  });

  it('does not auto-book commission, shipping, or otherCosts as separate ledger transactions', async () => {
    const { module, txRepo, accountRepo } = await createModule();
    await addAccount(accountRepo, 'acc-1');
    const sale = await module.createSale(saleInput({ paymentStatus: 'paid', accountId: 'acc-1' }));
    const tx = (await txRepo.loadAll()).filter(t => t.metadata?.resellingSaleId === sale.id);
    assert.equal(tx.length, 1);
    assert.equal(tx[0].amount, sale.salePrice);
  });
});
