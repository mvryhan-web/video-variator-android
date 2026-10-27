import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {MODELS,MODEL_CATALOG,validateGeneration,rejectUnsupportedVideoControls,generateGoogle,pollGoogle} from './generation-provider.js';
import {generateBytePlus,pollBytePlus,bytePlusDownloadsConfigured} from './generation-byteplus.js';
import {pricingCatalog,estimateGenerationPricing} from './generation-pricing.js';
import {listModelControls,getModelControl,updateModelControlAudited,applyModelControl,updateProviderGroupControls,publicModelCatalog} from './generation-model-control.js';
import {enforceGenerationPolicy,generationPolicy} from './generation-policy.js';
import {createObjectStorage} from './generation-storage.js';
import {bytePlusPublicDurableStorageReady} from './generation-byteplus-storage-gate.js';
import {installGenerationReferenceUpload} from './generation-reference-upload.js';
import {resolveGenerationModel,orderedGenerationCandidates} from './generation-routing.js';
import {planPreDispatchFallback} from './generation-fallback-policy.js';
import {normalizeGenerationError,publicGenerationError} from './generation-errors.js';
import {quarantineUncertainVideoSubmit,VIDEO_SUBMISSION_UNCERTAIN,videoHistoryPublicStatus} from './generation-video-submit-uncertainty.js';
import {publicProviderPerformanceRow} from './generation-provider-performance.js';
import {claimProviderPoll} from './generation-polling.js';
import {recordAdminAudit,listAdminAudit} from './admin-audit.js';
import {generationEntitlements,generationEntitlementForUser} from './generation-entitlements.js';
import {generationRequestId,findGenerationRequest} from './generation-idempotency.js';
import {generationReadiness} from './generation-readiness.js';
import {ownerProviderTaskId} from './generation-provider-task-id.js';
import {generationFeatureEnabled,generationFeatureSwitches} from './generation-feature-flags.js';
import {aiMigrationStatus} from './ai-migrations.js';
import {completedGenerationSummary,trackedToolUsageSummary} from './generation-business-rates.js';
import {submitPurchasedProviderRequest,PurchasedDispatchDenied} from './generation-purchased-provider-boundary.js';
import {installGenerationConsent,hasStoredGenerationConsent} from './generation-consent.js';
import {generateOpenAIImage} from './generation-openai-image.js';
import {objectStorageConfig} from './generation-storage.js';
export async function dispatchGeneration(request,{env=process.env,fetcher=fetch,authorization=null,signal=null}={}){
 // A purchased consent fence owns signal. A late model/body preparation MUST
 // not start provider transport after the fence times out or revoke is ACKed.
 signal?.throwIfAborted();
 const guardedFetch=(url,options)=>{signal?.throwIfAborted();return fetcher(url,options);};
 const model=MODEL_CATALOG.find(m=>m.id===request.model&&m.kind===request.kind&&m.adapter);
 if(!model)throw Error('MODEL_NOT_CONNECTED');
 if(model.provider==='OpenAI'){
  const proof=authorization?.scope==='purchased_customer_only'&&authorization?.authorized===true&&authorization?.modelId===model.id;
  const modelConfig={id:model.id,enabled:true,quality:'high',maxReferences:model.references,
   formats:['png','jpeg'],sizes:{'1:1':{'1K':'1024x1024'},'3:2':{'1K':'1536x1024'},'2:3':{'1K':'1024x1536'}}};
  return generateOpenAIImage(request,{key:env.OPENAI_API_KEY,modelConfig,
   purchasedJobGate:{customerPaymentConfirmed:proof,purchasedCreditsReserved:proof,
    serverPriceApproved:proof,userConsented:proof,durableStorageReady:proof&&objectStorageConfig(env).configured},fetcher:guardedFetch,signal});
 }
 signal?.throwIfAborted();
 return model.provider==='BytePlus'?generateBytePlus(request,{key:env.BYTEPLUS_API_KEY,fetcher:guardedFetch,signal}):generateGoogle(request,{key:env.GEMINI_API_KEY,fetcher:guardedFetch,signal});
}
export async function dispatchPoll(operation,{env=process.env,fetcher=fetch}={}){
 return operation.startsWith('byteplus:')?pollBytePlus(operation,{key:env.BYTEPLUS_API_KEY,downloadHosts:env.BYTEPLUS_MEDIA_HOSTS,fetcher}):pollGoogle(operation,{key:env.GEMINI_API_KEY,fetcher});
}
export function studioConfig(env=process.env){
 const calls=Number(env.AI_STUDIO_MAX_CALLS||0);
 const enabled=env.AI_STUDIO_ENABLED==='true'&&!!(env.GEMINI_API_KEY||env.BYTEPLUS_API_KEY||env.OPENAI_API_KEY)&&!!env.DATABASE_URL&&!!env.ADMIN_EMAIL&&Number.isInteger(calls)&&calls>0&&calls<=20;
 const allowed=(env.AI_STUDIO_ALLOWED_KINDS||'').split(',');
 const explicit=(env.AI_STUDIO_ALLOWED_MODELS||'').split(',');
 const providerKey=model=>model.provider==='BytePlus'?env.BYTEPLUS_API_KEY:model.provider==='OpenAI'?env.OPENAI_API_KEY:env.GEMINI_API_KEY;
 const catalog=MODEL_CATALOG.map(m=>({...m,priority:m.id===MODELS[m.kind]?.id?50:100,enabled:enabled&&m.adapter&&generationFeatureEnabled(m.kind,m.provider,env)&&(m.provider!=='BytePlus'||m.kind!=='video'||bytePlusDownloadsConfigured(env.BYTEPLUS_MEDIA_HOSTS))&&!!providerKey(m)&&bytePlusPublicDurableStorageReady(m,env)&&allowed.includes(m.kind)&&(m.id===MODELS[m.kind]?.id||explicit.includes(m.id))}));
 const pricingConfigured=pricingCatalog(env).configured,entitlements=generationEntitlements(env),publicReady=env.AI_PUBLIC_GENERATION_ENABLED==='true'&&env.AI_STUDIO_WALLET_ENABLED==='true'&&pricingConfigured&&entitlements.configured;
 const imageBatchEnabled=env.AI_STUDIO_IMAGE_BATCH_ENABLED==='true'&&env.AI_STUDIO_WALLET_ENABLED==='true'&&pricingConfigured;
 return {pilot:!publicReady,ownerOnly:!publicReady,publicGenerationEnabled:publicReady,entitlementsConfigured:entitlements.configured,enabled,pricingConfigured,imageBatchEnabled,featureSwitches:generationFeatureSwitches(env),publicPolicy:generationPolicy(env),reason:enabled?null:'OWNER_SETUP_REQUIRED',models:Object.entries(MODELS).map(([kind,m])=>({kind,...m,enabled:catalog.find(c=>c.id===m.id)?.enabled||false})),catalog,translation:{enabled:false,reason:'PROVIDER_NOT_CONNECTED'}};
}
export function installGenerationStudio(app,{auth,pool,env=process.env,provider=dispatchGeneration,poller=dispatchPoll,wallet=null,storage=null}){
 let ready;
 const objectStorage=storage||createObjectStorage({env});
 const init=()=>ready??=readFile(new URL('./migrations/20261015-generation-jobs.sql',import.meta.url),'utf8').then(sql=>pool.query(sql));
 const isOwner=user=>!!(user&&user.provider==='google'&&String(user.email||'').toLowerCase()===String(env.ADMIN_EMAIL||'').trim().toLowerCase());
 const owner=(req,res,next)=>{if(!isOwner(req.user))return res.status(403).json({error:'OWNER_PILOT_ONLY'});next();};
 installGenerationConsent(app,{auth,pool});
 // Reference intake is owner-only and independently disabled. It never submits an AI job.
 installGenerationReferenceUpload(app,{auth,owner,pool,storage:objectStorage,env});
 const walletEnabled=()=>env.AI_STUDIO_WALLET_ENABLED==='true'&&!!wallet&&pricingCatalog(env).configured;
 const generationUser=(req,res,next)=>{
  if(isOwner(req.user)){req.generationAccess={allowed:true,scope:'owner'};return next();}
  const access=generationEntitlementForUser(req.user,env);if(!access.allowed)return res.status(403).json({error:access.reason});
  if(!walletEnabled())return res.status(503).json({error:'PUBLIC_AI_NOT_READY'});
  req.generationAccess=access;next();
 };
 const requestFingerprint=request=>createHash('sha256').update(JSON.stringify(request)).digest('hex');
 async function effectiveCatalog(){
  const base=studioConfig(env).catalog;
  if(env.AI_PROVIDER_ADMIN_ENABLED!=='true'||!pool)return base;
  return listModelControls(pool,base);
 }
 async function resolveEstimateRequest(body){
  const catalog=await effectiveCatalog(),kind=String(body?.kind||''),ratio=String(body?.ratio||''),musicMode=body?.musicMode==null?null:String(body.musicMode),count=Number(body?.referenceCount||0);
  if(!['image','video','music'].includes(kind)||!Number.isInteger(count)||count<0||count>10)throw Error('INVALID_REQUEST');
  rejectUnsupportedVideoControls(body);
  if(body&&('seed'in body||'negativePrompt'in body||'negative_prompt'in body))throw Error('UNSUPPORTED_IMAGE_CONTROL');
  let selected,routing;
  if(env.AI_SMART_ROUTING_ENABLED==='true'&&(body?.model==='smart'||!body?.model)){
   const candidates=orderedGenerationCandidates({kind,ratio,references:Array.from({length:count}),...(kind==='video'?{videoInputMode:body?.videoInputMode,videoResolution:body?.videoResolution,videoDuration:body?.videoDuration}:{})},catalog);if(!candidates.length)throw Error('NO_COMPATIBLE_MODEL');selected=candidates[0];routing={smart:true,candidates:candidates.map(m=>m.id)};
  }else{
   selected=catalog.find(m=>m.id===body?.model&&m.kind===kind);if(!selected)throw Error('MODEL_NOT_FOUND');if(!selected.enabled)throw Error(selected.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED');routing={smart:false,candidates:[selected.id]};
  }
  if(selected.ratios?.length&&!selected.ratios.includes(ratio))throw Error('UNSUPPORTED_FORMAT');
  const outputFormat=kind==='image'?(body?.outputFormat||selected.capabilities?.outputFormats?.[0]||'auto'):null;
  if(kind==='image'&&!selected.capabilities?.outputFormats?.includes(outputFormat))throw Error('UNSUPPORTED_IMAGE_FORMAT');
  if(kind!=='image'&&body?.outputFormat)throw Error('UNSUPPORTED_IMAGE_FORMAT');
  const resolution=kind==='image'?(body?.resolution||selected.quality||'1K'):null;
  if(kind==='image'&&!selected.capabilities?.resolutions?.includes(resolution))throw Error('UNSUPPORTED_RESOLUTION');
  if(kind!=='image'&&body?.resolution)throw Error('UNSUPPORTED_RESOLUTION');
  const videoInputMode=kind==='video'?(body?.videoInputMode||(count?'first_frame':'text')):null;
  if(kind==='video'&&!selected.capabilities?.videoInputModes?.includes(videoInputMode))throw Error('UNSUPPORTED_VIDEO_INPUT_MODE');
  if(kind==='video'&&(
   videoInputMode==='text'&&count!==0||
   videoInputMode==='first_frame'&&count!==1||
   videoInputMode==='first_last'&&count!==2||
   videoInputMode==='reference_image'&&(count<1||count>3)
  ))throw Error('INVALID_VIDEO_REFERENCES');
  if(kind!=='video'&&body?.videoInputMode!=null)throw Error('UNSUPPORTED_VIDEO_SETTINGS');
  const videoResolution=kind==='video'?(body?.videoResolution||selected.quality):null;
  const videoDuration=kind==='video'?(body?.videoDuration==null?selected.capabilities?.durationSeconds:body.videoDuration):null;
  if(kind==='video'&&!selected.capabilities?.resolutions?.includes(videoResolution))throw Error('UNSUPPORTED_VIDEO_RESOLUTION');
  if(kind==='video'&&!selected.capabilities?.durations?.includes(videoDuration))throw Error('UNSUPPORTED_VIDEO_DURATION');
  if(kind==='video'&&selected.provider==='Google'&&(count>0||videoResolution==='1080p')&&videoDuration!==8)throw Error('UNSUPPORTED_VIDEO_DURATION');
  if(kind!=='video'&&(body?.videoResolution!=null||body?.videoDuration!=null))throw Error('UNSUPPORTED_VIDEO_SETTINGS');
  if(count>Number(selected.references||0))throw Error('INVALID_REFERENCES');
  if(kind==='music'&&!['song','instrumental'].includes(musicMode))throw Error('INVALID_MUSIC_MODE');
  return {request:{kind,model:selected.id,ratio,musicMode,...(kind==='image'?{resolution,outputFormat}:{}),...(kind==='video'?{videoResolution,videoDuration,videoInputMode,referenceCount:count}:{})},selected,routing};
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
 app.get('/api/studio/access',auth,async(req,res)=>{
  if(isOwner(req.user))return res.json({allowed:true,scope:'owner',plan:req.user.plan||null,maxConcurrent:null,maxPerHour:null,activeJobs:null,jobsThisHour:null,reason:null});
  const access=generationEntitlementForUser(req.user,env);let activeJobs=null,jobsThisHour=null;
  if(access.allowed&&pool)try{
   await init();const {rows}=await pool.query("SELECT COUNT(*) FILTER (WHERE status IN ('queued','processing','finalizing'))::int AS active,COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '1 hour')::int AS hourly FROM vv_generation_jobs WHERE user_id=$1 AND deleted=false",[req.user.id]);
   activeJobs=Number(rows[0]?.active||0);jobsThisHour=Number(rows[0]?.hourly||0);
  }catch(_){}
  res.json({allowed:!!access.allowed,scope:access.scope||'public',plan:access.plan||req.user.plan||null,maxConcurrent:access.maxConcurrent??null,maxPerHour:access.maxPerHour??null,activeJobs,jobsThisHour,reason:access.reason||null,walletReady:walletEnabled(),pricingConfigured:pricingCatalog(env).configured});
 });
 app.get('/api/studio/config',async(_req,res)=>{res.set('Cache-Control','no-store');const base=studioConfig(env);if(env.AI_PROVIDER_ADMIN_ENABLED!=='true'||!pool)return res.json(base);try{const controlled=await listModelControls(pool,base.catalog);const defaults=base.models.map(m=>{const best=controlled.filter(x=>x.kind===m.kind&&x.enabled).sort((a,b)=>(a.control?.priority??100)-(b.control?.priority??100))[0];return best?{kind:m.kind,id:best.id,label:best.label,ratios:best.ratios,references:best.references,enabled:true}: {...m,enabled:false};});res.json({...base,catalog:publicModelCatalog(controlled),models:defaults});}catch(_){res.json(base);}});
 const modelAdminEnabled=()=>env.AI_PROVIDER_ADMIN_ENABLED==='true'&&!!pool;
 app.get('/api/studio/admin/models',auth,owner,async(_req,res)=>{res.set('Cache-Control','private, no-store');if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const items=await listModelControls(pool,studioConfig(env).catalog);res.json({items});}catch(_){res.status(503).json({error:'MODEL_ADMIN_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/providers/:provider',auth,owner,async(req,res)=>{
  if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))return res.status(400).json({error:'INVALID_PROVIDER_GROUP_PATCH'});
  const {kind,...patch}=req.body;
  try{
   const result=await updateProviderGroupControls(pool,{provider:req.params.provider,kind,userId:req.user.id,patch,catalog:studioConfig(env).catalog});
   res.json({...result,customerCreditPricesUnchanged:true});
  }catch(e){
   const status=e.message==='INVALID_PROVIDER_GROUP_PATCH'?400:e.message==='PROVIDER_NOT_FOUND'?404:503;
   res.status(status).json({error:status===503?'MODEL_ADMIN_UNAVAILABLE':e.message});
  }
 });
 app.post('/api/studio/admin/route-preview',auth,owner,async(req,res)=>{if(env.AI_SMART_ROUTING_ENABLED!=='true')return res.status(503).json({error:'SMART_ROUTING_NOT_ENABLED'});try{const catalog=await effectiveCatalog();const candidates=orderedGenerationCandidates(req.body,catalog);if(!candidates.length)return res.status(503).json({error:'NO_COMPATIBLE_MODEL'});
  const first=candidates[0],refs=Array.isArray(req.body?.references)?req.body.references.length:req.body?.referenceCount??0;
  const fallback=planPreDispatchFallback({
   smart:true,providerStarted:false,primary:first,candidates,
   request:{...req.body,referenceCount:refs},
   quoteFor:(m,request)=>estimateGenerationPricing({...request,model:m.id},m,env)
  });
  res.json({fallback:{reason:fallback.reason,eligible:fallback.eligible,blocked:fallback.blocked},primary:candidates[0].id,candidates:candidates.map(m=>({id:m.id,provider:m.provider,priority:Number(m.control?.priority??m.priority??100),quality:m.capabilities?.quality??m.quality??null,durationSeconds:m.capabilities?.durationSeconds??null,maxReferences:m.capabilities?.maxReferences??m.references??0,ratios:m.capabilities?.ratios??m.ratios??[]}))});}catch(_){res.status(503).json({error:'SMART_ROUTING_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/models/:id',auth,owner,async(req,res)=>{if(!modelAdminEnabled())return res.status(503).json({error:'MODEL_ADMIN_NOT_ENABLED'});try{const control=await updateModelControlAudited(pool,{modelId:req.params.id,userId:req.user.id,patch:req.body,catalog:studioConfig(env).catalog});res.json({modelId:req.params.id,control});}catch(e){const status=e.message==='MODEL_NOT_FOUND'?404:e.message==='INVALID_MODEL_CONTROL'?400:503;res.status(status).json({error:status===503?'MODEL_ADMIN_UNAVAILABLE':e.message});}});

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
  await recordAdminAudit(pool,{actorUserId:req.user.id,action:'billing_review.release',targetType:'generation_job',targetId:item.job_id,details:{releasedCredits:Number(item.credits),note}});res.json({ok:true,jobId:item.job_id,releasedCredits:Number(item.credits)});
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
   await wallet.init();const balance=await wallet.adjust({userId:req.params.id,adjustmentId:requestId,ownerUserId:req.user.id,delta,reason});await recordAdminAudit(pool,{actorUserId:req.user.id,action:'ai_credits.adjust',targetType:'user',targetId:req.params.id,details:{requestId,delta,reason}});res.json({ok:true,balance});
  }catch(e){const status=e.message==='INSUFFICIENT_AVAILABLE_AI_CREDITS'?409:e.message==='ADJUSTMENT_CONFLICT'?409:e.message?.startsWith('INVALID_')?400:503;res.status(status).json({error:status===503?'OWNER_CREDIT_ADJUSTMENT_FAILED':e.message});}
 });
 app.get('/api/studio/admin/purchases',auth,owner,async(_req,res)=>{try{
  await init();if(wallet)await wallet.init();
  const {rows}=await pool.query(`SELECT p.user_id,u.email,p.credits,p.amount,p.refunded_amount,p.currency,l.created_at
    FROM vv_ai_purchase p LEFT JOIN vv_users u ON u.id=p.user_id
    LEFT JOIN LATERAL (SELECT created_at FROM vv_ai_ledger WHERE user_id=p.user_id AND reference=p.session_id AND kind='purchase' ORDER BY id ASC LIMIT 1) l ON true
    ORDER BY l.created_at DESC NULLS LAST,p.user_id LIMIT 100`);
  res.json({items:rows.map(p=>({userId:p.user_id,userEmail:p.email||null,credits:Number(p.credits||0),amountMinor:Number(p.amount||0),refundedMinor:Number(p.refunded_amount||0),netMinor:Number(p.amount||0)-Number(p.refunded_amount||0),currency:p.currency,createdAt:p.created_at||null}))});
 }catch(_){res.status(503).json({error:'OWNER_PURCHASES_UNAVAILABLE'});}});
 app.get('/api/studio/admin/jobs',auth,owner,async(req,res)=>{try{
  await init();const filter=String(req.query.status||'all'),allowed=new Set(['all','queued','processing','finalizing','ready','failed']);if(!allowed.has(filter))return res.status(400).json({error:'INVALID_JOB_FILTER'});
  const args=[],where=['j.deleted=false'];if(filter!=='all'){args.push(filter);where.push(`j.status=${args.length}`);}
  const {rows}=await pool.query(`SELECT j.id,j.user_id,u.email,j.kind,j.status,j.provider,j.model,j.provider_task_id,j.error,j.error_message,j.created_at,j.started_at,j.completed_at,j.failed_at,j.estimated_cost,j.actual_cost,j.cost_currency,j.credits_reserved,j.credits_charged
    FROM vv_generation_jobs j LEFT JOIN vv_users u ON u.id=j.user_id WHERE ${where.join(' AND ')} ORDER BY j.created_at DESC LIMIT 100`,args);
  res.json({filter,items:rows.map(j=>({id:j.id,userId:j.user_id,userEmail:j.email||null,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,providerTaskId:ownerProviderTaskId(j.provider,j.provider_task_id),error:j.error||j.error_message||null,createdAt:j.created_at,durationSeconds:j.started_at&&(j.completed_at||j.failed_at)?Math.max(0,(new Date(j.completed_at||j.failed_at)-new Date(j.started_at))/1000):null,estimatedCost:j.estimated_cost==null?null:Number(j.estimated_cost),actualCost:j.actual_cost==null?null:Number(j.actual_cost),costCurrency:j.cost_currency||null,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0)}))});
 }catch(_){res.status(503).json({error:'OWNER_JOBS_UNAVAILABLE'});}});
 app.get('/api/studio/admin/readiness',auth,owner,(_req,res)=>res.json(generationReadiness(env)));
 app.get('/api/studio/admin/migrations',auth,owner,async(_req,res)=>{try{const items=await aiMigrationStatus(pool);res.json({items,ready:items.every(x=>x.applied&&x.checksumMatches)});}catch(_){res.status(503).json({error:'MIGRATION_STATUS_UNAVAILABLE'});}});
 app.get('/api/studio/admin/audit',auth,owner,async(_req,res)=>{try{res.json({items:await listAdminAudit(pool,{limit:100})});}catch(_){res.status(503).json({error:'OWNER_AUDIT_UNAVAILABLE'});}});
 app.get('/api/studio/admin/business',auth,owner,async(_req,res)=>{try{
  await init();if(wallet)await wallet.init();
  // BASE #37 owner-only aggregate metrics: do not return user/payment identifiers.
  const [users,jobs,model,creationTypes,purchases,costs,firstGenerations,paidAccounts]=await Promise.all([
   pool.query(`SELECT COUNT(*)::int AS users,COUNT(*) FILTER (WHERE created_at>=NOW()-INTERVAL '30 days')::int AS registrations_30d,COUNT(*) FILTER (WHERE has_subscribed)::int AS ever_subscribed,COUNT(*) FILTER (WHERE has_subscribed AND subscription_status NOT IN ('active','trialing','lifetime'))::int AS inactive_after_subscription FROM vv_users`),
   pool.query(`SELECT COUNT(*)::int AS jobs,COUNT(DISTINCT user_id)::int AS generating_users,COUNT(*) FILTER (WHERE status='ready')::int AS ready,COUNT(*) FILTER (WHERE status='failed')::int AS failed,COUNT(*) FILTER (WHERE status IN ('queued','processing','finalizing'))::int AS processing,ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at,failed_at)-started_at))) FILTER (WHERE started_at IS NOT NULL AND (completed_at IS NOT NULL OR failed_at IS NOT NULL))::numeric,2) AS avg_seconds,COALESCE(SUM(credits_charged),0)::bigint AS credits_charged FROM vv_generation_jobs WHERE deleted=false`),
   pool.query(`SELECT model,COUNT(*)::int AS jobs FROM vv_generation_jobs WHERE deleted=false AND model IS NOT NULL GROUP BY model ORDER BY jobs DESC,model LIMIT 1`),
   pool.query(`SELECT kind,COUNT(*)::int AS jobs,
     COUNT(*) FILTER (WHERE status='ready')::int AS ready,
     COUNT(*) FILTER (WHERE status='failed')::int AS failed
     FROM vv_generation_jobs WHERE deleted=false AND kind IN ('image','video','music','voice')
     GROUP BY kind ORDER BY jobs DESC,kind ASC`),
   pool.query(`SELECT currency,COUNT(*)::int AS purchases,COALESCE(SUM(amount-refunded_amount),0)::bigint AS net_amount_minor,COALESCE(SUM(credits),0)::bigint AS credits_purchased FROM vv_ai_purchase GROUP BY currency ORDER BY currency`),
   pool.query(`SELECT COALESCE(cost_currency,'unknown') AS currency,
     COALESCE(SUM(actual_cost),0)::numeric AS amount,
     COUNT(*) FILTER (WHERE status='ready')::int AS ready_priced_jobs,
     ROUND(AVG(actual_cost) FILTER (WHERE status='ready'),6) AS avg_ready_cost
     FROM vv_generation_jobs WHERE deleted=false AND actual_cost IS NOT NULL
     GROUP BY COALESCE(cost_currency,'unknown') ORDER BY currency`),
   pool.query(`SELECT COUNT(*)::int AS first_success_users,
     COUNT(*) FILTER (WHERE first_success_at>=NOW()-INTERVAL '30 days')::int AS first_success_30d
     FROM (SELECT user_id,MIN(COALESCE(completed_at,created_at)) AS first_success_at
       FROM vv_generation_jobs WHERE deleted=false AND status='ready' GROUP BY user_id) firsts`),
   pool.query(`SELECT COUNT(DISTINCT p.user_id)::int AS paying_accounts
     FROM vv_ai_purchase p JOIN vv_users u ON u.id=p.user_id
     WHERE p.amount>0 AND p.amount>p.refunded_amount`)
  ]);
  const trackedToolUsage=await trackedToolUsageSummary(pool);
  const typeCounts=creationTypes.rows.map(x=>({kind:x.kind,jobs:Number(x.jobs||0),ready:Number(x.ready||0),failed:Number(x.failed||0)})),u=users.rows[0]||{},j=jobs.rows[0]||{},total=Number(u.users||0),generating=Number(j.generating_users||0),jobCount=Number(j.jobs||0),failed=Number(j.failed||0),
   paid=Math.min(total,Math.max(0,Number(paidAccounts.rows[0]?.paying_accounts||0))),
   firstSuccess=Number(firstGenerations.rows[0]?.first_success_users||0),
   firstSuccess30d=Number(firstGenerations.rows[0]?.first_success_30d||0);
  res.json({users:{total,registrations30d:Number(u.registrations_30d||0),everSubscribed:Number(u.ever_subscribed||0),inactiveAfterSubscription:Number(u.inactive_after_subscription||0),generationAdoptionRate:total?generating/total:0,everSubscribedRate:total?Number(u.ever_subscribed||0)/total:0,
   aiCreditBuyers:paid,aiCreditBuyerConversionRate:total?paid/total:0},generation:{jobs:jobCount,generatingUsers:generating,
   firstSuccessfulUsers:firstSuccess,firstSuccessfulUsers30d:firstSuccess30d,...trackedToolUsage,ready:Number(j.ready||0),failed,processing:Number(j.processing||0),failureRate:jobCount?failed/jobCount:0,...completedGenerationSummary({ready:Number(j.ready||0),failed}),jobsPerGeneratingUser:generating?jobCount/generating:0,averageSeconds:j.avg_seconds==null?null:Number(j.avg_seconds),providerCosts:costs.rows.map(c=>({currency:c.currency,amount:Number(c.amount||0),
    readyPricedJobs:Number(c.ready_priced_jobs||0),
    averageReadyJobCost:c.avg_ready_cost==null?null:Number(c.avg_ready_cost)})),creditsCharged:Number(j.credits_charged||0),topModel:model.rows[0]?.model||null,creationTypes:typeCounts,topCreationType:typeCounts[0]?.kind||null},aiPurchases:purchases.rows.map(p=>({currency:p.currency,purchases:Number(p.purchases||0),netAmountMinor:Number(p.net_amount_minor||0),creditsPurchased:Number(p.credits_purchased||0)})),grossMargin:null,grossMarginReason:'Provider cost currency and live AI revenue economics are not yet verified.',
   unverifiedMetrics:{trialToPaid:null,churnRate:null,revenuePerUser:null,mostUsedTool:null},
   analyticsScope:'Saved non-deleted generation jobs and net-positive confirmed AI-credit purchases only; no live Stripe or provider revenue verification.'});
 }catch(_){res.status(503).json({error:'OWNER_BUSINESS_UNAVAILABLE'});}});
  app.use('/api/studio',(_req,res,next)=>{if(!studioConfig(env).enabled)return res.status(503).json({error:'OWNER_SETUP_REQUIRED'});next();});
 async function failTerminalProviderJob(id,userId,error,stage){
  const failure=normalizeGenerationError(error,{stage});
  let released=false;
  if(walletEnabled()){
   try{const result=await wallet.settle({userId,jobId:id,outcome:'confirmed_failure'});released=result?.status==='released';}
   catch(_){/* Keep reservation held for audited owner review. */}
  }
  await pool.query("UPDATE vv_generation_jobs SET status='failed',credits_reserved=CASE WHEN $2 THEN 0 ELSE credits_reserved END,error=$3,error_message=CASE WHEN $4 THEN 'AI_WALLET_REVIEW_REQUIRED' ELSE NULL END,metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('failure',jsonb_build_object('category',$5,'stage',$6,'sourceCode',$7,'retryable',$8)),failed_at=NOW() WHERE id=$1",[id,released,failure.code,walletEnabled()&&!released,failure.category,failure.stage,failure.sourceCode,failure.retryable]);
 }
 async function finish(id,result,userId){
  if(result.operation){await pool.query("UPDATE vv_generation_jobs SET status='processing',operation=$2 WHERE id=$1",[id,result.operation]);return;}
  let asset=null,media=result.bytes||null;
  if(objectStorage.configured&&result.bytes){
   try{asset=await objectStorage.putGeneration({userId,jobId:id,mime:result.mime,bytes:result.bytes});media=null;}
   catch(_){
    // A produced Video is already a potentially billable provider result.
    // S3 outage is not proof that the AI call failed: never refund a held
    // reservation or automatically resubmit an expensive Video generation.
    // If provider task ID was already stored, preserve it so the worker may
    // retrieve the SAME result again when object storage recovers.
    const recorded=await pool.query('SELECT kind FROM vv_generation_jobs WHERE id=$1',[id]);
    if(recorded.rows?.[0]?.kind==='video'){
     await quarantineUncertainVideoSubmit({pool,jobId:id,failure:{
      category:'storage',sourceCode:'OBJECT_STORAGE_FAILED'
     }});
     return;
    }
    await failTerminalProviderJob(id,userId,Error('OBJECT_STORAGE_FAILED'),'storage');
    return;
   }
  }
  const assets=asset?[asset]:[];
  // The existing provider_task_id column is generated from operation. Preserve
  // its source after output is ready; recovery polls ONLY processing jobs.
  if(!walletEnabled()){await pool.query("UPDATE vv_generation_jobs SET status='ready',mime=$2,media=$3,result_text=$4,output_assets=$5::jsonb,completed_at=NOW() WHERE id=$1",[id,result.mime||null,media,result.text||'',JSON.stringify(assets)]);return;}
  await pool.query("UPDATE vv_generation_jobs SET status='finalizing',mime=$2,media=$3,result_text=$4,output_assets=$5::jsonb,error_message='AI_WALLET_CAPTURE_PENDING' WHERE id=$1",[id,result.mime||null,media,result.text||'',JSON.stringify(assets)]);
  try{await wallet.settle({userId,jobId:id,outcome:'success'});await pool.query("UPDATE vv_generation_jobs SET status='ready',credits_charged=credits_reserved,error_message=null,completed_at=NOW() WHERE id=$1",[id]);}
  catch(_){/* Durable finalizing state is retried by recoveryTick; never regenerate provider output. */}
 }
 async function run(id,request,user,selected,originalQuote,fingerprint){try{
  // Re-read durable owner, request, consent and quote AFTER reserving the wallet.
  const {rows}=await pool.query('SELECT user_id,kind,model,provider,status,operation,deleted,request_fingerprint,credits_reserved,settings,estimated_cost,cost_currency FROM vv_generation_jobs WHERE id=$1 AND user_id=$2',[id,user.id]);
  const job=rows[0]?{...rows[0],id,userId:rows[0].user_id,requestFingerprint:rows[0].request_fingerprint,creditsReserved:Number(rows[0].credits_reserved)}:null;
  const quote=estimateGenerationPricing(request,selected,env);
  const result=await submitPurchasedProviderRequest({env,wallet,pool,user:{id:user.id,email:user.email,isOwner:isOwner(user)},job,request,model:selected,quote,originalQuote,fingerprint,provider});
  await finish(id,result,user.id);
 }catch(e){
  // A verified pre-provider refusal cannot have incurred an AI provider cost.
  // Return the held reservation exactly once; an ambiguous provider result
  // is NEVER auto-refunded and remains reserved for reconciliation.
  if(e instanceof PurchasedDispatchDenied){
   await failTerminalProviderJob(id,user.id,e,'pre_provider_authorization');
   return;
  }
  const failure=normalizeGenerationError(e,{stage:'provider_submit'});
  if(request.kind==='video'){
   // Submission may already be billable remotely. Preserve one original job
   // and held credits for audit; never label a potentially running video failed.
   await quarantineUncertainVideoSubmit({pool,jobId:id,failure});
   if(walletEnabled())await wallet.settle({userId:user.id,jobId:id,outcome:'unknown'}).catch(()=>{});
   return;
  }
  await pool.query("UPDATE vv_generation_jobs SET status='failed',error=$2,error_message=$3,metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('failure',jsonb_build_object('category',$4,'stage',$5,'sourceCode',$6,'retryable',$7)),failed_at=NOW() WHERE id=$1",[id,failure.code,walletEnabled()?'AI_WALLET_REVIEW_REQUIRED':null,failure.category,failure.stage,failure.sourceCode,failure.retryable]);
  if(walletEnabled())await wallet.settle({userId:user.id,jobId:id,outcome:'unknown'}).catch(()=>{});
 }}
 app.post('/api/studio/estimate',auth,generationUser,async(req,res)=>{try{
  const {request,selected,routing}=await resolveEstimateRequest(req.body);
  const quantity=req.body?.quantity==null?1:Number(req.body.quantity);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>4||quantity>1&&request.kind!=='image')return res.status(400).json({error:'INVALID_IMAGE_QUANTITY'});
  if(quantity>1&&!(studioConfig(env).imageBatchEnabled&&walletEnabled()))return res.status(503).json({error:'IMAGE_BATCH_NOT_ENABLED'});
  const quote=estimateGenerationPricing(request,selected,env);if(!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  const totalCredits=quote.credits*quantity;
  if(!Number.isSafeInteger(totalCredits)||totalCredits>10_000_000)return res.status(400).json({error:'INVALID_IMAGE_QUANTITY'});
  res.json({credits:totalCredits,perImageCredits:quote.credits,quantity,unit:'AI credits',model:quote.model,kind:quote.kind,routing});
 }catch(e){const bad=['INVALID_REQUEST','UNSUPPORTED_FORMAT','UNSUPPORTED_RESOLUTION','UNSUPPORTED_IMAGE_FORMAT','UNSUPPORTED_IMAGE_CONTROL','UNSUPPORTED_VIDEO_RESOLUTION','UNSUPPORTED_VIDEO_DURATION','UNSUPPORTED_VIDEO_SETTINGS','UNSUPPORTED_VIDEO_INPUT_MODE','INVALID_VIDEO_REFERENCES','INVALID_REFERENCES','INVALID_MUSIC_MODE','UNSUPPORTED_VIDEO_CONTROL'].includes(e.message);res.status(bad?400:503).json({error:bad?e.message:e.message||'AI_PRICING_NOT_APPROVED'});}});
  app.post('/api/studio/jobs',auth,generationUser,async(req,res)=>{
  let request,selected,routing,clientRequestId;try{
   // The job endpoint always creates ONE image. Multi-image batches must use distinct, independently idempotent jobs.
   if(req.body?.quantity!=null&&req.body.quantity!==1)throw Error('INVALID_IMAGE_QUANTITY');
   ({request,selected,routing}=await resolveRequest(req.body));
   clientRequestId=generationRequestId(req.body?.requestId,{required:req.generationAccess?.scope==='public'});
  }catch(e){const bad=['INVALID_REQUEST','UNSUPPORTED_FORMAT','UNSUPPORTED_RESOLUTION','UNSUPPORTED_IMAGE_FORMAT','UNSUPPORTED_IMAGE_CONTROL','UNSUPPORTED_VIDEO_RESOLUTION','UNSUPPORTED_VIDEO_DURATION','UNSUPPORTED_VIDEO_SETTINGS','UNSUPPORTED_VIDEO_INPUT_MODE','INVALID_VIDEO_REFERENCES','INVALID_REFERENCES','INVALID_MUSIC_MODE','UNSUPPORTED_VIDEO_CONTROL','GENERATION_REQUEST_ID_REQUIRED','INVALID_GENERATION_REQUEST_ID','INVALID_IMAGE_QUANTITY'].includes(e.message);return res.status(bad?400:503).json({error:e.message||'MODEL_NOT_ENABLED'});}
  const premiumVideo=request.kind==='video'&&(request.videoResolution!==selected.quality||request.videoDuration!==selected.capabilities?.durationSeconds||!['text','first_frame'].includes(request.videoInputMode)||request.references?.length>1);
  const quote=walletEnabled()||premiumVideo?estimateGenerationPricing(request,selected,env):null;
  if((walletEnabled()||premiumVideo)&&!quote)return res.status(503).json({error:'AI_PRICING_NOT_APPROVED'});
  // No owner pilot or promotional/unknown funding may reach a possibly billable
  // provider: B's gate + D's atomic verified purchase are both mandatory.
  if(!walletEnabled()||typeof wallet?.purchasedDispatchVerifier!=='function'||
    env.AI_PURCHASED_ONLY_DISPATCH_ENABLED!=='true'||isOwner(req.user)||
    !quote||!quote.currency)
   return res.status(503).json({error:'AI_PURCHASED_DISPATCH_NOT_AUTHORIZED'});
  // Every billable job must carry the current server quote the user explicitly accepted.
  // Missing, malformed or stale quotes fail before insertion, reservation or provider dispatch.
  if(!Number.isSafeInteger(req.body?.expectedCredits)||req.body.expectedCredits<=0||req.body.expectedCredits!==quote?.credits)
   return res.status(409).json({error:'AI_ESTIMATE_CHANGED'});
  if(req.body?.consent!==true)return res.status(400).json({error:'EXPLICIT_CONSENT_REQUIRED'});
  try{if(!(await hasStoredGenerationConsent(pool,req.user.id)))return res.status(403).json({error:'PROVIDER_CONSENT_REQUIRED'});}
  catch(_){return res.status(503).json({error:'CONSENT_STORAGE_UNAVAILABLE'});}
  const fingerprint=requestFingerprint(request);let c,id=randomUUID(),reused=null;try{
   await init();c=await pool.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['ai-create:'+req.user.id]);
   reused=await findGenerationRequest(c,{userId:req.user.id,requestId:clientRequestId,fingerprint});
   if(reused){await c.query('COMMIT');return res.status(200).json({...reused,reused:true});}
   const access=req.generationAccess||{scope:'owner'};
   await enforceGenerationPolicy(c,{userId:req.user.id,env,policyOverride:access.scope==='public'?{enabled:true,maxConcurrentPerUser:access.maxConcurrent,maxJobsPerHourPerUser:access.maxPerHour}:null});
   if(access.scope==='owner'){const count=await c.query('SELECT count(*)::int AS n FROM vv_generation_jobs');if(count.rows[0].n>=Number(env.AI_STUDIO_MAX_CALLS)){await c.query('ROLLBACK');return res.status(429).json({error:'PILOT_LIMIT_REACHED'});}}
   const settings={ratio:request.ratio,resolution:request.resolution||null,outputFormat:request.outputFormat||null,videoResolution:request.videoResolution||null,videoDuration:request.videoDuration??null,videoInputMode:request.videoInputMode||null,musicMode:request.musicMode||null,referenceCount:request.references?.length||0,routing,
    dispatchConsent:req.body?.consent===true,
    purchasedQuote:{model:quote.model,provider:quote.provider,kind:quote.kind,credits:quote.credits,providerCostMicros:quote.providerCostMicros,currency:quote.currency}};
   await c.query('INSERT INTO vv_generation_jobs(id,user_id,kind,status,provider,model,prompt,client_request_id,request_fingerprint,started_at,settings,estimated_cost,cost_currency) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10::jsonb,$11,$12)',[id,req.user.id,request.kind,walletEnabled()?'queued':'processing',selected.provider||null,selected.id,request.prompt,clientRequestId,fingerprint,JSON.stringify(settings),quote?quote.providerCostMicros/1_000_000:null,quote?.currency||null]);await c.query('COMMIT');
  }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});if(['AI_CONCURRENCY_LIMIT','AI_RATE_LIMIT'].includes(e.message))return res.status(429).json({error:e.message});if(e.message==='GENERATION_REQUEST_CONFLICT')return res.status(409).json({error:e.message});return res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}finally{c?.release();}
  if(walletEnabled())try{
   await wallet.reserve({userId:req.user.id,jobId:id,credits:quote.credits,fingerprint});
   await pool.query("UPDATE vv_generation_jobs SET status='processing',credits_reserved=$2 WHERE id=$1",[id,quote.credits]);
  }catch(e){
   // No provider has been invoked at this point. A wallet reserve can
   // succeed while writing its matching job credits fails. Return any
   // successfully held credits, never strand a charge for a failed start.
   if(walletEnabled())try{await wallet.settle({userId:req.user.id,jobId:id,outcome:'confirmed_failure'});}catch(_){/* No provider was called; preserve auditable held state on refund DB failure. */}
   await pool.query("UPDATE vv_generation_jobs SET status='failed',error=$2,error_message=$2,failed_at=NOW() WHERE id=$1",[id,e.message==='INSUFFICIENT_AI_CREDITS'?'INSUFFICIENT_AI_CREDITS':'AI_WALLET_RESERVATION_FAILED']).catch(()=>{});
   return res.status(e.message==='INSUFFICIENT_AI_CREDITS'?402:503).json({error:e.message==='INSUFFICIENT_AI_CREDITS'?'INSUFFICIENT_AI_CREDITS':'AI_WALLET_UNAVAILABLE'});
  }
  res.status(202).json({id,status:'processing',creditsReserved:quote.credits});void run(id,request,{id:req.user.id,email:req.user.email,provider:req.user.provider},selected,quote,fingerprint).catch(()=>{});
 });
 // Read-only recovery of a Video POST whose HTTP reply was lost. This
 // NEVER dispatches/retries a provider, reserves credits or returns media.
 app.get('/api/studio/jobs/by-request/:requestId',auth,generationUser,async(req,res)=>{res.set('Cache-Control','private, no-store');
  let requestId;
  try{requestId=generationRequestId(req.params.requestId,{required:true});}
  catch(_){return res.status(400).json({error:'INVALID_GENERATION_REQUEST_ID'});}
  try{
   await init();
   const {rows}=await pool.query(
    "SELECT id,kind,status FROM vv_generation_jobs WHERE user_id=$1 AND client_request_id=$2 AND kind='video' AND deleted=false LIMIT 1",
    [req.user.id,requestId]);
   const original=rows[0];
   if(!original)return res.status(404).json({error:'NOT_FOUND'});
   res.json({id:original.id,kind:'video',status:original.status});
  }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}
 });
 const getJob=async(req)=>{await init();const r=await pool.query('SELECT * FROM vv_generation_jobs WHERE id=$1 AND user_id=$2 AND deleted=false',[req.params.id,req.user.id]);return r.rows[0];};
 app.get('/api/studio/admin/metrics',auth,owner,async(req,res)=>{try{
  await init();const window=String(req.query.window||'7d'),windows={'24h':'1 day','7d':'7 days','30d':'30 days',all:null};if(!(window in windows))return res.status(400).json({error:'INVALID_METRICS_WINDOW'});
  const args=[],where=['deleted=false'];if(windows[window]){args.push(windows[window]);where.push(`created_at>=NOW()-${args.length}::interval`);}
  const {rows}=await pool.query(`SELECT provider,model,kind,COALESCE(cost_currency,'unknown') AS cost_currency,
    COUNT(*)::int AS jobs,
    COUNT(*) FILTER (WHERE status='ready')::int AS succeeded,
    COUNT(*) FILTER (WHERE status='failed')::int AS failed,
    COUNT(*) FILTER (WHERE status IN ('queued','processing','finalizing'))::int AS processing,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at,failed_at)-started_at))) FILTER (WHERE started_at IS NOT NULL AND (completed_at IS NOT NULL OR failed_at IS NOT NULL))::numeric,2) AS avg_seconds,
    COALESCE(SUM(actual_cost),0)::numeric AS actual_cost,
    COALESCE(SUM(credits_charged),0)::bigint AS credits_charged
   FROM vv_generation_jobs
   WHERE ${where.join(' AND ')}
   GROUP BY provider,model,kind,COALESCE(cost_currency,'unknown')
   ORDER BY jobs DESC,provider,model,cost_currency`,args);
  res.json({window,items:rows.map(publicProviderPerformanceRow)});
 }catch(_){res.status(503).json({error:'STUDIO_ANALYTICS_UNAVAILABLE'});}});
  app.get('/api/studio/jobs',auth,generationUser,async(req,res)=>{res.set('Cache-Control','private, no-store');try{
  await init();const filter=String(req.query.filter||'all'),allowed=new Set(['all','image','video','music','failed','processing']);if(!allowed.has(filter))return res.status(400).json({error:'INVALID_HISTORY_FILTER'});
  const where=['user_id=$1','deleted=false'],args=[req.user.id];
  if(filter==='image'||filter==='video'||filter==='music'){args.push(filter);where.push(`kind=$${args.length}`);}
  else if(filter==='failed')where.push("status='failed'");
  else if(filter==='processing')where.push("status IN ('queued','processing','finalizing')");
  const {rows}=await pool.query(`SELECT id,kind,status,operation,provider,model,prompt,settings,error,result_text,mime,output_assets,created_at,started_at,completed_at,failed_at,credits_reserved,credits_charged FROM vv_generation_jobs WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 50`,args);
  // The durable job must retain purchasedQuote and routing for single-use
  // purchased-provider authorization. Only UI-safe scalar fields leave History.
  const publicSettings=stored=>{
   const src=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
   const safe={};
   for(const name of ['ratio','resolution','outputFormat','videoResolution','videoInputMode','musicMode']){
    if(typeof src[name]==='string'&&src[name].length<=32&&/^[a-zA-Z0-9:._-]+$/.test(src[name]))safe[name]=src[name];
   }
   for(const [name,max] of [['videoDuration',120],['referenceCount',10]]){
    if(Number.isSafeInteger(src[name])&&src[name]>=0&&src[name]<=max)safe[name]=src[name];
   }
   return safe;
  };
  res.json({filter,items:rows.map(j=>({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',settings:publicSettings(j.settings),error:j.error||null,...videoHistoryPublicStatus(j),text:j.result_text||'',mime:j.mime||null,storedExternally:Array.isArray(j.output_assets)&&j.output_assets.length>0,createdAt:j.created_at,startedAt:j.started_at||null,completedAt:j.completed_at||null,failedAt:j.failed_at||null,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0)}))});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id',auth,generationUser,async(req,res)=>{res.set('Cache-Control','private, no-store');try{
  let j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});
  if(j.status==='finalizing'&&walletEnabled()){try{await wallet.settle({userId:req.user.id,jobId:j.id,outcome:'success'});await pool.query("UPDATE vv_generation_jobs SET status='ready',credits_charged=credits_reserved,error_message=null,completed_at=NOW() WHERE id=$1 AND status='finalizing'",[j.id]);j=await getJob(req);}catch(_){/* Keep durable finalizing state; background/user polling may retry capture. */}}
  if(j.status==='processing'&&j.operation){try{const claimed=await claimProviderPoll(pool,j.id,{minSeconds:5});if(claimed){const result=await poller(j.operation,{env});if(!result.pending){await finish(j.id,result,req.user.id);j=await getJob(req);}}}catch(e){if(e.terminal){await failTerminalProviderJob(j.id,req.user.id,e,'provider_poll');j=await getJob(req);}else return res.status(502).json(publicGenerationError(e,{stage:'provider_poll'}));}}
  // A queued Video without an operation may have reached the provider even if
   // the acknowledgement was lost. Do not offer a fresh paid dispatch.
   if(j.kind==='video'&&!j.operation&&videoHistoryPublicStatus(j).error===VIDEO_SUBMISSION_UNCERTAIN)return res.json({id:j.id,kind:'video',status:'unknown',error:VIDEO_SUBMISSION_UNCERTAIN,retryAfterSeconds:0});
  if(j.status==='processing'&&!j.operation&&Date.now()-new Date(j.created_at).getTime()>180000)return res.json({id:j.id,status:'unknown',error:'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY',retryAfterSeconds:0});
  res.json({id:j.id,kind:j.kind,status:j.status,provider:j.provider||null,model:j.model||null,prompt:j.prompt||'',error:j.error,text:j.result_text||'',mime:j.mime,createdAt:j.created_at,creditsReserved:Number(j.credits_reserved||0),creditsCharged:Number(j.credits_charged||0),retryAfterSeconds:['queued','processing','finalizing'].includes(j.status)?5:0});
 }catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.get('/api/studio/jobs/:id/media',auth,generationUser,async(req,res)=>{res.set('Cache-Control','private, no-store');try{const j=await getJob(req);if(!j||j.status!=='ready')return res.status(404).json({error:'RESULT_UNAVAILABLE'});if(j.media)return res.type(j.mime).send(j.media);const asset=Array.isArray(j.output_assets)?j.output_assets[0]:null;if(!asset||asset.storage!=='s3'||!objectStorage.configured)return res.status(404).json({error:'RESULT_UNAVAILABLE'});const bytes=await objectStorage.get(asset.key,{expectedSha256:asset.sha256??null});res.type(asset.mime||j.mime).send(bytes);}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 app.delete('/api/studio/jobs/:id',auth,generationUser,async(req,res)=>{try{const j=await getJob(req);if(!j)return res.status(404).json({error:'NOT_FOUND'});if(['queued','processing','finalizing'].includes(j.status))return res.status(409).json({error:'PROCESSING_CANNOT_BE_CANCELLED'});if(Number(j.credits_reserved||0)>Number(j.credits_charged||0))return res.status(409).json({error:'BILLING_REVIEW_REQUIRED'});const assets=Array.isArray(j.output_assets)?j.output_assets:[];if(assets.length){if(!objectStorage.configured)return res.status(503).json({error:'OBJECT_STORAGE_NOT_CONFIGURED'});for(const asset of assets)if(asset?.storage==='s3'&&asset.key)await objectStorage.delete(asset.key);}await pool.query("UPDATE vv_generation_jobs SET deleted=true,media=null,result_text=null,output_assets='[]'::jsonb WHERE id=$1 AND user_id=$2",[req.params.id,req.user.id]);res.json({ok:true});}catch(_){res.status(503).json({error:'STUDIO_STORAGE_UNAVAILABLE'});}});
 let recoveryTimer=null,recoveryBusy=false;
 function recoveryConfigured(){return env.AI_STUDIO_BACKGROUND_POLLING==='true'&&!!pool&&env.AI_STUDIO_ENABLED==='true'&&!!(env.GEMINI_API_KEY||env.BYTEPLUS_API_KEY);}
 async function recoveryTick(){
  if(recoveryBusy||!recoveryConfigured())return;
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
     catch(e){if(e.terminal)await failTerminalProviderJob(job.id,job.user_id,e,'recovery_poll');}
    }finally{if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',[job.id]).catch(()=>{});client.release();}
   }
  }catch(e){console.error('[studio recovery]',e?.message||e);}
  finally{recoveryBusy=false;}
 }
 function startRecovery(){
  if(!recoveryConfigured())return false;
  if(recoveryTimer)return true;
  const raw=Number(env.AI_STUDIO_POLL_INTERVAL_MS||15000),interval=Number.isFinite(raw)?Math.max(5000,Math.min(60000,Math.floor(raw))):15000;
  recoveryTimer=setInterval(()=>void recoveryTick(),interval);recoveryTimer.unref?.();void recoveryTick();return true;
 }
 function stopRecovery(){if(recoveryTimer){clearInterval(recoveryTimer);recoveryTimer=null;}return true;}
 return {startRecovery,stopRecovery,recoveryTick};
}
