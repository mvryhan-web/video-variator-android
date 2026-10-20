import {readFile} from 'node:fs/promises';
const VERSION='2026-10-20';
let initPromise;
async function initConsentTable(pool){
 if(!initPromise) initPromise=readFile(new URL('./migrations/20261020-ai-user-consent.sql',import.meta.url),'utf8')
  .then(sql=>pool.query(sql)).catch(error=>{initPromise=null;throw error;});
 await initPromise;
}
export async function hasStoredGenerationConsent(pool,userId){
 if(typeof userId!=='string'||!userId)return false;
 await initConsentTable(pool);
 const {rows}=await pool.query(
  'SELECT provider_data_accepted,provider_data_version FROM vv_ai_user_consents WHERE user_id=$1 LIMIT 1',
  [userId]
 );
 return rows[0]?.provider_data_accepted===true&&rows[0]?.provider_data_version===VERSION;
}
export function installGenerationConsent(app,{auth,pool}){
 app.get('/api/studio/consent',auth,async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try{
   await initConsentTable(pool);
   const {rows}=await pool.query(
    'SELECT terms_version,privacy_version,provider_data_version,provider_data_accepted,updated_at FROM vv_ai_user_consents WHERE user_id=$1 LIMIT 1',
    [req.user.id]
   );
   const c=rows[0];
   res.json({version:VERSION,termsAccepted:!!c&&c.terms_version===VERSION,
    privacyAcknowledged:!!c&&c.privacy_version===VERSION,
    providerAccepted:!!c&&c.provider_data_accepted===true&&c.provider_data_version===VERSION});
  }catch(_){res.status(503).json({error:'CONSENT_STORAGE_UNAVAILABLE'});}
 });
 app.post('/api/studio/consent',auth,async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  // Provider processing is separate from terms acknowledgement and is never prechecked.
  if(req.body?.version!==VERSION||req.body?.termsAccepted!==true||req.body?.privacyAcknowledged!==true||
    typeof req.body?.providerAccepted!=='boolean')
   return res.status(400).json({error:'EXPLICIT_CONSENT_REQUIRED'});
  try{
   await initConsentTable(pool);
   await pool.query(`INSERT INTO vv_ai_user_consents
    (user_id,terms_version,privacy_version,provider_data_version,provider_data_accepted,updated_at)
    VALUES($1,$2,$2,$3,$4,NOW())
    ON CONFLICT(user_id) DO UPDATE SET
    terms_version=EXCLUDED.terms_version,privacy_version=EXCLUDED.privacy_version,
    provider_data_version=EXCLUDED.provider_data_version,
    provider_data_accepted=EXCLUDED.provider_data_accepted,updated_at=NOW()`,
    [req.user.id,VERSION,req.body.providerAccepted?VERSION:null,req.body.providerAccepted]);
   res.json({ok:true,version:VERSION,providerAccepted:req.body.providerAccepted});
  }catch(_){res.status(503).json({error:'CONSENT_STORAGE_UNAVAILABLE'});}
 });
}
