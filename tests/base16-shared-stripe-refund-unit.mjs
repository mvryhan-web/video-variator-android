import test from 'node:test';
import assert from 'node:assert/strict';
import {hasAiWalletRefundMarker,installGenerationBilling} from '../server/generation-billing.js';

const refund=({aiMarked=false,livemode=false,chargeLive=livemode}={})=>({
 type:'charge.refunded',livemode,data:{object:{
  livemode:chargeLive,payment_intent:'pi_unrelated',amount_refunded:200,
  metadata:aiMarked?{aiWallet:'v1'}:{legacyPlan:'basic'}
 }}
});
const make=({enabled=false}={})=>{
 let dbQueries=0;
 const pool={async query(sql){
  dbQueries++;
  if(String(sql).includes('CREATE TABLE IF NOT EXISTS vv_ai_wallet'))return {rows:[]};
  if(String(sql).startsWith('SELECT user_id FROM vv_ai_purchase'))return {rows:[]};
  throw Error('Unexpected query: '+sql);
 }};
 const env={AI_BILLING_ENABLED:enabled?'true':'false',AI_BILLING_MODE:'test',
  STRIPE_SECRET_KEY:'sk_test_mock',DATABASE_URL:'fixture',APP_JWT_SECRET:'fixture'};
 const {handleEvent,wallet}=installGenerationBilling({get(){},post(){},use(){}},{auth:()=>{},pool,stripe:{},appUrl:'https://example.invalid',env});
 return {handleEvent,wallet,getQueries:()=>dbQueries};
};

test('BASE #16: AI refund marker is positive evidence on charge/payment intent only',()=>{
 assert.equal(hasAiWalletRefundMarker(refund()),false);
 assert.equal(hasAiWalletRefundMarker(refund({aiMarked:true})),true);
 const e=refund();e.data.object.payment_intent={id:'pi_m',metadata:{aiWallet:'v1'}};
 assert.equal(hasAiWalletRefundMarker(e),true);
 assert.equal(hasAiWalletRefundMarker(null),false);
});

test('BASE #16: legacy Stripe refund does not crash shared webhook with AI billing OFF',async()=>{
 const h=make({enabled:false});
 for(const e of [refund(),refund({livemode:true})])
  assert.equal(await h.handleEvent(e),false);
 assert.equal(h.getQueries(),0,'disabled AI must not read/modify wallet for unrelated refund');
});

test('BASE #16: AI-tagged historical refund is retried if its grant is not yet recorded even after Checkout OFF',async()=>{
 const h=make({enabled:false});
 await assert.rejects(()=>h.handleEvent(refund({aiMarked:true})),/AI_REFUND_PURCHASE_PENDING/);
 assert.ok(h.getQueries()>0,'a tagged historical refund must consult the durable purchase ledger');
});

test('BASE #16: signed historical AI refund still reverses credits with Checkout OFF',async()=>{
 const h=make({enabled:false}),calls=[];
 h.wallet.refund=async(paymentIntent,cumulativeAmount)=>{
  calls.push({paymentIntent,cumulativeAmount});
  return {available:0,debt:7};
 };
 assert.equal(await h.handleEvent(refund({aiMarked:true})),true);
 assert.deepEqual(calls,[{paymentIntent:'pi_unrelated',cumulativeAmount:200}]);
 assert.equal(await h.handleEvent(refund()),false,'unrelated legacy refunds bypass disabled AI wallet');
 assert.deepEqual(calls,[{paymentIntent:'pi_unrelated',cumulativeAmount:200}]);
 assert.equal(h.getQueries(),0,'dispatcher delegates tagged refunds only, unrelated refund never creates tables');
});

test('BASE #16: historical AI refunds still reject cross-mode events after Checkout OFF',async()=>{
 const h=make({enabled:false}),calls=[];
 h.wallet.refund=async(...args)=>{calls.push(args);return {};};
 await assert.rejects(()=>h.handleEvent(refund({aiMarked:true,livemode:true})),/AI_PAYMENT_MODE_MISMATCH/);
 assert.deepEqual(calls,[]);
 assert.equal(h.getQueries(),0);
});

test('BASE #16: cross-mode unrelated legacy refund bypasses AI billing safely',async()=>{
 const h=make({enabled:true});
 assert.equal(await h.handleEvent(refund({livemode:true})),false);
 assert.equal(h.getQueries(),0);
 await assert.rejects(()=>h.handleEvent(refund({aiMarked:true,livemode:true})),/AI_PAYMENT_MODE_MISMATCH/);
});

test('BASE #16: known AI refund before purchase remains retriable; generic unrelated refund remains untouched',async()=>{
 const h=make({enabled:true});
 assert.equal(await h.handleEvent(refund()),false);
 await assert.rejects(()=>h.handleEvent(refund({aiMarked:true})),/AI_REFUND_PURCHASE_PENDING/);
 assert.ok(h.getQueries()>0,'AI-marked refund checks durable wallet before requiring retry');
});
