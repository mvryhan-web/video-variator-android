import test from 'node:test';
import assert from 'node:assert/strict';
import {generationReadiness} from '../server/generation-readiness.js';

test('launch readiness is fail-closed and never contains secret values',()=>{
 const off=generationReadiness({});assert.equal(off.launchReady,false);assert.ok(off.blockers.includes('database'));assert.equal(JSON.stringify(off).includes('secret'),false);
 const env={
  DATABASE_URL:'postgres://hidden',APP_JWT_SECRET:'jwt-hidden',GEMINI_API_KEY:'gemini-hidden',
  AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:10,providerCostMicros:1000}]),
  AI_STUDIO_WALLET_ENABLED:'true',
  AI_CREDIT_PACKS_JSON:JSON.stringify([{sku:'starter',priceId:'price_Test123',credits:100,amount:99,currency:'usd'}]),
  AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'image',credits:10}]),
  STRIPE_SECRET_KEY:'sk_live_hidden',AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',AI_OBJECT_STORAGE_REGION:'auto',AI_OBJECT_STORAGE_ACCESS_KEY_ID:'access',AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'storage-hidden',
  AI_STUDIO_BACKGROUND_POLLING:'true',AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:10}]),AI_PUBLIC_GENERATION_ENABLED:'true'
 };
 const ready=generationReadiness(env);assert.equal(ready.launchReady,true);const raw=JSON.stringify(ready);for(const secret of ['jwt-hidden','gemini-hidden','sk_test_hidden','storage-hidden','postgres://hidden'])assert.equal(raw.includes(secret),false);
 assert.equal(ready.billing.liveAiPaymentsImplemented,true);assert.equal(ready.billing.liveAiPaymentsEnabled,true);assert.equal(ready.billing.mode,'live');
});
