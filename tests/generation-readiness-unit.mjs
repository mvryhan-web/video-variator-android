import test from 'node:test';
import assert from 'node:assert/strict';
import {generationReadiness} from '../server/generation-readiness.js';

test('launch readiness is fail-closed and never contains secret values',()=>{
 const off=generationReadiness({});assert.equal(off.launchReady,false);assert.ok(off.blockers.includes('database'));assert.equal(JSON.stringify(off).includes('secret'),false);
 const env={
  DATABASE_URL:'postgres://hidden',APP_JWT_SECRET:'jwt-hidden',GEMINI_API_KEY:'gemini-hidden',
  AI_MODEL_PRICING_JSON:JSON.stringify([{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:10,providerCostMicros:1000,currency:'usd'},{model:'veo-3.1-fast-generate-preview',provider:'Google',kind:'video',credits:20,providerCostMicros:9000,currency:'usd'}]),
  AI_STUDIO_ENABLED:'true',ADMIN_EMAIL:'owner@example.invalid',AI_STUDIO_MAX_CALLS:'4',AI_STUDIO_ALLOWED_KINDS:'image,video',
  AI_STUDIO_WALLET_ENABLED:'true',
  AI_CREDIT_PACKS_JSON:JSON.stringify([{sku:'starter',priceId:'price_Test123',credits:100,amount:99,currency:'usd'}]),
  AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'image',credits:10},{kind:'video',credits:20}]),
  STRIPE_SECRET_KEY:'sk_live_hidden',STRIPE_WEBHOOK_SECRET:'whsec_synthetic_test_only',AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',AI_OBJECT_STORAGE_REGION:'auto',AI_OBJECT_STORAGE_ACCESS_KEY_ID:'access-key-123',AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'storage-hidden-123',
  AI_STUDIO_BACKGROUND_POLLING:'true',AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'1',AI_STUDIO_MAX_JOBS_PER_HOUR:'10',AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:10}]),AI_PUBLIC_GENERATION_ENABLED:'true'
 };
 const ready=generationReadiness(env);assert.equal(ready.launchReady,false,'purchased-only paid provider authorization is not yet wired');assert.ok(ready.blockers.includes('purchasedOnlyDispatch'));const raw=JSON.stringify(ready);for(const secret of ['jwt-hidden','gemini-hidden','sk_live_hidden','storage-hidden-123','postgres://hidden'])assert.equal(raw.includes(secret),false);
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


test('BASE #51 launch prerequisites reflect actual Studio owner, call limit and allowed creation kinds',()=>{
 const base={AI_STUDIO_ENABLED:'true',ADMIN_EMAIL:'owner@example.invalid',AI_STUDIO_MAX_CALLS:'4',AI_STUDIO_ALLOWED_KINDS:'image,video'};
 const gate=(env,id)=>generationReadiness(env).gates.find(g=>g.id===id)?.ready;
 assert.equal(gate(base,'studioOperator'),true);
 assert.equal(gate(base,'imageVideoKinds'),true);
 for(const changes of [
  {ADMIN_EMAIL:''},{ADMIN_EMAIL:'   '},{ADMIN_EMAIL:undefined},
  {AI_STUDIO_MAX_CALLS:undefined},{AI_STUDIO_MAX_CALLS:'0'},
  {AI_STUDIO_MAX_CALLS:'21'},{AI_STUDIO_MAX_CALLS:'not-a-number'},
  {AI_STUDIO_MAX_CALLS:'1.5'}
 ]){
  const report=generationReadiness({...base,...changes});
  assert.equal(report.gates.find(g=>g.id==='studioOperator').ready,false,JSON.stringify(changes));
  assert.ok(report.blockers.includes('studioOperator'));
  assert.equal(report.launchReady,false);
 }
 for(const kinds of ['', 'image', 'video', 'music', 'image, video','image,video_bad']){
  const report=generationReadiness({...base,AI_STUDIO_ALLOWED_KINDS:kinds});
  assert.equal(report.gates.find(g=>g.id==='imageVideoKinds').ready,false,kinds);
  assert.ok(report.blockers.includes('imageVideoKinds'));
  assert.equal(report.launchReady,false);
 }
 const valid=generationReadiness({...base,AI_STUDIO_ALLOWED_KINDS:'video,image'});
 assert.equal(valid.gates.find(g=>g.id==='imageVideoKinds').ready,true);
});

test('P0 #182: no env configuration can make paid AI launch ready before purchased-only dispatch is wired',()=>{
 for(const enabled of [undefined,'false','true','TRUE','1']){
  const report=generationReadiness({AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_ENABLED:'true',
   AI_PURCHASED_ONLY_DISPATCH_ENABLED:enabled,AI_BILLING_MODE:'live',
   AI_LIVE_BILLING_APPROVED:'true',AI_BILLING_ENABLED:'true',
   STRIPE_SECRET_KEY:'sk_live_synthetic',STRIPE_WEBHOOK_SECRET:'whsec_synthetic_long'});
  const gate=report.gates.find(g=>g.id==='purchasedOnlyDispatch');
  assert.deepEqual(gate,{id:'purchasedOnlyDispatch',
   label:'Purchased live-credit customer authorization enforced before provider dispatch',ready:false,required:true});
  assert.ok(report.blockers.includes('purchasedOnlyDispatch'));
  assert.equal(report.launchReady,false);
 }
});


