import test from 'node:test';import assert from 'node:assert/strict';
import {studioConfig} from '../server/generation-studio.js';
import {validateGeneration,generateGoogle,pollGoogle,safeGoogleUrl} from '../server/generation-provider.js';
const request={kind:'video',prompt:'Ocean at sunset',ratio:'16:9',consent:true,references:[]};
test('no paid request without explicit setup and durable call quota',()=>{assert.equal(studioConfig({}).enabled,false);for(const n of ['0','21','NaN'])assert.equal(studioConfig({AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'test',DATABASE_URL:'test',ADMIN_EMAIL:'test',AI_STUDIO_MAX_CALLS:n}).enabled,false);const c=studioConfig({AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'secret',DATABASE_URL:'secret',ADMIN_EMAIL:'owner',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image'});assert.equal(c.models.find(m=>m.kind==='image').enabled,true);assert.equal(c.models.find(m=>m.kind==='video').enabled,false);assert.ok(!JSON.stringify(c).includes('secret'));});
test('reject unsupported ratio, missing consent, oversized prompt, invalid refs',()=>{assert.throws(()=>validateGeneration({...request,ratio:'1:1'}));assert.throws(()=>validateGeneration({...request,consent:false}));assert.throws(()=>validateGeneration({...request,prompt:'x'.repeat(2001)}));assert.throws(()=>validateGeneration({...request,references:[{mimeType:'image/png',data:'abcd'}]}));assert.equal(validateGeneration(request).kind,'video');});
test('Veo submits exactly one 8 second 720p generation',async()=>{let seen;const result=await generateGoogle(request,{key:'test-key',fetcher:async(url,opts)=>{seen={url,opts};return {ok:true,json:async()=>({name:'operations/test'})};}});const body=JSON.parse(seen.opts.body);assert.equal(body.parameters.sampleCount,1);assert.equal(body.parameters.durationSeconds,8);assert.equal(body.parameters.resolution,'720p');assert.ok(seen.url.endsWith(':predictLongRunning'));assert.equal(result.operation,'operations/test');});
test('music output parsed by media type, not first part',async()=>{const r=await generateGoogle({kind:'music',prompt:'Piano',musicMode:'instrumental',references:[]},{key:'test',fetcher:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Lyrics'},{inlineData:{mimeType:'audio/mpeg',data:Buffer.from('fixture').toString('base64')}}]}}]})})});assert.equal(r.mime,'audio/mpeg');assert.equal(r.bytes.toString(),'fixture');});
test('provider API key never sent to arbitrary or redirected download URLs',async()=>{assert.throws(()=>safeGoogleUrl('https://evil.test/file'));assert.throws(()=>safeGoogleUrl('http://generativelanguage.googleapis.com/file'));let calls=0;await assert.rejects(()=>pollGoogle('operations/test',{key:'secret',fetcher:async()=>{calls++;return {ok:true,json:async()=>({done:true,response:{generateVideoResponse:{generatedSamples:[{video:{uri:'https://evil.test/file'}}]}}})};}}));assert.equal(calls,1);});
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
test('owner pilot cap persists across installation; deletion never restores attempts',async()=>{
 const jobs=[];const pool={async query(sql,args=[]){if(sql.startsWith('CREATE'))return {};if(sql.startsWith('SELECT id,kind,status'))return {rows:jobs.filter(j=>j.user_id===args[0]&&!j.deleted).map(j=>({...j,created_at:j.created_at||new Date()}))};if(sql.startsWith('SELECT *'))return {rows:jobs.filter(j=>j.id===args[0]&&j.user_id===args[1]&&!j.deleted)};if(sql.startsWith('UPDATE')&&sql.includes('deleted=true')){jobs.find(j=>j.id===args[0]).deleted=true;return {};}if(sql.startsWith("UPDATE vv_generation_jobs SET status='ready'")){const j=jobs.find(j=>j.id===args[0]);Object.assign(j,{status:'ready',operation:null,mime:args[1],media:args[2],result_text:args[3]});return {};}if(sql.startsWith('UPDATE')){const j=jobs.find(j=>j.id===args[0]);Object.assign(j,{status:args[1],operation:args[2],mime:args[3],media:args[4],result_text:args[5]});return {};}throw new Error(sql);},async connect(){return {query:async(sql,args=[])=>{if(sql.startsWith('SELECT count'))return {rows:[{n:jobs.length}]};if(sql.startsWith('INSERT'))jobs.push({id:args[0],user_id:args[1],kind:args[2],status:args[3],provider:args[4]||null,model:args[5]||null,prompt:args[6]||'',settings:args[7]?JSON.parse(args[7]):{},created_at:new Date(),started_at:new Date(),credits_reserved:0,credits_charged:0});return {};},release(){}};}};
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'1',AI_STUDIO_ALLOWED_KINDS:'image',GEMINI_API_KEY:'test-secret',DATABASE_URL:'test',ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:req.headers['x-test-email']||'owner@example.test'};next();},provider:async()=>({mime:'image/png',bytes:Buffer.from('fixture')})});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{let r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json','x-test-email':'other@example.test'},body:JSON.stringify({kind:'image',prompt:'Test',ratio:'1:1',consent:true})});assert.equal(r.status,403);assert.equal(jobs.length,0);
 r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',prompt:'Test',ratio:'1:1',consent:true})});assert.equal(r.status,202);const job=await r.json();await new Promise(r=>setTimeout(r,10));
 r=await fetch(base+'/api/studio/jobs');assert.equal(r.status,200);let history=await r.json();assert.equal(history.items.length,1);assert.equal(history.items[0].id,job.id);assert.equal(history.items[0].kind,'image');assert.equal(history.items[0].status,'ready');assert.equal(history.items[0].provider,'Google');assert.equal(history.items[0].model,'gemini-3.1-flash-image');assert.equal('media' in history.items[0],false);
 r=await fetch(base+`/api/studio/jobs/${job.id}`,{method:'DELETE'});assert.equal(r.status,200);r=await fetch(base+'/api/studio/jobs');history=await r.json();assert.equal(history.items.length,0);
 r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',prompt:'Test',ratio:'1:1',consent:true})});assert.equal(r.status,429);assert.equal(jobs.length,1);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
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
   if(sql.startsWith('SELECT pg_advisory_unlock'))return {rows:[{pg_advisory_unlock:true}]};
   throw new Error(sql);
  },release(){}};}
 };
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'video',AI_STUDIO_ALLOWED_MODELS:'byteplus-seedance-2',AI_STUDIO_BACKGROUND_POLLING:'true',BYTEPLUS_API_KEY:'fixture',BYTEPLUS_MEDIA_HOSTS:'cdn.bytepluses.com',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test'};
 const app=express();const controls=installGenerationStudio(app,{env,pool,auth:(_req,_res,next)=>next(),provider:async()=>{providerCalls++;throw Error('must not generate');},poller:async operation=>{pollCalls++;assert.equal(operation,row.operation);return {mime:'video/mp4',bytes:Buffer.from('fixture'),text:''};}});
 await controls.recoveryTick();
 assert.equal(providerCalls,0);assert.equal(pollCalls,1);assert.equal(finished,true);
});


test('wallet-gated Studio reserves before provider use and captures only after durable output',async()=>{
 const jobs=[];const walletCalls=[];
 const wallet={
  async reserve(v){walletCalls.push(['reserve',v]);return {available:93,reserved:7,debt:0};},
  async settle(v){walletCalls.push(['settle',v]);return {available:93,reserved:0,debt:0,status:'captured'};}
 };
 const pool={
  async query(sql,args=[]){
   if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
   if(sql.startsWith('SELECT * FROM vv_generation_jobs'))return {rows:jobs.filter(j=>j.id===args[0]&&j.user_id===args[1]&&!j.deleted)};
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='processing',credits_reserved")){const j=jobs.find(j=>j.id===args[0]);j.status='processing';j.credits_reserved=args[1];return {rows:[]};}
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='finalizing'")){const j=jobs.find(j=>j.id===args[0]);Object.assign(j,{status:'finalizing',mime:args[1],media:args[2],result_text:args[3]});return {rows:[]};}
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='ready',credits_charged")){const j=jobs.find(j=>j.id===args[0]);j.status='ready';j.credits_charged=j.credits_reserved;return {rows:[]};}
   if(sql.startsWith('SELECT id,kind,status'))return {rows:jobs};
   throw new Error(sql);
  },
  async connect(){return {async query(sql,args=[]){
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};
   if(sql.startsWith('SELECT count'))return {rows:[{n:jobs.length}]};
   if(sql.startsWith('INSERT INTO vv_generation_jobs')){jobs.push({id:args[0],user_id:args[1],kind:args[2],status:args[3],provider:args[4],model:args[5],prompt:args[6],settings:JSON.parse(args[7]),estimated_cost:args[8],created_at:new Date(),started_at:new Date(),credits_reserved:0,credits_charged:0,deleted:false});return {rows:[]};}
   throw new Error(sql);
  },release(){}};}
 };
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image',GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test',AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:7,providerCostMicros:1200}])};
 let providerSawReservation=false;
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,wallet,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();},provider:async()=>{providerSawReservation=walletCalls.some(([name])=>name==='reserve');return {mime:'image/png',bytes:Buffer.from('fixture')};}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',prompt:'Test',ratio:'1:1',consent:true})});assert.equal(r.status,202);const d=await r.json();assert.equal(d.creditsReserved,7);
  await new Promise(r=>setTimeout(r,20));assert.equal(providerSawReservation,true);assert.deepEqual(walletCalls.map(x=>x[0]),['reserve','settle']);assert.equal(walletCalls[1][1].outcome,'success');assert.equal(jobs[0].status,'ready');assert.equal(jobs[0].credits_reserved,7);assert.equal(jobs[0].credits_charged,7);assert.equal(jobs[0].estimated_cost,0.0012);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('object-storage enabled Studio keeps generated bytes out of PostgreSQL',async()=>{
 const jobs=[],storageCalls=[];
 const storage={configured:true,async putGeneration(v){storageCalls.push(['put',v]);return {storage:'s3',key:'deepsyq/users/hash/'+v.jobId+'.png',mime:v.mime,size:v.bytes.length};},async get(){return Buffer.from('fixture');},async delete(){}};
 const pool={
  async query(sql,args=[]){
   if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='ready'")){const j=jobs.find(x=>x.id===args[0]);Object.assign(j,{status:'ready',mime:args[1],media:args[2],result_text:args[3],output_assets:JSON.parse(args[4])});return {rows:[]};}
   if(sql.startsWith('SELECT * FROM vv_generation_jobs'))return {rows:jobs.filter(j=>j.id===args[0]&&j.user_id===args[1]&&!j.deleted)};
   throw new Error(sql);
  },
  async connect(){return {async query(sql,args=[]){
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};
   if(sql.startsWith('SELECT count'))return {rows:[{n:jobs.length}]};
   if(sql.startsWith('INSERT INTO vv_generation_jobs')){jobs.push({id:args[0],user_id:args[1],kind:args[2],status:args[3],provider:args[4],model:args[5],prompt:args[6],settings:JSON.parse(args[7]),created_at:new Date(),deleted:false,credits_reserved:0,credits_charged:0});return {rows:[]};}
   throw new Error(sql);
  },release(){}};}
 };
 const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image',GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,storage,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();},provider:async()=>({mime:'image/png',bytes:Buffer.from('fixture')})});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const r=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',prompt:'Stored',ratio:'1:1',consent:true})});assert.equal(r.status,202);
  await new Promise(r=>setTimeout(r,20));assert.equal(storageCalls.length,1);assert.equal(jobs[0].status,'ready');assert.equal(jobs[0].media,null);assert.equal(jobs[0].output_assets[0].storage,'s3');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('owner read-only analytics omit auth and Stripe secrets',async()=>{
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
  if(sql.startsWith('SELECT u.id,u.email'))return {rows:[{id:'u1',email:'alice@example.test',name:'Alice',provider:'email',plan:'trial',subscription_status:'inactive',has_subscribed:false,plan_limit:2,period_used:0,trial_used:1,ai_available:12,ai_reserved:3,ai_debt:0,generation_count:4,ai_purchase_count:1,created_at:new Date(),updated_at:new Date(),password_hash:'must-not-leak',stripe_customer_id:'cus_secret'}]};
  if(sql.startsWith('SELECT j.id,j.user_id'))return {rows:[{id:'j1',user_id:'u1',email:'alice@example.test',kind:'image',status:'ready',provider:'Google',model:'fixture',error:null,error_message:null,created_at:new Date(),started_at:new Date(Date.now()-1000),completed_at:new Date(),failed_at:null,estimated_cost:0.1,actual_cost:0.08,credits_reserved:5,credits_charged:5}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS users'))return {rows:[{users:2,registrations_30d:1,ever_subscribed:1,inactive_after_subscription:0}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS jobs'))return {rows:[{jobs:4,generating_users:2,ready:3,failed:1,processing:0,avg_seconds:8.5,recorded_cost:0.4,credits_charged:20}]};
  if(sql.startsWith('SELECT model,COUNT(*)::int AS jobs'))return {rows:[{model:'fixture',jobs:3}]};
  if(sql.startsWith('SELECT currency,COUNT(*)::int AS purchases'))return {rows:[{currency:'eur',purchases:1,net_amount_minor:500,credits_purchased:100}]};
  throw new Error(sql);
 }};
 const wallet={async init(){}},env={ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{pool,wallet,env,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(base+'/api/studio/admin/users?q=alice');assert.equal(r.status,200);let d=await r.json();assert.equal(d.items[0].aiWallet.available,12);assert.equal(d.items[0].generationCount,4);assert.equal(JSON.stringify(d).includes('password_hash'),false);assert.equal(JSON.stringify(d).includes('cus_secret'),false);
  r=await fetch(base+'/api/studio/admin/jobs');assert.equal(r.status,200);d=await r.json();assert.equal(d.items[0].actualCost,0.08);assert.equal(d.items[0].durationSeconds>=0,true);
  r=await fetch(base+'/api/studio/admin/business');assert.equal(r.status,200);d=await r.json();assert.equal(d.users.total,2);assert.equal(d.aiPurchases[0].currency,'eur');assert.equal(d.grossMargin,null);
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
