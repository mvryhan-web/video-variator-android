// Owner P0 #182: real one-use Stripe-funded claim in a THROWAWAY local PostgreSQL 16.
// No Stripe API, no paid AI API, no production DB, no external storage/network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {GenerationWallet} from '../server/generation-wallet.js';
import {submitPurchasedProviderRequest,PurchasedDispatchDenied} from '../server/generation-purchased-provider-boundary.js';

const url=process.env.P0_PURCHASED_TEST_DB_URL;
if(url){
 const u=new URL(url);
 if(!['postgres:','postgresql:'].includes(u.protocol)||
    !['127.0.0.1','localhost','::1'].includes(u.hostname)||
    u.pathname!=='/deepsyq_purchased_test')
  throw Error('P0_TEST_DB_MUST_BE_DISPOSABLE_LOCALHOST');
}
const migration=readFileSync(new URL('../server/migrations/20261017-purchased-dispatch-claim.sql',import.meta.url),'utf8');
const consentMigration=readFileSync(new URL('../server/migrations/20261020-ai-user-consent.sql',import.meta.url),'utf8');
const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_BILLING_MODE:'live',
 AI_LIVE_BILLING_APPROVED:'true',AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',
 ADMIN_EMAIL:'owner@example.test'};
const model={id:'gemini-3.1-flash-image',kind:'image',provider:'Google',adapter:true};
const quote={model:model.id,provider:model.provider,kind:model.kind,credits:7,providerCostMicros:1200,currency:'usd'};
const user=id=>({id,email:id==='owner'?'owner@example.test':id+'@example.test',isOwner:id==='owner'});
const request={kind:'image',model:model.id,prompt:'Original design',ratio:'1:1'};
const fingerprint='f'.repeat(64);

