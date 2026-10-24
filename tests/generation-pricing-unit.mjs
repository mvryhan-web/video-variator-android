import test from 'node:test';
import assert from 'node:assert/strict';
import {pricingCatalog,estimateGenerationPricing} from '../server/generation-pricing.js';

const model={id:'byteplus-seedance-2',provider:'BytePlus',kind:'video',quality:'720p',duration:'5 seconds'};

test('pricing catalog has no invented defaults and rejects malformed rows',()=>{
 assert.equal(pricingCatalog({}).configured,false);
 assert.equal(pricingCatalog({AI_MODEL_PRICING_JSON:'[{"model":"x"}]'}).configured,false);
});

test('pricing engine returns only explicitly approved matching model economics',()=>{
 const env={AI_MODEL_PRICING_JSON:JSON.stringify([
  {model:'byteplus-seedance-2',provider:'BytePlus',kind:'video',credits:80,providerCostMicros:250000,currency:'eur',ratio:'16:9',quality:'720p',durationSeconds:5},
  {model:'byteplus-seedance-2',provider:'BytePlus',kind:'video',credits:75,providerCostMicros:220000}
 ])};
 const exact=estimateGenerationPricing({model:model.id,kind:'video',ratio:'16:9'},model,env);
 assert.deepEqual(exact,{credits:80,providerCostMicros:250000,currency:'eur',model:model.id,provider:'BytePlus',kind:'video'});
 const fallback=estimateGenerationPricing({model:model.id,kind:'video',ratio:'9:16'},model,env);
 assert.equal(fallback.credits,75);assert.equal(fallback.currency,null);
 assert.equal(estimateGenerationPricing({model:'other',kind:'video',ratio:'16:9'},model,env),null);
});


test('nondefault video duration and resolution never inherit cheaper default credits',()=>{
 const rows=[
  {model:model.id,provider:model.provider,kind:'video',credits:40,providerCostMicros:100000},
  {model:model.id,provider:model.provider,kind:'video',quality:'1080p',durationSeconds:5,credits:75,providerCostMicros:200000},
  {model:model.id,provider:model.provider,kind:'video',quality:'720p',durationSeconds:10,credits:65,providerCostMicros:150000}
 ];
 const env={AI_MODEL_PRICING_JSON:JSON.stringify(rows)};
 const quote=(videoResolution,videoDuration)=>estimateGenerationPricing({kind:'video',model:model.id,ratio:'16:9',videoResolution,videoDuration},model,env);
 assert.equal(quote('720p',5).credits,40);
 assert.equal(quote('720p',10).credits,65);
 assert.equal(quote('1080p',5).credits,75);
 assert.equal(quote('1080p',10),null);
 assert.equal(quote('720p',15),null);
 assert.equal(quote('1080p',8),null);
});
test('multiframe Seedance pricing requires explicit mode and exact reference count',()=>{
 const base={model:model.id,provider:model.provider,kind:'video',credits:40,providerCostMicros:100000};
 const two={...base,credits:100,providerCostMicros:230000,videoInputMode:'first_last',referenceCount:2};
 const three={...base,credits:135,providerCostMicros:290000,videoInputMode:'reference_image',referenceCount:3};
 const env={AI_MODEL_PRICING_JSON:JSON.stringify([base,two,three])};
 const quote=(mode,count)=>estimateGenerationPricing({kind:'video',model:model.id,ratio:'16:9',videoInputMode:mode,referenceCount:count},model,env);
 assert.equal(quote('text',0).credits,40);
 assert.equal(quote('first_frame',1).credits,40);
 assert.equal(quote('first_last',2).credits,100);
 assert.equal(quote('reference_image',3).credits,135);
 assert.equal(quote('reference_image',1),null);
 assert.equal(quote('reference_image',2),null);
 assert.equal(quote('first_last',3),null);
 const noSpecific={AI_MODEL_PRICING_JSON:JSON.stringify([base])};
 assert.equal(estimateGenerationPricing({kind:'video',model:model.id,ratio:'16:9',videoInputMode:'first_last',referenceCount:2},model,noSpecific),null);
 const malformed={AI_MODEL_PRICING_JSON:JSON.stringify([{...base,videoInputMode:'first_last',referenceCount:5}])};
 assert.equal(pricingCatalog(malformed).configured,false);
});
test('pricing never invents a currency when operator economics omit it',()=>{
 const e=pricingCatalog({AI_MODEL_PRICING_JSON:JSON.stringify([{model:'m',provider:'P',kind:'image',credits:1,providerCostMicros:100}])});assert.equal(e.configured,true);assert.equal(e.entries[0].currency,null);
 assert.equal(pricingCatalog({AI_MODEL_PRICING_JSON:JSON.stringify([{model:'m',provider:'P',kind:'image',credits:1,providerCostMicros:100,currency:'EURO'}])}).configured,false);
});

