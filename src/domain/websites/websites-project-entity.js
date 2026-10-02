const STATUSES=['lead','active','on_hold','completed','cancelled'];
export function createWebsitesProject({ userId, incomeProfileId, clientId, name, description, agreedValue, startDate, deadline, status } = {}) {
  if(!userId||typeof userId!=='string'||!userId.trim()||!incomeProfileId||typeof incomeProfileId!=='string'||!incomeProfileId.trim()||!clientId||typeof clientId!=='string'||!clientId.trim()) throw new Error('VALIDATION_FAILED');
  if(!name||typeof name!=='string'||!name.trim()||name.length>200) throw new Error('VALIDATION_FAILED');
  if(agreedValue!==undefined&&agreedValue!==null&&(typeof agreedValue!=='number'||!Number.isFinite(agreedValue)||agreedValue<0)) throw new Error('VALIDATION_FAILED');
  for(const d of [{key:'startDate',value:startDate},{key:'deadline',value:deadline}]) if(d.value!==undefined&&d.value!==null&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(d.value)) throw new Error('VALIDATION_FAILED');
  if(status!==undefined&&!STATUSES.includes(status)) throw new Error('VALIDATION_FAILED');
  const now=new Date().toISOString(); return {id:(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,9)),userId,incomeProfileId,clientId,name:name.trim(),description:description?String(description).trim():'',agreedValue:agreedValue??0,startDate:startDate||null,deadline:deadline||null,status:status||'lead',archived:false,createdAt:now,updatedAt:now};
}
export function validateWebsitesProjectUpdate({existing,updates}={}) {
  if(!existing) throw new Error('NOT_FOUND'); if(!updates||typeof updates!=='object') throw new Error('VALIDATION_FAILED');
  if(['id','userId','incomeProfileId','clientId','createdAt'].some(k=>updates[k]!==undefined)) throw new Error('VALIDATION_FAILED');
  const r={...existing};
  if(updates.name!==undefined){if(typeof updates.name!=='string'||!updates.name.trim()||updates.name.length>200)throw new Error('VALIDATION_FAILED');r.name=updates.name.trim();}
  if(updates.description!==undefined){if(typeof updates.description!=='string')throw new Error('VALIDATION_FAILED');r.description=updates.description.trim();}
  if(updates.agreedValue!==undefined){if(typeof updates.agreedValue!=='number'||!Number.isFinite(updates.agreedValue)||updates.agreedValue<0)throw new Error('VALIDATION_FAILED');r.agreedValue=updates.agreedValue;}
  for(const d of ['startDate','deadline'])if(updates[d]!==undefined){if(updates[d]!==null&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(updates[d]))throw new Error('VALIDATION_FAILED');r[d]=updates[d];}
  if(updates.status!==undefined){if(!STATUSES.includes(updates.status))throw new Error('VALIDATION_FAILED');r.status=updates.status;}
  r.updatedAt=new Date().toISOString();return r;
}