test('P0: PostgreSQL16 real wallet + purchase + once-only dispatch + denied credits released (all mock providers)',
 {skip:!url},async()=>{
 const schema='p0_gate_'+randomUUID().replaceAll('-','');
 const admin=new pg.Client({connectionString:url});
 await admin.connect();
 await admin.query('CREATE SCHEMA '+schema);
 const pool=new pg.Pool({connectionString:url,options:'-c search_path='+schema});
 try{
  const wallet=new GenerationWallet(pool);
  await wallet.init();
  await pool.query('CREATE TABLE vv_ai_order(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,session_id TEXT UNIQUE,snapshot JSONB NOT NULL)');
  await pool.query(`CREATE TABLE vv_generation_jobs(
   id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,model TEXT,
   provider TEXT,status TEXT,operation TEXT,deleted BOOLEAN NOT NULL DEFAULT false,
   request_fingerprint TEXT,credits_reserved INTEGER NOT NULL DEFAULT 0,
   estimated_cost NUMERIC,cost_currency TEXT,settings JSONB DEFAULT '{}'::jsonb)`);
  await pool.query(migration);
  await pool.query(migration);
  await pool.query('CREATE TABLE vv_users(id TEXT PRIMARY KEY)');
  await pool.query(consentMigration);
  async function accept(id){
   await pool.query('INSERT INTO vv_users(id) VALUES($1)',[id]);
   await pool.query('INSERT INTO vv_ai_user_consents(user_id,terms_version,privacy_version,provider_data_version,provider_data_accepted) VALUES($1,$2,$2,$2,true)',[id,'2026-10-20']);
  }
  async function paid(id){
   await accept(id);
   const sid='cs_live_'+id;
   await pool.query('INSERT INTO vv_ai_order(id,user_id,session_id,snapshot) VALUES($1,$2,$3,$4::jsonb)',
    [sid+'_order',id,sid,JSON.stringify({billingMode:'live'})]);
   await wallet.grant({userId:id,sessionId:sid,paymentIntent:'pi_'+sid,credits:100,amount:1000,currency:'usd'});
   return sid;
  }
  async function insertJob(id,uid,change={}){
   await pool.query(`INSERT INTO vv_generation_jobs
    (id,user_id,kind,model,provider,status,request_fingerprint,credits_reserved,estimated_cost,cost_currency,settings)
    VALUES($1,$2,'image',$3,'Google','processing',$4,$5,$6,'usd',$7::jsonb)`,
    [id,uid,model.id,fingerprint,7,0.0012,JSON.stringify({dispatchConsent:true,purchasedQuote:quote,...change})]);
   await wallet.reserve({userId:uid,jobId:id,credits:7,fingerprint});
   const {rows}=await pool.query('SELECT * FROM vv_generation_jobs WHERE id=$1',[id]);
   return {...rows[0],userId:uid,requestFingerprint:fingerprint,creditsReserved:7};
  }
  async function dispatch(id,job,changes={}){
   return submitPurchasedProviderRequest({env,pool,user:user(id),job,request,model,quote,originalQuote:quote,
    fingerprint,wallet,...changes,
    provider:changes.provider??(async()=>({operation:'mock-only-task'}))});
  }
  await paid('paid');
  const job1=await insertJob('job-paid','paid');
  let providerCalls=0;
  const provider=async()=>{providerCalls++;return {operation:'provider-mock-one'};};
  const results=await Promise.allSettled([
   dispatch('paid',job1,{provider}),dispatch('paid',job1,{provider}),
   dispatch('paid',job1,{provider})
  ]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(providerCalls,1,'PostgreSQL unique claim + wallet locking must allow exactly one spend');
  const count=await pool.query('SELECT COUNT(*)::int AS n FROM vv_ai_purchased_dispatch_claim WHERE job_id=$1',['job-paid']);
  assert.equal(count.rows[0].n,1);

  await accept('bonus');
  await wallet.grantOnce({userId:'bonus',kind:'welcome',credits:20});
  const bonus=await insertJob('job-bonus','bonus');
  await assert.rejects(dispatch('bonus',bonus),PurchasedDispatchDenied);
  assert.equal((await wallet.settle({userId:'bonus',jobId:'job-bonus',outcome:'confirmed_failure'})).status,'released');
  assert.deepEqual(await wallet.balance('bonus'),{available:20,reserved:0,debt:0});

  await paid('refunded');
  const refunded=await insertJob('job-refunded','refunded');
  await wallet.refund('pi_cs_live_refunded',1000);
  await assert.rejects(dispatch('refunded',refunded),PurchasedDispatchDenied);
  assert.equal((await wallet.settle({userId:'refunded',jobId:'job-refunded',outcome:'confirmed_failure'})).status,'released');
  assert.deepEqual(await wallet.balance('refunded'),{available:0,reserved:0,debt:0},
    'no lost held credits and no resurrected spendable refunded money');

  await paid('revoked');
  const revoked=await insertJob('job-revoked','revoked');
  await pool.query('UPDATE vv_ai_user_consents SET provider_data_accepted=false,provider_data_version=NULL WHERE user_id=$1',['revoked']);
  await assert.rejects(dispatch('revoked',revoked),PurchasedDispatchDenied);
  assert.equal((await wallet.settle({userId:'revoked',jobId:'job-revoked',outcome:'confirmed_failure'})).status,'released');

  await paid('owner');
  const ownerJob=await insertJob('job-owner','owner');
  await assert.rejects(dispatch('owner',ownerJob),PurchasedDispatchDenied);
  assert.equal((await wallet.settle({userId:'owner',jobId:'job-owner',outcome:'confirmed_failure'})).status,'released');

  await paid('price');
  const priceJob=await insertJob('job-price','price',{purchasedQuote:{...quote,credits:6}});
  await assert.rejects(dispatch('price',priceJob),PurchasedDispatchDenied);
  const c=await pool.query('SELECT COUNT(*)::int AS n FROM vv_ai_purchased_dispatch_claim');
  assert.equal(c.rows[0].n,1,'denied price/bonus/owner/refunded claims never persist purchase dispatch');
 }finally{
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
