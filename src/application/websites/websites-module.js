import { createWebsitesClient, validateWebsitesClientUpdate } from '../../domain/websites/websites-client-entity.js';
import { createWebsitesProject, validateWebsitesProjectUpdate } from '../../domain/websites/websites-project-entity.js';
import { ApplicationTransaction } from '../../infrastructure/storage/application-transaction.js';

export function createWebsitesModule({ websitesClientRepository, websitesProjectRepository, incomeProfileRepository, applicationTransaction } = {}) {
  const clientRepo=websitesClientRepository, projectRepo=websitesProjectRepository, profileRepo=incomeProfileRepository, appTx=applicationTransaction;
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
  return {createClient,listClients,updateClient,archiveClient,createProject,listProjects,updateProject,archiveProject};
}
