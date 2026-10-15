import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MODELS,MODEL_CATALOG,validateGeneration,generateGoogle,pollGoogle} from './generation-provider.js';
import {generateBytePlus,pollBytePlus,bytePlusDownloadsConfigured} from './generation-byteplus.js';
import {pricingCatalog,estimateGenerationPricing} from './generation-pricing.js';
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
 app.get('/api/studio/config',(_req,res)=>res.json(studioConfig(env)));
 app.use('/api/studio',(_req,res,next)=>{if(!studioConfig(env).enabled)return res.status(503).json({error:'OWNER_SETUP_REQUIRED'});next();});
 async function finish(id,result){const status=result.operation?'processing':'ready';await pool.query("UPDATE vv_generation_pilot SET status=$2,operation=$3,mime=$4,media=$5,result_text=$6,completed_at=CASE WHEN $2='ready' THEN NOW() ELSE completed_at END WHERE id=$1",[id,status,result.operation||null,result.mime||null,result.bytes||null,result.text||'']);}
 async function run(id,request){try{await finish(id,await provider(request,{env}));}catch(e){await pool.query("UPDATE vv_generation_pilot SET status='failed',error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',failed_at=NOW() WHERE id=$1",[id]);}}
 app.post('/api/studio/estimate',auth,owner,(req,res)=>{try{
  const request=validateGeneration(req.body),selected=studioConfig(env).catalog.find(m=>m.id===request.model&&m.kind===request.kind);
  if(!selected?.enabled)return res.status(503).json({error:'MODEL_NOT_ENABLED'});
  const quote=estimateGenerationPricing(request,selected,env);if(!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  res.json({credits:quote.credits,unit:'AI credits',model:quote.model,kind:quote.kind});
 }catch(e){res.status(400).json({error:e.message==='INVALID_REQUEST'?'INVALID_REQUEST':'AI_PRICING_NOT_APPROVED'});}});
  app.post('/api/studio/jobs',auth,owner,async(req,res)=>{
  let request;try{request=validateGeneration(req.body);}catch(e){return res.status(400).json({error:e.message});}
  const selected=studioConfig(env).catalog.find(m=>m.id===request.model&&m.kind===request.kind);if(!selected?.enabled)return res.status(503).json({error:'MODEL_NOT_ENABLED'});
  // No consumer credits or existing subscription entitlements are reused in this owner-only pilot.
  let c,id;try{
   await init();c=await pool.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(84920115)');
   const count=await c.query('SELECT count(*)::int AS n FROM vv_generation_pilot');
   if(count.rows[0].n>=Number(env.AI_STUDIO_MAX_CALLS)){await c.query('ROLLBACK');return res.status(429).json({error:'PILOT_LIMIT_REACHED'});}
   id=randomUUID();const settings={ratio:request.ratio,musicMode:request.musicMode||null,referenceCount:request.references?.length||0};await c.query('INSERT INTO vv_generation_pilot(id,user_id,kind,status,provider,model,started_at,settings) VALUES($1,$2,$3,$4,$5,$6,NOW(),$7::jsonb)',[id,req.user.id,request.kind,'processing',selected.provider||null,selected.id,JSON.stringify(settings)]);await c.query('COMMIT');
  }catch(_){if(c)await c.query('ROLLBACK').catch(()=>{});return res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}finally{c?.release();}
  res.status(202).json({id,status:'processing'});void run(id,request).catch(()=>{});
 });
 const getJob=async(req)=>{await init();const r=await pool.query('SELECT * FROM vv_generation_pilot WHERE id=$1 AND user_id=$2 AND deleted=false',[req.params.id,req.user.id]);return r.rows[0];};
 app.get('/api/studio/jobs',auth,owner,async(req,res)=>{try{await init();const {rows}=await pool.query('SELECT id,kind,status,provider,model,error,result_text,mime,created_at,started_at,completed_at,failed_at,credits_reserved,credits_charged,estimated_cost,actual_cost FROM vv_generation_pilot WHERE user_id=$1 AND deleted=false ORDER BY created_at DESC LIMIT 50',[req.user.id]);res.json({items:rows.map(j=>({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,error:j.error||null,text:j.result_text||'',mime:j.mime||null,createdAt:j.created_at,startedAt:j.started_at||null,completedAt:j.completed_at||null,failedAt:j.failed_at||null,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0),estimatedCost:j.estimated_cost==null?null:Number(j.estimated_cost),actualCost:j.actual_cost==null?null:Number(j.actual_cost)}))});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{
  let j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});
  if(j.status==='processing'&&j.operation){try{const result=await poller(j.operation,{env});if(!result.pending){await finish(j.id,result);j=await getJob(req);}}catch(e){if(e.terminal){await pool.query("UPDATE vv_generation_pilot SET status='failed',error='GENERATION_FAILED_NO_AUTOMATIC_RETRY',failed_at=NOW() WHERE id=$1",[j.id]);j=await getJob(req);}else return res.status(502).json({error:'PROVIDER_POLL_FAILED',retryable:true});}}
  if(j.status==='processing'&&!j.operation&&Date.now()-new Date(j.created_at).getTime()>180000)return res.json({id:j.id,status:'unknown',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY'});
  res.json({id:j.id,kind:j.kind,status:j.status,error:j.error,text:j.result_text||'',mime:j.mime});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id/media',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j||j.status!=='ready'||!j.media)return res.status(404).json({error:'RESULT_UNAVAILABLE'});res.type(j.mime).send(j.media);}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.delete('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{const j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});if(j.status==='processing')return res.status(409).json({error:'PROCESSING_CANNOT_BE_CANCELLED'});await pool.query('UPDATE vv_generation_pilot SET deleted=true,media=null,result_text=null WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);res.json({ok:true});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
}
