import test from 'node:test';import assert from 'node:assert/strict';
import {studioConfig} from '../server/generation-studio.js';
import {validateGeneration,generateGoogle,pollGoogle,safeGoogleUrl} from '../server/generation-provider.js';
const request={kind:'video',prompt:'Ocean at sunset',ratio:'16:9',consent:true,references:[]};
test('no paid request without explicit setup and durable call quota',()=>{assert.equal(studioConfig({}).enabled,false);for(const n of ['0','21','NaN'])assert.equal(studioConfig({AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'test',DATABASE_URL:'test',ADMIN_EMAIL:'test',AI_STUDIO_MAX_CALLS:n}).enabled,false);const c=studioConfig({AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'secret',DATABASE_URL:'secret',ADMIN_EMAIL:'owner',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image'});assert.equal(c.models.find(m=>m.kind==='image').enabled,true);assert.equal(c.models.find(m=>m.kind==='video').enabled,false);assert.ok(!JSON.stringify(c).includes('secret'));});
test('reject unsupported ratio, missing consent, oversized prompt, invalid refs',()=>{assert.throws(()=>validateGeneration({...request,ratio:'1:1'}));assert.throws(()=>validateGeneration({...request,consent:false}));assert.throws(()=>validateGeneration({...request,prompt:'x'.repeat(2001)}));assert.throws(()=>validateGeneration({...request,references:[{mimeType:'image/png',data:'abcd'}]}));assert.equal(validateGeneration(request).kind,'video');});
test('Veo submits exactly one 8 second 720p generation',async()=>{let seen;const result=await generateGoogle(request,{key:'test-key',fetcher:async(url,opts)=>{seen={url,opts};return {ok:true,json:async()=>({name:'operations/test'})};}});const body=JSON.parse(seen.opts.body);assert.equal(body.parameters.sampleCount,1);assert.equal(body.parameters.durationSeconds,8);assert.equal(body.parameters.resolution,'720p');assert.ok(seen.url.endsWith(':predictLongRunning'));assert.equal(result.operation,'operations/test');});
test('Veo video output settings obey model capability and first-frame duration restrictions',async()=>{
 const short=validateGeneration({...request,videoResolution:'720p',videoDuration:4});
 assert.equal(short.videoDuration,4);assert.equal(short.videoResolution,'720p');
 const hd=validateGeneration({...request,videoResolution:'1080p',videoDuration:8});
 assert.equal(hd.videoResolution,'1080p');
 assert.throws(()=>validateGeneration({...request,videoResolution:'1080p',videoDuration:4}),/UNSUPPORTED_VIDEO_DURATION/);
 assert.throws(()=>validateGeneration({...request,videoResolution:'4k',videoDuration:8}),/UNSUPPORTED_VIDEO_RESOLUTION/);
 assert.throws(()=>validateGeneration({...request,videoResolution:'720p',videoDuration:5}),/UNSUPPORTED_VIDEO_DURATION/);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 const reference={mimeType:'image/png',data:png.toString('base64')};
 assert.throws(()=>validateGeneration({...request,videoDuration:4,references:[reference]}),/UNSUPPORTED_VIDEO_DURATION/);
 let submitted=0,body;
 await generateGoogle(short,{key:'fixture',fetcher:async(_url,opts)=>{submitted++;body=JSON.parse(opts.body);return {ok:true,json:async()=>({name:'operations/test'})};}});
 assert.equal(submitted,1);assert.equal(body.parameters.durationSeconds,4);assert.equal(body.parameters.resolution,'720p');
 await generateGoogle(hd,{key:'fixture',fetcher:async(_url,opts)=>{body=JSON.parse(opts.body);return {ok:true,json:async()=>({name:'operations/test'})};}});
 assert.equal(body.parameters.durationSeconds,8);assert.equal(body.parameters.resolution,'1080p');
});
test('music output parsed by media type, not first part',async()=>{const r=await generateGoogle({kind:'music',prompt:'Piano',musicMode:'instrumental',references:[]},{key:'test',fetcher:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Lyrics'},{inlineData:{mimeType:'audio/mpeg',data:Buffer.from('fixture').toString('base64')}}]}}]})})});assert.equal(r.mime,'audio/mpeg');assert.equal(r.bytes.toString(),'fixture');});
test('Nano Banana 2.1 uses the official Interactions API contract and validates returned image bytes',async()=>{
 const png=Buffer.from([137,80,78,71,13,10,26,10,0]);let seen;
 const request=validateGeneration({kind:'image',model:'gemini-nano-banana-2.1',prompt:'A red kite',ratio:'3:2',resolution:'2K',consent:true,references:[{mimeType:'image/png',data:png.toString('base64')}]});
 const result=await generateGoogle(request,{key:'fixture',fetcher:async(url,options)=>{seen={url,options};return {ok:true,json:async()=>({output_image:{data:png.toString('base64'),mime_type:'image/png'}})};}});
 const body=JSON.parse(seen.options.body);
 assert.ok(seen.url.endsWith('/v1beta/interactions'));
 assert.equal(body.model,'gemini-nano-banana-2.1');
 assert.deepEqual(body.input,[{type:'text',text:'A red kite'},{type:'image',mime_type:'image/png',data:png.toString('base64')}]);
 assert.deepEqual(body.response_format,{type:'image',mime_type:'image/png',aspect_ratio:'3:2',image_size:'2K'});
 assert.deepEqual(result,{mime:'image/png',bytes:png,text:''});
});
test('Nano Banana models still require an explicit Studio model allowlist',()=>{
 const base={AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image'};
 assert.equal(studioConfig(base).catalog.find(m=>m.id==='gemini-nano-banana-2.1').enabled,false);
 assert.equal(studioConfig({...base,AI_STUDIO_ALLOWED_MODELS:'gemini-nano-banana-2.1'}).catalog.find(m=>m.id==='gemini-nano-banana-2.1').enabled,true);
});
test('provider API key never sent to arbitrary or redirected download URLs',async()=>{assert.throws(()=>safeGoogleUrl('https://evil.test/file'));assert.throws(()=>safeGoogleUrl('http://generativelanguage.googleapis.com/file'));let calls=0;await assert.rejects(()=>pollGoogle('operations/test',{key:'secret',fetcher:async()=>{calls++;return {ok:true,json:async()=>({done:true,response:{generateVideoResponse:{generatedSamples:[{video:{uri:'https://evil.test/file'}}]}}})};}}));assert.equal(calls,1);});
test('Veo completed provider errors are terminal and never start a second paid job',async()=>{
 let calls=0;
 await assert.rejects(()=>pollGoogle('operations/test',{key:'fixture',fetcher:async()=>{
  calls++;return {ok:true,json:async()=>({done:true,error:{code:400,message:'private provider rejection'}})};
 }}),e=>e.message==='PROVIDER_TASK_FAILED'&&e.terminal===true);
 assert.equal(calls,1);
 assert.deepEqual(await pollGoogle('operations/test',{key:'fixture',fetcher:async()=>({ok:true,json:async()=>({done:false})})}),{pending:true});
});
test('provider errors produce no fake media',async()=>{await assert.rejects(()=>generateGoogle(request,{key:'test',fetcher:async()=>({ok:false,status:429})}),/PROVIDER_BUSY/);});
test('model selection routes explicitly and unconnected models never fall back to Google',async()=>{
 const selected=validateGeneration({...request,model:'veo-3.1-fast-generate-preview'});let called='';
 await generateGoogle(selected,{key:'fixture',fetcher:async url=>{called=url;return {ok:true,json:async()=>({name:'operations/fixture'})};}});
 assert.ok(called.includes('veo-3.1-fast-generate-preview:predictLongRunning'));
 for(const model of ['byteplus-seed-speech-2','gemini-3.1-flash-image','unknown'])assert.throws(()=>validateGeneration({...request,model}));
 await assert.rejects(()=>generateGoogle(validateGeneration({...request,model:'byteplus-seedance-2'}),{key:'fixture',fetcher:()=>{throw Error('must not call Google');}}),/MODEL_NOT_CONNECTED/);
 const env={AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',ADMIN_EMAIL:'fixture',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'video'};
 assert.equal(studioConfig(env).catalog.find(m=>m.id===selected.model).enabled,false);
 assert.equal(studioConfig({...env,AI_STUDIO_ALLOWED_MODELS:selected.model}).catalog.find(m=>m.id===selected.model).enabled,true);
 assert.equal(studioConfig({...env,AI_STUDIO_ALLOWED_MODELS:'byteplus-seedance-2'}).catalog.find(m=>m.id==='byteplus-seedance-2').enabled,false);
});
import express from 'express';import {installGenerationStudio} from '../server/generation-studio.js';
test('owner pilot may read existing work but cannot enqueue a billable AI call without Stripe purchase',async()=>{
 const jobs=[];let calls=0;
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
  if(sql.startsWith('SELECT id,kind,status'))return {rows:jobs};
  throw Error('unexpected DB access: '+sql.slice(0,75));
 }};
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'1',AI_STUDIO_ALLOWED_KINDS:'image',
  GEMINI_API_KEY:'fixture-only',DATABASE_URL:'fixture-only',ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,
  auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:req.headers['x-test-email']||'owner@example.test'};next()},
  provider:async()=>{calls++;return {mime:'image/png',bytes:Buffer.from('fixture')} }
 });
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const payload=JSON.stringify({kind:'image',prompt:'Test',ratio:'1:1',consent:true});
  let r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json','x-test-email':'other@example.test'},body:payload});
  assert.equal(r.status,403);
  r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:payload});
  assert.equal(r.status,503);assert.equal((await r.json()).error,'AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');
  assert.equal(jobs.length,0);assert.equal(calls,0);
  r=await fetch(base+'/api/studio/jobs');
  assert.equal(r.status,200);assert.deepEqual((await r.json()).items,[]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});

test('owner metrics expose aggregate provider performance without secrets',async()=>{
 const pool={
  async query(sql){
   if(sql.includes('CREATE TABLE')||sql.includes('ALTER TABLE')||sql.includes('CREATE INDEX'))return {rows:[]};
   if(sql.includes('GROUP BY provider,model,kind'))return {rows:[{provider:'BytePlus',model:'byteplus-seedance-2',kind:'video',jobs:4,succeeded:3,failed:1,processing:0,avg_seconds:'12.50',actual_cost:'1.250000',credits_charged:'320'}]};
   throw new Error(sql);
  }
 };
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'1',AI_STUDIO_ALLOWED_KINDS:'video',BYTEPLUS_API_KEY:'secret',BYTEPLUS_MEDIA_HOSTS:'cdn.bytepluses.com',DATABASE_URL:'test',ADMIN_EMAIL:'owner@example.test'};
 const app=express();installGenerationStudio(app,{env,pool,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const r=await fetch(base+'/api/studio/admin/metrics');assert.equal(r.status,200);const d=await r.json();
  assert.equal(d.items[0].provider,'BytePlus');assert.equal(d.items[0].jobs,4);assert.equal(d.items[0].averageSeconds,12.5);assert.equal(d.items[0].creditsCharged,320);
  assert.ok(!JSON.stringify(d).includes('secret'));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('recovery polls only an existing provider operation and never starts a replacement generation',async()=>{
 let providerCalls=0,pollCalls=0,finished=false;
 const row={id:'job-1',operation:'byteplus:task_1',status:'processing',deleted:false};
 const pool={
  async query(sql,args=[]){
   if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
   if(sql.startsWith("SELECT id,user_id,operation FROM vv_generation_jobs"))return {rows:[{id:row.id,user_id:'owner',operation:row.operation}]};
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='ready'")){finished=true;return {rows:[]};}
   throw new Error(sql);
  },
  async connect(){return {async query(sql,args=[]){
   if(sql.startsWith('SELECT pg_try_advisory_lock'))return {rows:[{locked:true}]};
   if(sql.startsWith('SELECT status,operation,deleted'))return {rows:[row]};
   if(sql.startsWith('UPDATE vv_generation_jobs SET last_polled_at=NOW()'))return {rows:[{last_polled_at:new Date()}]};
   if(sql.startsWith('SELECT pg_advisory_unlock'))return {rows:[{pg_advisory_unlock:true}]};
   throw new Error(sql);
  },release(){}};}
 };
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'video',AI_STUDIO_ALLOWED_MODELS:'byteplus-seedance-2',AI_STUDIO_BACKGROUND_POLLING:'true',BYTEPLUS_API_KEY:'fixture',BYTEPLUS_MEDIA_HOSTS:'cdn.bytepluses.com',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test'};
 const app=express();const controls=installGenerationStudio(app,{env,pool,auth:(_req,_res,next)=>next(),provider:async()=>{providerCalls++;throw Error('must not generate');},poller:async operation=>{pollCalls++;assert.equal(operation,row.operation);return {mime:'video/mp4',bytes:Buffer.from('fixture'),text:''};}});
 await controls.recoveryTick();
 assert.equal(providerCalls,0);assert.equal(pollCalls,1);assert.equal(finished,true);
});


test('owner mixed wallet balance cannot reserve or call a paid model without verified Stripe purchase',async()=>{
 let calls=0,claims=0,reserves=0;
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',
  AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',
  AI_STUDIO_ALLOWED_KINDS:'image',GEMINI_API_KEY:'fixture-only',DATABASE_URL:'fixture',
  ADMIN_EMAIL:'owner@example.test',AI_MODEL_PRICING_JSON:JSON.stringify([
   {model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:7,providerCostMicros:1200,currency:'usd'}])};
 const wallet={async reserve(){reserves++},purchasedDispatchVerifier:()=>async()=>{claims++}};
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};throw Error(sql)}};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,wallet,
  auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next()},
  provider:async()=>{calls++;return {mime:'image/png',bytes:Buffer.from('fixture')}}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{
  const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/studio/jobs',
   {method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({kind:'image',prompt:'Test',ratio:'1:1',consent:true})});
  assert.equal(res.status,503);assert.equal((await res.json()).error,'AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');
  assert.equal(calls,0);assert.equal(reserves,0);assert.equal(claims,0);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});

test('unpaid owner attempt cannot put generated content into private object storage',async()=>{
 let calls=0,stores=0;
 const storage={configured:true,async putGeneration(){stores++;throw Error('unsafe write')}};
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};throw Error(sql)}};
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image',
  GEMINI_API_KEY:'fixture-only',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{pool,storage,env,
  auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next()},
  provider:async()=>{calls++;return {mime:'image/png',bytes:Buffer.from('fixture')}}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{
  const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/studio/jobs',
   {method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({kind:'image',prompt:'Stored',ratio:'1:1',consent:true})});
  assert.equal(res.status,503);assert.equal(calls,0);assert.equal(stores,0);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});

