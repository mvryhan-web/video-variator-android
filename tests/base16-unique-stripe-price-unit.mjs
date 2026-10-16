import test from 'node:test';
import assert from 'node:assert/strict';
import {billingCatalog} from '../server/generation-billing.js';

const fixture=packs=>({
 AI_CREDIT_PACKS_JSON:JSON.stringify(packs),
 AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'video',credits:10}])
});
const first={sku:'small',priceId:'price_firstFixture',credits:150,amount:999,currency:'usd'};
const second={sku:'large',priceId:'price_secondFixture',credits:500,amount:1999,currency:'usd'};

test('BASE 16 accepts separately approved unique Stripe Price IDs',()=>{
 const config=billingCatalog(fixture([first,second]));
 assert.deepEqual(config.packs,[first,second]);
 assert.equal(config.rates[0].kind,'video');
 assert.ok(config.revision);
});

test('BASE 16 rejects duplicate Price ID even when SKU and credit counts differ',()=>{
 const config=billingCatalog(fixture([first,{...second,priceId:first.priceId}]));
 assert.deepEqual(config.packs,[]);
 assert.deepEqual(config.rates,[]);
 assert.equal(config.revision,null);
});

test('BASE 16 rejects duplicate Price ID even with identical amount and credits',()=>{
 const config=billingCatalog(fixture([first,{...first,sku:'other'}]));
 assert.equal(config.revision,null);
});

test('BASE 16 preserves existing duplicate SKU and malformed Price ID rejection',()=>{
 assert.equal(billingCatalog(fixture([first,{...second,sku:first.sku}])).revision,null);
 assert.equal(billingCatalog(fixture([first,{...second,priceId:'bad'}])).revision,null);
});