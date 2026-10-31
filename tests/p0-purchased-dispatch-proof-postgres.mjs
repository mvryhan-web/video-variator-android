// Only ephemeral localhost PostgreSQL; never target any existing user DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {GenerationWallet} from '../server/generation-wallet.js';
import {grantPaidSubscriptionInvoice} from '../server/generation-subscription-credits.js';
const urlString=process.env.P0_PURCHASED_TEST_DB_URL;
if(urlString){
 const u=new URL(urlString);
 if(!['postgres:', 'postgresql:'].includes(u.protocol)||
    !['127.0.0.1','localhost','::1'].includes(u.hostname)||
    u.pathname!=='/deepsyq_purchased_test')throw Error('P0_TEST_DB_MUST_BE_DISPOSABLE_LOCALHOST');
}
const sql=readFileSync(new URL('../server/migrations/20261017-purchased-dispatch-claim.sql',import.meta.url),'utf8');
const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true'};
test('P0 disposable PostgreSQL: paid purchased reservation single-use, bonus denied, refund denied',
 {skip:!urlString},async()=>{
 const schema='p0_purchased_'+randomUUID().replaceAll('-',''),admin=new pg.Client({connectionString:urlString});
 await admin.connect();
 await admin.query('CREATE SCHEMA '+schema);
 const pool=new pg.Pool({connectionString:urlString,options:'-c search_path='+schema});
 try{
  const wallet=new GenerationWallet(pool);await wallet.init();
  await pool.query(`CREATE TABLE vv_ai_order(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,
    session_id TEXT UNIQUE,snapshot JSONB NOT NULL)`);
  await pool.query(`CREATE TABLE vv_generation_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,
    kind TEXT NOT NULL,model TEXT,provider TEXT,status TEXT,operation TEXT,deleted BOOLEAN NOT NULL DEFAULT false,
    request_fingerprint TEXT,credits_reserved INTEGER NOT NULL DEFAULT 0)`);
  await pool.query(sql);await pool.query(sql);
  await pool.query(`CREATE TABLE vv_users (id TEXT PRIMARY KEY,plan TEXT,
    stripe_customer_id TEXT,stripe_subscription_id TEXT,subscription_status TEXT)`);
  async function job(userId,jobId,credits){
    await pool.query('INSERT INTO vv_generation_jobs(id,user_id,kind,model,provider,status,request_fingerprint,credits_reserved) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
       [jobId,userId,'video','model_v','Google','processing','sha256abc',credits]);
    await wallet.reserve({userId,jobId,credits,fingerprint:'sha256abc'});
    return {userId,jobId,kind:'video',credits,fingerprint:'sha256abc',modelId:'model_v',provider:'Google'};
  }
  async function paid(userId,sessionId,credits){
    await pool.query('INSERT INTO vv_ai_order(id,user_id,session_id,snapshot) VALUES($1,$2,$3,$4)',
     [sessionId+'_order',userId,sessionId,JSON.stringify({billingMode:'live'})]);
    await wallet.grant({userId,sessionId,paymentIntent:'pi_'+sessionId,credits,amount:100,currency:'eur'});
  }
  await paid('customer_paid','cs_live_paid',200);
  const paidJob=await job('customer_paid','job_paid_a',100);
  const contenders=await Promise.allSettled(Array.from({length:4},()=>wallet.claimPurchasedDispatch(paidJob,{env})));
  assert.equal(contenders.filter(x=>x.status==='fulfilled').length,1,'only one purchased claim may win the lock');
  assert.equal(contenders.filter(x=>x.status==='rejected').length,3,'concurrent replays must not claim again');
  const proof=contenders.find(x=>x.status==='fulfilled').value;
  assert.equal(proof.source,'settled_stripe_purchase');
  assert.equal(proof.purchasedCreditsAvailableBeforeReserve,200);
  assert.equal(proof.purchaseId,'cs_live_paid');
  await assert.rejects(()=>wallet.claimPurchasedDispatch(paidJob,{env}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  const once=await pool.query('SELECT count(*)::int AS n FROM vv_ai_purchased_dispatch_claim WHERE job_id=$1',[paidJob.jobId]);
  assert.equal(once.rows[0].n,1);
  // Promo balance by itself cannot authorize spending or dispatch.
  await wallet.grantOnce({userId:'customer_promo',kind:'welcome',credits:100});
  const promoJob=await job('customer_promo','job_promo',50);
  await assert.rejects(()=>wallet.claimPurchasedDispatch(promoJob,{env}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  // Refund after reservation must never spend with an outstanding debt.
  await paid('customer_refund','cs_live_refunded',100);
  const refundJob=await job('customer_refund','job_refund',50);
  await wallet.refund('pi_cs_live_refunded',100);
  await assert.rejects(()=>wallet.claimPurchasedDispatch(refundJob,{env}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  // Even an artificially mixed/promotional wallet cannot spend past the
  // settled-purchase budget: other held/captured jobs count against all paid credits.
  await paid('customer_mix','cs_live_mixed',100);
  await wallet.grantOnce({userId:'customer_mix',kind:'welcome',credits:100});
  const first=await job('customer_mix','job_mixed_first',100);
  await wallet.claimPurchasedDispatch(first,{env});
  const second=await job('customer_mix','job_mixed_second',50);
  await assert.rejects(()=>wallet.claimPurchasedDispatch(second,{env}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  // Only the ACTUAL captured amount is paid provider spend. A historical
  // 60-credit reservation settled at 20 returns 40; remaining paid budget
  // must permit a separate valid 60-credit reservation from a 100-credit pack.
  await paid('customer_partial_settle','cs_live_partialsettle',100);
  const settled=await job('customer_partial_settle','job_partial_settle',60);
  await wallet.settle({userId:settled.userId,jobId:settled.jobId,
    outcome:'success',actualCredits:20});
  const allowedAfterReturn=await job('customer_partial_settle','job_after_return',60);
  const returnedProof=await wallet.claimPurchasedDispatch(allowedAfterReturn,{env});
  assert.equal(returnedProof.purchasedCreditsAvailableBeforeReserve,80);
  // Missing or contradictory capture audit MUST NOT be interpreted as a
  // valid credit return. The same 60 spent reservation then counts in full.
  await pool.query("DELETE FROM vv_ai_ledger WHERE user_id='customer_partial_settle' AND reference='job_partial_settle' AND kind='captured'");
  const noAudit=await job('customer_partial_settle','job_without_audit',10);
  await assert.rejects(()=>wallet.claimPurchasedDispatch(noAudit,{env}),
    /AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);

  // A *real invoice.paid grant path* (simulated signed-webhook input, no Stripe
  // API call) is different from Checkout. It must record separate LIVE proof.
  const subEnv={AI_SUBSCRIPTION_CREDITS_ENABLED:'true',
   AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:80}),
   STRIPE_PRICE_BASIC:'price_SubSafe123',AI_BILLING_MODE:'live',
   AI_LIVE_BILLING_APPROVED:'true',AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'};
  const subEvent=(id='in_SubSafe1',intent='pi_SubSafe1',change={})=>({
   type:'invoice.paid',livemode:true,data:{object:{
    id,status:'paid',paid:true,livemode:true,billing_reason:'subscription_cycle',
    amount_paid:100,currency:'eur',payment_intent:intent,
    subscription:'sub_SubSafe1',customer:'cus_SubSafe1',
    lines:{has_more:false,data:[{price:{id:'price_SubSafe123'},quantity:1}]},...change
   }}});
  await pool.query(`INSERT INTO vv_users(id,plan,stripe_customer_id,stripe_subscription_id,subscription_status)
    VALUES('sub_customer','basic','cus_SubSafe1','sub_SubSafe1','active')`);
  assert.equal(await grantPaidSubscriptionInvoice({event:subEvent(),env:subEnv,pool,wallet}),true);
  // A matching replay remains idempotent, and cannot add extra bought credits.
  assert.equal(await grantPaidSubscriptionInvoice({event:subEvent(),env:subEnv,pool,wallet}),true);
  const receipt=await pool.query('SELECT invoice_id,user_id,payment_intent,livemode FROM vv_ai_verified_subscription_invoice');
  assert.deepEqual(receipt.rows,[{invoice_id:'in_SubSafe1',user_id:'sub_customer',payment_intent:'pi_SubSafe1',livemode:true}]);
  const paidSubJob=await job('sub_customer','job_sub_1',80);
  const subProof=await wallet.claimPurchasedDispatch(paidSubJob,{env});
  assert.equal(subProof.source,'settled_stripe_purchase');
  assert.equal(subProof.purchaseId,'in_SubSafe1');
  await assert.rejects(()=>wallet.claimPurchasedDispatch(paidSubJob,{env}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  // A valid paid invoice whose Stripe amount is partially refunded must no
  // longer authorize provider spend, even if leftover credits cover the job.
  const secondInvoice=subEvent('in_SubSafe2','pi_SubSafe2');
  assert.equal(await grantPaidSubscriptionInvoice({event:secondInvoice,env:subEnv,pool,wallet}),true);
  // The first 80-credit invoice has already fully funded a held reservation;
  // a partial refund makes the second invoice ineligible for new paid spend.
  await wallet.refund('pi_SubSafe2',1);
  // Without the bonus there are only 79 available credits; add 100 promo
  // credits to verify they cannot cover a one-credit purchased shortfall.
  await wallet.grantOnce({userId:'sub_customer',kind:'welcome',credits:100});
  const partialJob=await job('sub_customer','job_sub_refunded',80);
  await assert.rejects(()=>wallet.claimPurchasedDispatch(partialJob,{env}),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  // Conversely a genuine still-paid remainder of a partially refunded
  // LIVE subscription must be usable: 80 original - ceil(80*1/100) = 79.
  await pool.query(`INSERT INTO vv_users(id,plan,stripe_customer_id,stripe_subscription_id,subscription_status)
    VALUES('sub_partial_ok','basic','cus_PartialOK','sub_PartialOK','active')`);
  const partialInvoice=subEvent('in_PartialOK','pi_PartialOK',{
    subscription:'sub_PartialOK',customer:'cus_PartialOK'});
  assert.equal(await grantPaidSubscriptionInvoice({event:partialInvoice,env:subEnv,pool,wallet}),true);
  await wallet.refund('pi_PartialOK',1);
  const legitimate=await job('sub_partial_ok','job_sub_partial_ok',70);
  const partialProof=await wallet.claimPurchasedDispatch(legitimate,{env});
  assert.equal(partialProof.purchasedCreditsAvailableBeforeReserve,79);
  assert.equal(partialProof.source,'settled_stripe_purchase');
  assert.equal(await grantPaidSubscriptionInvoice({event:subEvent('in_Unpaid','pi_Unpaid',{amount_paid:0}),env:subEnv,pool,wallet}),false);

  // Refund rounding can exhaust a 1-credit pack on a tiny *partial*
  // amount refund. MIN(session_id) must not attach the immutable dispatch
  // claim to that zero-funded pack when a different LIVE pack covers it.
  await paid('customer_positive_source','cs_live_A_zero',1);
  await paid('customer_positive_source','cs_live_Z_valid',100);
  await wallet.refund('pi_cs_live_A_zero',1); // ceil(1 * 1 / 100) = 1 credit
  const provenanceJob=await job('customer_positive_source','job_positive_source',80);
  const provenance=await wallet.claimPurchasedDispatch(provenanceJob,{env});
  assert.equal(provenance.purchasedCreditsAvailableBeforeReserve,100);
  assert.equal(provenance.purchaseId,'cs_live_Z_valid',
    'single-use dispatch reference must name a source with positive paid credits');
  const storedSource=await pool.query(
    'SELECT purchase_reference FROM vv_ai_purchased_dispatch_claim WHERE job_id=$1',
    [provenanceJob.jobId]);
  assert.equal(storedSource.rows[0].purchase_reference,'cs_live_Z_valid');

  const total=await pool.query('SELECT count(*)::int AS n FROM vv_ai_purchased_dispatch_claim');
  assert.equal(total.rows[0].n,6,'pack, mixed, net-settled, subscriptions and positive-source provenance');
 }finally{
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});

test('BASE #16 subscriber-only fresh DB needs no prior Checkout to prove paid credits',
 {skip:!urlString},async()=>{
 const schema='p0_onlysub_'+randomUUID().replaceAll('-',''),admin=new pg.Client({connectionString:urlString});
 await admin.connect();
 await admin.query('CREATE SCHEMA '+schema);
 const pool=new pg.Pool({connectionString:urlString,options:'-c search_path='+schema});
 try{
  const wallet=new GenerationWallet(pool);await wallet.init();
  await pool.query(`CREATE TABLE vv_users(id TEXT PRIMARY KEY,plan TEXT,
   stripe_customer_id TEXT,stripe_subscription_id TEXT,subscription_status TEXT)`);
  await pool.query(`CREATE TABLE vv_generation_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,
   kind TEXT NOT NULL,model TEXT,provider TEXT,status TEXT,operation TEXT,
   deleted BOOLEAN NOT NULL DEFAULT false,request_fingerprint TEXT,
   credits_reserved INTEGER NOT NULL DEFAULT 0)`);
  await pool.query(sql);await pool.query(sql);
  const order=await pool.query("SELECT to_regclass('vv_ai_order') AS rel");
  assert.ok(order.rows[0].rel,'versioned migration must create lazy AI order table without pack checkout');
  const subEnv={AI_SUBSCRIPTION_CREDITS_ENABLED:'true',
   AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:50}),
   STRIPE_PRICE_BASIC:'price_OnlyApproved1',AI_BILLING_MODE:'live',
   AI_LIVE_BILLING_APPROVED:'true',AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'};
  const signedInvoiceFixture={type:'invoice.paid',livemode:true,data:{object:{
   id:'in_Only1',status:'paid',paid:true,livemode:true,billing_reason:'subscription_cycle',
   amount_paid:500,currency:'eur',payment_intent:'pi_Only1',
   subscription:'sub_Only1',customer:'cus_Only1',
   lines:{has_more:false,data:[{price:{id:'price_OnlyApproved1'},quantity:1}]}}}};
  await pool.query(`INSERT INTO vv_users(id,plan,stripe_customer_id,stripe_subscription_id,subscription_status)
   VALUES('user_only_sub','basic','cus_Only1','sub_Only1','active')`);
  assert.equal(await grantPaidSubscriptionInvoice({event:signedInvoiceFixture,env:subEnv,pool,wallet}),true);
  await pool.query(`INSERT INTO vv_generation_jobs(id,user_id,kind,model,provider,status,request_fingerprint,credits_reserved)
   VALUES('job_only_sub','user_only_sub','image','model_i','Google','processing','fp_only_sub',40)`);
  await wallet.reserve({userId:'user_only_sub',jobId:'job_only_sub',credits:40,fingerprint:'fp_only_sub'});
  const proof=await wallet.claimPurchasedDispatch({
   userId:'user_only_sub',jobId:'job_only_sub',kind:'image',modelId:'model_i',
   provider:'Google',credits:40,fingerprint:'fp_only_sub'},{env});
  assert.equal(proof.source,'settled_stripe_purchase');
  assert.equal(proof.purchaseId,'in_Only1');
  assert.equal(proof.purchasedCreditsAvailableBeforeReserve,50);
  await assert.rejects(()=>wallet.claimPurchasedDispatch({
   userId:'user_only_sub',jobId:'job_only_sub',kind:'image',modelId:'model_i',
   provider:'Google',credits:40,fingerprint:'fp_only_sub'},{env}),
   /AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
 }finally{
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