test('owner read-only analytics omit auth and Stripe secrets',async()=>{
 const seen=[];
 const pool={async query(sql,args=[]){
  seen.push(sql);
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
  if(sql.startsWith('SELECT u.id,u.email'))return {rows:[{id:'u1',email:'alice@example.test',name:'Alice',provider:'email',plan:'trial',subscription_status:'inactive',has_subscribed:false,plan_limit:2,period_used:0,trial_used:1,ai_available:12,ai_reserved:3,ai_debt:0,generation_count:4,ai_purchase_count:1,created_at:new Date(),updated_at:new Date(),password_hash:'must-not-leak',stripe_customer_id:'cus_secret'}]};
  if(sql.startsWith('SELECT j.id,j.user_id'))return {rows:[{id:'j1',user_id:'u1',email:'alice@example.test',kind:'image',status:'ready',provider:'Google',model:'fixture',error:null,error_message:null,created_at:new Date(),started_at:new Date(Date.now()-1000),completed_at:new Date(),failed_at:null,estimated_cost:0.1,actual_cost:0.08,credits_reserved:5,credits_charged:5}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS users'))return {rows:[{users:2,registrations_30d:1,ever_subscribed:1,inactive_after_subscription:0}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS jobs'))return {rows:[{jobs:4,generating_users:2,ready:3,failed:1,processing:0,avg_seconds:8.5,recorded_cost:0.4,credits_charged:20}]};
  if(sql.startsWith('SELECT model,COUNT(*)::int AS jobs'))return {rows:[{model:'fixture',jobs:3}]};
  if(sql.startsWith('SELECT kind,COUNT(*)::int AS jobs'))return {rows:[{kind:'image',jobs:2,ready:2,failed:0},{kind:'video',jobs:1,ready:0,failed:1}]};
  if(sql.startsWith('SELECT currency,COUNT(*)::int AS purchases'))return {rows:[{currency:'eur',purchases:1,net_amount_minor:500,credits_purchased:100}]};
  if(sql.startsWith("SELECT COALESCE(cost_currency,'unknown') AS currency"))return {rows:[{currency:'usd',amount:0.4,ready_priced_jobs:2,avg_ready_cost:0.12}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS first_success_users'))return {rows:[{first_success_users:2,first_success_30d:1}]};
  if(sql.startsWith('SELECT COUNT(DISTINCT p.user_id)::int AS paying_accounts'))return {rows:[{paying_accounts:1}]};
  // BASE #37 source-backed tracked Tools are read-only and completed only.
  if(sql.startsWith("SELECT to_regclass('public.vv_tool_runs') AS reg"))return {rows:[{reg:'vv_tool_runs'}]};
  if(sql.startsWith('SELECT tool,COUNT(*)::bigint AS completed_runs'))return {rows:[{tool:'photo_batch',completed_runs:'11'}]};
  throw new Error(sql);
 }};
 const wallet={async init(){}},env={ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{pool,wallet,env,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(base+'/api/studio/admin/users?q=alice');assert.equal(r.status,200);let d=await r.json();assert.equal(d.items[0].aiWallet.available,12);assert.equal(d.items[0].generationCount,4);assert.equal(JSON.stringify(d).includes('password_hash'),false);assert.equal(JSON.stringify(d).includes('cus_secret'),false);
  r=await fetch(base+'/api/studio/admin/jobs');assert.equal(r.status,200);d=await r.json();assert.equal(d.items[0].actualCost,0.08);assert.equal(d.items[0].durationSeconds>=0,true);
  r=await fetch(base+'/api/studio/admin/business');assert.equal(r.status,200);d=await r.json();assert.equal(d.users.total,2);assert.equal(d.aiPurchases[0].currency,'eur');assert.equal(d.grossMargin,null);assert.equal(d.generation.firstSuccessfulUsers,2);
  assert.equal(d.generation.firstSuccessfulUsers30d,1);assert.equal(d.users.aiCreditBuyers,1);
  assert.equal(d.users.aiCreditBuyerConversionRate,0.5);
  assert.equal(d.generation.providerCosts[0].readyPricedJobs,2);
  assert.deepEqual(d.generation.creationTypes,[{kind:'image',jobs:2,ready:2,failed:0},{kind:'video',jobs:1,ready:0,failed:1}]);
  assert.equal(d.generation.topCreationType,'image');
  assert.equal(d.generation.providerCosts[0].averageReadyJobCost,0.12);
  assert.equal(d.generation.completedJobs,4);
  assert.equal(d.generation.completedFailureRate,0.25);
  assert.equal(d.generation.jobsPerGeneratingUser,2);
  assert.equal(d.generation.trackedToolsAvailable,true);
  assert.deepEqual(d.generation.topTrackedTool,{tool:'photo_batch',completedRuns:11});
  assert.ok(seen.some(q=>q.includes("FROM vv_tool_runs WHERE state='completed'")&&q.includes('GROUP BY tool')));

  assert.deepEqual(d.unverifiedMetrics,{trialToPaid:null,churnRate:null,revenuePerUser:null,mostUsedTool:null});
  assert.ok(seen.some(q=>q.includes('MIN(COALESCE(completed_at,created_at))')&&q.includes("status='ready'")));
  assert.ok(seen.some(q=>q.includes('COUNT(DISTINCT p.user_id)')&&q.includes('p.amount>p.refunded_amount')));
  assert.ok(seen.some(q=>q.includes("kind IN ('image','video','music','voice')")&&q.includes('deleted=false')));
  assert.ok(seen.every(q=>q.startsWith('SELECT')||q.startsWith('CREATE TABLE')));
  assert.equal(JSON.stringify(d).includes('must-not-leak'),false);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('pricing estimate does not upload prompt or reference bytes',async()=>{
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};throw new Error(sql);}};
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image',GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test',AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:9,providerCostMicros:1200,currency:'usd',ratio:'1:1'}])};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{const r=await fetch(base+'/api/studio/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',model:'gemini-3.1-flash-image',ratio:'1:1',referenceCount:0})});assert.equal(r.status,200);const d=await r.json();assert.equal(d.credits,9);assert.equal(d.model,'gemini-3.1-flash-image');}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('Studio access endpoint reports configured plan limits without inventing defaults',async()=>{
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};throw new Error(sql);}};
 const env={AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:5,providerCostMicros:1000,currency:'usd'}]),AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:2,maxPerHour:12}])};
 const wallet={};
 const app=express();installGenerationStudio(app,{env,pool,wallet,auth:(req,_res,next)=>{req.user={id:'u1',provider:'email',plan:'basic',subscription_status:'active'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base=`http://127.0.0.1:${server.address().port}`;const r=await fetch(base+'/api/studio/access');assert.equal(r.status,200);const d=await r.json();assert.equal(d.allowed,true);assert.equal(d.maxConcurrent,2);assert.equal(d.maxPerHour,12);assert.equal(d.plan,'basic');}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('Studio access endpoint reports live usage counters when database is available',async()=>{
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
  if(sql.startsWith("SELECT COUNT(*) FILTER")){assert.equal(args[0],'u1');return {rows:[{active:1,hourly:4}]};}
  throw new Error(sql);
 }};
 const env={AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:5,providerCostMicros:1000,currency:'usd'}]),AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:2,maxPerHour:12}])};
 const app=express();installGenerationStudio(app,{env,pool,wallet:{},auth:(req,_res,next)=>{req.user={id:'u1',provider:'email',plan:'basic',subscription_status:'active'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base=`http://127.0.0.1:${server.address().port}`;const d=await fetch(base+'/api/studio/access').then(r=>r.json());assert.equal(d.activeJobs,1);assert.equal(d.jobsThisHour,4);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('owner purchase list omits Stripe identifiers and reports refund/net amounts',async()=>{
 const pool={async query(sql){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs')||sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_wallet'))return {rows:[]};
  if(sql.startsWith('SELECT p.user_id,u.email,p.credits'))return {rows:[{user_id:'u1',email:'buyer@example.test',credits:1000,amount:999,refunded_amount:250,currency:'eur',created_at:new Date('2026-10-15T10:00:00Z'),session_id:'cs_secret',payment_intent:'pi_secret'}]};
  throw new Error(sql);
 }};
 const app=express();installGenerationStudio(app,{pool,wallet:{async init(){}},env:{ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const d=await fetch(`http://127.0.0.1:${server.address().port}/api/studio/admin/purchases`).then(r=>r.json());assert.equal(d.items[0].netMinor,749);assert.equal(d.items[0].refundedMinor,250);assert.equal(JSON.stringify(d).includes('cs_secret'),false);assert.equal(JSON.stringify(d).includes('pi_secret'),false);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('single paid generation requires the exact server quote before DB, reserve or provider work',async()=>{
 let dbCalls=0,reserves=0,calls=0;
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',AI_PUBLIC_GENERATION_ENABLED:'true',
  AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image',
  GEMINI_API_KEY:'fixture-only',DATABASE_URL:'fixture-only',ADMIN_EMAIL:'owner@example.test',
  AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:5}]),
  AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:9,providerCostMicros:1200,currency:'usd',ratio:'1:1'}])};
 const pool={async query(){dbCalls++;throw Error('DB must not be touched before quote acceptance');},async connect(){dbCalls++;throw Error('DB must not be touched before quote acceptance');}};
 const wallet={async reserve(){reserves++;},purchasedDispatchVerifier:()=>async()=>{}};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,wallet,
  auth:(req,_res,next)=>{req.user={id:'buyer',email:'buyer@example.test',provider:'email',plan:'basic',subscription_status:'active'};next();},
  provider:async()=>{calls++;return {mime:'image/png',bytes:Buffer.from('fixture')};}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const expectedCredits of [undefined,8,0,'9']){
   const body={requestId:crypto.randomUUID(),kind:'image',model:'gemini-3.1-flash-image',prompt:'A blue cup',ratio:'1:1',consent:true};
   if(expectedCredits!==undefined)body.expectedCredits=expectedCredits;
   const response=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   assert.equal(response.status,409);assert.equal((await response.json()).error,'AI_ESTIMATE_CHANGED');
  }
  assert.equal(dbCalls,0);assert.equal(reserves,0);assert.equal(calls,0);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
