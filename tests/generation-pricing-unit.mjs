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


test('pricing never invents a currency when operator economics omit it',()=>{
 const e=pricingCatalog({AI_MODEL_PRICING_JSON:JSON.stringify([{model:'m',provider:'P',kind:'image',credits:1,providerCostMicros:100}])});assert.equal(e.configured,true);assert.equal(e.entries[0].currency,null);
 assert.equal(pricingCatalog({AI_MODEL_PRICING_JSON:JSON.stringify([{model:'m',provider:'P',kind:'image',credits:1,providerCostMicros:100,currency:'EURO'}])}).configured,false);
});