test('equally-specific overlapping approved rates fail closed, irrespective of JSON row order',()=>{
 const m={id:'image-model',provider:'Google',kind:'image',quality:'1024',capabilities:{outputFormats:['auto']}};
 const ratio={model:m.id,provider:'Google',kind:'image',ratio:'1:1',credits:40,providerCostMicros:100000,currency:'usd'};
 const quality={model:m.id,provider:'Google',kind:'image',quality:'1024',credits:80,providerCostMicros:200000,currency:'usd'};
 const req={kind:'image',model:m.id,ratio:'1:1',resolution:'1024'};
 for(const entries of [[ratio,quality],[quality,ratio]]){
  const env={AI_MODEL_PRICING_JSON:JSON.stringify(entries)};
  assert.equal(pricingCatalog(env).configured,true);
  assert.equal(estimateGenerationPricing(req,m,env),null,'cannot choose first rate based on operator JSON order');
 }
 const exact={...ratio,quality:'1024',credits:95,providerCostMicros:250000};
 const env={AI_MODEL_PRICING_JSON:JSON.stringify([ratio,quality,exact])};
 assert.equal(estimateGenerationPricing(req,m,env).credits,95,'a unique more-specific approved rate wins');
 assert.equal(estimateGenerationPricing({...req,ratio:'16:9'},m,env).credits,80,'non-overlapping selection still works');
 assert.equal(estimateGenerationPricing({...req,resolution:'512'},m,env),null,'new image quality needs an exact approved price');
});

test('equal-score overlaps are provider-isolated, and no price is ever invented',()=>{
 const m={id:'shared-model',provider:'BytePlus',kind:'image',quality:'1024',capabilities:{outputFormats:['auto']}};
 const approved={model:m.id,provider:'BytePlus',kind:'image',credits:19,providerCostMicros:50000,currency:'eur'};
 const other={...approved,provider:'Google',credits:4};
 const e={AI_MODEL_PRICING_JSON:JSON.stringify([approved,other])};
 assert.equal(estimateGenerationPricing({kind:'image',model:m.id,ratio:'1:1',resolution:'1024'},m,e).credits,19);
 assert.equal(estimateGenerationPricing({kind:'image',model:m.id,ratio:'1:1',resolution:'1024'},m,{}),null);
});


test('explicitly blank ratio or quality must never become an approved wildcard price',()=>{
 const base={model:model.id,provider:model.provider,kind:'video',credits:1,providerCostMicros:50,currency:'usd'};
 const request={kind:'video',model:model.id,ratio:'9:16',videoResolution:'720p',videoDuration:5};
 // An operator typo (an explicit blank dimension) used to silently create
 // a wildcard row, allowing an arbitrary aspect ratio to inherit cheap credits.
 for(const key of ['ratio','quality']){
  for(const invalid of ['', ' ', '\t', '\n']){
   const env={AI_MODEL_PRICING_JSON:JSON.stringify([{...base,[key]:invalid}])};
   assert.equal(pricingCatalog(env).configured,false,key+' '+JSON.stringify(invalid));
   assert.equal(estimateGenerationPricing(request,model,env),null,'never price from malformed configured selector');
  }
 }
 // A genuinely absent/null qualifier is still the intentional default-price
 // wildcard; exact approved selectors continue matching normally.
 for(const row of [base,{...base,ratio:null,quality:null},{...base,ratio:'9:16',quality:'720p'}]){
  const env={AI_MODEL_PRICING_JSON:JSON.stringify([row])};
  assert.equal(pricingCatalog(env).configured,true);
  assert.equal(estimateGenerationPricing(request,model,env).credits,1);
 }
});

test('BASE #18: unrecognized Video roles and impossible reference counts never inherit cheap text tariffs',()=>{
 const base={model:model.id,provider:model.provider,kind:'video',
  credits:1,providerCostMicros:100,currency:'usd'};
 const approvedLast={...base,credits:120,providerCostMicros:250000,
  videoInputMode:'first_last',referenceCount:2};
 const approvedScene={...base,credits:130,providerCostMicros:300000,
  videoInputMode:'reference_image',referenceCount:3};
 const env={AI_MODEL_PRICING_JSON:JSON.stringify([base,approvedLast,approvedScene])};
 const price=(mode,count)=>estimateGenerationPricing({
  kind:'video',model:model.id,ratio:'16:9',videoInputMode:mode,referenceCount:count,
 },model,env);
 assert.equal(price('text',0)?.credits,1);
 assert.equal(price('first_frame',1)?.credits,1);
 assert.equal(price('first_last',2)?.credits,120);
 assert.equal(price('reference_image',3)?.credits,130);
 for(const [mode,count] of [
  ['text',1],['text',2],['first_frame',0],['first_frame',2],
  ['first_frame',3],['first_last',0],['first_last',1],['first_last',3],
  ['reference_image',0],['reference_image',4],['reference_image',-1],
  ['unrecognized',0],['reference_images',2],['',2],
  ['text',-1],['text',1.5],['first_frame','1'],['text',9999]
 ]){
  assert.equal(price(mode,count),null,
   'malformed provider role '+JSON.stringify([mode,count])+' must not get any price');
 }
 assert.equal(estimateGenerationPricing({
  kind:'video',model:model.id,ratio:'16:9',
  referenceCount:3 // Legacy auto-first_frame formerly inherited the text price.
 },model,env),null);
});
