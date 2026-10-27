import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {dispatchGeneration} from '../server/generation-studio.js';
import {generateGoogle} from '../server/generation-provider.js';
import {generateBytePlus} from '../server/generation-byteplus.js';
import {generateOpenAIImage} from '../server/generation-openai-image.js';
import {submitPurchasedProviderRequest} from '../server/generation-purchased-provider-boundary.js';

// Genuine local HTTP transport, synthetic models/keys only. NEVER contact
// Google, OpenAI, BytePlus, Stripe or production in this suite.
const image={kind:'image',model:'gemini-3.1-flash-image',prompt:'Synthetic sunset',ratio:'1:1',references:[]};
const plus={...image,model:'byteplus-seedream-5-lite',resolution:'2K',outputFormat:'png'};
const openai={...image,model:'gpt-image-1.5',resolution:'1K',outputFormat:'png'};
const gate={customerPaymentConfirmed:true,purchasedCreditsReserved:true,serverPriceApproved:true,userConsented:true,durableStorageReady:true};
const aiConfig={id:'gpt-image-1.5',enabled:true,quality:'high',maxReferences:0,formats:['png'],sizes:{'1:1':{'1K':'1024x1024'}}};
const deferred=()=>{let release;const promise=new Promise(r=>{release=r;});return {promise,release};};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dEnv={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',ADMIN_EMAIL:'owner@example.test',AI_PROVIDER_DISPATCH_TIMEOUT_MS:'100'};
const user={id:'user-A',email:'a@example.test',isOwner:false};
const model={id:image.model,kind:'image',provider:'Google',adapter:true};
const quote={kind:'image',model:image.model,provider:'Google',credits:7,providerCostMicros:1200,currency:'usd'};
const fingerprint='b'.repeat(64);
const job={id:'paid-A',userId:user.id,user_id:user.id,kind:'image',model:image.model,provider:'Google',status:'processing',
 deleted:false,requestFingerprint:fingerprint,creditsReserved:7,estimated_cost:0.0012,cost_currency:'usd',
 settings:{dispatchConsent:true,purchasedQuote:{...quote}}};

test('P0 pre-aborted request never starts an OpenAI, Google, or BytePlus HTTP transport',async()=>{
 for(const [modelId,request] of [[image.model,image],[plus.model,plus],[openai.model,openai]]){
  const controller=new AbortController();controller.abort(Error('REVOKED'));
  let calls=0;
  await assert.rejects(dispatchGeneration(request,{env:{GEMINI_API_KEY:'fixture',BYTEPLUS_API_KEY:'fixture',OPENAI_API_KEY:'fixture'},
   signal:controller.signal,fetcher:async()=>{calls++;throw Error('UNSAFE_FETCH');}}),/REVOKED/);
  assert.equal(calls,0,modelId+' must never call fetch');
 }
});

test('P0 late adapter dispatch after consent timeout and revoke ACK has ZERO new HTTP sends',async()=>{
 let accepted=true,unlocked=false,claims=0,sends=0,abortedSignal=null;
 const prepared=deferred(),proceed=deferred();
 const client={
  async query(sql){
   if(sql.includes('pg_try_advisory_lock'))return {rows:[{acquired:true}]};
   if(sql.includes('pg_advisory_unlock')){unlocked=true;return {rows:[{pg_advisory_unlock:true}]};}
   if(sql.startsWith('SELECT terms_version'))return {rows:[accepted?{terms_version:'2026-10-20',privacy_version:'2026-10-20',provider_data_version:'2026-10-20',provider_data_accepted:true}:{provider_data_accepted:false}]};
   return {rows:[]};
  },release(){}
 };
 const wallet={purchasedDispatchVerifier:()=>async()=>{claims++;return {
  source:'settled_stripe_purchase',purchaseConfirmed:true,refunded:false,
  dispatchClaimedExactlyOnce:true,purchaseId:'synthetic-purchase-id',
  reservationId:job.id,userId:user.id,jobId:job.id,modelId:model.id,
  provider:model.provider,requestFingerprint:fingerprint,creditsReserved:7,
  purchasedCreditsAvailableBeforeReserve:7
 };}};
 const provider=async(req,{signal,authorization})=>{
  abortedSignal=signal;prepared.release();await proceed.promise;
  return dispatchGeneration(req,{env:{GEMINI_API_KEY:'fixture'},authorization,signal,
   fetcher:async()=>{sends++;throw Error('LATE_NETWORK');}});
 };
 const request=submitPurchasedProviderRequest({env:dEnv,pool:{connect:async()=>client},wallet,user,job,request:image,model,quote,originalQuote:quote,fingerprint,provider});
 await prepared.promise;
 await assert.rejects(request,/AI_PROVIDER_TIMEOUT_UNCERTAIN/);
 assert.equal(unlocked,true,'consent lock must be released despite uncertain transport');
 accepted=false; // Equivalent to the successful fenced revoke ACK after timeout.
 assert.equal(abortedSignal.aborted,true);
 proceed.release();
 await delay(20);
 assert.equal(sends,0,'late real Studio adapter may not start a new HTTP call after revoke ACK');
 assert.equal(claims,1,'purchased one-use claim is not retried or refunded');
});

test('P0 already-sent local HTTP provider streams abort in flight; never send a retry',async()=>{
 for(const kind of ['OpenAI','Google','BytePlus']){
  let sends=0;const entered=deferred();
  const server=createServer((req,res)=>{
   sends++;req.on('data',()=>{});req.on('end',()=>{});
   entered.release();
   // Intentionally leave the request pending until the client aborts.
   res.on('close',()=>{});
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port+'/mock-provider';
  const controller=new AbortController();
  const localFetch=(_url,init)=>fetch(base,init);
  try{
   let running;
   if(kind==='OpenAI')running=generateOpenAIImage(openai,{key:'fake-only',modelConfig:aiConfig,purchasedJobGate:gate,signal:controller.signal,fetcher:localFetch});
   if(kind==='Google')running=generateGoogle(image,{key:'fake-only',signal:controller.signal,fetcher:localFetch});
   if(kind==='BytePlus')running=generateBytePlus(plus,{key:'fake-only',signal:controller.signal,fetcher:localFetch});
   await entered.promise;
   controller.abort(Error('CONSENT_TIMEOUT'));
   await assert.rejects(running,err=>err?.message==='CONSENT_TIMEOUT'||err?.name==='AbortError',kind+' fetch must abort');
   await delay(20);
   assert.equal(sends,1,kind+' must make exactly one pre-revoke call and no retry');
  }finally{
   server.closeAllConnections();
   await new Promise(resolve=>server.close(resolve));
  }
 }
});
