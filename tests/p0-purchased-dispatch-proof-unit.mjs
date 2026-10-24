import test from 'node:test';
import assert from 'node:assert/strict';
import {claimPurchasedGeneration,purchasedFundingProof} from '../server/generation-purchased-proof.js';
import {grantPaidSubscriptionInvoice} from '../server/generation-subscription-credits.js';
import {GenerationWallet} from '../server/generation-wallet.js';


const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true'};
const options=()=>({env,userId:'paid_user',jobId:'job_live_a',kind:'video',credits:100,fingerprint:'sha256abc',modelId:'model_v',provider:'Google',wallet:{available:0,reserved:100,debt:0}});
function db({paidCredits=200,otherSpent=80,sourceId='cs_live_paid1',held={},job={},inserted=true}={}){
 const statements=[];
 const query=async(sql,args)=>{
  statements.push({sql,args});
  if(sql.includes('eligible_paid_purchases'))return {rows:[{paid_credits:String(paidCredits),source_id:sourceId}]};
  if(sql.includes('FROM vv_ai_reservation res'))return {rows:[{used:String(otherSpent)}]};
  if(sql.includes('FROM vv_ai_reservation')&&sql.includes('FOR UPDATE'))return {rows:held===null?[]:[{user_id:'paid_user',credits:100,fingerprint:'sha256abc',status:'held',...held}]};
  if(sql.includes('FROM vv_generation_jobs')&&sql.includes('FOR UPDATE'))return {rows:job===null?[]:[{user_id:'paid_user',kind:'video',model:'model_v',provider:'Google',status:'processing',operation:null,deleted:false,request_fingerprint:'sha256abc',credits_reserved:100,...job}]};
  if(sql.includes('INSERT INTO vv_ai_purchased_dispatch_claim'))return {rows:inserted?[{job_id:'job_live_a'}]:[]};
  throw Error('UNEXPECTED_SQL');
 };
 return {query,statements};
}

test('P0 only the locked, verifiable, unrefunded live Stripe order can claim ONE dispatch',async()=>{
 const c=db(),receipt=await claimPurchasedGeneration(c,options());
 assert.equal(receipt.source,'settled_stripe_purchase');
 assert.equal(receipt.dispatchClaimedExactlyOnce,true);
 assert.equal(receipt.creditsReserved,100);
 assert.equal(receipt.purchasedCreditsAvailableBeforeReserve,120);
 assert.equal(receipt.purchaseId,'cs_live_paid1');
 assert.equal(c.statements.length,5);
 assert.match(c.statements[0].sql,/o\.snapshot->>'billingMode'='live'/);
 assert.match(c.statements[0].sql,/CEIL\(p\.credits::numeric\*p\.refunded_amount\/p\.amount\)/);
 assert.match(c.statements[0].sql,/p\.refunded_amount<p\.amount/);
 assert.match(c.statements[0].sql,/JOIN vv_ai_verified_subscription_invoice v/);
 assert.match(c.statements[0].sql,/v\.livemode=true/);
 assert.match(c.statements[0].sql,/v\.payment_intent=p\.payment_intent/);
 assert.match(c.statements[1].sql,/status IN \('held','captured'\)/);
 assert.match(c.statements[1].sql,/audit.entries=1/);
 assert.match(c.statements[1].sql,/MAX\(available_delta-debt_delta\)/);
 assert.match(c.statements[1].sql,/res\.credits-audit.returned/);
 assert.match(c.statements[2].sql,/FOR UPDATE/);
 assert.match(c.statements[3].sql,/FOR UPDATE/);
 assert.match(c.statements[4].sql,/ON CONFLICT \(job_id\) DO NOTHING RETURNING job_id/);
});

