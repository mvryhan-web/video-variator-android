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
 const {handleEvent}=installGenerationBilling({get(){},post(){},use(){}},{auth:()=>{},pool,stripe:{},appUrl:'https://example.invalid',env});
 return {handleEvent,getQueries:()=>dbQueries};
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

test('BASE #16: a clearly AI-tagged refund cannot be silently ignored when AI billing OFF',async()=>{
 const h=make({enabled:false});
 await assert.rejects(()=>h.handleEvent(refund({aiMarked:true})),/AI_BILLING_WEBHOOK_DISABLED/);
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
