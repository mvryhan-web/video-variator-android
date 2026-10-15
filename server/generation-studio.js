import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MODELS,MODEL_CATALOG,validateGeneration,generateGoogle,pollGoogle} from './generation-provider.js';
import {generateBytePlus,pollBytePlus,bytePlusDownloadsConfigured} from './generation-byteplus.js';
import {pricingCatalog,estimateGenerationPricing} from './generation-pricing.js';
import {listModelControls,getModelControl,updateModelControl,applyModelControl} from './generation-model-control.js';
import {enforceGenerationPolicy,generationPolicy} from './generation-policy.js';
import {createObjectStorage} from './generation-storage.js';
export async function dispatchGeneration(request,{env=process.env,fetcher=fetch}={}){
 const model=MODEL_CATALOG.find(m=>m.id===request.model&&m.kind===request.kind&&m.adapter);
 if(!model)throw Error('MODEL_NOT_CONNECTED');
 return model.provider==='BytePlus'?generateBytePlus(request,{key:env.BYTEPLUS_API_KEY,fetcher}):generateGoogle(request,{key:env.GEMINI_API_KEY,fetcher});
}
export async function dispatchPoll(operation,{env=process.env,fetcher=fetch}={}){
 return operation.startsWith('byteplus:')?pollBytePlus(operation,{key:env.BYTEPLUS_API_KEY,downloadHosts:env.BYTEPLUS_MEDIA_HOSTS,fetcher}):pollGoogle(operation,{key:env.GEMINI_API_KEY,fetcher});
}
export function studioConfig(env=process.env){
 const calls=Number(env.AI_STUDIO_MAX_CALLS||0);
 const enabled=env.AI_STUDIO_ENABLED==='true'&&!!(env.GEMINI_API_KEY||env.BYTEPLUS_API_KEY)&&!!env.DATABASE_URL&&!!env.ADMIN_EMAIL&&Number.isInteger(calls)&&calls>0&&calls<=20;
 const allowed=(env.AI_STUDIO_ALLOWED_KINDS||'').split(',');
 const explicit=(env.AI_STUDIO_ALLOWED_MODELS||'').split(',');
 const catalog=MODEL_CATALOG.map(m=>({...m,enabled:enabled&&m.adapter&&(m.provider!=='BytePlus'||m.kind!=='video'||bytePlusDownloadsConfigured(env.BYTEPLUS_MEDIA_HOSTS))&&!!(m.provider==='BytePlus'?env.BYTEPLUS_API_KEY:env.GEMINI_API_KEY)&&allowed.includes(m.kind)&&(m.id===MODELS[m.kind]?.id||explicit.includes(m.id))}));
 return {pilot:true,ownerOnly:true,enabled,pricingConfigured:pricingCatalog(env).configured,publicPolicy:generationPolicy(env),reason:enabled?null:'OWNER_SETUP_REQUIRED',models:Object.entries(MODELS).map(([kind,m])=>({kind,...m,enabled:catalog.find(c=>c.id===m.id)?.enabled||false})),catalog,translation:{enabled:false,reason:'PROVIDER_NOT_CONNECTED'}};
}
export function installGenerationStudio(app,{auth,pool,env=process.env,provider=dispatchGeneration,poller=dispatchPoll,wallet=null,storage=null}){
 let ready;
 const objectStorage=storage||createObjectStorage({env});
 const init=()=>ready??=readFile(new URL('./migrations/20261015-generation-jobs.sql',import.meta.url),'utf8').then(sql=>pool.query(sql));
 const owner=(req,res,next)=>{if(req.user.provider!=='google'||String(req.user.email||'').toLowerCase()!==String(env.ADMIN_EMAIL||'').trim().toLowerCase())return res.status(403).json({error:'OWNER_PILOT_ONLY'});next();};
 const walletEnabled=()=>env.AI_STUDIO_WALLET_ENABLED==='true'&&!!wallet&&pricingCatalog(env).configured;
 const requestFingerprint=request=>createHash('sha256').update(JSON.stringify(request)).digest('hex');
 app.get('/api/studio/config',async(_req,res)=>{const base=studioConfig(env);if(env.AI_PROVIDER_ADMIN_ENABLED!=='true'||!pool)return res.json(base);try{const controlled=await listModelControls(pool,base.catalog);const defaults=base.models.map(m=>{const best=controlled.filter(x=>x.kind===m.kind&&x.enabled).sort((a,b)=>(a.control?.priority??100)-(b.control?.priority??100))[0];return best?{kind:m.kind,id:best.id,label:best.label,ratios:best.ratios,references:best.references,enabled:true}: {...m,enabled:false};});res.json({...base,catalog:controlled,models:defaults});}catch(_){res.json(base);}});
 const modelAdminEnabled=()=>env.AI_PROVIDER_ADMIN_ENABLED==='true'&&!!pool;
 app.get('/api/studio/admin/models',auth,owner,async(_req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const items=await listModelControls(pool,studioConfig(env).catalog);res.json({items});}catch(_){res.status(503).json({error:'MODEL_ADMIN_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/models/:id',auth,owner,async(req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const control=await updateModelControl(pool,{modelId:req.params.id,userId:req.user.id,patch:req.body,catalog:studioConfig(env).catalog});res.json({modelId:req.params.id,control});}catch(e){const status=e.message==='MODEL_NOT_FOUND'?404:e.message==='INVALID_MODEL_CONTROL'?400:503;res.status(status).json({error:status===503?'MODEL_ADMIN_UNAVAILABLE':e.message});}});
  app.use('/api/studio',(_req,res,next)=>{if(!studioConfig(env).enabled)return res.status(503).json({error:'OWNER_SETUP_REQUIRED'});next();});
 async function finish(id,result,userId){
  if(result.operation){await pool.query("UPDATE vv_generation_jobs SET status='processing',operation=$2 WHERE id=$1",[id,result.operation]);return;}
  let asset=null,media=result.bytes||null;
  if(objectStorage.configured&&result.bytes){
   try{asset=await objectStorage.putGeneration({userId,jobId:id,mime:result.mime,bytes:result.bytes});media=null;}
   catch(_){
    if(walletEnabled())await wallet.settle({userId,jobId:id,outcome:'confirmed_failure'}).catch(()=>{});
    await pool.query("UPDATE vv_generation_jobs SET status='failed',credits_reserved=CASE WHEN $2 THEN 0 ELSE credits_reserved,error='OBJECT_STORAGE_FAILED',error_message='OBJECT_STORAGE_FAILED',failed_at=NOW() WHERE id=$1",[id,walletEnabled()]);
    return;
   }
  }
  const assets=asset?[asset]:[];
  if(!walletEnabled()){await pool.query("UPDATE vv_generation_jobs SET status='ready',operation=null,mime=$2,media=$3,result_text=$4,output_assets=$5::jsonb,completed_at=NOW() WHERE id=$1",[id,result.mime||null,media,result.text||'',JSON.stringify(assets)]);return;}
  await pool.query("UPDATE vv_generation_jobs SET status='finalizing',operation=null,mime=$2,media=$3,result_text=$4,output_assets=$5::jsonb,error_message='AI_WALLET_CAPTURE_PENDING' WHERE id=$1",[id,result.mime||null,media,result.text||'',JSON.stringify(assets)]);
  try{await wallet.settle({userId,jobId:id,outcome:'success'});await pool.query("UPDATE vv_generation_jobs SET status='ready',credits_charged=credits_reserved,error_message=null,completed_at=NOW() WHERE id=$1",[id]);}
  catch(_){/* Durable finalizing state is retried by recoveryTick; never regenerate provider output. */}
 }
 async function run(id,request,userId){try{await finish(id,await provider(request,{env}),userId);}catch(e){
  await pool.query("UPDATE vv_generation_jobs SET status='failed',error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',error_message=$2,failed_at=NOW() WHERE id=$1",[id,walletEnabled()?'AI_WALLET_REVIEW_REQUIRED':null]);
  if(walletEnabled())await wallet.settle({userId,jobId:id,outcome:'unknown'}).catch(()=>{});
 }}
 app.post('/api/studio/estimate',auth,owner,async(req,res)=>{try{
  const request=validateGeneration(req.body);let selected=studioConfig(env).catalog.find(m=>m.id===request.model&&m.kind===request.kind);
  if(env.AI_PROVIDER_ADMIN_ENABLED==='true'&&pool&&selected)selected=applyModelControl(selected,await getModelControl(pool,selected.id));
  if(!selected?.enabled)return res.status(503).json({error:selected?.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED'});
  const quote=estimateGenerationPricing(request,selected,env);if(!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  res.json({credits:quote.credits,unit:'AI credits',model:quote.model,kind:quote.kind});
 }catch(e){const invalid=e.message==='INVALID_REQUEST';res.status(invalid?400:503).json({error:invalid?'INVALID_REQUEST':'AI_PRICING_NOT_APPROVED'});}});
  app.post('/api/studio/jobs',auth,owner,async(req,res)=>{
  let request;try{request=validateGeneration(req.body);}catch(e){return res.status(400).json({error:e.message});}
  let selected=studioConfig(env).catalog.find(m=>m.id===request.model&&m.kind===request.kind);if(env.AI_PROVIDER_ADMIN_ENABLED==='true'&&pool&&selected){try{selected=applyModelControl(selected,await getModelControl(pool,selected.id));}catch(_){return res.status(503).json({error:'MODEL_ADMIN_UNAVAILABLE'});}}if(!selected?.enabled)return res.status(503).json({error:selected?.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED'});
  const quote=walletEnabled()?estimateGenerationPricing(request,selected,env):null;if(walletEnabled()&&!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  let c,id=randomUUID();try{
   await init();c=await pool.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(84920115)');
   await enforceGenerationPolicy(c,{userId:req.user.id,env});
   const count=await c.query('SELECT count(*)::int AS n FROM vv_generation_jobs');
   if(count.rows[0].n>=Number(env.AI_STUDIO_MAX_CALLS)){await c.query('ROLLBACK');return res.status(429).json({error:'PILOT_LIMIT_REACHED'});}
   const settings={ratio:request.ratio,musicMode:request.musicMode||null,referenceCount:request.references?.length||0};
   await c.query('INSERT INTO vv_generation_jobs(id,user_id,kind,status,provider,model,prompt,started_at,settings,estimated_cost) VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),$8::jsonb,$9)',[id,req.user.id,request.kind,walletEnabled()?'queued':'processing',selected.provider||null,selected.id,request.prompt,JSON.stringify(settings),quote?quote.providerCostMicros/1_000_000:null]);await c.query('COMMIT');
  }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});if(['AI_CONCURRENCY_LIMIT','AI_RATE_LIMIT'].includes(e.message))return res.status(429).json({error:e.message});return res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}finally{c?.release();}
  if(walletEnabled())try{
   await wallet.reserve({userId:req.user.id,jobId:id,credits:quote.credits,fingerprint:requestFingerprint(request)});
   await pool.query("UPDATE vv_generation_jobs SET status='processing',credits_reserved=$2 WHERE id=$1",[id,quote.credits]);
  }catch(e){await pool.query("UPDATE vv_generation_jobs SET status='failed',error=$2,error_message=$2,failed_at=NOW() WHERE id=$1",[id,e.message==='INSUFFICIENT_AI_CREDITS'?'INSUFFICIENT_AI_CREDITS':'AI_WALLET_RESERVATION_FAILED']).catch(()=>{});return res.status(e.message==='INSUFFICIENT_AI_CREDITS'?402:503).json({error:e.message==='INSUFFICIENT_AI_CREDITS'?'INSUFFICIENT_AI_CREDITS':'AI_WALLET_UNAVAILABLE'});}
  res.status(202).json({id,status:'processing',creditsReserved:quote?.credits||0});void run(id,request,req.user.id).catch(()=>{});
 });
 const getJob=async(req)=>{await init();const r=await pool.query('SELECT * FROM vv_generation_jobs WHERE id=$1 AND user_id=$2 AND deleted=false',[req.params.id,req.user.id]);return r.rows[0];};
 app.get('/api/studio/admin/metrics',auth,owner,async(_req,res)=>{try{
  await init();
  const {rows}=await pool.query(`SELECT provider,model,kind,
    COUNT(*)::int AS jobs,
    COUNT(*) FILTER (WHERE status='ready')::int AS succeeded,
    COUNT(*) FILTER (WHERE status='failed')::int AS failed,
    COUNT(*) FILTER (WHERE status='processing')::int AS processing,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at,failed_at)-started_at))) FILTER (WHERE started_at IS NOT NULL AND (completed_at IS NOT NULL OR failed_at IS NOT NULL))::numeric,2) AS avg_seconds,
    COALESCE(SUM(actual_cost),0)::numeric AS actual_cost,
    COALESCE(SUM(credits_charged),0)::bigint AS credits_charged
   FROM vv_generation_jobs
   WHERE deleted=false
   GROUP BY provider,model,kind
   ORDER BY jobs DESC,provider,model`);
  res.json({items:rows.map(r=>({provider:r.provider||null,model:r.model||null,kind:r.kind,jobs:Number(r.jobs||0),succeeded:Number(r.succeeded||0),failed:Number(r.failed||0),processing:Number(r.processing||0),averageSeconds:r.avg_seconds==null?null:Number(r.avg_seconds),actualCost:Number(r.actual_cost||0),creditsCharged:Number(r.credits_charged||0)}))});
 }catch(_){res.status(503).json({error:'STUDIO_ANALYTICS_UNAVAILABLE'});}});
  app.get('/api/studio/jobs',auth,owner,async(req,res)=>{try{await init();const {rows}=await pool.query('SELECT id,kind,status,provider,model,prompt,error,result_text,mime,output_assets,created_at,started_at,completed_at,failed_at,credits_reserved,credits_charged,estimated_cost,actual_cost FROM vv_generation_jobs WHERE user_id=$1 AND deleted=false ORDER BY created_at DESC LIMIT 50',[req.user.id]);res.json({items:rows.map(j=>({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',error:j.error||null,text:j.result_text||'',mime:j.mime||null,storedExternally:Array.isArray(j.output_assets)&&j.output_assets.length>0,createdAt:j.created_at,startedAt:j.started_at||null,completedAt:j.completed_at||null,failedAt:j.failed_at||null,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0),estimatedCost:j.estimated_cost==null?null:Number(j.estimated_cost),actualCost:j.actual_cost==null?null:Number(j.actual_cost)}))});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{
  let j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});
  if(j.status==='finalizing'&&walletEnabled()){try{await wallet.settle({userId:req.user.id,jobId:j.id,outcome:'success'});await pool.query("UPDATE vv_generation_jobs SET status='ready',credits_charged=credits_reserved,error_message=null,completed_at=NOW() WHERE id=$1 AND status='finalizing'",[j.id]);j=await getJob(req);}catch(_){/* Keep durable finalizing state; background/user polling may retry capture. */}}
  if(j.status==='processing'&&j.operation){try{const result=await poller(j.operation,{env});if(!result.pending){await finish(j.id,result,req.user.id);j=await getJob(req);}}catch(e){if(e.terminal){if(walletEnabled())await wallet.settle({userId:req.user.id,jobId:j.id,outcome:'confirmed_failure'}).catch(()=>{});await pool.query("UPDATE vv_generation_jobs SET status='failed',credits_reserved=CASE WHEN $2 THEN 0 ELSE credits_reserved END,error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',error_message=null,failed_at=NOW() WHERE id=$1",[j.id,walletEnabled()]);j=await getJob(req);}else return res.status(502).json({error:'PROVIDER_POLL_FAILED',retryable:true});}}
  if(j.status==='processing'&&!j.operation&&Date.now()-new Date(j.created_at).getTime()>180000)return res.json({id:j.id,status:'unknown',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY'});
  res.json({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',error:j.error,text:j.result_text||'',mime:j.mime,createdAt:j.created_at,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0)});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id/media',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j||j.status!=='ready')return res.status(404).json({error:'RESULT_UNAVAILABLE'});if(j.media)return res.type(j.mime).send(j.media);const asset=Array.isArray(j.output_assets)?j.output_assets[0]:null;if(!asset||asset.storage!=='s3'||!objectStorage.configured)return res.status(404).json({error:'RESULT_UNAVAILABLE'});const bytes=await objectStorage.get(asset.key);res.type(asset.mime||j.mime).send(bytes);}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.delete('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});if(['queued','processing','finalizing'].includes(j.status))return res.status(409).json({error:'PROCESSING_CANNOT_BE_CANCELLED'});if(Number(j.credits_reserved||0)>Number(j.credits_charged||0))return res.status(409).json({error:'BILLING_REVIEW_REQUIRED'});const assets=Array.isArray(j.output_assets)?j.output_assets:[];if(assets.length){if(!objectStorage.configured)return res.status(503).json({error:'OBJECT_STORAGE_NOT_CONFIGURED'});for(const asset of assets)if(asset?.storage==='s3'&&asset.key)await objectStorage.delete(asset.key);}await pool.query("UPDATE vv_generation_jobs SET deleted=true,media=null,result_text=null,output_assets='[]'::jsonb WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);res.json({ok:true});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 let recoveryTimer=null,recoveryBusy=false;
 async function recoveryTick(){
  if(recoveryBusy||env.AI_STUDIO_BACKGROUND_POLLING!=='true'||!studioConfig(env).enabled||!pool)return;
  recoveryBusy=true;
  try{
   await init();
   if(walletEnabled()){
    const pending=await pool.query("SELECT id,user_id FROM vv_generation_jobs WHERE status='finalizing' AND deleted=false ORDER BY created_at ASC LIMIT 5");
    for(const job of pending.rows)try{await wallet.settle({userId:job.user_id,jobId:job.id,outcome:'success'});await pool.query("UPDATE vv_generation_jobs SET status='ready',credits_charged=credits_reserved,error_message=null,completed_at=NOW() WHERE id=$1 AND status='finalizing'",[job.id]);}catch(_){}
   }
   const {rows}=await pool.query("SELECT id,user_id,operation FROM vv_generation_jobs WHERE status='processing' AND operation IS NOT NULL AND deleted=false ORDER BY created_at ASC LIMIT 5");
   for(const job of rows){
    const client=await pool.connect();let locked=false;
    try{
     const lock=await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',[job.id]);locked=!!lock.rows[0]?.locked;if(!locked)continue;
     const latest=await client.query("SELECT status,operation,deleted FROM vv_generation_jobs WHERE id=$1",[job.id]);const current=latest.rows[0];
     if(!current||current.deleted||current.status!=='processing'||!current.operation)continue;
     try{const result=await poller(current.operation,{env});if(!result.pending)await finish(job.id,result,job.user_id);}
     catch(e){if(e.terminal){if(walletEnabled())await wallet.settle({userId:job.user_id,jobId:job.id,outcome:'confirmed_failure'}).catch(()=>{});await pool.query("UPDATE vv_generation_jobs SET status='failed',credits_reserved=CASE WHEN $2 THEN 0 ELSE credits_reserved END,error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',error_message=null,failed_at=NOW() WHERE id=$1",[job.id,walletEnabled()]);}}
    }finally{if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',[job.id]).catch(()=>{});client.release();}
   }
  }catch(e){console.error('[studio recovery]',e?.message||e);}
  finally{recoveryBusy=false;}
 }
 function startRecovery(){
  if(env.AI_STUDIO_BACKGROUND_POLLING!=='true'||!studioConfig(env).enabled||!pool)return false;
  if(recoveryTimer)return true;
  const raw=Number(env.AI_STUDIO_POLL_INTERVAL_MS||15000),interval=Number.isFinite(raw)?Math.max(5000,Math.min(60000,Math.floor(raw))):15000;
  recoveryTimer=setInterval(()=>void recoveryTick(),interval);recoveryTimer.unref?.();void recoveryTick();return true;
 }
 function stopRecovery(){if(recoveryTimer){clearInterval(recoveryTimer);recoveryTimer=null;}return true;}
 return {startRecovery,stopRecovery,recoveryTick};
}