test('P0 never spend on admin/bonus balance or a missing confirmed paid order',async()=>{
 for(const changes of [{paidCredits:0,sourceId:null},{paidCredits:99},
  {paidCredits:150,otherSpent:51},{sourceId:null},{paidCredits:100,otherSpent:1}]){
  const c=db(changes);
  await assert.rejects(()=>claimPurchasedGeneration(c,options()),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  assert.ok(!c.statements.some(x=>x.sql.includes('INSERT INTO vv_ai_purchased_dispatch_claim')));
 }
});

test('P0 no opt-in or non-live/test credentials ever allow a purchased dispatch claim',async()=>{
 for(const changed of [
  {AI_PURCHASED_ONLY_DISPATCH_ENABLED:'false'}, {AI_PURCHASED_ONLY_DISPATCH_ENABLED:undefined},
  {AI_BILLING_MODE:'test'}, {AI_BILLING_MODE:undefined},
  {AI_LIVE_BILLING_APPROVED:'false'}, {AI_LIVE_BILLING_APPROVED:undefined},
  {AI_PUBLIC_GENERATION_ENABLED:'false'}, {AI_STUDIO_WALLET_ENABLED:'false'}
 ]){
  const c=db();
  await assert.rejects(()=>claimPurchasedGeneration(c,{...options(),env:{...env,...changed}}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  assert.equal(c.statements.length,0,'must stop before database proof or any provider call');
 }
});

test('P0 job/request/reservation state must match prior to the irreversible claim',async()=>{
 const cases=[{held:null},{held:{status:'captured'}},{held:{fingerprint:'other'}},
  {job:null},{job:{status:'ready'}},{job:{deleted:true}},{job:{operation:'byteplus:already_started'}},
  {job:{provider:'other'}},{job:{kind:'image'}},{job:{model:'other'}},{job:{request_fingerprint:'other'}},
  {job:{credits_reserved:99}},{inserted:false}];
 for(const changed of cases){
  const c=db(changed);
  await assert.rejects(()=>claimPurchasedGeneration(c,options()),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
 }
});

test('P0 funding invariant is exact integer conservative under paid/refunded/used mixtures',()=>{
 for(let paid=0;paid<=40;paid++)for(let consumed=0;consumed<=40;consumed++)for(let reserve=1;reserve<=15;reserve++){
  const valid=paid-consumed>=reserve;
  assert.equal(purchasedFundingProof({paidCredits:paid,otherSpentCredits:consumed,requiredCredits:reserve}),valid);
 }
 for(const value of [-1,1.1,'oops',Number.MAX_SAFE_INTEGER+1,true,false,null,undefined,'',{},[]])
  assert.throws(()=>purchasedFundingProof({paidCredits:value,otherSpentCredits:0,requiredCredits:1}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
});


test('BASE #16 verified LIVE paid subscription invoice alone records paid provenance',async()=>{
 const events=[],inserts=[],walletCalls=[];
 const env={AI_SUBSCRIPTION_CREDITS_ENABLED:'true',AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:70}),
  STRIPE_PRICE_BASIC:'price_Verified123',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'};
 const event=(change={})=>({type:'invoice.paid',livemode:true,data:{object:{
  id:'in_Verified123',status:'paid',paid:true,livemode:true,billing_reason:'subscription_cycle',
  amount_paid:700,currency:'usd',payment_intent:'pi_Verified123',
  customer:'cus_Verified123',subscription:'sub_Verified123',
  lines:{has_more:false,data:[{price:{id:'price_Verified123'},quantity:1}]},...change}}});
 const pool={query:async(sql,vals)=>{events.push(sql);
  if(sql.includes('FROM vv_users WHERE stripe_subscription_id'))return {rows:[{id:'user_verified',plan:'basic',stripe_customer_id:'cus_Verified123',subscription_status:'active'}]};
  if(sql.includes('INSERT INTO vv_ai_verified_subscription_invoice')){inserts.push(vals);return {rows:[]}}
  if(sql.includes('FROM vv_ai_verified_subscription_invoice WHERE invoice_id'))return {rows:[{user_id:'user_verified',payment_intent:'pi_Verified123',livemode:true}]};
  throw Error('UNEXPECTED_DB_SQL');
 }};
 const wallet={grant:async args=>{walletCalls.push(args);return {available:70}}};
 assert.equal(await grantPaidSubscriptionInvoice({event:event(),env,pool,wallet}),true);
 assert.equal(walletCalls.length,1);
 assert.deepEqual(inserts,[['in_Verified123','user_verified','pi_Verified123']]);
 assert.equal(events.length,3);
 // A free, wrong-mode or foreign paid event cannot write provenance.
 for(const invalid of [{amount_paid:0},{livemode:false},{customer:'cus_Attacker'},
  {lines:{has_more:false,data:[{price:{id:'price_Mismatch'},quantity:1}]}}]){
  const prior=inserts.length;
  try{await grantPaidSubscriptionInvoice({event:event(invalid),env,pool,wallet})}catch{}
  assert.equal(inserts.length,prior);
 }
});

test('BASE #16 paid subscription receipt conflict never authenticates a different invoice owner',async()=>{
 const env={AI_SUBSCRIPTION_CREDITS_ENABLED:'true',AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:40}),
  STRIPE_PRICE_BASIC:'price_Protect123',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',
  AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'};
 const event={type:'invoice.paid',livemode:true,data:{object:{
  id:'in_Protect123',status:'paid',paid:true,livemode:true,billing_reason:'subscription_cycle',
  amount_paid:500,currency:'usd',payment_intent:'pi_Protect123',
  customer:'cus_Protect123',subscription:'sub_Protect123',
  lines:{has_more:false,data:[{price:{id:'price_Protect123'},quantity:1}]}}}};
 const pool={query:async sql=>{
  if(sql.includes('FROM vv_users'))return {rows:[{id:'real_owner',plan:'basic',stripe_customer_id:'cus_Protect123',subscription_status:'active'}]};
  if(sql.includes('INSERT INTO vv_ai_verified_subscription_invoice'))return {rows:[]};
  if(sql.includes('FROM vv_ai_verified_subscription_invoice'))return {rows:[{user_id:'other_owner',payment_intent:'pi_Protect123',livemode:true}]};
  throw Error('UNEXPECTED_DB_SQL');
 }};
 await assert.rejects(()=>grantPaidSubscriptionInvoice({event,env,pool,wallet:{grant:async()=>{}}}),
  /AI_SUBSCRIPTION_PURCHASE_PROVENANCE_CONFLICT/);
});

test('P0 D-to-B callback projection preserves server trusted fingerprint and locked paid receipt',async()=>{
 const c=db(),wallet=new GenerationWallet(null);
 wallet.transaction=async(userId,fn)=>{
  assert.equal(userId,'paid_user');
  return fn(c,options().wallet);
 };
 const verifyPurchasedReservation=wallet.purchasedDispatchVerifier({env});
 // Match the exact named callback keys in B's approved pre-provider contract.
 const expected={userId:'paid_user',jobId:'job_live_a',kind:'video',
  modelId:'model_v',provider:'Google',requestFingerprint:'sha256abc',credits:100};
 const proof=await verifyPurchasedReservation(Object.freeze(expected));
 assert.equal(proof.source,'settled_stripe_purchase');
 assert.equal(proof.requestFingerprint,expected.requestFingerprint);
 assert.equal(proof.creditsReserved,expected.credits);
 assert.equal(proof.jobId,expected.jobId);
 assert.equal(proof.dispatchClaimedExactlyOnce,true);
 assert.equal(c.statements.length,5);
 const before=c.statements.length;
 await assert.rejects(()=>verifyPurchasedReservation({...expected,requestFingerprint:undefined}),
  /AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
 await assert.rejects(()=>verifyPurchasedReservation({...expected,requestFingerprint:''}),
  /AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
 assert.equal(c.statements.length,before,'malformed B callback cannot reach database or provider');
 const cOther=db();
 const otherWallet=new GenerationWallet(null);
 otherWallet.transaction=async(_,fn)=>fn(cOther,options().wallet);
 await assert.rejects(()=>otherWallet.purchasedDispatchVerifier({env:{
  ...env,AI_LIVE_BILLING_APPROVED:'false'}})(expected),
  /AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
 assert.equal(cOther.statements.length,0,'unapproved live mode must fail before DB proof');
});
