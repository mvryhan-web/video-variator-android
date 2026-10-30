// No-spend BASE #5 regression: real disposable PG16, row locks and held credits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {quarantineUncertainVideoSubmit,VIDEO_SUBMISSION_UNCERTAIN} from '../server/generation-video-submit-uncertainty.js';
const connectionString=process.env.P0_PURCHASED_TEST_DB_URL||'';
if(connectionString){
 const u=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(u.protocol)||
 !['localhost','127.0.0.1','::1'].includes(u.hostname)||
 u.pathname!=='/deepsyq_purchased_test')throw Error('DISPOSABLE_POSTGRES_ONLY');
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const fail={category:'provider_transport',sourceCode:'PROVIDER_TIMEOUT'};
test('BASE5 real PG16 ambiguous Video submission does not lose operation or held credits',{skip:!connectionString,timeout:40000},async t=>{
 const schema='video_unknown_b_'+randomUUID().replaceAll('-','');
 const admin=new pg.Client({connectionString});
 await admin.connect();let pool;
 try{
  await admin.query('CREATE SCHEMA '+schema);
  pool=new pg.Pool({connectionString,options:'-c search_path='+schema,max:3,connectionTimeoutMillis:3000});
  await pool.query("CREATE TABLE vv_generation_jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,status TEXT NOT NULL,operation TEXT,deleted BOOLEAN NOT NULL DEFAULT false,error TEXT,error_message TEXT,failed_at TIMESTAMPTZ,metadata JSONB,credits_reserved INTEGER NOT NULL DEFAULT 0,credits_charged INTEGER NOT NULL DEFAULT 0)");
  await pool.query('CREATE TABLE vv_ai_wallet(user_id TEXT PRIMARY KEY,available INT,reserved INT,debt INT)');
  await pool.query('CREATE TABLE vv_ai_ledger(reference TEXT PRIMARY KEY,available_delta INT,reserved_delta INT)');
  await pool.query("INSERT INTO vv_ai_wallet VALUES('user-a',5,8,0)");
  await pool.query("INSERT INTO vv_ai_ledger VALUES('paid-original-job',-8,8)");
  const money=async()=>({
    wallet:(await pool.query('SELECT * FROM vv_ai_wallet')).rows,
    ledger:(await pool.query('SELECT * FROM vv_ai_ledger')).rows
  });
  const beforeMoney=await money();
  async function seed(id,kind,status,{operation=null,deleted=false}={}){
    await pool.query('INSERT INTO vv_generation_jobs(id,kind,status,operation,deleted,credits_reserved,credits_charged,metadata) VALUES($1,$2,$3,$4,$5,8,0,$6)',
     [id,kind,status,operation,deleted,JSON.stringify({ownerScope:'kept'})]);
  }
  const get=async id=>(await pool.query('SELECT * FROM vv_generation_jobs WHERE id=$1',[id])).rows[0];
  await t.test('queued/processing ambiguous video is held, never marked failed/charged/released',async()=>{
    for(const state of ['queued','processing']){
     const id='unknown-'+state;await seed(id,'video',state);
     assert.deepEqual(await quarantineUncertainVideoSubmit({pool,jobId:id,failure:fail}),{quarantined:true});
     const row=await get(id);
     assert.equal(row.status,'processing');assert.equal(row.operation,null);
     assert.equal(row.error,VIDEO_SUBMISSION_UNCERTAIN);
     assert.equal(row.error_message,'AI_PROVIDER_SUBMISSION_UNCERTAIN');
     assert.equal(row.failed_at,null);assert.equal(row.credits_reserved,8);
     assert.equal(row.credits_charged,0);
     assert.equal(row.metadata.ownerScope,'kept');
     assert.equal(row.metadata.providerSubmitUncertain,true);
     assert.deepEqual(row.metadata.failure,{category:'provider_transport',stage:'provider_submit',sourceCode:'PROVIDER_TIMEOUT',retryable:false});
     assert.deepEqual(await money(),beforeMoney);
    }
  });
  await t.test('accepted remote operation, terminal, deleted and non-video rows do not change',async()=>{
   for(const [id,kind,status,flags] of [
     ['remote','video','processing',{operation:'byteplus:accepted-task'}],
     ['ready','video','ready',{}],['failed','video','failed',{}],
     ['deleted','video','queued',{deleted:true}],['image','image','queued',{}],
     ['music','music','queued',{}]
   ]){
    await seed(id,kind,status,flags);
    const before=await get(id);
    assert.deepEqual(await quarantineUncertainVideoSubmit({pool,jobId:id,failure:fail}),{quarantined:false});
    assert.deepEqual(await get(id),before);
   }
   assert.deepEqual(await money(),beforeMoney);
  });
  await t.test('row lock makes new accepted provider operation defeat stale quarantine',async()=>{
   await seed('race','video','processing');
   const first=await pool.connect();let tx=false,attempt;
   try{
    await first.query('BEGIN');tx=true;
    await first.query("UPDATE vv_generation_jobs SET operation='byteplus:accepted-task' WHERE id='race'");
    let resolved=false;
    attempt=quarantineUncertainVideoSubmit({pool,jobId:'race',failure:fail})
      .then(v=>{resolved=true;return v;},e=>{resolved=true;throw e;});
    void attempt.catch(()=>{});
    await delay(85);
    assert.equal(resolved,false,'PG must wait for the provider-operation row lock');
    await first.query('COMMIT');tx=false;
    assert.deepEqual(await attempt,{quarantined:false});
    const row=await get('race');
    assert.equal(row.operation,'byteplus:accepted-task');
    assert.equal(row.status,'processing');assert.equal(row.error,null);
    assert.equal(row.credits_reserved,8);
    assert.deepEqual(await money(),beforeMoney);
   }finally{
    if(tx)await first.query('ROLLBACK').catch(()=>{});
    if(attempt)await attempt.catch(()=>{});
    first.release();
   }
  });
  await t.test('injected identifiers never select a job; diagnostics are SQL-parameter bounded',async()=>{
   assert.deepEqual(await quarantineUncertainVideoSubmit({pool,jobId:"x' OR TRUE --",failure:fail}),{quarantined:false});
   await seed('bounded','video','queued');
   assert.deepEqual(await quarantineUncertainVideoSubmit({pool,jobId:'bounded',failure:{
    category:'A'.repeat(250),sourceCode:'B'.repeat(400)
   }}),{quarantined:true});
   const x=await get('bounded');
   assert.equal(x.metadata.failure.category.length,64);
   assert.equal(x.metadata.failure.sourceCode.length,80);
   assert.equal(x.credits_reserved,8);
   assert.deepEqual(await money(),beforeMoney);
  });
 }finally{
  if(pool)await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
