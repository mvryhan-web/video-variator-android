// BASE #5: inert server-only reference ledger; no upload routes or paid provider calls.
import {randomUUID} from 'node:crypto';
import {inspectStudioReferenceMedia} from './generation-reference-media.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const identity=x=>typeof x==='string'&&x.length>0&&x.length<=256;
export function referenceRetentionMinutes(env={}){
 const n=Number(env.AI_STUDIO_REFERENCE_TTL_MINUTES);
 return env.AI_STUDIO_REFERENCE_TTL_MINUTES!=null&&Number.isInteger(n)&&n>=5&&n<=1440?n:null;
}
export function createGenerationReferenceLedger({pool,storage,env=process.env,uuid=randomUUID,now=()=>new Date(),maxActiveUploads=0}={}){
 if(!Number.isInteger(maxActiveUploads)||maxActiveUploads<0||maxActiveUploads>10)throw Error('REFERENCE_UPLOAD_LIMIT_INVALID');
 function cleanupReady(){
  // Cleanup must continue even after new uploads are disabled, or old assets leak.
  if(!pool||!storage?.configured)throw Error('REFERENCE_STORAGE_UNAVAILABLE');
  if(env.AI_STUDIO_REFERENCE_CLEANUP_ENABLED!=='true')throw Error('REFERENCE_CLEANUP_DISABLED');
 }
 function ready(){
  if(env.AI_STUDIO_REFERENCE_STAGING_ENABLED!=='true')throw Error('REFERENCE_STAGING_DISABLED');
  cleanupReady();
  const ttl=referenceRetentionMinutes(env);
  if(!ttl)throw Error('REFERENCE_RETENTION_NOT_CONFIGURED');
  return ttl;
 }
 async function stage({userId,mime,bytes}){
  const ttl=ready();
  if(!identity(userId))throw Error('REFERENCE_MEDIA_INVALID');
  const info=inspectStudioReferenceMedia({mime,bytes}),id=uuid();
  if(!UUID.test(id))throw Error('REFERENCE_MEDIA_INVALID');
  const key=storage.stagedReferenceKey({userId,mime,assetId:id}),date=now();
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw Error('REFERENCE_RETENTION_NOT_CONFIGURED');
  const expires=new Date(date.getTime()+ttl*60000);
  // A failed/ambiguous PUT remains discoverable: ledger row precedes S3 upload.
  const insertSql=`INSERT INTO vv_generation_reference_assets
   (id,user_id,storage_key,mime,byte_size,duration_seconds,expires_at,status)
   VALUES($1,$2,$3,$4,$5,$6,$7,'uploading')`;
  const args=[id,userId,key,mime,info.size,info.durationSeconds,expires];
  if(maxActiveUploads){
   // Serialize admissions across app instances, not just within one Node process.
   // S3 upload happens AFTER commit so a slow remote PUT never holds a DB lock.
   if(typeof pool.connect!=='function')throw Error('REFERENCE_UPLOAD_UNAVAILABLE');
   const c=await pool.connect();
   try{
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['ai-reference:'+userId]);
    const {rows}=await c.query(`SELECT COUNT(*)::int AS active
     FROM vv_generation_reference_assets
     WHERE user_id=$1 AND status IN ('uploading','ready','failed') AND expires_at>NOW()`,[userId]);
    if(Number(rows[0]?.active||0)>=maxActiveUploads)throw Error('REFERENCE_UPLOAD_LIMIT');
    await c.query(insertSql,args);
    await c.query('COMMIT');
   }catch(e){
    await c.query('ROLLBACK').catch(()=>{});
    throw e;
   }finally{c.release();}
  }else await pool.query(insertSql,args);
  try{
   const stored=await storage.putStagedReference({userId,mime,bytes,assetId:id});
   if(stored.key!==key)throw Error('REFERENCE_STAGING_FAILED');
   const {rows}=await pool.query(`UPDATE vv_generation_reference_assets
    SET status='ready',uploaded_at=NOW(),last_error=NULL
    WHERE id=$1 AND user_id=$2 AND status='uploading' AND expires_at>NOW()
    RETURNING id,mime,byte_size,duration_seconds,expires_at`,[id,userId]);
   if(rows.length!==1)throw Error('REFERENCE_STAGING_EXPIRED');
   const row=rows[0];
   return {id:row.id,mime:row.mime,size:Number(row.byte_size),durationSeconds:Number(row.duration_seconds),expiresAt:row.expires_at};
  }catch(e){
   await pool.query(`UPDATE vv_generation_reference_assets
    SET status='failed',last_error='REFERENCE_UPLOAD_REVIEW'
    WHERE id=$1 AND user_id=$2 AND status='uploading'`,[id,userId]).catch(()=>{});
   throw Error(e?.message==='REFERENCE_STAGING_EXPIRED'?'REFERENCE_STAGING_EXPIRED':'REFERENCE_STAGING_FAILED');
  }
 }
 async function get({userId,id}){
  ready();
  if(!identity(userId)||!UUID.test(id||''))throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
  const {rows}=await pool.query(`SELECT storage_key,mime FROM vv_generation_reference_assets
   WHERE id=$1 AND user_id=$2 AND status='ready' AND expires_at>NOW()`,[id,userId]);
  if(rows.length!==1)throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
  return storage.getStagedReference({userId,key:rows[0].storage_key,mime:rows[0].mime});
 }
 // Server-only signing candidate; callers still must FFprobe the underlying bytes
 // and obtain independently approved paid-generation consent before dispatch.
 async function getForVideoTransfer({userId,id}={}){
  ready();
  if(!identity(userId)||!UUID.test(id||''))throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
  const {rows}=await pool.query(`SELECT storage_key,mime,expires_at
   FROM vv_generation_reference_assets
   WHERE id=$1 AND user_id=$2 AND mime='video/mp4' AND status='ready'
     AND expires_at>NOW()+INTERVAL '90 seconds'`,[id,userId]);
  if(rows.length!==1)throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
  return {key:rows[0].storage_key,mime:rows[0].mime,expiresAt:rows[0].expires_at};
 }
 async function cleanupExpired({batchSize=20}={}){
  cleanupReady();
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>100)throw Error('INVALID_CLEANUP_BATCH');
  const {rows}=await pool.query(`WITH selected AS (
   SELECT id FROM vv_generation_reference_assets
   WHERE (status IN ('uploading','ready','failed') AND expires_at<=NOW())
      OR (status='deleting' AND cleanup_claimed_at<=NOW()-INTERVAL '15 minutes')
   ORDER BY expires_at,id LIMIT $1 FOR UPDATE SKIP LOCKED
  )
  UPDATE vv_generation_reference_assets a SET status='deleting',cleanup_claimed_at=NOW()
  FROM selected WHERE a.id=selected.id
  RETURNING a.id,a.user_id,a.storage_key`,[batchSize]);
  let deleted=0,failed=0;
  for(const row of rows){
   try{
    await storage.deleteStagedReference({userId:row.user_id,key:row.storage_key});
    await pool.query(`DELETE FROM vv_generation_reference_assets WHERE id=$1 AND status='deleting'`,[row.id]);
    deleted++;
   }catch(_){
    failed++;
    await pool.query(`UPDATE vv_generation_reference_assets
     SET status='failed',cleanup_claimed_at=NULL,last_error='REFERENCE_DELETE_FAILED'
     WHERE id=$1 AND status='deleting'`,[row.id]).catch(()=>{});
   }
  }
  return {claimed:rows.length,deleted,failed};
 }
 return {stage,get,getForVideoTransfer,cleanupExpired};
}
