import test from 'node:test';
import assert from 'node:assert/strict';
import {generationPolicy,enforceGenerationPolicy} from '../server/generation-policy.js';

test('generation policy is off by default and validates bounded limits',()=>{
 assert.deepEqual(generationPolicy({}),{enabled:false,maxConcurrentPerUser:0,maxJobsPerHourPerUser:0});
 assert.deepEqual(generationPolicy({AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'3',AI_STUDIO_MAX_JOBS_PER_HOUR:'20'}),{enabled:true,maxConcurrentPerUser:3,maxJobsPerHourPerUser:20});
 assert.equal(generationPolicy({AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'0'}).maxConcurrentPerUser,0);
});

test('policy blocks concurrent and hourly abuse server-side',async()=>{
 let mode='concurrency';
 const client={async query(sql,args){
  if(sql.startsWith('SELECT pg_advisory_xact_lock')){assert.equal(args[0],'ai-user:user-1');return {rows:[]};}
  if(sql.includes("status IN ('queued','processing','finalizing')"))return {rows:[{n:mode==='concurrency'?2:0}]};
  if(sql.includes("INTERVAL '1 hour'"))return {rows:[{n:5}]};
  throw new Error(sql);
 }};
 const env={AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',AI_STUDIO_MAX_CONCURRENT_PER_USER:'2',AI_STUDIO_MAX_JOBS_PER_HOUR:'5'};
 await assert.rejects(()=>enforceGenerationPolicy(client,{userId:'user-1',env}),/AI_CONCURRENCY_LIMIT/);
 mode='hourly';
 await assert.rejects(()=>enforceGenerationPolicy(client,{userId:'user-1',env}),/AI_RATE_LIMIT/);
});

test('BASE #51: explicitly enabled AI rate policy refuses missing, zero and malformed limits before DB',async()=>{
 let queries=0;
 const client={async query(){queries++;throw Error('DATABASE_SHOULD_NOT_BE_TOUCHED');}};
 const enabled={AI_STUDIO_PUBLIC_POLICY_ENABLED:'true',
  AI_STUDIO_MAX_CONCURRENT_PER_USER:'2',AI_STUDIO_MAX_JOBS_PER_HOUR:'6'};
 for(const change of [
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:undefined},
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:'0'},
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:'not-a-number'},
  {AI_STUDIO_MAX_CONCURRENT_PER_USER:'101'},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:undefined},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:'0'},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:'10001'},
  {AI_STUDIO_MAX_JOBS_PER_HOUR:'1.5'}
 ]){
  const env={...enabled,...change};
  await assert.rejects(
   ()=>enforceGenerationPolicy(client,{userId:'test-1',env}),
   e=>e.message==='AI_POLICY_LIMITS_NOT_CONFIGURED'&&e.status===503
  );
 }
 for(const overrides of [
  {enabled:true,maxConcurrentPerUser:0,maxJobsPerHourPerUser:10},
  {enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:0},
  {enabled:true,maxConcurrentPerUser:undefined,maxJobsPerHourPerUser:10},
  {enabled:true,maxConcurrentPerUser:101,maxJobsPerHourPerUser:10},
  {enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:10001}
 ]){
  await assert.rejects(
   ()=>enforceGenerationPolicy(client,{userId:'test-1',policyOverride:overrides}),
   /AI_POLICY_LIMITS_NOT_CONFIGURED/
  );
 }
 assert.equal(queries,0,'invalid enabled rate policies must not query the database');
});
