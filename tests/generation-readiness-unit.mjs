import test from 'node:test';
import assert from 'node:assert/strict';
import {generationReadiness} from '../server/generation-readiness.js';

test('launch readiness is fail-closed and never contains secret values',()=>{
 const off=generationReadiness({});assert.equal(off.launchReady,false);assert.ok(off.blockers.includes('database'));assert.equal(JSON.stringify(off).includes('secret'),false);
 const env={
  DATABASE_URL:'postgres://hidden',APP_JWT_SECRET:'jwt-hidden',GEMINI_API_KEY:'gemini-hidden',
  AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:10,providerCostMicros:1000,currency:'usd'},{model:'veo-3.1-fast-generate-preview',provider:'Google',kind:'video',credits:20,providerCostMicros:9000,currency:'usd'}]),
  AI_STUDIO_ENABLED:'true',
  AI_STUDIO_WALLET_ENABLED:'true',
  AI_CREDIT_PACKS_JSON:JSON.stringify([{sku:'starter',priceId:'price_Test123',credits:100,amount:99,currency:'usd'}]),
  AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'image',credits:10},{kind:'video',credits:20}]),
  STRIPE_SECRET_KEY:'sk_live_hidden',STRIPE_WEBHOOK_SECRET:'whsec_synthetic_test_only',AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',AI_OBJECT_STORAGE_REGION:'auto',AI_OBJECT_STORAGE_ACCESS_KEY_ID:'access-key-123',AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'storage-hidden-123',
  AI_STUDIO_BACKGROUND_POLLING:'true',AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'1',AI_STUDIO_MAX_JOBS_PER_HOUR:'10',AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:10}]),AI_PUBLIC_GENERATION_ENABLED:'true'
 };
 const ready=generationReadiness(env);assert.equal(ready.launchReady,true);const raw=JSON.stringify(ready);for(const secret of ['jwt-hidden','gemini-hidden','sk_live_hidden','storage-hidden-123','postgres://hidden'])assert.equal(raw.includes(secret),false);
 assert.equal(ready.billing.liveAiPaymentsImplemented,true);assert.equal(ready.billing.liveAiPaymentsEnabled,true);assert.equal(ready.billing.mode,'live');
});


test('BASE #51: explicit Image or Video kill switches block commercial launch readiness',()=>{
 const base={AI_PUBLIC_GENERATION_ENABLED:'true',AI_IMAGE_ENABLED:'true',AI_VIDEO_ENABLED:'true'};
 assert.equal(generationReadiness(base).gates.find(g=>g.id==='imageVideo').ready,true);
 assert.equal(generationReadiness({AI_PUBLIC_GENERATION_ENABLED:'true'}).gates.find(g=>g.id==='imageVideo').ready,true,
  'unset flags retain existing backward-compatible catalog behavior');
 for(const flag of ['AI_IMAGE_ENABLED','AI_VIDEO_ENABLED']){
  for(const value of ['false','0','TRUE','']){
   const report=generationReadiness({...base,[flag]:value});
   assert.ok(report.blockers.includes('imageVideo'),flag+'='+value);
   assert.equal(report.launchReady,false);
   assert.equal(report.gates.find(g=>g.id==='imageVideo').ready,false);
  }
 }
 assert.equal(generationReadiness({...base,BYTEPLUS_ENABLED:'false'}).gates.find(g=>g.id==='imageVideo').ready,true,
  'disabling just one optional provider should not disable an independent provider');
});

test('BASE #51: commercial readiness cannot report ready when Studio routes are disabled',()=>{
 for(const value of [undefined,'false','','TRUE','0']){
  const report=generationReadiness({AI_STUDIO_ENABLED:value,AI_PUBLIC_GENERATION_ENABLED:'true'});
  assert.equal(report.gates.find(g=>g.id==='studioEnabled').ready,false);
  assert.ok(report.blockers.includes('studioEnabled'));
  assert.equal(report.launchReady,false);
 }
 const report=generationReadiness({AI_STUDIO_ENABLED:'true'});
 assert.equal(report.gates.find(g=>g.id==='studioEnabled').ready,true);
 assert.equal(report.blockers.includes('studioEnabled'),false);
 assert.equal(report.launchReady,false,'other required production gates remain mandatory');
});

