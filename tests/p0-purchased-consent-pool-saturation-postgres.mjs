// Disposable PostgreSQL16 only. No production SQL, Stripe or paid AI requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {GenerationWallet} from '../server/generation-wallet.js';
import {submitPurchasedProviderRequest,PurchasedDispatchDenied} from '../server/generation-purchased-provider-boundary.js';
import {withUserConsentFence} from '../server/generation-consent.js';
import {pollWithCurrentGenerationConsent} from '../server/generation-consent-poll.js';
const url=process.env.P0_PURCHASED_TEST_DB_URL;
if(url){
 const u=new URL(url);
 if(!['postgres:','postgresql:'].includes(u.protocol)||!['127.0.0.1','localhost','::1'].includes(u.hostname)||u.pathname!=='/deepsyq_purchased_test')throw Error('DISPOSABLE_POSTGRES_ONLY');
}
const migration=readFileSync(new URL('../server/migrations/20261017-purchased-dispatch-claim.sql',import.meta.url),'utf8');
const consentMigration=readFileSync(new URL('../server/migrations/20261020-ai-user-consent.sql',import.meta.url),'utf8');
const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'};
const model={id:'gemini-3.1-flash-image',kind:'image',provider:'Google',adapter:true};
const quote={model:model.id,provider:model.provider,kind:'image',credits:7,providerCostMicros:1200,currency:'usd'};
const request={kind:'image',model:model.id,prompt:'local mock',ratio:'1:1'},fingerprint='f'.repeat(64);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function bound(p,ms=2900){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('P0_POOL_DEADLOCK')),ms);})]);}finally{clearTimeout(timer);}}
for(const max of [1,2])test('P0 REAL disposable PG pool.max='+max+' concurrency, revoke, retry, timeout, credit holding',{skip:!url,timeout:35000},async()=>{
 const schema='pool_p0_'+randomUUID().replaceAll('-',''),admin=new pg.Client({connectionString:url});
 await admin.connect();await admin.query('CREATE SCHEMA '+schema);
 const pool=new pg.Pool({connectionString:url,options:'-c search_path='+schema,max,connectionTimeoutMillis:2000});
 try{
  const wallet=new GenerationWallet(pool);await wallet.init();
  await pool.query('CREATE TABLE vv_users(id TEXT PRIMARY KEY)');
  await pool.query('CREATE TABLE vv_ai_order(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,session_id TEXT UNIQUE,snapshot JSONB NOT NULL)');
  await pool.query("CREATE TABLE vv_generation_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,model TEXT,provider TEXT,status TEXT,operation TEXT,deleted BOOLEAN DEFAULT false,request_fingerprint TEXT,credits_reserved INTEGER DEFAULT 0,estimated_cost NUMERIC,cost_currency TEXT,settings JSONB DEFAULT '{}'::jsonb)");
  await pool.query(migration);await pool.query(consentMigration);
  const paid=async id=>{
   const sid='cs_live_'+id;
   await pool.query('INSERT INTO vv_users(id) VALUES($1)',[id]);
   await pool.query('INSERT INTO vv_ai_user_consents(user_id,terms_version,privacy_version,provider_data_version,provider_data_accepted) VALUES($1,$2,$2,$2,true)',[id,'2026-10-20']);
   await pool.query('INSERT INTO vv_ai_order(id,user_id,session_id,snapshot) VALUES($1,$2,$3,$4::jsonb)',[sid+'_order',id,sid,JSON.stringify({billingMode:'live'})]);
   await wallet.grant({userId:id,sessionId:sid,paymentIntent:'pi_'+sid,credits:70,amount:1000,currency:'usd'});
  };
  const create=async(id,userId)=>{
   await pool.query("INSERT INTO vv_generation_jobs(id,user_id,kind,model,provider,status,request_fingerprint,credits_reserved,estimated_cost,cost_currency,settings) VALUES($1,$2,'image',$3,'Google','processing',$4,7,0.0012,'usd',$5::jsonb)",[id,userId,model.id,fingerprint,JSON.stringify({dispatchConsent:true,purchasedQuote:quote})]);
   await wallet.reserve({userId,jobId:id,credits:7,fingerprint});
   const {rows}=await pool.query('SELECT * FROM vv_generation_jobs WHERE id=$1',[id]);
   return {...rows[0],userId,requestFingerprint:fingerprint,creditsReserved:7};
  };
  const send=(uid,job,provider,overrides={})=>submitPurchasedProviderRequest({env:{...env,...overrides},pool,wallet,user:{id:uid,email:uid+'@example.test',isOwner:false},job,request,model,quote,originalQuote:quote,fingerprint,provider});
  await paid('a');await paid('b');
  const jobs=await Promise.all([create('j-a','a'),create('j-b','b')]);
  let providerCalls=0;
  await bound(Promise.all(jobs.map((j,i)=>send(i?'b':'a',j,async()=>{providerCalls++;await sleep(30);return {operation:'mock'};}))));
  assert.equal(providerCalls,2,'both paid jobs complete even with no spare pool connection');
  await assert.rejects(bound(send('a',jobs[0],async()=>{providerCalls++;})),PurchasedDispatchDenied);
  assert.equal(providerCalls,2,'duplicate id cannot invoke provider');
  const held=await create('j-revoke','a');let entered,release;
  const started=new Promise(r=>entered=r),stop=new Promise(r=>release=r);
  let acknowledged=false,remaining=0;
  const inflight=send('a',held,async()=>{providerCalls++;entered();await stop;return {operation:'mock'};});
  await bound(started);
  const revocation=withUserConsentFence(pool,'a',async client=>{
   await client.query('BEGIN');
   try{await client.query("UPDATE vv_ai_user_consents SET provider_data_accepted=false,provider_data_version=NULL WHERE user_id='a'");await client.query('COMMIT');}
   catch(e){await client.query('ROLLBACK');throw e;}
  }).then(()=>{acknowledged=true;});
  await sleep(45);assert.equal(acknowledged,false,'revoke ACK must not overtake admitted transport');
  release();await bound(inflight);await bound(revocation);
  const late=await create('j-late','a');
  await assert.rejects(bound(send('a',late,async()=>{remaining++;})),PurchasedDispatchDenied);
  assert.equal(remaining,0);
  assert.equal((await wallet.settle({userId:'a',jobId:late.id,outcome:'confirmed_failure'})).status,'released');
  const timeout=await create('j-timeout','b');
  let timedCalls=0;
  await assert.rejects(bound(send('b',timeout,async()=>{timedCalls++;await new Promise(()=>{});},{AI_PROVIDER_DISPATCH_TIMEOUT_MS:'120'})),/AI_PROVIDER_TIMEOUT_UNCERTAIN/);
  await assert.rejects(bound(send('b',timeout,async()=>{timedCalls++;})),PurchasedDispatchDenied);
  assert.equal(timedCalls,1);
  await wallet.settle({userId:'b',jobId:timeout.id,outcome:'unknown'});
  assert.equal((await pool.query("SELECT status FROM vv_ai_reservation WHERE job_id='j-timeout'")).rows[0].status,'held');
  assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM vv_ai_purchased_dispatch_claim WHERE job_id='j-timeout'")).rows[0].n,1);

  // Read-only provider STATUS/RESULT polling must share the SAME consent fence.
  // Test with actual disposable PG16 at max=1 and max=2: a revoke ACK must
  // never overtake an admitted poll, and revoked users send ZERO new HTTP.
  let pollEntered,pollReleased,pollCalls=0,revokeAcknowledged=false;
  const startedPoll=new Promise(resolve=>pollEntered=resolve);
  const releasedPoll=new Promise(resolve=>pollReleased=resolve);
  const admitted=pollWithCurrentGenerationConsent({
   pool,userId:'b',poll:async({client,signal})=>{
    signal.throwIfAborted();assert.ok(client);
    pollCalls++;pollEntered();await releasedPoll;signal.throwIfAborted();
    return {pending:true};
   }
  });
  await bound(startedPoll);
  const pollRevoke=withUserConsentFence(pool,'b',async client=>{
   await client.query('BEGIN');
   try{
    await client.query("UPDATE vv_ai_user_consents SET provider_data_accepted=false,provider_data_version=NULL WHERE user_id='b'");
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}
  }).then(()=>{revokeAcknowledged=true;});
  await sleep(45);
  assert.equal(revokeAcknowledged,false,'poll must keep revoke ACK behind admitted HTTP');
  pollReleased();await bound(admitted);await bound(pollRevoke);
  await assert.rejects(bound(pollWithCurrentGenerationConsent({
   pool,userId:'b',poll:async()=>{pollCalls++;return {pending:true};}
  })),/PROVIDER_CONSENT_REQUIRED/);
  assert.equal(pollCalls,1,'aborted consent cannot start another status or media HTTP');
  assert.equal((await pool.query("SELECT status FROM vv_ai_reservation WHERE job_id='j-timeout'")).rows[0].status,'held',
   'revoke does not refund a purchased unresolved task');
  assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM vv_ai_purchased_dispatch_claim WHERE job_id='j-timeout'")).rows[0].n,1,
   'revoke/poll never re-claims or re-dispatches paid job');
  await bound(withUserConsentFence(pool,'b',async client=>{
   await client.query('BEGIN');
   try{
    await client.query("UPDATE vv_ai_user_consents SET provider_data_accepted=true,provider_data_version='2026-10-20' WHERE user_id='b'");
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e;}
  }));
  const resumed=await bound(pollWithCurrentGenerationConsent({
   pool,userId:'b',poll:async({signal})=>{signal.throwIfAborted();pollCalls++;return {pending:true};}
  }));
  assert.equal(resumed.pending,true,'same original operation may be read once consent is restored');
  assert.equal(pollCalls,2);
 }finally{await pool.end();await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});await admin.end();}
});
