import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MODELS,MODEL_CATALOG,validateGeneration,generateGoogle,pollGoogle} from './generation-provider.js';
import {generateBytePlus,pollBytePlus,bytePlusDownloadsConfigured} from './generation-byteplus.js';
import {pricingCatalog,estimateGenerationPricing} from './generation-pricing.js';
import {listModelControls,getModelControl,updateModelControl,applyModelControl} from './generation-model-control.js';
import {enforceGenerationPolicy,generationPolicy} from './generation-policy.js';
import {createObjectStorage} from './generation-storage.js';
import {resolveGenerationModel,orderedGenerationCandidates} from './generation-routing.js';
import {normalizeGenerationError,publicGenerationError} from './generation-errors.js';
import {claimProviderPoll} from './generation-polling.js';
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
 const catalog=MODEL_CATALOG.map(m=>({...m,priority:m.id===MODELS[m.kind]?.id?50:100,enabled:enabled&&m.adapter&&(m.provider!=='BytePlus'||m.kind!=='video'||bytePlusDownloadsConfigured(env.BYTEPLUS_MEDIA_HOSTS))&&!!(m.provider==='BytePlus'?env.BYTEPLUS_API_KEY:env.GEMINI_API_KEY)&&allowed.includes(m.kind)&&(m.id===MODELS[m.kind]?.id||explicit.includes(m.id))}));
 return {pilot:true,ownerOnly:true,enabled,pricingConfigured:pricingCatalog(env).configured,publicPolicy:generationPolicy(env),reason:enabled?null:'OWNER_SETUP_REQUIRED',models:Object.entries(MODELS).map(([kind,m])=>({kind,...m,enabled:catalog.find(c=>c.id===m.id)?.enabled||false})),catalog,translation:{enabled:false,reason:'PROVIDER_NOT_CONNECTED'}};
}
export function installGenerationStudio(app,{auth,pool,env=process.env,provider=dispatchGeneration,poller=dispatchPoll,wallet=null,storage=null}){
 let ready;
 const objectStorage=storage||createObjectStorage({env});
 const init=()=>ready??=readFile(new URL('./migrations/20261015-generation-jobs.sql',import.meta.url),'utf8').then(sql=>pool.query(sql));
 const owner=(req,res,next)=>{if(req.user.provider!=='google'||String(req.user.email||'').toLowerCase()!==String(env.ADMIN_EMAIL||'').trim().toLowerCase())return res.status(403).json({error:'OWNER_PILOT_ONLY'});next();};
 const walletEnabled=()=>env.AI_STUDIO_WALLET_ENABLED==='true'&&!!wallet&&pricingCatalog(env).configured;
 const requestFingerprint=request=>createHash('sha256').update(JSON.stringify(request)).digest('hex');
 async function effectiveCatalog(){
  const base=studioConfig(env).catalog;
  if(env.AI_PROVIDER_ADMIN_ENABLED!=='true'||!pool)return base;
  return listModelControls(pool,base);
 }
 async function resolveRequest(body){
  const catalog=await effectiveCatalog();
  let selected;
  if(env.AI_SMART_ROUTING_ENABLED==='true'&&(body?.model==='smart'||!body?.model)){
   const choice=resolveGenerationModel(body,catalog,env);selected=choice.model;
   return {request:validateGeneration({...body,model:selected.id}),selected,routing:{smart:true,candidates:choice.candidates.map(m=>m.id)}};
  }
  const request=validateGeneration(body);selected=catalog.find(m=>m.id===request.model&&m.kind===request.kind);
  if(!selected)throw Error('MODEL_NOT_FOUND');
  if(!selected.enabled)throw Error(selected.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED');
  return {request,selected,routing:{smart:false,candidates:[selected.id]}};
 }
 app.get('/api/studio/config',async(_req,res)=>{const base=studioConfig(env);if(env.AI_PROVIDER_ADMIN_ENABLED!=='true'||!pool)return res.json(base);try{const controlled=await listModelControls(pool,base.catalog);const defaults=base.models.map(m=>{const best=controlled.filter(x=>x.kind===m.kind&&x.enabled).sort((a,b)=>(a.control?.priority??100)-(b.control?.priority??100))[0];return best?{kind:m.kind,id:best.id,label:best.label,ratios:best.ratios,references:best.references,enabled:true}: {...m,enabled:false};});res.json({...base,catalog:controlled,models:defaults});}catch(_){res.json(base);}});
 const modelAdminEnabled=()=>env.AI_PROVIDER_ADMIN_ENABLED==='true'&&!!pool;
 app.get('/api/studio/admin/models',auth,owner,async(_req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const items=await listModelControls(pool,studioConfig(env).catalog);res.json({items});}catch(_){res.status(503).json({error:'MODEL_ADMIN_UNAVAILABLE'});}});
 app.post('/api/studio/admin/route-preview',auth,owner,async(req,res)=>{if(env.AI_SMART_ROUTING_ENABLED!=='true')return res.status(503).json({error:'SMART_ROUTING_NOT_ENABLED'});try{const catalog=await effectiveCatalog();const candidates=orderedGenerationCandidates(req.body,catalog);if(!candidates.length)return res.status(503).json({error:'NO_COMPATIBLE_MODEL'});res.json({primary:candidates[0].id,candidates:candidates.map(m=>({id:m.id,provider:m.provider,priority:Number(m.control?.priority??m.priority??100),quality:m.capabilities?.quality??m.quality??null,durationSeconds:m.capabilities?.durationSeconds??null,maxReferences:m.capabilities?.maxReferences??m.references??0,ratios:m.capabilities?.ratios??m.ratios??[]}))});}catch(_){res.status(503).json({error:'SMART_ROUTING_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/models/:id',auth,owner,async(req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const control=await updateModelControl(pool,{modelId:req.params.id,userId:req.user.id,patch:req.body,catalog:studioConfig(env).catalog});res.json({modelId:req.params.id,control});}catch(e){const status=e.message==='MODEL_NOT_FOUND'?404:e.message==='INVALID_MODEL_CONTROL'?400:503;res.status(status).json({error:status===503?'MODEL_ADMIN_UNAVAILABLE':e.message});}});

 app.get('/api/studio/admin/billing-review',auth,owner,async(_req,res)=>{if(!wallet)return res.status(503).json({error:'AI_WALLET_UNAVAILABLE'});try{
  await init();await wallet.init();
  const {rows}=await pool.query(`SELECT r.job_id,r.user_id,r.credits,j.kind,j.provider,j.model,j.status,j.error,j.error_message,j.created_at
   FROM vv_ai_reservation r JOIN vv_generation_jobs j ON j.id=r.job_id
   WHERE r.status='held' AND j.deleted=false AND j.status='failed' AND j.error_message='AI_WALLET_REVIEW_REQUIRED'
   ORDER BY j.created_at ASC LIMIT 50`);
  res.json({items:rows.map(r=>({jobId:r.job_id,userId:r.user_id,credits:Number(r.credits),kind:r.kind,provider:r.provider||null,model:r.model||null,status:r.status,error:r.error||null,createdAt:r.created_at}))});
 }catch(_){res.status(503).json({error:'AI_WALLET_REVIEW_UNAVAILABLE'});}});
 app.post('/api/studio/admin/billing-review/:id/release',auth,owner,async(req,res)=>{if(!wallet)return res.status(503).json({error:'AI_WALLET_UNAVAILABLE'});const note=String(req.body?.note||'').trim();if(req.body?.confirmJobId!==req.params.id||note.length<3||note.length>200)return res.status(400).json({error:'EXPLICIT_CONFIRMATION_REQUIRED'});try{
  await init();await wallet.init();
  const {rows}=await pool.query(`SELECT r.job_id,r.user_id,r.credits FROM vv_ai_reservation r JOIN vv_generation_jobs j ON j.id=r.job_id
   WHERE r.job_id=$1 AND r.status='held' AND j.deleted=false AND j.status='failed' AND j.error_message='AI_WALLET_REVIEW_REQUIRED'`,[req.params.id]);
  if(!rows.length)return res.status(409).json({error:'BILLING_REVIEW_NOT_RELEASABLE'});
  const item=rows[0];await wallet.settle({userId:item.user_id,jobId:item.job_id,outcome:'confirmed_failure'});
  await pool.query(`UPDATE vv_generation_jobs SET credits_reserved=0,error_message='AI_WALLET_RELEASED_BY_OWNER',
    metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('billingReview',jsonb_build_object('action','release','note',$2,'resolvedBy',$3,'resolvedAt',NOW()::text))
    WHERE id=$1`,[item.job_id,note,req.user.id]);
  res.json({ok:true,jobId:item.job_id,releasedCredits:Number(item.credits)});
 }catch(_){res.status(503).json({error:'AI_WALLET_REVIEW_UNAVAILABLE'});}});
 app.get('/api/studio/admin/users',auth,owner,async(req,res)=>{try{
  await init();if(wallet)await wallet.init();const q=String(req.query.q||'').trim().slice(0,80);
  const {rows}=await pool.query(`SELECT u.id,u.email,u.name,u.provider,u.plan,u.subscription_status,u.has_subscribed,u.plan_limit,u.period_used,u.trial_used,u.created_at,u.updated_at,
    COALESCE(w.available,0)::bigint AS ai_available,COALESCE(w.reserved,0)::bigint AS ai_reserved,COALESCE(w.debt,0)::bigint AS ai_debt,
    (SELECT COUNT(*)::int FROM vv_generation_jobs j WHERE j.user_id=u.id AND j.deleted=false) AS generation_count,
    (SELECT COUNT(*)::int FROM vv_ai_purchase p WHERE p.user_id=u.id) AS ai_purchase_count
   FROM vv_users u LEFT JOIN vv_ai_wallet w ON w.user_id=u.id
   WHERE ($1='' OR COALESCE(u.email,'') ILIKE '%'||$1||'%' OR COALESCE(u.name,'') ILIKE '%'||$1||'%')
   ORDER BY u.created_at DESC LIMIT 50`,[q]);
  res.json({items:rows.map(u=>({id:u.id,email:u.email||null,name:u.name||null,provider:u.provider,plan:u.plan,status:u.subscription_status,hasSubscribed:!!u.has_subscribed,toolUsage:{limit:Number(u.plan_limit||0),periodUsed:Number(u.period_used||0),trialUsed:Number(u.trial_used||0)},aiWallet:{available:Number(u.ai_available||0),reserved:Number(u.ai_reserved||0),debt:Number(u.ai_debt||0)},generationCount:Number(u.generation_count||0),aiPurchaseCount:Number(u.ai_purchase_count||0),createdAt:u.created_at,updatedAt:u.updated_at}))});
 }catch(_){res.status(503).json({error:'OWNER_USERS_UNAVAILABLE'});}});
 app.post('/api/studio/admin/users/:id/credits/adjust',auth,owner,async(req,res)=>{
  if(env.AI_OWNER_CREDIT_ADJUSTMENTS!=='true'||!wallet)return res.status(503).json({error:'OWNER_CREDIT_ADJUSTMENTS_DISABLED'});
  const requestId=String(req.body?.requestId||''),confirmUserId=String(req.body?.confirmUserId||''),delta=Number(req.body?.delta),reason=String(req.body?.reason||'').trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)||confirmUserId!==req.params.id||!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>1000000||reason.length<3||reason.length>200)return res.status(400).json({error:'EXPLICIT_CONFIRMATION_REQUIRED'});
  try{
   await wallet.init();const balance=await wallet.adjust({userId:req.params.id,adjustmentId:requestId,ownerUserId:req.user.id,delta,reason});res.json({ok:true,balance});
  }catch(e){const status=e.message==='INSUFFICIENT_AVAILABLE_AI_CREDITS'?409:e.message==='ADJUSTMENT_CONFLICT'?409:e.message?.startsWith('INVALID_')?400:503;res.status(status).json({error:status===503?'OWNER_CREDIT_ADJUSTMENT_FAILED':e.message});}
 });
 app.get('/api/studio/admin/jobs',auth,owner,async(req,res)=>{try{
  await init();const filter=String(req.query.status||'all'),allowed=new Set(['all','queued','processing','finalizing','ready','failed']);if(!allowed.has(filter))return res.status(400).json({error:'INVALID_JOB_FILTER'});
  const args=[],where=['j.deleted=false'];if(filter!=='all'){args.push(filter);where.push(`j.status=${args.length}`);}
  const {rows}=await pool.query(`SELECT j.id,j.user_id,u.email,j.kind,j.status,j.provider,j.model,j.error,j.error_message,j.created_at,j.started_at,j.completed_at,j.failed_at,j.estimated_cost,j.actual_cost,j.credits_reserved,j.credits_charged
    FROM vv_generation_jobs j LEFT JOIN vv_users u ON u.id=j.user_id WHERE ${where.join(' AND ')} ORDER BY j.created_at DESC LIMIT 100`,args);
  res.json({filter,items:rows.map(j=>({id:j.id,userId:j.user_id,userEmail:j.email||null,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,error:j.error||j.error_message||null,createdAt:j.created_at,durationSeconds:j.started_at&&(j.completed_at||j.failed_at)?Math.max(0,(new Date(j.completed_at||j.failed_at)-new Date(j.started_at))/1000):null,estimatedCost:j.estimated_cost==null?null:Number(j.estimated_cost),actualCost:j.actual_cost==null?null:Number(j.actual_cost),creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0)}))});
 }catch(_){res.status(503).json({error:'OWNER_JOBS_UNAVAILABLE'});}});
 app.get('/api/studio/admin/business',auth,owner,async(_req,res)=>{try{
  await init();if(wallet)await wallet.init();
  const [users,jobs,model,purchases]=await Promise.all([
   pool.query(`SELECT COUNT(*)::int AS users,COUNT(*) FILTER (WHERE created_at>=NOW()-INTERVAL '30 days')::int AS registrations_30d,COUNT(*) FILTER (WHERE has_subscribed)::int AS ever_subscribed,COUNT(*) FILTER (WHERE has_subscribed AND subscription_status NOT IN ('active','trialing','lifetime'))::int AS inactive_after_subscription FROM vv_users`),
   pool.query(`SELECT COUNT(*)::int AS jobs,COUNT(DISTINCT user_id)::int AS generating_users,COUNT(*) FILTER (WHERE status='ready')::int AS ready,COUNT(*) FILTER (WHERE status='failed')::int AS failed,COUNT(*) FILTER (WHERE status IN ('queued','processing','finalizing'))::int AS processing,ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at,failed_at)-started_at))) FILTER (WHERE started_at IS NOT NULL AND (completed_at IS NOT NULL OR failed_at IS NOT NULL))::numeric,2) AS avg_seconds,COALESCE(SUM(actual_cost),0)::numeric AS recorded_cost,COALESCE(SUM(credits_charged),0)::bigint AS credits_charged FROM vv_generation_jobs WHERE deleted=false`),
   pool.query(`SELECT model,COUNT(*)::int AS jobs FROM vv_generation_jobs WHERE deleted=false AND model IS NOT NULL GROUP BY model ORDER BY jobs DESC,model LIMIT 1`),
   pool.query(`SELECT currency,COUNT(*)::int AS purchases,COALESCE(SUM(amount-refunded_amount),0)::bigint AS net_amount_minor,COALESCE(SUM(credits),0)::bigint AS credits_purchased FROM vv_ai_purchase GROUP BY currency ORDER BY currency`)
  ]);
  const u=users.rows[0]||{},j=jobs.rows[0]||{},total=Number(u.users||0),generating=Number(j.generating_users||0),jobCount=Number(j.jobs||0),failed=Number(j.failed||0);
  res.json({users:{total,registrations30d:Number(u.registrations_30d||0),everSubscribed:Number(u.ever_subscribed||0),inactiveAfterSubscription:Number(u.inactive_after_subscription||0),generationAdoptionRate:total?generating/total:0,everSubscribedRate:total?Number(u.ever_subscribed||0)/total:0},generation:{jobs:jobCount,generatingUsers:generating,ready:Number(j.ready||0),failed,processing:Number(j.processing||0),failureRate:jobCount?failed/jobCount:0,jobsPerGeneratingUser:generating?jobCount/generating:0,averageSeconds:j.avg_seconds==null?null:Number(j.avg_seconds),recordedProviderCost:Number(j.recorded_cost||0),creditsCharged:Number(j.credits_charged||0),topModel:model.rows[0]?.model||null},aiPurchases:purchases.rows.map(p=>({currency:p.currency,purchases:Number(p.purchases||0),netAmountMinor:Number(p.net_amount_minor||0),creditsPurchased:Number(p.credits_purchased||0)})),grossMargin:null,grossMarginReason:'Provider cost currency and live AI revenue economics are not yet verified.'});
 }catch(_){res.status(503).json({error:'OWNER_BUSINESS_UNAVAILABLE'});}});
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
  const failure=normalizeGenerationError(e,{stage:'provider_submit'});
  await pool.query("UPDATE vv_generation_jobs SET status='failed',error=$2,error_message=$3,metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('failure',jsonb_build_object('category',$4,'stage',$5,'sourceCode',$6,'retryable',$7)),failed_at=NOW() WHERE id=$1",[id,failure.code,walletEnabled()?'AI_WALLET_REVIEW_REQUIRED':null,failure.category,failure.stage,failure.sourceCode,failure.retryable]);
  if(walletEnabled())await wallet.settle({userId,jobId:id,outcome:'unknown'}).catch(()=>{});
 }}
 app.post('/api/studio/estimate',auth,owner,async(req,res)=>{try{
  const {request,selected,routing}=await resolveRequest(req.body);
  const quote=estimateGenerationPricing(request,selected,env);if(!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  res.json({credits:quote.credits,unit:'AI credits',model:quote.model,kind:quote.kind,routing});
 }catch(e){const bad=['INVALID_REQUEST','UNSUPPORTED_FORMAT','INVALID_REFERENCES','INVALID_MUSIC_MODE'].includes(e.message);res.status(bad?400:503).json({error:bad?e.message:e.message||'AI_PRICING_NOT_APPROVED'});}});
  app.post('/api/studio/jobs',auth,owner,async(req,res)=>{
  let request,selected,routing;try{({request,selected,routing}=await resolveRequest(req.body));}catch(e){const bad=['INVALID_REQUEST','UNSUPPORTED_FORMAT','INVALID_REFERENCES','INVALID_MUSIC_MODE'].includes(e.message);return res.status(bad?400:503).json({error:e.message||'MODEL_NOT_ENABLED'});}
  const quote=walletEnabled()?estimateGenerationPricing(request,selected,env):null;if(walletEnabled()&&!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  let c,id=randomUUID();try{
   await init();c=await pool.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(84920115)');
   await enforceGenerationPolicy(c,{userId:req.user.id,env});
   const count=await c.query('SELECT count(*)::int AS n FROM vv_generation_jobs');
   if(count.rows[0].n>=Number(env.AI_STUDIO_MAX_CALLS)){await c.query('ROLLBACK');return res.status(429).json({error:'PILOT_LIMIT_REACHED'});}
   const settings={ratio:request.ratio,musicMode:request.musicMode||null,referenceCount:request.references?.length||0,routing};
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
  app.get('/api/studio/jobs',auth,owner,async(req,res)=>{try{
  await init();const filter=String(req.query.filter||'all'),allowed=new Set(['all','image','video','failed','processing']);if(!allowed.has(filter))return res.status(400).json({error:'INVALID_HISTORY_FILTER'});
  const where=['user_id=$1','deleted=false'],args=[req.user.id];
  if(filter==='image'||filter==='video'){args.push(filter);where.push(`kind=${args.length}`);}
  else if(filter==='failed')where.push("status='failed'");
  else if(filter==='processing')where.push("status IN ('queued','processing','finalizing')");
  const {rows}=await pool.query(`SELECT id,kind,status,provider,model,prompt,settings,error,result_text,mime,output_assets,created_at,started_at,completed_at,failed_at,credits_reserved,credits_charged,estimated_cost,actual_cost FROM vv_generation_jobs WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 50`,args);
  res.json({filter,items:rows.map(j=>({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',settings:j.settings||{},error:j.error||null,text:j.result_text||'',mime:j.mime||null,storedExternally:Array.isArray(j.output_assets)&&j.output_assets.length>0,createdAt:j.created_at,startedAt:j.started_at||null,completedAt:j.completed_at||null,failedAt:j.failed_at||null,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0),estimatedCost:j.estimated_cost==null?null:Number(j.estimated_cost),actualCost:j.actual_cost==null?null:Number(j.actual_cost)}))});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id',auth,owner,async(req,res)=>{try{
  let j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});
  if(j.status==='finalizing'&&walletEnabled()){try{await wallet.settle({userId:req.user.id,jobId:j.id,outcome:'success'});await pool.query("UPDATE vv_generation_jobs SET status='ready',credits_charged=credits_reserved,error_message=null,completed_at=NOW() WHERE id=$1 AND status='finalizing'",[j.id]);j=await getJob(req);}catch(_){/* Keep durable finalizing state; background/user polling may retry capture. */}}
  if(j.status==='processing'&&j.operation){try{const claimed=await claimProviderPoll(pool,j.id,{minSeconds:5});if(claimed){const result=await poller(j.operation,{env});if(!result.pending){await finish(j.id,result,req.user.id);j=await getJob(req);}}}catch(e){const failure=normalizeGenerationError(e,{stage:'provider_poll'});if(e.terminal){if(walletEnabled())await wallet.settle({userId:req.user.id,jobId:j.id,outcome:'confirmed_failure'}).catch(()=>{});await pool.query("UPDATE vv_generation_jobs SET status='failed',credits_reserved=CASE WHEN $2 THEN 0 ELSE credits_reserved END,error=$3,error_message=null,metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('failure',jsonb_build_object('category',$4,'stage',$5,'sourceCode',$6,'retryable',$7)),failed_at=NOW() WHERE id=$1",[j.id,walletEnabled(),failure.code,failure.category,failure.stage,failure.sourceCode,failure.retryable]);j=await getJob(req);}else return res.status(502).json(publicGenerationError(e,{stage:'provider_poll'}));}}
  if(j.status==='processing'&&!j.operation&&Date.now()-new Date(j.created_at).getTime()>180000)return res.json({id:j.id,status:'unknown',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY',retryAfterSeconds:0});
  res.json({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',error:j.error,text:j.result_text||'',mime:j.mime,createdAt:j.created_at,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0),retryAfterSeconds:['queued','processing','finalizing'].includes(j.status)?5:0});
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
     if(!await claimProviderPoll(client,job.id,{minSeconds:5}))continue;
     try{const result=await poller(current.operation,{env});if(!result.pending)await finish(job.id,result,job.user_id);}
     catch(e){if(e.terminal){const failure=normalizeGenerationError(e,{stage:'recovery_poll'});if(walletEnabled())await wallet.settle({userId:job.user_id,jobId:job.id,outcome:'confirmed_failure'}).catch(()=>{});await pool.query("UPDATE vv_generation_jobs SET status='failed',credits_reserved=CASE WHEN $2 THEN 0 ELSE credits_reserved END,error=$3,error_message=null,metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('failure',jsonb_build_object('category',$4,'stage',$5,'sourceCode',$6,'retryable',$7)),failed_at=NOW() WHERE id=$1",[job.id,walletEnabled(),failure.code,failure.category,failure.stage,failure.sourceCode,failure.retryable]);}}
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
