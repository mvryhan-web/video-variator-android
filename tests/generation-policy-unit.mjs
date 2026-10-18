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
