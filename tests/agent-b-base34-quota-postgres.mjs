// BASE #34: actual PostgreSQL transaction-scoped quota safety, not SQL mocks.
// Uses a unique disposable schema on localhost only; no AI, Stripe, or payments.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {enforceGenerationPolicy} from '../server/generation-policy.js';

const connectionString=process.env.P0_PURCHASED_TEST_DB_URL||'';
if(connectionString){
 const u=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(u.protocol)||
   !['localhost','127.0.0.1','::1'].includes(u.hostname)||
   u.pathname!=='/deepsyq_purchased_test')throw Error('DISPOSABLE_POSTGRES_ONLY');
}
const quota={enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:3};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function bounded(p,ms=4000){
 let timer;
 try{return await Promise.race([p,new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Error('REAL_PG_QUOTA_TIMEOUT')),ms);
 })]);}finally{clearTimeout(timer);}
}
test('BASE34 real PG16 serialized same-user quota and isolated B user', {skip:!connectionString,timeout:30000}, async t=>{
 const schema='quota_b_'+randomUUID().replaceAll('-','');
 const admin=new pg.Client({connectionString});
 await admin.connect();
 let pool;
 try{
  await admin.query('CREATE SCHEMA '+schema);
  pool=new pg.Pool({connectionString,options:'-c search_path='+schema,max:3,connectionTimeoutMillis:2500});
  await pool.query('CREATE TABLE vv_generation_jobs(user_id TEXT NOT NULL,status TEXT NOT NULL,deleted BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  await t.test('transaction advisory lock serializes two same-user concurrent admissions',async()=>{
   const a=await pool.connect(),b=await pool.connect();
   let txA=false,txB=false;
   try{
    await a.query('BEGIN');txA=true;
    await bounded(enforceGenerationPolicy(a,{userId:'user-a',policyOverride:quota}));
    // A's job is still UNCOMMITTED. B must wait for A's per-user
    // transaction advisory lock, then observe its committed quota usage.
    await a.query("INSERT INTO vv_generation_jobs(user_id,status) VALUES('user-a','processing')");
    await b.query('BEGIN');txB=true;
    let settled=false;
    const second=enforceGenerationPolicy(b,{userId:'user-a',policyOverride:quota})
      .then(value=>{settled=true;return value},error=>{settled=true;throw error});
    void second.catch(()=>{}); // Do not leave rejected promise unhandled on failure.
    await sleep(80);
    assert.equal(settled,false,'B request may not race past first user transaction');
    // A different user can be admitted while user A is locked.
    const other=await pool.connect();
    try{
     await other.query('BEGIN');
     await bounded(enforceGenerationPolicy(other,{userId:'user-b',policyOverride:quota}));
     await other.query('ROLLBACK');
    }finally{other.release();}
    await a.query('COMMIT');txA=false;
    await assert.rejects(bounded(second),err=>
     err?.message==='AI_CONCURRENCY_LIMIT'&&err.status===429);
    await b.query('ROLLBACK');txB=false;
    const rows=(await pool.query('SELECT user_id,status FROM vv_generation_jobs')).rows;
    assert.deepEqual(rows,[{user_id:'user-a',status:'processing'}]);
   }finally{
    if(txA)await a.query('ROLLBACK').catch(()=>{});
    if(txB)await b.query('ROLLBACK').catch(()=>{});
    a.release();b.release();
   }
  });
  await t.test('hourly limit counts failed/finished recent tasks, excludes expired task, isolates user',async()=>{
   await pool.query('TRUNCATE vv_generation_jobs');
   await pool.query("INSERT INTO vv_generation_jobs(user_id,status,created_at) VALUES ('user-a','ready',NOW()),('user-a','failed',NOW()),('user-a','ready',NOW()-INTERVAL '2 hours'),('user-b','ready',NOW())");
   const limit={enabled:true,maxConcurrentPerUser:2,maxJobsPerHourPerUser:2};
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    await assert.rejects(bounded(enforceGenerationPolicy(client,{userId:'user-a',policyOverride:limit})),
      e=>e?.message==='AI_RATE_LIMIT'&&e.status===429);
    await client.query('ROLLBACK');
    await client.query('BEGIN');
    assert.equal((await bounded(enforceGenerationPolicy(client,{userId:'user-b',policyOverride:limit}))).ok,true);
    await client.query('ROLLBACK');
   }finally{client.release();}
  });
 }finally{
  if(pool)await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
