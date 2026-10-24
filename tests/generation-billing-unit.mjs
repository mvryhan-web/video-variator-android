import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {billingCatalog,makeQuote,verifyQuote,installGenerationBilling} from '../server/generation-billing.js';
const body={kind:'video',prompt:'Ocean at sunset',ratio:'16:9',consent:true};
// Synthetic prices for code tests only, never proposed customer prices.
const env={APP_JWT_SECRET:'test-only-signing-key',AI_CREDIT_PACKS_JSON:JSON.stringify([{sku:'fixture',priceId:'price_fixture',amount:100,credits:100,currency:'eur'}]),AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'video',credits:10}])};
test('no catalog or invented rates by default; reject malformed/duplicate rates',()=>{
 assert.deepEqual(billingCatalog({}).packs,[]);assert.throws(()=>makeQuote({userId:'u',body,env:{}}));
 for(const rates of [[{kind:'video',credits:0}],[{kind:'video',credits:1.5}],[{kind:'evil',credits:1}],[{kind:'video',credits:1},{kind:'video',credits:2}]]) assert.equal(billingCatalog({...env,AI_CREDIT_RATES_JSON:JSON.stringify(rates)}).revision,null);
});
test('quote binds approved price, user, model, content and reference image',()=>{
 const q=makeQuote({userId:'u',body,env,now:1000});assert.equal(q.credits,10);
 assert.equal(verifyQuote({userId:'u',body,token:q.token,env,now:2000}).credits,10);
 for(const change of [{userId:'other'},{body:{...body,prompt:'Different'}},{body:{...body,ratio:'9:16'}},{env:{...env,AI_CREDIT_RATES_JSON:'[{"kind":"video","credits":11}]'}},{token:q.token+'x'},{now:301000}]) assert.throws(()=>verifyQuote({userId:'u',body,token:q.token,env,now:2000,...change}));
});
test('quote cannot override server pricing through client credits/model',()=>{
 const q=makeQuote({userId:'u',body:{...body,credits:1},env,now:1000});assert.equal(q.credits,10);assert.equal(q.model,'veo-3.1-lite-generate-preview');
 assert.throws(()=>makeQuote({userId:'u',body:{...body,model:'cheap-fake'},env,now:1000}));
 assert.throws(()=>makeQuote({userId:'u',body:{...body,model:'veo-3.1-fast-generate-preview'},env,now:1000}),/AI_PRICING_NOT_APPROVED/);
});
test('live Stripe key cannot activate this test-only payment integration',async()=>{
 const app=express();app.use(express.json());let reads=0;
 installGenerationBilling(app,{auth:(_r,_s,n)=>n(),pool:{query:()=>{reads++;throw Error('must not touch DB');}},stripe:{},appUrl:'https://example.test',env:{...env,AI_BILLING_ENABLED:'true',DATABASE_URL:'fixture',STRIPE_SECRET_KEY:'sk_live_fixture'}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{const url=`http://127.0.0.1:${server.address().port}/api/ai-billing`;const c=await fetch(url+'/config').then(r=>r.json());assert.equal(c.enabled,false);assert.equal(c.livePaymentsEnabled,false);assert.ok(!JSON.stringify(c).includes('price_fixture'));assert.equal((await fetch(url+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);assert.equal(reads,0);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
