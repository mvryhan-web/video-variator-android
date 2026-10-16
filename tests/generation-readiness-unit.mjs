import test from 'node:test';
import assert from 'node:assert/strict';
import {generationReadiness} from '../server/generation-readiness.js';

test('launch readiness is fail-closed and never contains secret values',()=>{
 const off=generationReadiness({});assert.equal(off.launchReady,false);assert.ok(off.blockers.includes('database'));assert.equal(JSON.stringify(off).includes('secret'),false);
 const env={
  DATABASE_URL:'postgres://hidden',APP_JWT_SECRET:'jwt-hidden',GEMINI_API_KEY:'gemini-hidden',
  AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:10,providerCostMicros:1000,currency:'usd'}]),
  AI_STUDIO_WALLET_ENABLED:'true',
  AI_CREDIT_PACKS_JSON:JSON.stringify([{sku:'starter',priceId:'price_Test123',credits:100,amount:99,currency:'usd'}]),
  AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'image',credits:10}]),
  STRIPE_SECRET_KEY:'sk_live_hidden',AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',AI_OBJECT_STORAGE_REGION:'auto',AI_OBJECT_STORAGE_ACCESS_KEY_ID:'access-key-123',AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'storage-hidden-123',
  AI_STUDIO_BACKGROUND_POLLING:'true',AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:10}]),AI_PUBLIC_GENERATION_ENABLED:'true'
 };
 const ready=generationReadiness(env);assert.equal(ready.launchReady,true);const raw=JSON.stringify(ready);for(const secret of ['jwt-hidden','gemini-hidden','sk_live_hidden','storage-hidden-123','postgres://hidden'])assert.equal(raw.includes(secret),false);
 assert.equal(ready.billing.liveAiPaymentsImplemented,true);assert.equal(ready.billing.liveAiPaymentsEnabled,true);assert.equal(ready.billing.mode,'live');
});


test('pricing without currency remains a launch blocker even when model economics exist',()=>{
 const r=generationReadiness({AI_MODEL_PRICING_JSON:JSON.stringify([{model:'m',provider:'P',kind:'image',credits:1,providerCostMicros:100}])});
 assert.equal(r.pricing.configured,true);assert.equal(r.pricing.currenciesExplicit,false);assert.ok(r.blockers.includes('pricing'));
});

test('BASE #51: release readiness flags an enabled public rate guard with missing limits',()=>{
 const base={AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'1',AI_STUDIO_MAX_JOBS_PER_HOUR:'10'};
 const good=generationReadiness(base);
 assert.equal(good.gates.find(g=>g.id==='publicJobPolicy')?.ready,true);
 assert.equal(good.blockers.includes('publicJobPolicy'),false);
 for(const bad of [
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:'0'},
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:'garbled'},
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:'101'},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:'0'},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:'10001'},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:undefined}
 ]){
  const readiness=generationReadiness({...base,...bad});
  assert.equal(readiness.launchReady,false);
  assert.ok(readiness.blockers.includes('publicJobPolicy'),JSON.stringify(bad));
 }
 const disabled=generationReadiness({AI_STUDIO_PUBLIC_POLICY_ENABLED:'false'});
 assert.equal(disabled.blockers.includes('publicJobPolicy'),false);
});
