import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MODELS,MODEL_CATALOG,validateGeneration,generateGoogle,pollGoogle} from './generation-provider.js';
import {generateBytePlus,pollBytePlus,bytePlusDownloadsConfigured} from './generation-byteplus.js';
import {pricingCatalog,estimateGenerationPricing} from './generation-pricing.js';
import {listModelControls,getModelControl,updateModelControl,applyModelControl} from './generation-model-control.js';
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
 return {pilot:true,ownerOnly:true,enabled,pricingConfigured:pricingCatalog(env).configured,reason:enabled?null:'OWNER_SETUP_REQUIRED',models:Object.entries(MODELS).map(([kind,m])=>({kind,...m,enabled:catalog.find(c=>c.id===m.id)?.enabled||false})),catalog,translation:{enabled:false,reason:'PROVIDER_NOT_CONNECTED'}};
}
export function installGenerationStudio(app,{auth,pool,env=process.env,provider=dispatchGeneration,poller=dispatchPoll}){
 let ready;
 const init=()=>ready??=readFile(new URL('./migrations/20261015-generation-jobs.sql',import.meta.url),'utf8').then(sql=>pool.query(sql));
 const owner=(req,res,next)=>{if(req.user.provider!=='google'||String(req.user.email||'').toLowerCase()!==String(env.ADMIN_EMAIL||'').trim().toLowerCase())return res.status(403).json({error:'OWNER_PILOT_ONLY'});next();};
 app.get('/api/studio/config',async(_req,res)=>{const base=studioConfig(env);if(env.AI_PROVIDER_ADMIN_ENABLED!=='true'||!pool)return res.json(base);try{const controlled=await listModelControls(pool,base.catalog);const defaults=base.models.map(m=>{const best=controlled.filter(x=>x.kind===m.kind&&x.enabled).sort((a,b)=>(a.control?.priority??100)-(b.control?.priority??100))[0];return best?{kind:m.kind,id:best.id,label:best.label,ratios:best.ratios,references:best.references,enabled:true}: {...m,enabled:false};});res.json({...base,catalog:controlled,models:defaults});}catch(_){res.json(base);}});
 const modelAdminEnabled=()=>env.AI_PROVIDER_ADMIN_ENABLED==='true'&&!!pool;
 app.get('/api/studio/admin/models',auth,owner,async(_req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const items=await listModelControls(pool,studioConfig(env).catalog);res.json({items});}catch(_){res.status(503).json({error:'MODEL_ADMIN_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/models/:id',auth,owner,async(req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const control=await updateModelControl(pool,{modelId:req.params.id,userId:req.user.id,patch:req.body,catalog:studioConfig(env).catalog});res.json({modelId:req.params.id,control});}catch(e){const status=e.message==='MODEL_NOT_FOUND'?404:e.message==='INVALID_MODEL_CONTROL'?400:503;res.status(status).json({error:status===503?'MODEL_ADMIN_UNAVAILABLE':e.message});}});
  app.use('/api/studio',(_req,res,next)=>{if(!studioConfig(env).enabled)return res.status(503).json({error:'OWNER_SETUP_REQUIRED'});next();});
 async function finish(id,result){const status=result.operation?'processing':'ready';await pool.query("UPDATE vv_generation_pilot SET status=$2,operation=$3,mime=$4,media=$5,result_text=$6,completed_at=CASE WHEN $2='ready' THEN NOW() ELSE completed_at END WHERE id=$1",[id,status,result.operation||null,result.mime||null,result.bytes||null,result.text||'']);}
 async function run(id,request){try{await finish(id,await provider(request,{env}));}catch(e){await pool.query("UPDATE vv_generation_pilot SET status='failed',error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',failed_at=NOW() WHERE id=$1",[id]);}}
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
  // No consumer credits or existing subscription entitlements are reused in this owner-only pilot.
  let c,id;try{
   await init();c=await pool.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(84920115)');
   const count=await c.query('SELECT count(*)::int AS n FROM vv_generation_pilot');
   if(count.rows[0].n>=Number(env.AI_STUDIO_MAX_CALLS)){await c.query('ROLLBACK');return res.status(429).json({error:'PILOT_LIMIT_REACHED'});}
   id=randomUUID();const settings={ratio:request.ratio,musicMode:request.musicMode||null,referenceCount:request.references?.length||0};await c.query('INSERT INTO vv_generation_pilot(id,user_id,kind,status,provider,model,prompt,started_at,settings) VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),$8::jsonb)',[id,req.user.id,request.kind,'processing',selected.provider||null,selected.id,request.prompt,JSON.stringify(settings)]);await c.query('COMMIT');
  }catch(_){if(c)await c.query('ROLLBACK').catch(()=>{});return res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}finally{c?.release();}
  res.status(202).json({id,status:'processing'});void run(id,request).catch(()=>{});
 });
 const getJob=async(req)=>{await init();const r=await pool.query('SELECT * FROM vv_generation_pilot WHERE id=$1 AND user_id=$2 AND deleted=false',[req.params.id,req.user.id]);return r.rows[0];};
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
   FROM vv_generation_pilot
   WHERE deleted=false
   GROUP BY provider,model,kind
   ORDER BY jobs DESC,provider,model`);
  res.json({items:rows.map(r=>({provider:r.provider||null,model:r.model||null,kind:r.kind,jobs:Number(r.jobs||0),succeeded:Number(r.succeeded||0),failed:Number(r.failed||0),processing:Number(r.processing||0),averageSeconds:r.avg_seconds==null?null:Number(r.avg_seconds),actualCost:Number(r.actual_cost||0),creditsCharged:Number(r.credits_charged||0)}))});
 }catch(_){res.status(503).json({error:'STUDIO_ANALYTICS_UNAVAILABLE'});}});
  app.get('/api/studio/jobs',auth,owner,async(req,res)=>{try{await init();const {rows}=await pool.query('SELECT id,kind,status,provider,model,prompt,error,result_text,mime,created_at,started_at,completed_at,failed_at,credits_reserved,credits_charged,estimated_cost,actual_cost FROM vv_generation_pilot WHERE user_id=$1 AND deleted=false ORDER BY created_at DESC LIMIT 50',[req.user.id]);res.json({items:rows.map(j=>({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',error:j.error||null,text:j.result_text||'',mime:j.mime||null,createdAt:j.created_at,startedAt:j.started_at||null,completedAt:j.completed_at||null,failedAt:j.failed_at||null,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0),estimatedCost:j.estimated_cost==null?null:Number(j.estimated_cost),actualCost:j.actual_cost==null?null:Number(j.actual_cost)}))});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{
  let j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});
  if(j.status==='processing'&&j.operation){try{const result=await poller(j.operation,{env});if(!result.pending){await finish(j.id,result);j=await getJob(req);}}catch(e){if(e.terminal){await pool.query("UPDATE vv_generation_pilot SET status='failed',error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',failed_at=NOW() WHERE id=$1",[j.id]);j=await getJob(req);}else return res.status(502).json({error:'PROVIDER_POLL_FAILED',retryable:true});}}
  if(j.status==='processing'&&!j.operation&&Date.now()-new Date(j.created_at).getTime()>180000)return res.json({id:j.id,status:'unknown',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY'});
  res.json({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',error:j.error,text:j.result_text||'',mime:j.mime,createdAt:j.created_at});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id/media',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j||j.status!=='ready'||!j.media)return res.status(404).json({error:'RESULT_UNAVAILABLE'});res.type(j.mime).send(j.media);}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.delete('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});if(j.status==='processing')return res.status(409).json({error:'PROCESSING_CANNOT_BE_CANCELLED'});await pool.query('UPDATE vv_generation_pilot SET deleted=true,media=null,result_text=null WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);res.json({ok:true});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 let recoveryTimer=null,recoveryBusy=false;
 async function recoveryTick(){
  if(recoveryBusy||env.AI_STUDIO_BACKGROUND_POLLING!=='true'||!studioConfig(env).enabled||!pool)return;
  recoveryBusy=true;
  try{
   await init();
   const {rows}=await pool.query("SELECT id,operation FROM vv_generation_pilot WHERE status='processing' AND operation IS NOT NULL AND deleted=false ORDER BY created_at ASC LIMIT 5");
   for(const job of rows){
    const client=await pool.connect();let locked=false;
    try{
     const lock=await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',[job.id]);locked=!!lock.rows[0]?.locked;if(!locked)continue;
     const latest=await client.query("SELECT status,operation,deleted FROM vv_generation_pilot WHERE id=$1",[job.id]);const current=latest.rows[0];
     if(!current||current.deleted||current.status!=='processing'||!current.operation)continue;
     try{const result=await poller(current.operation,{env});if(!result.pending)await finish(job.id,result);}
     catch(e){if(e.terminal)await pool.query("UPDATE vv_generation_pilot SET status='failed',error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',failed_at=NOW() WHERE id=$1",[job.id]);}
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
