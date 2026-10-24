import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import express from 'express';
import {existingCheckoutResponse,installGenerationBilling} from '../server/generation-billing.js';

const pack={sku:'fixture',priceId:'price_fixture',amount:990,credits:120,currency:'usd'};
const userId='customer-1',requestId='11111111-1111-4111-8111-111111111111';
const orderId=createHash('sha256').update(JSON.stringify({userId,requestId})).digest('hex');
const order={id:orderId,user_id:userId,sku:pack.sku,session_id:'cs_test_123',
 snapshot:{...pack,billingMode:'test',email:'customer@example.invalid'}};
const future=()=>Math.floor(Date.now()/1000)+3600;
const session=()=>({id:order.session_id,url:'https://checkout.stripe.com/c/pay/cs_test_123',mode:'payment',
 status:'open',livemode:false,client_reference_id:userId,metadata:{aiWallet:'v1',orderId},
 amount_total:pack.amount,currency:pack.currency,expires_at:future()});
const runtime={mode:'test',livemode:false};

test('BASE #16: a still-open matching test Stripe session has honest test mode',()=>{
 const x=existingCheckoutResponse({order,pack,session:session(),runtime,userId});
 assert.deepEqual(x,{url:session().url,id:order.session_id,mode:'test'});
});

test('BASE #16: live session reuse cannot be mislabeled as test',()=>{
 const liveOrder={...order,snapshot:{...order.snapshot,billingMode:'live'}};
 const live={...session(),id:order.session_id,livemode:true};
 const x=existingCheckoutResponse({order:liveOrder,pack,session:live,runtime:{mode:'live',livemode:true},userId});
 assert.equal(x.mode,'live');
 assert.throws(()=>existingCheckoutResponse({order,pack,session:live,runtime,userId}),/CHECKOUT_SESSION_INVALID/);
 assert.throws(()=>existingCheckoutResponse({order,pack,session:session(),runtime:{mode:'live',livemode:true},userId}),/CHECKOUT_REQUEST_CONFLICT/);
});

test('BASE #16: foreign, expired, completed and misleading Checkout URLs fail closed',()=>{
 const valid=session();
 const invalid=[
  {id:'cs_test_foreign'},
  {mode:'subscription'},{status:'complete'},{status:'expired'},
  {livemode:true},{client_reference_id:'other-account'},
  {metadata:{aiWallet:'v1',orderId:'other-order'}},
  {metadata:{aiWallet:'v2',orderId}},
  {amount_total:pack.amount-1},{currency:'eur'},
  {expires_at:1},{expires_at:undefined},
  {url:'http://checkout.stripe.com/c/pay/test'},
  {url:'https://checkout.stripe.com.evil.test/c/pay/test'},
  {url:'https://attacker@checkout.stripe.com/c/pay/test'},
  {url:null}
 ];
 for(const change of invalid)assert.throws(()=>existingCheckoutResponse({order,pack,session:{...valid,...change},runtime,userId}),/CHECKOUT_SESSION_INVALID/,JSON.stringify(change));
});

test('BASE #16: changing a pack or order owner never silently reuses an old approved price',()=>{
 const other={...pack,credits:pack.credits+1};
 for(const changed of [{pack:other},{userId:'other'},{order:{...order,user_id:'other'}},
  {order:{...order,snapshot:{...order.snapshot,priceId:'price_changed'}}},
  {order:{...order,snapshot:{...order.snapshot,amount:pack.amount-1}}}
 ])assert.throws(()=>existingCheckoutResponse({order,pack,session:session(),runtime,userId,...changed}),/CHECKOUT_REQUEST_CONFLICT/);
});

test('BASE #16: HTTP idempotent checkout reuses one mock live Stripe session, with correct mode and no charge',async()=>{
 const livePack={...pack},liveOrder={...order,snapshot:{...order.snapshot,billingMode:'live'}};
 const stripeSession={...session(),livemode:true};
 let sessionReads=0,creates=0,priceReads=0;
 const stripe={checkout:{sessions:{
  async retrieve(id){sessionReads++;assert.equal(id,liveOrder.session_id);return stripeSession;},
  async create(){creates++;throw Error('No session must be created');}
 }},prices:{async retrieve(){priceReads++;throw Error('No price call on retry');}}};
 const queries=[];
 const pool={async query(sql){
  queries.push(sql);
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_wallet')||sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_order'))return {rows:[]};
  if(sql.startsWith('INSERT INTO vv_ai_order'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_ai_order'))return {rows:[liveOrder]};
  throw Error('Unexpected SQL: '+sql);
 }};
 const env={AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  STRIPE_SECRET_KEY:'sk_live_mock_only',STRIPE_WEBHOOK_SECRET:'whsec_mock_checkout_signing',DATABASE_URL:'mock',APP_JWT_SECRET:'mock-secret',
  AI_CREDIT_PACKS_JSON:JSON.stringify([livePack]),AI_CREDIT_RATES_JSON:'[]'};
 const app=express();app.use(express.json());
 installGenerationBilling(app,{auth:(req,_res,next)=>{req.user={id:userId,email:'customer@example.invalid'};next();},pool,stripe,appUrl:'https://example.test',env});
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/ai-billing/checkout',
   {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku:pack.sku,requestId})});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{url:stripeSession.url,id:stripeSession.id,mode:'live'});
  assert.equal(sessionReads,1);assert.equal(creates,0);assert.equal(priceReads,0);
  assert.ok(!queries.some(sql=>sql.includes('UPDATE vv_ai_wallet')||sql.includes('INSERT INTO vv_ai_purchase')));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
