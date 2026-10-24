import test from 'node:test';
import assert from 'node:assert/strict';
import {planPreDispatchFallback} from '../server/generation-fallback-policy.js';
import {estimateGenerationPricing} from '../server/generation-pricing.js';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';

const model=(id,provider,overrides={})=>({
 id,provider,kind:'video',enabled:true,adapter:true,quality:'720p',references:1,ratios:['16:9'],
 capabilities:{ratios:['16:9'],maxReferences:1,videoInputModes:['text','first_frame'],resolutions:['720p'],durations:[8],durationSeconds:8},
 ...overrides
});
const primary=model('primary','BytePlus'),backup=model('backup','Google');
const request={kind:'video',ratio:'16:9',references:[],videoInputMode:'text',videoResolution:'720p',videoDuration:8};
const quotes=new Map([['primary',{credits:80,providerCostMicros:200000,currency:'usd'}],['backup',{credits:80,providerCostMicros:180000,currency:'usd'}]]);
const quoteFor=m=>quotes.get(m.id)||null;
const opts=()=>({request,primary,candidates:[primary,backup],quoteFor,smart:true,providerStarted:false});

test('BASE #8: safe equivalent video provider yields a no-spend pre-dispatch fallback plan',()=>{
 const plan=planPreDispatchFallback(opts());
 assert.equal(plan.reason,'READY');assert.deepEqual(plan.eligible,[{id:'backup',provider:'Google'}]);
 assert.deepEqual(plan.blocked,[]);
});

test('BASE #8: never fallback after provider submission or for explicit model selection',()=>{
 let quoted=0;
 const quote=m=>{quoted++;return quoteFor(m);};
 assert.deepEqual(planPreDispatchFallback({...opts(),quoteFor:quote,providerStarted:true}),{eligible:[],blocked:[],reason:'PROVIDER_ALREADY_STARTED'});
 assert.deepEqual(planPreDispatchFallback({...opts(),quoteFor:quote,smart:false}),{eligible:[],blocked:[],reason:'EXPLICIT_MODEL_NO_FALLBACK'});
 assert.equal(quoted,0);
});

test('BASE #8: refuse customer credit changes, currency changes or higher internal cost',()=>{
 for(const item of [
  {credits:81,providerCostMicros:180000,currency:'usd'},
  {credits:80,providerCostMicros:180000,currency:'eur'},
  {credits:80,providerCostMicros:210000,currency:'usd'}
 ]){
  const p=planPreDispatchFallback({...opts(),quoteFor:m=>m.id==='backup'?item:quoteFor(m)});
  assert.deepEqual(p.eligible,[]);
  assert.equal(p.blocked.length,1);
  assert.ok(['CUSTOMER_PRICE_CHANGED','INTERNAL_COST_INCREASE'].includes(p.blocked[0].reason));
 }
});

test('BASE #8: fail closed when prices are absent, invalid or quoting throws',()=>{
 assert.equal(planPreDispatchFallback({...opts(),quoteFor:()=>null}).reason,'PRIMARY_PRICE_NOT_APPROVED');
 assert.equal(planPreDispatchFallback({...opts(),quoteFor:()=>{throw Error('pricing unavailable')}}).reason,'PRIMARY_PRICE_NOT_APPROVED');
 const plan=planPreDispatchFallback({...opts(),quoteFor:m=>m.id==='primary'?quoteFor(m):{credits:80,providerCostMicros:0,currency:'usd'}});
 assert.deepEqual(plan.eligible,[]);assert.equal(plan.blocked[0].reason,'FALLBACK_PRICE_NOT_APPROVED');
});

test('BASE #8: reject disabled, non-distinct, maintenance or incompatible fallback models',()=>{
 const variations=[
  model('x','BytePlus'),
  model('x','Google',{enabled:false}),
  model('x','Google',{maintenance:true}),
  model('x','Google',{adapter:false}),
  model('x','Google',{capabilities:{...backup.capabilities,videoInputModes:['first_frame']}}),
  model('x','Google',{capabilities:{...backup.capabilities,resolutions:['1080p']}})
 ];
 for(const bad of variations){
  const plan=planPreDispatchFallback({...opts(),candidates:[bad],quoteFor:m=>m.id==='x'?quotes.get('backup'):quoteFor(m)});
  assert.deepEqual(plan.eligible,[]);assert.equal(plan.blocked.length,1);
 }
});

test('BASE #8: refuse malformed ref counts and unsupported media types',()=>{
 assert.equal(planPreDispatchFallback({...opts(),request:{...request,references:null,referenceCount:1.5}}).reason,'INVALID_REFERENCES');
 assert.equal(planPreDispatchFallback({...opts(),request:{...request,kind:'music'}}).reason,'FALLBACK_UNAVAILABLE');
});

test('BASE #8: real approved pricing registry permits lowercase usd fallback parity',()=>{
 const seedance={...MODEL_CATALOG.find(m=>m.id==='byteplus-seedance-2'),enabled:true};
 const veo={...MODEL_CATALOG.find(m=>m.id==='veo-3.1-lite-generate-preview'),enabled:true};
 assert.ok(seedance&&veo);
 const env={AI_MODEL_PRICING_JSON:JSON.stringify([
  {model:seedance.id,provider:'BytePlus',kind:'video',credits:80,providerCostMicros:200000,currency:'usd',quality:'720p',durationSeconds:8},
  {model:veo.id,provider:'Google',kind:'video',credits:80,providerCostMicros:180000,currency:'usd',quality:'720p',durationSeconds:8}
 ])};
 const quoteFor=(m,q)=>estimateGenerationPricing({...q,model:m.id},m,env);
 const plan=planPreDispatchFallback({request,primary:seedance,candidates:[seedance,veo],quoteFor,smart:true,providerStarted:false});
 assert.equal(plan.reason,'READY');
 assert.deepEqual(plan.eligible,[{id:veo.id,provider:'Google'}]);
});

test('BASE #8: approved 2K image fallback respects real model formats and primary capabilities',()=>{
 const google={...MODEL_CATALOG.find(m=>m.id==='gemini-3.1-flash-image'),enabled:true};
 const byteplus={...MODEL_CATALOG.find(m=>m.id==='byteplus-seedream-4-5'),enabled:true};
 assert.ok(google&&byteplus);
 const requestImage={kind:'image',ratio:'1:1',references:[],resolution:'2K',outputFormat:'auto'};
 const env={AI_MODEL_PRICING_JSON:JSON.stringify([
  {model:google.id,provider:'Google',kind:'image',credits:20,providerCostMicros:100000,currency:'usd',quality:'2K'},
  {model:byteplus.id,provider:'BytePlus',kind:'image',credits:20,providerCostMicros:95000,currency:'usd',quality:'2K'}
 ])};
 const input={request:requestImage,primary:google,candidates:[google,byteplus],smart:true,
  quoteFor:(m,q)=>estimateGenerationPricing({...q,model:m.id},m,env)};
 const safe=planPreDispatchFallback(input);
 assert.deepEqual(safe.eligible,[{id:byteplus.id,provider:'BytePlus'}]);
 const invalidPrimary=planPreDispatchFallback({...input,request:{...requestImage,outputFormat:'png'}});
 assert.deepEqual(invalidPrimary.eligible,[]);
 assert.equal(invalidPrimary.reason,'PRIMARY_CAPABILITIES_INVALID');
});
