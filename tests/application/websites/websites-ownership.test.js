import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebsitesModule } from '../../../src/application/websites/websites-module.js';

const USER='u1';
const OTHER='u2';
const PROFILE='ip1';

function createModule(overrides={}){
  const data={
    client:{id:'c1',userId:OTHER,incomeProfileId:PROFILE,name:'Foreign',archived:false},
    project:{id:'p1',userId:OTHER,incomeProfileId:PROFILE,clientId:'c1',name:'Foreign project',description:'',agreedValue:100,startDate:null,deadline:null,status:'lead',archived:false},
    payment:{id:'pay1',userId:OTHER,incomeProfileId:PROFILE,projectId:'p1',amount:100,date:'2026-10-01',description:'Foreign payment',status:'pending',accountId:'',linkedTransactionId:'',archived:false},
    cost:{id:'cost1',userId:OTHER,incomeProfileId:PROFILE,projectId:'p1',amount:50,category:'hosting',date:'2026-10-01',description:'Foreign cost',status:'unpaid',accountId:'',linkedTransactionId:'',archived:false},
    ...overrides
  };
  const saves={client:0,project:0,payment:0,cost:0};
  const repo=(key)=>({
    async findById(id){return data[key]?.id===id?data[key]:undefined;},
    async loadAll(){return data[key]?[data[key]]:[];},
    async save(value){saves[key]++;data[key]=value;},
  });
  const profileRepo={async findById(id){return id===PROFILE?{id:PROFILE,userId:USER,archived:false}:undefined;}};
  const appTx={async run(fn){return fn();}};
  const module=createWebsitesModule({
    userId:USER,
    websitesClientRepository:repo('client'),
    websitesProjectRepository:repo('project'),
    websitesPaymentRepository:repo('payment'),
    websitesCostRepository:repo('cost'),
    incomeProfileRepository:profileRepo,
    transactionRepository:{async findById(){return undefined;},async save(){throw new Error('unexpected');}},
    accountRepository:{async findById(){return undefined;}},
    applicationTransaction:appTx
  });
  return {module,saves};
}

test('rejects foreign client update without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.updateClient({clientId:'c1',updates:{name:'changed'}}),{message:'NOT_FOUND'});
  assert.equal(saves.client,0);
});

test('rejects foreign client archive without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.archiveClient({clientId:'c1'}),{message:'NOT_FOUND'});
  assert.equal(saves.client,0);
});

test('rejects foreign project update without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.updateProject({projectId:'p1',updates:{name:'changed'}}),{message:'NOT_FOUND'});
  assert.equal(saves.project,0);
});

test('rejects foreign project archive without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.archiveProject({projectId:'p1'}),{message:'NOT_FOUND'});
  assert.equal(saves.project,0);
});

test('rejects foreign payment update without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.updatePayment({paymentId:'pay1',updates:{description:'changed'}}),{message:'NOT_FOUND'});
  assert.equal(saves.payment,0);
});

test('rejects foreign payment archive without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.archivePayment({paymentId:'pay1'}),{message:'NOT_FOUND'});
  assert.equal(saves.payment,0);
});

test('rejects foreign cost update without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.updateCost({costId:'cost1',updates:{description:'changed'}}),{message:'NOT_FOUND'});
  assert.equal(saves.cost,0);
});

test('rejects foreign cost archive without mutation',async()=>{
  const {module,saves}=createModule();
  await assert.rejects(module.archiveCost({costId:'cost1'}),{message:'NOT_FOUND'});
  assert.equal(saves.cost,0);
});
