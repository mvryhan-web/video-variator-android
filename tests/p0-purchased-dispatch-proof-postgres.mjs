// Only ephemeral localhost PostgreSQL; never target any existing user DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {GenerationWallet} from '../server/generation-wallet.js';
const urlString=process.env.P0_PURCHASED_TEST_DB_URL;
if(urlString){
 const u=new URL(urlString);
 if(!['postgres:', 'postgresql:'].includes(u.protocol)||
    !['127.0.0.1','localhost','::1'].includes(u.hostname)||
    u.pathname!=='/deepsyq_purchased_test')throw Error('P0_TEST_DB_MUST_BE_DISPOSABLE_LOCALHOST');
}
const sql=readFileSync(new URL('../server/migrations/20261017-purchased-dispatch-claim.sql',import.meta.url),'utf8');
const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_BILLING_MODE:'live',AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true'};
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
    model TEXT,provider TEXT,status TEXT,operation TEXT,deleted BOOLEAN NOT NULL DEFAULT false,
    request_fingerprint TEXT,credits_reserved INTEGER NOT NULL DEFAULT 0)`);
  await pool.query(sql);await pool.query(sql);
  async function job(userId,jobId,credits){
    await pool.query('INSERT INTO vv_generation_jobs(id,user_id,model,provider,status,request_fingerprint,credits_reserved) VALUES($1,$2,$3,$4,$5,$6,$7)',
       [jobId,userId,'model_v','Google','processing','sha256abc',credits]);
    await wallet.reserve({userId,jobId,credits,fingerprint:'sha256abc'});
    return {userId,jobId,credits,fingerprint:'sha256abc',modelId:'model_v',provider:'Google'};
  }
  async function paid(userId,sessionId,credits){
    await pool.query('INSERT INTO vv_ai_order(id,user_id,session_id,snapshot) VALUES($1,$2,$3,$4)',
     [sessionId+'_order',userId,sessionId,JSON.stringify({billingMode:'live'})]);
    await wallet.grant({userId,sessionId,paymentIntent:'pi_'+sessionId,credits,amount:100,currency:'eur'});
  }
  await paid('customer_paid','cs_live_paid',200);
  const paidJob=await job('customer_paid','job_paid_a',100);
  const proof=await wallet.claimPurchasedDispatch(paidJob,{env});
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
  const total=await pool.query('SELECT count(*)::int AS n FROM vv_ai_purchased_dispatch_claim');
  assert.equal(total.rows[0].n,2);
 }finally{
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