test('BASE #51: phantom model or wrong provider price must not count as launch price coverage',()=>{
 const image={model:'gemini-3.1-flash-image',provider:'Google',kind:'image',
  credits:10,providerCostMicros:1000,currency:'usd'};
 const video={model:'veo-3.1-fast-generate-preview',provider:'Google',kind:'video',
  credits:20,providerCostMicros:9000,currency:'usd'};
 const rates=[{kind:'image',credits:10},{kind:'video',credits:20}];
 const coverage=rows=>generationReadiness({
  AI_MODEL_PRICING_JSON:JSON.stringify(rows),
  AI_CREDIT_RATES_JSON:JSON.stringify(rates)
 }).gates.find(g=>g.id==='imageVideoPricing').ready;
 assert.equal(coverage([image,video]),true,'real adapter-backed Image and Video models remain covered');
 for(const bad of [
  [{...image,model:'nonexistent-image-model'},video],
  [image,{...video,model:'nonexistent-video-model'}],
  [{...image,provider:'BytePlus'},video],
  [image,{...video,provider:'BytePlus'}],
  [{...image,model:'google-tts-preview',kind:'image'},video],
  [{...image,model:'nonexistent-image-model'},{...video,model:'nonexistent-video-model'}]
 ]){
  assert.equal(coverage(bad),false,'unroutable or wrong-provider price cannot authorize setup '+JSON.stringify(bad));
 }
 // An unrecognized extra price does not invalidate a separate genuinely
 // supported and explicitly priced route; the live payment P0 still blocks launch.
 assert.equal(coverage([image,video,{...video,model:'unrecognized-optional-video'}]),true);
 const unsafe=generationReadiness({
  AI_MODEL_PRICING_JSON:JSON.stringify([image,{...video,provider:'BytePlus'}]),
  AI_CREDIT_RATES_JSON:JSON.stringify(rates),
  AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'
 });
 assert.equal(unsafe.launchReady,false);
 assert.ok(unsafe.blockers.includes('imageVideoPricing'));
 assert.ok(unsafe.blockers.includes('purchasedOnlyDispatch'),
  'new guard must not relax mandatory customer-purchased proof');
});


test('BASE #51: both Image and Video need a priced model actually allowed by Studio with its own provider key',()=>{
 const img={model:'gemini-3.1-flash-image',provider:'Google',kind:'image',
  credits:12,providerCostMicros:1900,currency:'usd'};
 const googleVideo={model:'veo-3.1-fast-generate-preview',provider:'Google',kind:'video',
  credits:80,providerCostMicros:50000,currency:'usd'};
 const seedImage={model:'byteplus-seedream-4-5',provider:'BytePlus',kind:'image',
  credits:15,providerCostMicros:2000,currency:'usd'};
 const seedVideo={model:'byteplus-seedance-2',provider:'BytePlus',kind:'video',
  credits:85,providerCostMicros:60000,currency:'usd'};
 const kinds=[{kind:'image',credits:12},{kind:'video',credits:80}];
 const base={
  AI_MODEL_PRICING_JSON:JSON.stringify([img,googleVideo]),
  AI_CREDIT_RATES_JSON:JSON.stringify(kinds)
 };
 const check=(overrides={})=>generationReadiness({...base,...overrides}).gates.find(
  gate=>gate.id==='imageVideoProviderModels')?.ready;
 assert.equal(check({GEMINI_API_KEY:'synthetic-no-network'}),false,
  'Veo Fast is not a default Studio-enabled model');
 assert.equal(check({GEMINI_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:googleVideo.model}),true,
  'operator opted in and Google key is present for both priced routes');
 assert.equal(check({BYTEPLUS_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:googleVideo.model}),false,
  'some provider key is not proof Google models can run');
 assert.equal(check({AI_STUDIO_ALLOWED_MODELS:googleVideo.model}),false,
  'an approved catalog price alone cannot replace the provider key');
 assert.equal(check({GEMINI_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:googleVideo.model,AI_VIDEO_ENABLED:'false'}),false);
 assert.equal(check({GEMINI_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:googleVideo.model,AI_IMAGE_ENABLED:'false'}),false);
 assert.equal(check({GEMINI_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:googleVideo.model,
  AI_MODEL_PRICING_JSON:JSON.stringify([img,{...googleVideo,model:'ghost-video'}])}),false);
 const defaultVideo={...googleVideo,model:'veo-3.1-lite-generate-preview'};
 assert.equal(check({GEMINI_API_KEY:'synthetic-no-network',
  AI_MODEL_PRICING_JSON:JSON.stringify([img,defaultVideo])}),true,
  'the actually configured Studio default video is allowed without extra opt-in');
 assert.equal(check({BYTEPLUS_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:[seedImage.model,seedVideo.model].join(','),
  AI_MODEL_PRICING_JSON:JSON.stringify([seedImage,seedVideo])}),true,
  'BytePlus-only allows explicitly enabled image and video models with its key');
 assert.equal(check({BYTEPLUS_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:[seedImage.model,seedVideo.model].join(','),
  AI_MODEL_PRICING_JSON:JSON.stringify([seedImage,seedVideo]),
  BYTEPLUS_ENABLED:'false'}),false,
  'BytePlus kill switch must block apparently priced routes');
 const configured=generationReadiness({...base,
  GEMINI_API_KEY:'synthetic-no-network',
  AI_STUDIO_ALLOWED_MODELS:googleVideo.model,
  AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'});
 assert.equal(configured.gates.find(g=>g.id==='imageVideoProviderModels').ready,true);
 assert.equal(configured.gates.find(g=>g.id==='purchasedOnlyDispatch').ready,false);
 assert.equal(configured.launchReady,false,'P0 paid-only cannot be overridden by provider setup');
});