test('pricing without currency remains a launch blocker even when model economics exist',()=>{
 const r=generationReadiness({AI_MODEL_PRICING_JSON:JSON.stringify([{model:'m',provider:'P',kind:'image',credits:1,providerCostMicros:100}])});
 assert.equal(r.pricing.configured,true);assert.equal(r.pricing.currenciesExplicit,false);assert.ok(r.blockers.includes('pricing'));
});

test('BASE #51: release readiness flags an enabled public rate guard with missing limits',()=>{
 const base={AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'1',AI_STUDIO_MAX_JOBS_PER_HOUR:'10'};
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
 const publicWithoutGuard=generationReadiness({...base,AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_PUBLIC_POLICY_ENABLED:'false'});
 assert.equal(publicWithoutGuard.launchReady,false);
 assert.equal(publicWithoutGuard.gates.find(g=>g.id==='publicJobPolicy').ready,false);
 assert.ok(publicWithoutGuard.blockers.includes('publicJobPolicy'));
 const publicUnsetGuard=generationReadiness({AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'1',AI_STUDIO_MAX_JOBS_PER_HOUR:'10'});
 assert.ok(publicUnsetGuard.blockers.includes('publicJobPolicy'));
 const pilotWithoutGuard=generationReadiness({AI_PUBLIC_GENERATION_ENABLED:'false'});
 assert.equal(pilotWithoutGuard.blockers.includes('publicJobPolicy'),false);
});

test('BASE #16: live AI checkout cannot claim launch readiness without webhook signature secret',()=>{
 const common={AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  STRIPE_SECRET_KEY:'sk_live_synthetic',STRIPE_WEBHOOK_SECRET:'whsec_synthetic_test_only'};
 const good=generationReadiness(common);
 assert.equal(good.gates.find(g=>g.id==='stripeWebhook')?.ready,true);
 assert.equal(good.blockers.includes('stripeWebhook'),false);
 for(const value of [undefined,'','not-a-webhook-secret','whsec_short']){
  const candidate=generationReadiness({...common,STRIPE_WEBHOOK_SECRET:value});
  assert.ok(candidate.blockers.includes('stripeWebhook'),String(value));
  assert.equal(candidate.launchReady,false);
 }
 const inactive=generationReadiness({STRIPE_SECRET_KEY:'sk_test_synthetic',AI_BILLING_MODE:'test'});
 assert.equal(inactive.blockers.includes('stripeWebhook'),false);
 const report=JSON.stringify(good);
 assert.equal(report.includes('whsec_synthetic_test_only'),false);
});


test('BASE #51 commercial readiness requires BOTH Image and Video price entries and credit rates',()=>{
 const modelPrice=(kind)=>({model:kind==='image'?'gemini-3.1-flash-image':'veo-3.1-fast-generate-preview',provider:'Google',kind,credits:kind==='image'?10:20,providerCostMicros:kind==='image'?1000:9000,currency:'usd'});
 const kindRate=(kind)=>({kind,credits:kind==='image'?10:20});
 const baseline={AI_MODEL_PRICING_JSON:JSON.stringify(['image','video'].map(modelPrice)),AI_CREDIT_RATES_JSON:JSON.stringify(['image','video'].map(kindRate))};
 const gate=env=>generationReadiness(env).gates.find(g=>g.id==='imageVideoPricing');
 assert.equal(gate(baseline).ready,true);
 for(const kinds of [['image'],['video'],[]]){
  const withoutModels={...baseline,AI_MODEL_PRICING_JSON:JSON.stringify(kinds.map(modelPrice))};
  const report=generationReadiness(withoutModels);
  assert.equal(gate(withoutModels).ready,false,'missing approved model price for '+kinds.join(','));
  assert.ok(report.blockers.includes('imageVideoPricing'));
  assert.equal(report.launchReady,false);
  const withoutRates={...baseline,AI_CREDIT_RATES_JSON:JSON.stringify(kinds.map(kindRate))};
  assert.equal(gate(withoutRates).ready,false,'missing credit rate for '+kinds.join(','));
  assert.ok(generationReadiness(withoutRates).blockers.includes('imageVideoPricing'));
 }
 const disabled={...baseline,AI_IMAGE_ENABLED:'false'};
 assert.equal(gate(disabled).ready,true,'pricing coverage does not silently override existing Image kill switch');
 assert.ok(generationReadiness(disabled).blockers.includes('imageVideo'));
 assert.equal(generationReadiness(disabled).launchReady,false);
});
