import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {GenerationWallet} from '../server/generation-wallet.js';

const db=process.env.AI_TEST_DATABASE_URL;

test('BASE #15: partial capture is atomic, debt-first and retry-safe in real isolated PostgreSQL',{skip:!db},async t=>{
 const dbUrl=new URL(db);
 assert.equal(process.env.NODE_ENV,'test');
 assert.ok(['127.0.0.1','localhost'].includes(dbUrl.hostname));
 assert.equal(dbUrl.pathname,'/vv_ai_test');
 const pool=new pg.Pool({connectionString:db});
 const wallet=new GenerationWallet(pool),prefix=randomUUID();
 const grant=async(tag,credits=100)=>{const userId=prefix+'-'+tag;
  await wallet.grant({userId,sessionId:prefix+'-cs-'+tag,paymentIntent:prefix+'-pi-'+tag,
    credits,amount:100,currency:'eur'});
  return userId;
 };
 const reserve=(userId,tag,credits)=>({userId,jobId:prefix+'-job-'+tag,credits,fingerprint:'hash-'+tag});
 try{
  await t.test('legacy caller still captures full reserved credits exactly once',async()=>{
   const u=await grant('legacy'),job=reserve(u,'legacy',80);
   await wallet.reserve(job);
   await Promise.all(Array.from({length:4},()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'success'})));
   assert.deepEqual(await wallet.balance(u),{available:20,reserved:0,debt:0});
   await assert.rejects(()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits:79}),/SETTLEMENT_AMOUNT_CONFLICT/);
   assert.deepEqual(await wallet.balance(u),{available:20,reserved:0,debt:0});
  });
  await t.test('lower trusted actual quote returns unused reserve; retries do not double refund',async()=>{
   const u=await grant('partial'),job=reserve(u,'partial',80);
   await wallet.reserve(job);
   const all=await Promise.all(Array.from({length:8},()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits:30})));
   assert.equal(all.filter(x=>x.returnedCredits===50).length,1);
   assert.deepEqual(await wallet.balance(u),{available:70,reserved:0,debt:0});
   await wallet.settle({userId:u,jobId:job.jobId,outcome:'confirmed_failure'});
   await wallet.settle({userId:u,jobId:job.jobId,outcome:'success'});
   assert.deepEqual(await wallet.balance(u),{available:70,reserved:0,debt:0});
   const r=await pool.query("SELECT available_delta,reserved_delta,debt_delta FROM vv_ai_ledger WHERE user_id=$1 AND reference=$2 AND kind='captured'",[u,job.jobId]);
   assert.equal(r.rows.length,1);
   assert.deepEqual(r.rows[0],{available_delta:'50',reserved_delta:'-80',debt_delta:'0'});
   await assert.rejects(()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits:29}),/SETTLEMENT_AMOUNT_CONFLICT/);
   assert.deepEqual(await wallet.balance(u),{available:70,reserved:0,debt:0});
  });
  await t.test('invalid final amount or failure amount never mutates held reservation',async()=>{
   const u=await grant('invalid'),job=reserve(u,'invalid',80);
   await wallet.reserve(job);
   for(const actualCredits of [0,-1,81,1.4,'30',NaN,Infinity]){
    await assert.rejects(()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits}),/INVALID_ACTUAL_CREDITS/);
   }
   await assert.rejects(()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'confirmed_failure',actualCredits:30}),/INVALID_ACTUAL_CREDITS/);
   assert.deepEqual(await wallet.balance(u),{available:20,reserved:80,debt:0});
   const released=await wallet.settle({userId:u,jobId:job.jobId,outcome:'confirmed_failure'});
   assert.equal(released.status,'released');
   assert.deepEqual(await wallet.balance(u),{available:100,reserved:0,debt:0});
   await assert.rejects(()=>wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits:30}),/SETTLEMENT_ALREADY_RELEASED/);
  });
  await t.test('a refunded checkout cannot turn unused reserved credits into spending power',async()=>{
   const u=await grant('debt'),job=reserve(u,'debt',80);
   await wallet.reserve(job); // available 20, reserved 80
   await wallet.refund(prefix+'-pi-debt',90); // debt 70, available 0
   assert.deepEqual(await wallet.balance(u),{available:0,reserved:80,debt:70});
   const charged=await wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits:20});
   assert.equal(charged.capturedCredits,20);
   assert.equal(charged.returnedCredits,60);
   assert.deepEqual(await wallet.balance(u),{available:0,reserved:0,debt:10});
   await wallet.settle({userId:u,jobId:job.jobId,outcome:'success',actualCredits:20});
   assert.deepEqual(await wallet.balance(u),{available:0,reserved:0,debt:10});
   const ledger=await pool.query("SELECT available_delta,reserved_delta,debt_delta FROM vv_ai_ledger WHERE user_id=$1 AND reference=$2 AND kind='captured'",[u,job.jobId]);
   assert.deepEqual(ledger.rows[0],{available_delta:'0',reserved_delta:'-80',debt_delta:'-60'});
   assert.equal(ledger.rows.length,1);
  });
 }finally{await pool.end();}
});
