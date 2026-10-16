import test from 'node:test';
import assert from 'node:assert/strict';
import {generationEntitlements,generationEntitlementForUser,freeGenerationConfig} from '../server/generation-entitlements.js';
import {enforceGenerationPolicy} from '../server/generation-policy.js';

test('public AI entitlements have no invented defaults and never inherit existing lifetime access',()=>{
 assert.equal(generationEntitlements({}).configured,false);
 const env={AI_PUBLIC_GENERATION_ENABLED:'true',AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'basic',maxConcurrent:1,maxPerHour:12}])};
 assert.deepEqual(generationEntitlementForUser({plan:'basic',subscription_status:'active'},env),{allowed:true,scope:'public',plan:'basic',maxConcurrent:1,maxPerHour:12});
 assert.equal(generationEntitlementForUser({plan:'basic',subscription_status:'inactive'},env).reason,'AI_PLAN_INACTIVE');
 assert.equal(generationEntitlementForUser({plan:'lifetime',subscription_status:'lifetime'},env).reason,'AI_PLAN_NOT_ENTITLED');
 assert.equal(generationEntitlements({...env,AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'lifetime',maxConcurrent:1,maxPerHour:1}])}).configured,false);
});

test('BASE #44: free/trial AI acquisition requires explicit flags, starter funds and strict limits',()=>{
 const base={
  AI_PUBLIC_GENERATION_ENABLED:'true',
  AI_FREE_GENERATION_ENABLED:'true',
  AI_WELCOME_CREDITS_ENABLED:'true',
  AI_WELCOME_CREDITS:'25',
  AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([
   {plan:'trial',maxConcurrent:1,maxPerHour:3},
   {plan:'basic',maxConcurrent:2,maxPerHour:40}
  ])
 };
 const newAccount={plan:'trial',subscription_status:'inactive',has_subscribed:false};
 assert.deepEqual(generationEntitlementForUser(newAccount,base),{
  allowed:true,scope:'public',plan:'trial',maxConcurrent:1,maxPerHour:3
 });
 assert.equal(freeGenerationConfig(base).enabled,true);
 for(const changed of [
  {AI_FREE_GENERATION_ENABLED:'false'},
  {AI_WELCOME_CREDITS_ENABLED:'false'},
  {AI_WELCOME_CREDITS:'0'},
  {AI_WELCOME_CREDITS:'1001'},
  {AI_WELCOME_CREDITS:'1.1'},
  {AI_PLAN_ENTITLEMENTS_JSON:'[]'},
  {AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'trial',maxConcurrent:2,maxPerHour:3}])},
  {AI_PLAN_ENTITLEMENTS_JSON:JSON.stringify([{plan:'trial',maxConcurrent:1,maxPerHour:11}])}
 ]) {
  const disabled=generationEntitlementForUser(newAccount,{...base,...changed});
  assert.equal(disabled.allowed,false,JSON.stringify(changed));
  assert.equal(disabled.reason,changed.AI_FREE_GENERATION_ENABLED==='false'?'AI_PLAN_NOT_ENTITLED':changed.AI_PLAN_ENTITLEMENTS_JSON==='[]'?'AI_ENTITLEMENTS_NOT_CONFIGURED':'AI_FREE_PLAN_NOT_CONFIGURED');
 }
 assert.equal(generationEntitlementForUser(newAccount,{...base,AI_PUBLIC_GENERATION_ENABLED:'false'}).reason,'PUBLIC_AI_DISABLED');
 assert.equal(generationEntitlementForUser({...newAccount,has_subscribed:true},base).allowed,false);
 assert.equal(generationEntitlementForUser({...newAccount,subscription_status:'past_due'},base).allowed,false);
 assert.equal(generationEntitlementForUser({...newAccount,subscription_status:'active'},base).allowed,false);
 assert.equal(generationEntitlementForUser({plan:'basic',subscription_status:'active',has_subscribed:true},base).allowed,true);
 assert.equal(generationEntitlementForUser({plan:'lifetime',subscription_status:'lifetime',has_subscribed:true},base).allowed,false);
 assert.equal(freeGenerationConfig({}).enabled,false);
});

test('entitlement policy overrides enforce per-user concurrency before public dispatch',async()=>{
 const calls=[];const client={async query(sql,args=[]){calls.push({sql,args});if(sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};if(sql.includes("status IN ('queued','processing','finalizing')"))return {rows:[{n:1}]};throw new Error(sql);}};
 await assert.rejects(()=>enforceGenerationPolicy(client,{userId:'u1',env:{},policyOverride:{enabled:true,maxConcurrentPerUser:1,maxJobsPerHourPerUser:10}}),/AI_CONCURRENCY_LIMIT/);
 assert.ok(calls.some(x=>x.sql.startsWith('SELECT pg_advisory_xact_lock')));
});
