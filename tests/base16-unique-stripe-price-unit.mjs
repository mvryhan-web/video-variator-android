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

test('BASE 16 duplicate Price IDs block Checkout before database or Stripe access',async()=>{
 const {default:express}=await import('express');
 const {installGenerationBilling}=await import('../server/generation-billing.js');
 let dbReads=0,stripeCalls=0;
 const app=express();app.use(express.json());
 const conflictEnv={
  ...fixture([first,{...second,priceId:first.priceId}]),
  AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'test',
  STRIPE_SECRET_KEY:'sk_test_fixture',APP_JWT_SECRET:'fixture-secret',
  DATABASE_URL:'fixture'
 };
 const pool={query(){dbReads++;throw Error('unexpected database access');}};
 const stripe={checkout:{sessions:{create(){stripeCalls++;throw Error('unexpected Stripe call');}}}};
 installGenerationBilling(app,{
  auth:(req,_res,next)=>{req.user={id:'fixture-user',email:'test@example.invalid'};next();},
  pool,stripe,appUrl:'https://example.invalid',env:conflictEnv
 });
 const server=app.listen(0);
 await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const config=await fetch(base+'/api/ai-billing/config').then(r=>r.json());
  assert.deepEqual(config.packs,[]);
  assert.deepEqual(config.rates,[]);
  const response=await fetch(base+'/api/ai-billing/checkout',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({sku:first.sku,requestId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'})
  });
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'AI_PRICING_NOT_APPROVED');
  assert.equal(dbReads,0);
  assert.equal(stripeCalls,0);
 }finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
});
