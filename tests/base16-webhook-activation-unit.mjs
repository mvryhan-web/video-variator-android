import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationBilling,stripeWebhookConfigured} from '../server/generation-billing.js';
import {generationReadiness} from '../server/generation-readiness.js';

const pack={sku:'fixture',priceId:'price_fixture',credits:100,amount:990,currency:'eur'};
const env0={
 AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
 DATABASE_URL:'fixture',APP_JWT_SECRET:'fixture-signing-only',STRIPE_SECRET_KEY:'sk_live_mock_only',
 AI_CREDIT_PACKS_JSON:JSON.stringify([pack]),AI_CREDIT_RATES_JSON:'[]'
};
async function serve(env){
 let reads=0;
 const app=express();app.use(express.json());
 installGenerationBilling(app,{auth:(req,_res,next)=>{req.user={id:'fixture',email:'fixture@example.invalid'};next();},
  pool:{query(){reads++;throw Error('UNEXPECTED_DATABASE_READ');}},
  stripe:{},env,appUrl:'https://example.invalid'});
 const server=app.listen(0);
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api/ai-billing';
 return {server,base,getReads:()=>reads};
}
test('BASE #16: missing live signed webhook forces checkout config OFF and no database writes',async()=>{
 for(const secret of [undefined,'','not_signed','whsec_short']){
  const env={...env0,STRIPE_WEBHOOK_SECRET:secret};
  assert.equal(stripeWebhookConfigured(env),false);
  const h=await serve(env);
  try{
   const response=await fetch(h.base+'/config'),config=await response.json();
   assert.equal(response.status,200);
   assert.equal(config.enabled,false);
   assert.equal(config.livePaymentsEnabled,false);
   assert.equal(config.reason,'PAYMENTS_NOT_ACTIVATED');
   assert.equal(generationReadiness(env).gates.find(g=>g.id==='stripeWebhook').ready,false);
   assert.equal(generationReadiness(env).billing.liveAiPaymentsEnabled,false);
   const post=await fetch(h.base+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku:pack.sku,requestId:'11111111-1111-4111-8111-111111111111'})});
   assert.equal(post.status,503);
   assert.equal(h.getReads(),0,'blocked checkout must not access wallet/order database');
  }finally{h.server.closeAllConnections();await new Promise(done=>h.server.close(done));}
 }
});
test('BASE #16: a configured test Stripe checkout does not require live webhook activation',async()=>{
 const env={...env0,AI_BILLING_MODE:'test',STRIPE_SECRET_KEY:'sk_test_mock_only'};
 const h=await serve(env);
 try{
  const config=await fetch(h.base+'/config').then(x=>x.json());
  assert.equal(config.enabled,true);
  assert.equal(config.livePaymentsEnabled,false);
  assert.equal(h.getReads(),0);
 }finally{h.server.closeAllConnections();await new Promise(done=>h.server.close(done));}
});
test('BASE #16: explicit syntactically valid live webhook matches the readiness predicate',()=>{
 const env={...env0,STRIPE_WEBHOOK_SECRET:'whsec_synthetic_test_only'};
 assert.equal(stripeWebhookConfigured(env),true);
 const gate=generationReadiness(env).gates.find(g=>g.id==='stripeWebhook');
 assert.equal(gate.ready,true);
 assert.equal(generationReadiness(env).billing.liveAiPaymentsEnabled,true);
 assert.equal(JSON.stringify(gate).includes(env.STRIPE_WEBHOOK_SECRET),false);
});
