import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {installGenerationStudio} from '../server/generation-studio.js';

// Full HTTP/Studio → DB persisted job → purchased B+D gate → mock provider.
// No external payment/AI/network traffic except loopback HTTP.
const model='gemini-3.1-flash-image';
const pricing={model,provider:'Google',kind:'image',credits:7,providerCostMicros:1200,currency:'usd'};
const baseEnv={AI_STUDIO_ENABLED:'true',AI_PUBLIC_GENERATION_ENABLED:'true',
 AI_STUDIO_WALLET_ENABLED:'true',AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',
 AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image',
 GEMINI_API_KEY:'test-only-not-an-api-key',DATABASE_URL:'test-only',ADMIN_EMAIL:'owner@example.test',
 AI_MODEL_PRICING_JSON:JSON.stringify([pricing]),
 AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:2,maxPerHour:12}])};
function simulate({receiptStatus='paid',providerThrows=false,reservationPersistFails=false,user={id:'customer-1',email:'buyer@example.test',plan:'basic',subscription_status:'active',provider:'email'},envOverrides={}}={}){
 const jobs=[],walletEvents=[];let providerCalls=0;
 const pool={
  async query(sql,args=[]){
   if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
   if(sql.startsWith('SELECT user_id,kind,model,provider,status,operation,deleted,request_fingerprint,credits_reserved,settings,estimated_cost,cost_currency FROM vv_generation_jobs')){
    return {rows:jobs.filter(j=>j.id===args[0]&&j.user_id===args[1])};
   }
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='processing',credits_reserved")){
    if(reservationPersistFails)throw Error('mock job persistence failed after wallet reserve');
    const j=jobs.find(x=>x.id===args[0]);j.status='processing';j.credits_reserved=args[1];return {rows:[]};
   }
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='finalizing'")){
    const j=jobs.find(x=>x.id===args[0]);j.status='finalizing';j.mime=args[1];return {rows:[]};
   }
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='ready',credits_charged")){
    const j=jobs.find(x=>x.id===args[0]);j.status='ready';j.credits_charged=j.credits_reserved;return {rows:[]};
   }
   if(sql.startsWith("UPDATE vv_generation_jobs SET status='failed'")){
    const j=jobs.find(x=>x.id===args[0]);j.status='failed';
    if(sql.includes('credits_reserved=CASE WHEN')){j.credits_reserved=args[1]?0:j.credits_reserved;j.error=args[2];}
    else j.error=args[1];
    return {rows:[]};
   }
   throw Error('Unexpected fake DB SQL: '+sql.slice(0,85));
  },
  async connect(){return {async query(sql,args=[]){
   if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)||sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};
   if(sql.startsWith('SELECT id,status,request_fingerprint'))return {rows:[]};
   if(sql.startsWith('SELECT count(*)::int AS n'))return {rows:[{n:0}]};
   if(sql.startsWith('INSERT INTO vv_generation_jobs')){
    jobs.push({id:args[0],user_id:args[1],kind:args[2],status:args[3],provider:args[4],
     model:args[5],prompt:args[6],client_request_id:args[7],request_fingerprint:args[8],
     settings:JSON.parse(args[9]),estimated_cost:args[10],cost_currency:args[11],
     credits_reserved:0,deleted:false,operation:null});
    return {rows:[]};
   }
   throw Error('Unexpected transaction SQL: '+sql.slice(0,85));
  },release(){}}}
 };
 const wallet={
  async reserve(value){walletEvents.push(['reserve',value]);return {available:93,reserved:7,debt:0}},
  async settle(value){walletEvents.push(['settle',value]);return {status:value.outcome==='success'?'captured':value.outcome==='confirmed_failure'?'released':'held'}},
  purchasedDispatchVerifier(){return async v=>{
   walletEvents.push(['purchasedClaim',v]);
   if(receiptStatus==='reject')throw Error('unpaid or refunded source');
   return {source:receiptStatus==='paid'?'settled_stripe_purchase':'bonus_credit',
    purchaseConfirmed:true,refunded:false,dispatchClaimedExactlyOnce:true,
    purchaseId:'cs_live_mock_only',reservationId:v.jobId,userId:v.userId,jobId:v.jobId,
    modelId:v.modelId,provider:v.provider,requestFingerprint:v.requestFingerprint,
    creditsReserved:v.credits,purchasedCreditsAvailableBeforeReserve:7};
  }}
 };
 const app=express();app.use(express.json());
 installGenerationStudio(app,{pool,wallet,env:{...baseEnv,...envOverrides},auth:(req,_res,next)=>{req.user=user;next()},
  provider:async()=>{providerCalls++;if(providerThrows)throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');return {mime:'image/png',bytes:Buffer.from('mock-only-image')}}});
 return {app,jobs,walletEvents,providerCalls:()=>providerCalls};
}
async function withHttp(sim,fn){
 const server=sim.app.listen(0);await new Promise(r=>server.once('listening',r));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/studio/jobs';
  await fn(async(body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({requestId:randomUUID(),kind:'image',prompt:'owned flower',ratio:'1:1',
    model,consent:true,...body})}));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,40));
