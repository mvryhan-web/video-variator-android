import {createHash} from 'node:crypto';

// Owner P0: acceptance and dispatch use the SAME cross-process session-level
// PostgreSQL fence. A revoke acknowledgement cannot overtake a not-yet-sent
// paid provider request. No DDL is run by a customer endpoint.
export const GENERATION_CONSENT_VERSION='2026-10-20';
const FENCE_NAMESPACE=20261020;
const safeUserId=id=>typeof id==='string'&&id.length>0&&id.length<=256;
const fenceKey=id=>[FENCE_NAMESPACE,createHash('sha256').update(id).digest().readInt32BE(0)];

export async function withUserConsentFence(pool,userId,operation){
 if(!safeUserId(userId)||!pool||typeof pool.connect!=='function'||typeof operation!=='function')
  throw Error('CONSENT_STORAGE_UNAVAILABLE');
 const client=await pool.connect();
 let attempted=false,locked=false,destroy=false;
 try{
  attempted=true;
  await client.query('SELECT pg_advisory_lock($1,$2)',fenceKey(userId));
  locked=true;
  return await operation(client);
 }finally{
  destroy=attempted&&!locked;
  if(locked){
   try{
    const result=await client.query('SELECT pg_advisory_unlock($1,$2)',fenceKey(userId));
    if(result.rows?.[0]?.pg_advisory_unlock!==true)destroy=true;
   }catch(_){destroy=true;}
  }
  client.release(destroy);
 }
}
export async function hasStoredGenerationConsent(db,userId){
 if(!safeUserId(userId)||!db||typeof db.query!=='function')return false;
 const {rows}=await db.query(
  'SELECT terms_version,privacy_version,provider_data_version,provider_data_accepted FROM vv_ai_user_consents WHERE user_id=$1 LIMIT 1',
  [userId]);
 const row=rows?.[0];
 return !!row&&row.terms_version===GENERATION_CONSENT_VERSION&&
  row.privacy_version===GENERATION_CONSENT_VERSION&&
  row.provider_data_version===GENERATION_CONSENT_VERSION&&row.provider_data_accepted===true;
}
export async function withCurrentGenerationConsent(pool,userId,send){
 return withUserConsentFence(pool,userId,async client=>{
  if(!(await hasStoredGenerationConsent(client,userId)))throw Error('PROVIDER_CONSENT_REQUIRED');
  // Keep the SAME fence across purchased-only claim and actual external
  // provider invocation. A concurrent revoke waits until dispatch completes,
  // rather than getting an ACK while an unstarted paid transport can proceed.
  return await send();
 });
}
async function withConsentWrite(pool,userId,write){
 return withUserConsentFence(pool,userId,async client=>{
  await client.query('BEGIN');
  try{
   const result=await write(client);
   await client.query('COMMIT');
   return result;
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
 });
}
export function installGenerationConsent(app,{auth,pool}){
 app.get('/api/studio/consent',auth,async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{
   if(!safeUserId(req.user?.id)||!pool)throw Error('CONSENT_STORAGE_UNAVAILABLE');
   const {rows}=await pool.query(
    'SELECT terms_version,privacy_version,provider_data_version,provider_data_accepted FROM vv_ai_user_consents WHERE user_id=$1 LIMIT 1',
    [req.user.id]);
   const row=rows?.[0];
   const termsAccepted=row?.terms_version===GENERATION_CONSENT_VERSION;
   const privacyAcknowledged=row?.privacy_version===GENERATION_CONSENT_VERSION;
   const providerAccepted=row?.provider_data_accepted===true&&row?.provider_data_version===GENERATION_CONSENT_VERSION;
   res.json({version:GENERATION_CONSENT_VERSION,termsAccepted,privacyAcknowledged,
    providerAccepted,accepted:termsAccepted&&privacyAcknowledged&&providerAccepted});
  }catch(_){res.status(503).json({error:'CONSENT_STORAGE_UNAVAILABLE'});}
 });
 app.post('/api/studio/consent',auth,async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  if(req.body?.version!==GENERATION_CONSENT_VERSION||req.body?.termsAccepted!==true||
   req.body?.privacyAcknowledged!==true||typeof req.body?.providerAccepted!=='boolean')
   return res.status(400).json({error:'EXPLICIT_CONSENT_REQUIRED'});
  try{
   await withConsentWrite(pool,req.user?.id,async client=>{
    await client.query(
     'INSERT INTO vv_ai_user_consents(user_id,terms_version,privacy_version,provider_data_version,provider_data_accepted,updated_at) VALUES($1,$2,$2,$3,$4,NOW()) ON CONFLICT(user_id) DO UPDATE SET terms_version=EXCLUDED.terms_version,privacy_version=EXCLUDED.privacy_version,provider_data_version=EXCLUDED.provider_data_version,provider_data_accepted=EXCLUDED.provider_data_accepted,updated_at=NOW()',
     [req.user.id,GENERATION_CONSENT_VERSION,req.body.providerAccepted?GENERATION_CONSENT_VERSION:null,req.body.providerAccepted]);
   });
   res.json({ok:true,version:GENERATION_CONSENT_VERSION,providerAccepted:req.body.providerAccepted});
  }catch(_){res.status(503).json({error:'CONSENT_STORAGE_UNAVAILABLE'});}
 });
 app.delete('/api/studio/consent',auth,async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{
   await withConsentWrite(pool,req.user?.id,async client=>{
    await client.query('UPDATE vv_ai_user_consents SET provider_data_accepted=false,provider_data_version=NULL,updated_at=NOW() WHERE user_id=$1',[req.user.id]);
   });
   res.json({ok:true,providerAccepted:false});
  }catch(_){res.status(503).json({error:'CONSENT_STORAGE_UNAVAILABLE'});}
 });
}
