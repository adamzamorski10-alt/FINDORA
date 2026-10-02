import { createWebsitesClient, validateWebsitesClientUpdate } from '../../domain/websites/websites-client-entity.js';
import { createWebsitesProject, validateWebsitesProjectUpdate } from '../../domain/websites/websites-project-entity.js';
import { createWebsitesPayment, validateWebsitesPaymentUpdate } from '../../domain/websites/websites-payment-entity.js';
import { createWebsitesCost, validateWebsitesCostUpdate } from '../../domain/websites/websites-cost-entity.js';
import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';


export function createWebsitesModule({ websitesClientRepository, websitesProjectRepository, websitesPaymentRepository, websitesCostRepository, incomeProfileRepository, transactionRepository, accountRepository, applicationTransaction } = {}) {
  const clientRepo=websitesClientRepository, projectRepo=websitesProjectRepository, paymentRepo=websitesPaymentRepository, costRepo=websitesCostRepository, profileRepo=incomeProfileRepository, txRepo=transactionRepository, accountRepo=accountRepository, appTx=applicationTransaction;
  async function assertProfile(userId,incomeProfileId){ const p=await profileRepo.findById(incomeProfileId); if(!p||p.userId!==userId)throw new Error('NOT_FOUND'); if(p.archived)throw new Error('ARCHIVED_ENTITY'); return p; }
  async function assertClient(userId,incomeProfileId,clientId){ const c=await clientRepo.findById(clientId); if(!c||c.userId!==userId||c.incomeProfileId!==incomeProfileId||c.archived)throw new Error('NOT_FOUND'); return c; }
  async function createClient(input){await assertProfile(input.userId,input.incomeProfileId);const c=createWebsitesClient(input);await appTx.run(()=>clientRepo.save(c));return c;}
  async function listClients({userId,incomeProfileId}={}){await assertProfile(userId,incomeProfileId);return (await clientRepo.loadAll()).filter(c=>c.userId===userId&&c.incomeProfileId===incomeProfileId&&!c.archived);}
  async function updateClient({clientId,updates}={}){const c=await clientRepo.findById(clientId);if(!c)throw new Error('NOT_FOUND');const u=validateWebsitesClientUpdate({existing:c,updates});await appTx.run(()=>clientRepo.save(u));return u;}
  async function archiveClient({clientId}={}){const c=await clientRepo.findById(clientId);if(!c)throw new Error('NOT_FOUND');if(c.archived)return c; c.archived=true;c.updatedAt=new Date().toISOString();await appTx.run(()=>clientRepo.save(c));return c;}
  async function createProject(input){await assertProfile(input.userId,input.incomeProfileId);await assertClient(input.userId,input.incomeProfileId,input.clientId);const p=createWebsitesProject(input);await appTx.run(()=>projectRepo.save(p));return p;}
  async function listProjects({userId,incomeProfileId}={}){await assertProfile(userId,incomeProfileId);return (await projectRepo.loadAll()).filter(p=>p.userId===userId&&p.incomeProfileId===incomeProfileId&&!p.archived);}
  async function updateProject({projectId,updates}={}){const p=await projectRepo.findById(projectId);if(!p)throw new Error('NOT_FOUND');const u=validateWebsitesProjectUpdate({existing:p,updates});await appTx.run(()=>projectRepo.save(u));return u;}
  async function archiveProject({projectId}={}){const p=await projectRepo.findById(projectId);if(!p)throw new Error('NOT_FOUND');if(p.archived)return p;p.archived=true;p.updatedAt=new Date().toISOString();await appTx.run(()=>projectRepo.save(p));return p;}

  async function createPayment(input){
    await assertProfile(input.userId,input.incomeProfileId);
    const project=await projectRepo.findById(input.projectId);
    if(!project||project.userId!==input.userId||project.incomeProfileId!==input.incomeProfileId||project.archived)throw new Error('NOT_FOUND');
    const payment=createWebsitesPayment(input);
    await appTx.run(async()=>{
      if(payment.status==='paid'){
        if(!payment.accountId)throw new Error('VALIDATION_FAILED');
        if(!txRepo||!accountRepo)throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');
        const account=await accountRepo.findById(payment.accountId);if(!account||account.userId!==input.userId)throw new Error('NOT_FOUND');if(account.archived)throw new Error('ARCHIVED_ENTITY');
      }
      await paymentRepo.save(payment);
      if(payment.status==='paid'){
        const tx={id:(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,9)),userId:input.userId,accountId:payment.accountId,amount:payment.amount,type:'income',categoryId:null,description:payment.description,date:payment.date,notes:'',metadata:{websitesPaymentId:payment.id},archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
        await txRepo.save(tx);payment.linkedTransactionId=tx.id;await paymentRepo.save(payment);
      }
    });return payment;
  }
  async function updatePayment({paymentId,updates}={}){
    const existing=await paymentRepo.findById(paymentId);if(!existing)throw new Error('NOT_FOUND');
    const updated=validateWebsitesPaymentUpdate({existing,updates});
    await appTx.run(async()=>{
      const oldPaid=existing.status==='paid', newPaid=updated.status==='paid';
      const changed=updated.amount!==existing.amount||updated.date!==existing.date||updated.description!==existing.description||updated.accountId!==existing.accountId;
      if(oldPaid&&!newPaid){if(existing.linkedTransactionId&&txRepo){const tx=await txRepo.findById(existing.linkedTransactionId);if(tx&&!tx.archived)await txRepo.save({...tx,archived:true,updatedAt:new Date().toISOString()});}updated.linkedTransactionId='';}
      else if(newPaid&&( !oldPaid||changed||!existing.linkedTransactionId )){
        if(!updated.accountId)throw new Error('VALIDATION_FAILED');if(!txRepo||!accountRepo)throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');const account=await accountRepo.findById(updated.accountId);if(!account||account.userId!==existing.userId)throw new Error('NOT_FOUND');if(account.archived)throw new Error('ARCHIVED_ENTITY');
        if(existing.linkedTransactionId){const tx=await txRepo.findById(existing.linkedTransactionId);if(tx&&!tx.archived)await txRepo.save({...tx,archived:true,updatedAt:new Date().toISOString()});}
        const tx={id:(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,9)),userId:existing.userId,accountId:updated.accountId,amount:updated.amount,type:'income',categoryId:null,description:updated.description,date:updated.date,notes:'',metadata:{websitesPaymentId:existing.id},archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await txRepo.save(tx);updated.linkedTransactionId=tx.id;
      }
      await paymentRepo.save(updated);
    });return updated;
  }
  async function archivePayment({paymentId}={}){const p=await paymentRepo.findById(paymentId);if(!p)throw new Error('NOT_FOUND');if(p.archived)return p;await appTx.run(async()=>{p.archived=true;p.updatedAt=new Date().toISOString();await paymentRepo.save(p);if(p.linkedTransactionId&&txRepo){const tx=await txRepo.findById(p.linkedTransactionId);if(tx&&!tx.archived)await txRepo.save({...tx,archived:true,updatedAt:new Date().toISOString()});}});return p;}
  async function getWebsitesAnalytics({userId,incomeProfileId,period}={}){await assertProfile(userId,incomeProfileId);let payments=(await paymentRepo.loadAll()).filter(p=>p.userId===userId&&p.incomeProfileId===incomeProfileId&&!p.archived);let costs=(await costRepo.loadAll()).filter(c=>c.userId===userId&&c.incomeProfileId===incomeProfileId&&!c.archived);if(period){if(!period.startDate||!period.endDate||period.startDate>period.endDate)throw new Error('VALIDATION_FAILED');payments=payments.filter(p=>p.date>=period.startDate&&p.date<=period.endDate);costs=costs.filter(c=>c.date>=period.startDate&&c.date<=period.endDate);}const revenue=payments.reduce((s,p)=>s+((p.status==='paid'||p.status==='pending')?p.amount:0),0);const realizedRevenue=payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);const operationalCost=costs.reduce((s,c)=>s+c.amount,0);return{totalRevenue:revenue,totalCost:operationalCost,totalNet:revenue-operationalCost,realizedRevenue,realizedCost:costs.filter(c=>c.status==='paid').reduce((s,c)=>s+c.amount,0),pendingRevenue:payments.reduce((s,p)=>s+(p.status==='pending'?p.amount:0),0),refundedRevenue:payments.reduce((s,p)=>s+(p.status==='refunded'?p.amount:0),0),paymentCount:payments.length,costCount:costs.length,period:period||null};}


  async function createCost(input){await assertProfile(input.userId,input.incomeProfileId);const project=await projectRepo.findById(input.projectId);if(!project||project.userId!==input.userId||project.incomeProfileId!==input.incomeProfileId||project.archived)throw new Error('NOT_FOUND');const cost=createWebsitesCost(input);await appTx.run(async()=>{if(cost.status==='paid'){if(!cost.accountId)throw new Error('VALIDATION_FAILED');if(!txRepo||!accountRepo)throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');const a=await accountRepo.findById(cost.accountId);if(!a||a.userId!==input.userId)throw new Error('NOT_FOUND');if(a.archived)throw new Error('ARCHIVED_ENTITY');}await costRepo.save(cost);if(cost.status==='paid'){const tx={id:(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,9)),userId:input.userId,accountId:cost.accountId,amount:cost.amount,type:'expense',categoryId:null,description:cost.description,date:cost.date,notes:'',metadata:{websitesCostId:cost.id},archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await txRepo.save(tx);cost.linkedTransactionId=tx.id;await costRepo.save(cost);}});return cost;}
  async function updateCost({costId,updates}={}){const existing=await costRepo.findById(costId);if(!existing)throw new Error('NOT_FOUND');const updated=validateWebsitesCostUpdate({existing,updates});await appTx.run(async()=>{const oldPaid=existing.status==='paid',newPaid=updated.status==='paid',changed=updated.amount!==existing.amount||updated.date!==existing.date||updated.description!==existing.description||updated.accountId!==existing.accountId;if(oldPaid&&!newPaid){if(existing.linkedTransactionId&&txRepo){const tx=await txRepo.findById(existing.linkedTransactionId);if(tx&&!tx.archived)await txRepo.save({...tx,archived:true,updatedAt:new Date().toISOString()});}updated.linkedTransactionId='';}else if(newPaid&&(!oldPaid||changed||!existing.linkedTransactionId)){if(!updated.accountId)throw new Error('VALIDATION_FAILED');if(!txRepo||!accountRepo)throw new Error('FINANCIAL_INTEGRATION_UNAVAILABLE');const a=await accountRepo.findById(updated.accountId);if(!a||a.userId!==existing.userId)throw new Error('NOT_FOUND');if(a.archived)throw new Error('ARCHIVED_ENTITY');if(existing.linkedTransactionId){const tx=await txRepo.findById(existing.linkedTransactionId);if(tx&&!tx.archived)await txRepo.save({...tx,archived:true,updatedAt:new Date().toISOString()});}const tx={id:(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,9)),userId:existing.userId,accountId:updated.accountId,amount:updated.amount,type:'expense',categoryId:null,description:updated.description,date:updated.date,notes:'',metadata:{websitesCostId:existing.id},archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await txRepo.save(tx);updated.linkedTransactionId=tx.id;}await costRepo.save(updated);});return updated;}
  async function archiveCost({costId}={}){const cost=await costRepo.findById(costId);if(!cost)throw new Error('NOT_FOUND');if(cost.archived)return cost;await appTx.run(async()=>{cost.archived=true;cost.updatedAt=new Date().toISOString();await costRepo.save(cost);if(cost.linkedTransactionId&&txRepo){const tx=await txRepo.findById(cost.linkedTransactionId);if(tx&&!tx.archived)await txRepo.save({...tx,archived:true,updatedAt:new Date().toISOString()});}});return cost;}

  return {createClient,listClients,updateClient,archiveClient,createProject,listProjects,updateProject,archiveProject,createPayment,updatePayment,archivePayment,createCost,updateCost,archiveCost,getWebsitesAnalytics};
}