test('HTTP purchased customer: durable consent+server quote, atomic proof, provider once, credit capture',async()=>{
 const sim=simulate();await withHttp(sim,async post=>{
  const res=await post();assert.equal(res.status,202);const body=await res.json();
  assert.equal(body.creditsReserved,7);await settle();
  assert.equal(sim.providerCalls(),1);
  assert.equal(sim.jobs[0].status,'ready');
  assert.equal(sim.jobs[0].settings.dispatchConsent,true);
  assert.equal(sim.jobs[0].settings.purchasedQuote.credits,7);
  assert.deepEqual(sim.walletEvents.map(x=>x[0]),['reserve','purchasedClaim','settle']);
  assert.equal(sim.walletEvents.at(-1)[1].outcome,'success');
 });
});
test('HTTP bonus/welcome/unknown funding cannot reach provider and automatically returns held credits',async()=>{
 for(const receiptStatus of ['bonus','reject']){
  const sim=simulate({receiptStatus});
  await withHttp(sim,async post=>{
   const res=await post();assert.equal(res.status,202);await settle();
   assert.equal(sim.providerCalls(),0);assert.equal(sim.jobs[0].status,'failed');
   assert.equal(sim.walletEvents.at(-1)[1].outcome,'confirmed_failure');
   assert.equal(sim.jobs[0].credits_reserved,0,'refuse before provider, release ALL reserved credits');
  });
 }
});
test('HTTP owner pilot and disabled paid-only flag reject before DB insert or wallet reserve',async()=>{
 for(const cfg of [
  {user:{id:'owner',provider:'google',email:'owner@example.test'}},
  {envOverrides:{AI_PURCHASED_ONLY_DISPATCH_ENABLED:'false'}}
 ]){
  const sim=simulate(cfg);
  await withHttp(sim,async post=>{
   const res=await post();assert.equal(res.status,503);
   assert.equal((await res.json()).error,'AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');
   assert.equal(sim.jobs.length,0);assert.equal(sim.walletEvents.length,0);assert.equal(sim.providerCalls(),0);
  });
 }
});
test('HTTP without explicit user consent fails before reservation or provider',async()=>{
 const sim=simulate();await withHttp(sim,async post=>{
  const res=await post({consent:false});assert.equal(res.status,400);
  assert.equal(sim.jobs.length,0);assert.equal(sim.providerCalls(),0);
 });
});

test('HTTP ambiguous provider error never triggers refund, even with denial-like message',async()=>{
 const sim=simulate({providerThrows:true});
 await withHttp(sim,async post=>{
  const res=await post();assert.equal(res.status,202);await settle();
  assert.equal(sim.providerCalls(),1,'the paid provider was invoked just once');
  assert.equal(sim.jobs[0].status,'failed');
  assert.equal(sim.jobs[0].credits_reserved,7,'ambiguous acceptance must remain held');
  assert.deepEqual(sim.walletEvents.map(x=>x[0]),['reserve','purchasedClaim','settle']);
  assert.equal(sim.walletEvents.at(-1)[1].outcome,'unknown');
 });
});

test('HTTP job persistence fails AFTER wallet reserve: release credits, NO provider call',async()=>{
 const sim=simulate({reservationPersistFails:true});
 await withHttp(sim,async post=>{
  const res=await post();assert.equal(res.status,503);
  assert.equal((await res.json()).error,'AI_WALLET_UNAVAILABLE');
  assert.equal(sim.jobs.length,1);
  assert.equal(sim.jobs[0].status,'failed');
  assert.equal(sim.providerCalls(),0);
  assert.deepEqual(sim.walletEvents.map(x=>x[0]),['reserve','settle']);
  assert.equal(sim.walletEvents[1][1].outcome,'confirmed_failure');
 });
});
