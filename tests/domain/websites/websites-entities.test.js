import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebsitesClient, validateWebsitesClientUpdate } from '../../../src/domain/websites/websites-client-entity.js';
import { createWebsitesProject, validateWebsitesProjectUpdate } from '../../../src/domain/websites/websites-project-entity.js';

test('websites client entity validates required identity and normalizes text',()=>{
 const c=createWebsitesClient({userId:'u1',incomeProfileId:'w1',name:'  ACME  ',email:' a@b.com '});
 assert.equal(c.name,'ACME'); assert.equal(c.email,'a@b.com'); assert.equal(c.archived,false);
 assert.throws(()=>createWebsitesClient({userId:'u1',incomeProfileId:'w1',name:''}),/VALIDATION_FAILED/);
});
test('websites client update cannot change ownership',()=>{
 const c=createWebsitesClient({userId:'u1',incomeProfileId:'w1',name:'ACME'});
 assert.throws(()=>validateWebsitesClientUpdate({existing:c,updates:{userId:'u2'}}),/VALIDATION_FAILED/);
});
test('websites project validates client and financial planning fields',()=>{
 const p=createWebsitesProject({userId:'u1',incomeProfileId:'w1',clientId:'c1',name:'Site',agreedValue:1500,startDate:'2026-10-01',deadline:'2026-11-01'});
 assert.equal(p.agreedValue,1500); assert.equal(p.status,'lead');
 assert.throws(()=>createWebsitesProject({userId:'u1',incomeProfileId:'w1',clientId:'c1',name:'Site',deadline:'2026-99-99'}),/VALIDATION_FAILED/);
});
test('websites project update cannot change ownership or client',()=>{
 const p=createWebsitesProject({userId:'u1',incomeProfileId:'w1',clientId:'c1',name:'Site'});
 assert.throws(()=>validateWebsitesProjectUpdate({existing:p,updates:{clientId:'c2'}}),/VALIDATION_FAILED/);
 const u=validateWebsitesProjectUpdate({existing:p,updates:{status:'active',agreedValue:2000}});
 assert.equal(u.status,'active'); assert.equal(u.agreedValue,2000);
});
