import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWebsitesModule } from '../../../src/application/websites/websites-module.js';
import { WebsitesClientRepository } from '../../../src/infrastructure/repositories/websites-client-repository.js';
import { WebsitesProjectRepository } from '../../../src/infrastructure/repositories/websites-project-repository.js';
import { IncomeProfileRepository } from '../../../src/infrastructure/repositories/income-profile-repository.js';
import { InMemoryStorageAdapter } from '../../../src/infrastructure/storage/memory-storage-adapter.js';
import { ApplicationTransaction } from '../../../src/infrastructure/storage/application-transaction.js';
import { WebsitesPaymentRepository } from '../../../src/infrastructure/repositories/websites-payment-repository.js';
import { AccountRepository } from '../../../src/infrastructure/repositories/account-repository.js';
import { TransactionRepository } from '../../../src/infrastructure/repositories/transaction-repository.js';

describe('WebsitesModule',()=>{
 function createModule(){const storage=new InMemoryStorageAdapter();const keys=()=>storage.keys();const profileRepo=new IncomeProfileRepository(storage,'u1',keys);const clientRepo=new WebsitesClientRepository(storage,'u1',keys);const projectRepo=new WebsitesProjectRepository(storage,'u1',keys);const paymentRepo=new WebsitesPaymentRepository(storage,'u1',keys);const accountRepo=new AccountRepository(storage,'u1',keys);const txRepo=new TransactionRepository(storage,'u1',keys);const module=createWebsitesModule({websitesClientRepository:clientRepo,websitesProjectRepository:projectRepo,websitesPaymentRepository:paymentRepo,incomeProfileRepository:profileRepo,transactionRepository:txRepo,accountRepository:accountRepo,applicationTransaction:new ApplicationTransaction(storage)});return {module,profileRepo};}
 async function seed(){const x=createModule();await x.profileRepo.save({id:'w1',userId:'u1',type:'websites',name:'Freelance',description:'',archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});return x;}
 it('creates clients and projects only inside an active websites profile',async()=>{const {module}=await seed();const client=await module.createClient({userId:'u1',incomeProfileId:'w1',name:'ACME'});const project=await module.createProject({userId:'u1',incomeProfileId:'w1',clientId:client.id,name:'Company Website',agreedValue:2500});assert.equal(project.clientId,client.id);assert.equal((await module.listProjects({userId:'u1',incomeProfileId:'w1'})).length,1);});
 it('rejects projects linked to a missing client',async()=>{const {module}=await seed();await assert.rejects(module.createProject({userId:'u1',incomeProfileId:'w1',clientId:'missing',name:'Broken'}),/NOT_FOUND/);});
 it('rejects archived profiles',async()=>{const {module,profileRepo}=await seed();const p=await profileRepo.findById('w1');p.archived=true;await profileRepo.save(p);await assert.rejects(module.createClient({userId:'u1',incomeProfileId:'w1',name:'ACME'}),/ARCHIVED_ENTITY/);});
 it('does not expose archived clients or projects',async()=>{const {module}=await seed();const c=await module.createClient({userId:'u1',incomeProfileId:'w1',name:'ACME'});const p=await module.createProject({userId:'u1',incomeProfileId:'w1',clientId:c.id,name:'Site'});await module.archiveClient({clientId:c.id});await module.archiveProject({projectId:p.id});assert.equal((await module.listClients({userId:'u1',incomeProfileId:'w1'})).length,0);assert.equal((await module.listProjects({userId:'u1',incomeProfileId:'w1'})).length,0);});
});
