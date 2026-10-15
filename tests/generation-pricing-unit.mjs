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
  {model:'byteplus-seedance-2',provider:'BytePlus',kind:'video',credits:80,providerCostMicros:250000,ratio:'16:9',quality:'720p',durationSeconds:5},
  {model:'byteplus-seedance-2',provider:'BytePlus',kind:'video',credits:75,providerCostMicros:220000}
 ])};
 const exact=estimateGenerationPricing({model:model.id,kind:'video',ratio:'16:9'},model,env);
 assert.deepEqual(exact,{credits:80,providerCostMicros:250000,currency:'USD',model:model.id,provider:'BytePlus',kind:'video'});
 const fallback=estimateGenerationPricing({model:model.id,kind:'video',ratio:'9:16'},model,env);
 assert.equal(fallback.credits,75);
 assert.equal(estimateGenerationPricing({model:'other',kind:'video',ratio:'16:9'},model,env),null);
});
