// BASE #50 historical-work safeguard: category/provider kill switches stop NEW work,
// not already authorized account-private History/status/media retrieval.
// This test uses an in-memory query stub and loopback HTTP; no Stripe, paid AI,
// credentials, actual PostgreSQL, production, or remote storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationStudio,studioConfig} from '../server/generation-studio.js';
import {MODELS,MODEL_CATALOG} from '../server/generation-provider.js';

const owner='existing-owner';
const png=Buffer.from(
 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/PKoAAAAASUVORK5CYII=',
 'base64'
);
const original={
 id:'already-paid-image',user_id:owner,kind:'image',status:'ready',
 provider:'Google',model:MODELS.image.id,prompt:'Existing artwork',
 settings:{ratio:'1:1',secretConfig:'never expose'},error:null,
 operation:null,media:png,mime:'image/png',output_assets:[],
 result_text:'',created_at:'2026-10-01T12:00:00.000Z',
 started_at:'2026-10-01T12:00:01.000Z',
 completed_at:'2026-10-01T12:00:10.000Z',
 failed_at:null,deleted:false,credits_reserved:0,credits_charged:3
};
const baseEnv={
 NODE_ENV:'test',AI_STUDIO_ENABLED:'true',AI_PUBLIC_GENERATION_ENABLED:'false',
 AI_STUDIO_WALLET_ENABLED:'false',AI_PURCHASED_ONLY_DISPATCH_ENABLED:'false',
 ADMIN_EMAIL:'owner@example.invalid',DATABASE_URL:'injected-memory-only',
 GEMINI_API_KEY:'dummy-never-dispatched',BYTEPLUS_API_KEY:'dummy-never-dispatched',
 AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image,video,music',
 AI_STUDIO_ALLOWED_MODELS:MODEL_CATALOG.map(m=>m.id).join(',')
};
const configurations=[
 {AI_IMAGE_ENABLED:'false'},
 {AI_VIDEO_ENABLED:'false'},
 {BYTEPLUS_ENABLED:'false'},
 {AI_IMAGE_ENABLED:'false',AI_VIDEO_ENABLED:'false',BYTEPLUS_ENABLED:'false'}
];

async function withFixture(flags,run){
 const env={...baseEnv,...flags};
 let queries=0,writes=0,paidCalls=0;
 const pool={query:async(sql,params=[])=>{
  queries++;
  if(typeof sql!=='string')throw Error('UNEXPECTED_SQL');
  // The pre-existing installer runs its own idempotent migration at first
  // history read. We simulate that initialization, NEVER run a real migration.
  if(/CREATE TABLE IF NOT EXISTS vv_generation_jobs/i.test(sql))return {rows:[],rowCount:0};
  if(/SELECT id,kind,status,operation,provider,model,prompt,settings,error,result_text,mime,output_assets,created_at/i.test(sql)){
   if(params[0]!==owner)throw Error('UNSCOPED_HISTORY_READ');
   return {rows:[original],rowCount:1};
  }
  if(/SELECT \* FROM vv_generation_jobs WHERE id=\$1 AND user_id=\$2 AND deleted=false/i.test(sql)){
   return {rows:params[0]===original.id&&params[1]===owner?[original]:[],rowCount:1};
  }
  writes++;throw Error('UNEXPECTED_SQL_OR_WRITE');
 }};
 const app=express();
 app.use(express.json({limit:'32kb'}));
 const auth=(req,_res,next)=>{
  const foreign=req.get('x-test-foreign')==='1';
  req.user=foreign?{id:'other-account',email:'not-owner@example.invalid',provider:'email'}:
   {id:owner,email:env.ADMIN_EMAIL,provider:'google'};
  next();
 };
 installGenerationStudio(app,{auth,env,pool,
  provider:async()=>{paidCalls++;throw Error('PROVIDER_MUST_NOT_RUN');},
  poller:async()=>{paidCalls++;throw Error('POLLER_MUST_NOT_RUN');}
 });
 const server=await new Promise(resolve=>{
  const s=app.listen(0,'127.0.0.1',()=>resolve(s));
 });
 try{
  const url='http://127.0.0.1:'+server.address().port;
  await run({url,env,stats:()=>({queries,writes,paidCalls})});
 }finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}

test('BASE50: switching off Image, Video or BytePlus preserves existing owner-only history, status and real media bytes',async()=>{
 for(const flags of configurations){
  await withFixture(flags,async({url,env,stats})=>{
   assert.equal(studioConfig(env).enabled,true,'Studio/history must not be shut down');
   const listed=await fetch(url+'/api/studio/jobs?filter=image');
   assert.equal(listed.status,200,JSON.stringify(flags));
   assert.match(listed.headers.get('cache-control')||'',/private/);
   const history=await listed.json();
   assert.equal(history.items.length,1);
   assert.equal(history.items[0].id,original.id);
   assert.equal(history.items[0].status,'ready');
   assert.equal(history.items[0].creditsCharged,3);
   assert.deepEqual(history.items[0].settings,{ratio:'1:1'},'no secret settings leak');
   const job=await fetch(url+'/api/studio/jobs/'+original.id);
   assert.equal(job.status,200,JSON.stringify(flags));
   const status=await job.json();
   assert.equal(status.status,'ready');
   assert.equal(status.creditsCharged,3);
   const media=await fetch(url+'/api/studio/jobs/'+original.id+'/media');
   assert.equal(media.status,200,JSON.stringify(flags));
   assert.match(media.headers.get('cache-control')||'',/private/);
   assert.deepEqual(Buffer.from(await media.arrayBuffer()),png);
   assert.equal(stats().writes,0,'no mutating SQL on old work');
   assert.equal(stats().paidCalls,0,'no paid dispatch/poll for old ready jobs');
  });
 }
});

test('BASE50: disabled categories preserve account isolation; foreign identity cannot list, poll or download existing media',async()=>{
 await withFixture(configurations[3],async({url,stats})=>{
  const before=stats().queries;
  for(const path of ['/api/studio/jobs','/api/studio/jobs/'+original.id,'/api/studio/jobs/'+original.id+'/media']){
   const result=await fetch(url+path,{headers:{'x-test-foreign':'1'}});
   assert.equal(result.status,403,path);
   assert.equal((result.headers.get('cache-control')||'').includes('public'),false);
  }
  assert.equal(stats().queries,before,'foreign user rejected before touching database');
  assert.equal(stats().writes,0);
  assert.equal(stats().paidCalls,0);
 });
});

test('BASE50: fully disabled Image and Video still reject NEW estimate/create without DB/provider',async()=>{
 await withFixture(configurations[3],async({url,stats})=>{
  const model=MODEL_CATALOG.find(m=>m.id===MODELS.image.id);
  assert.ok(model);
  const request={kind:'image',model:model.id,ratio:model.ratios[0],referenceCount:0,prompt:'never charge',references:[],consent:true};
  for(const path of ['/api/studio/estimate','/api/studio/jobs']){
   const response=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
   assert.equal(response.status,503,path);
   assert.equal((await response.json()).error,'MODEL_NOT_ENABLED');
  }
  assert.equal(stats().queries,0,'new disabled request must be blocked before database initialization');
  assert.equal(stats().writes,0);
  assert.equal(stats().paidCalls,0);
 });
});
