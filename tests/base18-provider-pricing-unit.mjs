import test from 'node:test';
import assert from 'node:assert/strict';
import {pricingCatalog, estimateGenerationPricing} from '../server/generation-pricing.js';

const a={model:'shared-model-v1',provider:'BytePlus',kind:'video',credits:70,providerCostMicros:400000,currency:'eur',ratio:'16:9',quality:'720p',durationSeconds:5};
const b={...a,provider:'OtherProvider',credits:120,providerCostMicros:750000,currency:'usd'};
const env=rows=>({AI_MODEL_PRICING_JSON:JSON.stringify(rows)});
const model=(provider,kind='video')=>({id:'shared-model-v1',provider,kind,quality:'720p',capabilities:{durationSeconds:5}});
const req={kind:'video',model:'shared-model-v1',ratio:'16:9',videoResolution:'720p',videoDuration:5,videoInputMode:'text',referenceCount:0};

test('BASE #18: independent provider prices for an otherwise identical model are allowed',()=>{
 const c=pricingCatalog(env([a,b]));
 assert.equal(c.configured,true);
 assert.equal(c.entries.length,2);
 assert.equal(estimateGenerationPricing(req,model('BytePlus'),env([a,b])).credits,70);
 assert.equal(estimateGenerationPricing(req,model('OtherProvider'),env([a,b])).credits,120);
});

test('BASE #18: provider-specific currency and cost stay attached to matched adapter',()=>{
 const rows=env([a,b]);
 const first=estimateGenerationPricing(req,model('BytePlus'),rows);
 const second=estimateGenerationPricing(req,model('OtherProvider'),rows);
 assert.equal(first.currency,'eur');
 assert.equal(first.providerCostMicros,400000);
 assert.equal(second.currency,'usd');
 assert.equal(second.providerCostMicros,750000);
 assert.equal(second.provider,'OtherProvider');
});

test('BASE #18: same provider, model, and settings cannot silently configure two prices',()=>{
 const duplicate={...a,credits:999,providerCostMicros:900000};
 const catalog=pricingCatalog(env([a,duplicate]));
 assert.equal(catalog.configured,false);
 assert.equal(catalog.entries.length,0);
 assert.equal(estimateGenerationPricing(req,model('BytePlus'),env([a,duplicate])),null);
});

test('BASE #18: missing provider pricing, unapproved quality and duration fail closed',()=>{
 const rows=env([a,b]);
 assert.equal(estimateGenerationPricing(req,model('UnknownProvider'),rows),null);
 assert.equal(estimateGenerationPricing({...req,videoDuration:10},model('BytePlus'),rows),null);
 assert.equal(estimateGenerationPricing({...req,videoResolution:'1080p'},model('BytePlus'),rows),null);
 assert.equal(pricingCatalog({}).configured,false);
});

test('BASE #18: provider-specific image pricing does not inherit a differently priced adapter',()=>{
 const base={model:'image-shared',provider:'A',kind:'image',credits:15,providerCostMicros:120000,currency:'eur',quality:'1K'};
 const other={...base,provider:'B',credits:28,providerCostMicros:210000};
 const request={kind:'image',model:'image-shared',ratio:'1:1',resolution:'1K'};
 const mk=provider=>({id:'image-shared',provider,kind:'image',quality:'1K',capabilities:{outputFormats:['auto']}});
 assert.equal(pricingCatalog(env([base,other])).configured,true);
 assert.equal(estimateGenerationPricing(request,mk('A'),env([base,other])).credits,15);
 assert.equal(estimateGenerationPricing(request,mk('B'),env([base,other])).credits,28);
});
