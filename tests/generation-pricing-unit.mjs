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
