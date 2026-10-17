import test from 'node:test';
import assert from 'node:assert/strict';
import {generationPolicy,enforceGenerationPolicy} from '../server/generation-policy.js';

const valid={enabled:true,maxConcurrentPerUser:2,maxJobsPerHourPerUser:5};
function fakeDb({concurrent=0,hourly=0}={}){
 const calls=[];
 return {calls,client:{async query(sql,params){
  calls.push({sql,params});
  if(sql.includes('pg_advisory_xact_lock'))return {rows:[{}]};
  if(sql.includes("status IN"))return {rows:[{n:concurrent}]};
  if(sql.includes("INTERVAL '1 hour'"))return {rows:[{n:hourly}]};
  throw Error('UNEXPECTED_SQL');
 }}};
}

test('BASE #34: public policy fails closed on missing and malformed quota config before DB calls',async()=>{
 const cases=[
  {enabled:true,maxConcurrentPerUser:0,maxJobsPerHourPerUser:5},
  {enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:0},
  {enabled:true,maxConcurrentPerUser:101,maxJobsPerHourPerUser:5},
  {enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:10001},
  {enabled:true,maxConcurrentPerUser:1.5,maxJobsPerHourPerUser:5}
 ];
 for(const policyOverride of cases){
  const db=fakeDb();
  await assert.rejects(enforceGenerationPolicy(db.client,{userId:'sample-user',policyOverride}),e=>
   e.message==='AI_POLICY_LIMITS_NOT_CONFIGURED'&&e.status===503);
  assert.deepEqual(db.calls,[]);
 }
});

test('BASE #34: enabled env policy never invents missing production quotas',()=>{
 assert.deepEqual(generationPolicy({AI_STUDIO_PUBLIC_POLICY_ENABLED:'true'}),{
  enabled:true,maxConcurrentPerUser:0,maxJobsPerHourPerUser:0
 });
 assert.deepEqual(generationPolicy({
  AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'2',AI_STUDIO_MAX_JOBS_PER_HOUR:'50'
 }),{enabled:true,maxConcurrentPerUser:2,maxJobsPerHourPerUser:50});
});

test('BASE #34: disabled policy does not query database',async()=>{
 const db=fakeDb();
 assert.deepEqual(await enforceGenerationPolicy(db.client,{
  userId:'sample-user',policyOverride:{enabled:false,maxConcurrentPerUser:0,maxJobsPerHourPerUser:0}
 }),{ok:true,policy:{enabled:false,maxConcurrentPerUser:0,maxJobsPerHourPerUser:0}});
 assert.equal(db.calls.length,0);
});

test('BASE #34: uses per-user transaction advisory lock before both quota queries',async()=>{
 const db=fakeDb({concurrent:1,hourly:4});
 assert.deepEqual(await enforceGenerationPolicy(db.client,{userId:'user-42',policyOverride:valid}),{ok:true,policy:valid});
 assert.equal(db.calls.length,3);
 assert.match(db.calls[0].sql,/pg_advisory_xact_lock/);
 assert.deepEqual(db.calls[0].params,['ai-user:user-42']);
 assert.match(db.calls[1].sql,/status IN/);
 assert.deepEqual(db.calls[1].params,['user-42']);
 assert.match(db.calls[2].sql,/INTERVAL '1 hour'/);
 assert.deepEqual(db.calls[2].params,['user-42']);
});

test('BASE #34: concurrent job quota rejects exactly at configured limit before hourly query',async()=>{
 const db=fakeDb({concurrent:2});
 await assert.rejects(enforceGenerationPolicy(db.client,{userId:'u',policyOverride:valid}),e=>
  e.message==='AI_CONCURRENCY_LIMIT'&&e.status===429);
 assert.equal(db.calls.length,2);
});

test('BASE #34: sliding-hour quota rejects at threshold and allows below threshold',async()=>{
 const blocked=fakeDb({hourly:5});
 await assert.rejects(enforceGenerationPolicy(blocked.client,{userId:'u',policyOverride:valid}),e=>
  e.message==='AI_RATE_LIMIT'&&e.status===429);
 assert.equal(blocked.calls.length,3);
 const ok=fakeDb({hourly:4});
 await enforceGenerationPolicy(ok.client,{userId:'u',policyOverride:valid});
 assert.equal(ok.calls.length,3);
});


test('BASE #34: user identity stays SQL-parameterized and cannot alter lock or quota SQL',async()=>{
 const injected="user-42' OR TRUE --";
 const db=fakeDb({concurrent:0,hourly:0});
 await enforceGenerationPolicy(db.client,{userId:injected,policyOverride:valid});
 assert.equal(db.calls.length,3);
 for(const {sql} of db.calls)assert.equal(sql.includes(injected),false);
 assert.deepEqual(db.calls[0].params,['ai-user:'+injected]);
 assert.deepEqual(db.calls[1].params,[injected]);
 assert.deepEqual(db.calls[2].params,[injected]);
});

test('BASE #34: advisory-lock/DB failures must reject generation instead of approving quotas',async()=>{
 const failure=Error('database unavailable');
 let calls=0;
 const client={async query(){calls++;throw failure;}};
 await assert.rejects(enforceGenerationPolicy(client,{userId:'user-42',policyOverride:valid}),e=>e===failure);
 assert.equal(calls,1); // Quota reads must not race ahead after a missing transaction lock.
});
