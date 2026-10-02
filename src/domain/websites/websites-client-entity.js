export function createWebsitesClient({ userId, incomeProfileId, name, email, phone, notes } = {}) {
  if (!userId || typeof userId !== 'string' || !userId.trim()) throw new Error('VALIDATION_FAILED');
  if (!incomeProfileId || typeof incomeProfileId !== 'string' || !incomeProfileId.trim()) throw new Error('VALIDATION_FAILED');
  if (!name || typeof name !== 'string' || !name.trim() || name.length > 200) throw new Error('VALIDATION_FAILED');
  if (email !== undefined && email !== null && typeof email !== 'string') throw new Error('VALIDATION_FAILED');
  if (phone !== undefined && phone !== null && typeof phone !== 'string') throw new Error('VALIDATION_FAILED');
  if (notes !== undefined && notes !== null && typeof notes !== 'string') throw new Error('VALIDATION_FAILED');
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), userId, incomeProfileId, name:name.trim(), email:email ? email.trim() : '', phone:phone ? phone.trim() : '', notes:notes ? notes.trim() : '', archived:false, createdAt:now, updatedAt:now };
}
export function validateWebsitesClientUpdate({ existing, updates } = {}) {
  if (!existing) throw new Error('NOT_FOUND');
  if (!updates || typeof updates !== 'object') throw new Error('VALIDATION_FAILED');
  if (['id','userId','incomeProfileId','createdAt'].some(k => updates[k] !== undefined)) throw new Error('VALIDATION_FAILED');
  const result={...existing};
  if (updates.name !== undefined) { if(typeof updates.name!=='string'||!updates.name.trim()||updates.name.length>200) throw new Error('VALIDATION_FAILED'); result.name=updates.name.trim(); }
  for (const key of ['email','phone','notes']) if(updates[key]!==undefined){ if(updates[key]!==null&&typeof updates[key]!=='string') throw new Error('VALIDATION_FAILED'); result[key]=updates[key]?updates[key].trim():''; }
  result.updatedAt=new Date().toISOString(); return result;
}
