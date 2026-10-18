import test from 'node:test';
import assert from 'node:assert/strict';
import {generationEntitlements,generationEntitlementForUser} from '../server/generation-entitlements.js';
import {enforceGenerationPolicy} from '../server/generation-policy.js';

test('public AI entitlements have no invented defaults and never inherit existing lifetime access',()=>{
 assert.equal(generationEntitlements({}).configured,false);
 const env={AI_PUBLIC_GENERATION_ENABLED:'true',AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:12}])};
 assert.deepEqual(generationEntitlementForUser({plan:'basic',subscription_status:'active'},env),{allowed:true,scope:'public',plan:'basic',maxConcurrent:1,maxPerHour:12});
 assert.equal(generationEntitlementForUser({plan:'basic',subscription_status:'inactive'},env).reason,'AI_PLAN_INACTIVE');
 assert.equal(generationEntitlementForUser({plan:'lifetime',subscription_status:'lifetime'},env).reason,'AI_PLAN_NOT_ENTITLED');
 assert.equal(generationEntitlements({...env,AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'lifetime',maxConcurrent:1,maxPerHour:1}])}).configured,false);
});

test('entitlement policy overrides enforce per-user concurrency before public dispatch',async()=>{
 const calls=[];const client={async query(sql,args=[]){calls.push({sql,args});if(sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};if(sql.includes("status IN ('queued','processing','finalizing')"))return {rows:[{n:1}]};throw new Error(sql);}};
 await assert.rejects(()=>enforceGenerationPolicy(client,{userId:'u1',env:{},policyOverride:{enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:10}}),/AI_CONCURRENCY_LIMIT/);
 assert.ok(calls.some(x=>x.sql.startsWith('SELECT pg_advisory_xact_lock')));
});
