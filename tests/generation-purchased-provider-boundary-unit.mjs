import test from 'node:test';
import assert from 'node:assert/strict';
import {submitPurchasedProviderRequest} from '../server/generation-purchased-provider-boundary.js';

const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'};
const user={id:'u-paid',email:'customer@example.test',isOwner:false};
const model={id:'gemini-3.1-flash-image',kind:'image',provider:'Google',adapter:true};
const quote={model:model.id,kind:model.kind,provider:model.provider,credits:7,providerCostMicros:1200,currency:'usd'};
const fingerprint='a'.repeat(64);
const job={id:'job-one',userId:user.id,user_id:user.id,kind:'image',model:model.id,provider:model.provider,
 status:'processing',operation:null,deleted:false,requestFingerprint:fingerprint,
 creditsReserved:7,estimated_cost:0.0012,cost_currency:'usd',settings:{dispatchConsent:true,purchasedQuote:{...quote}}};
const request={kind:'image',model:model.id,prompt:'Original flower',ratio:'1:1'};
const proof={source:'settled_stripe_purchase',purchaseConfirmed:true,refunded:false,dispatchClaimedExactlyOnce:true,
 purchaseId:'cs_live_real',reservationId:job.id,userId:user.id,jobId:job.id,modelId:model.id,
 provider:model.provider,requestFingerprint:fingerprint,creditsReserved:7,purchasedCreditsAvailableBeforeReserve:7};
const pool={async connect(){return {async query(sql){
 if(sql.startsWith('SELECT pg_advisory_unlock'))return {rows:[{pg_advisory_unlock:true}]};
 if(sql.startsWith('SELECT terms_version'))return {rows:[{terms_version:'2026-10-20',privacy_version:'2026-10-20',provider_data_version:'2026-10-20',provider_data_accepted:true}]};
 return {rows:[]};
},release(){}}}};
const core={env,pool,user,job,request,model,quote,originalQuote:quote,fingerprint};
function scenario(changes={},receipt=proof){
 let calls=0,claims=0;
 const provider=async()=>{calls++;return {operation:'one-accepted-provider-task'};};
 const wallet={purchasedDispatchVerifier:()=>async()=>{claims++;return receipt;}};
 return {args:{...core,wallet,provider,...changes},counts:()=>({calls,claims})};
}
test('confirmed LIVE purchased source authorizes ONE provider call with persisted user consent and quote',async()=>{
 let options;const s=scenario(),originalProvider=s.args.provider;s.args.provider=async(request,received)=>{options=received;return originalProvider(request,received);};const result=await submitPurchasedProviderRequest(s.args);
 assert.equal(result.operation,'one-accepted-provider-task');
 assert.deepEqual(s.counts(),{calls:1,claims:1});
 assert.equal(options.authorization.authorized,true);
 assert.equal(options.authorization.scope,'purchased_customer_only');
 assert.equal(options.authorization.modelId,model.id);
});
test('fail closed BEFORE purchased claim or provider on untrusted price, job, identity and consent',async()=>{
 const invalid=[
 {wallet:null},{wallet:{}},{job:null},{user:null},
 {job:{...job,user_id:'different-user'}},{job:{...job,userId:'different-user'}},
 {job:{...job,settings:{...job.settings,dispatchConsent:false}}},
 {job:{...job,settings:{...job.settings,purchasedQuote:{...quote,credits:6}}}},
 {job:{...job,creditsReserved:6}},{job:{...job,requestFingerprint:'other'}},
 {job:{...job,provider:'BytePlus'}},{job:{...job,cost_currency:'eur'}},
 {job:{...job,estimated_cost:0.42}},
 {originalQuote:{...quote,credits:6}},{quote:{...quote,providerCostMicros:1600}},
 {model:{...model,adapter:false}},{job:{...job,status:'queued'}},
 {job:{...job,operation:'google:already-accepted'}},{job:{...job,deleted:true}},
 {user:{...user,isOwner:true}},{user:{...user,email:'owner@example.test'}},
 {env:{...env,AI_PURCHASED_ONLY_DISPATCH_ENABLED:'false'}}
 ];
 for(const bad of invalid){
  const s=scenario(bad);
  await assert.rejects(submitPurchasedProviderRequest(s.args),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  assert.equal(s.counts().calls,0,'no external call for '+Object.keys(bad).join(','));
 }
});
test('bonus, refunded, foreign and replayed proofs cannot send any provider request',async()=>{
 for(const fake of [
  null,{...proof,source:'welcome_bonus'},{...proof,refunded:true},
  {...proof,purchaseConfirmed:false},{...proof,jobId:'job-foreign'},
  {...proof,dispatchClaimedExactlyOnce:false},
  {...proof,purchasedCreditsAvailableBeforeReserve:0},
  {...proof,provider:'BytePlus'}]){
  const s=scenario({},fake);
  await assert.rejects(submitPurchasedProviderRequest(s.args),/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/);
  assert.equal(s.counts().calls,0);
 }
});
test('concurrent requests cannot submit twice when wallet claim is atomic',async()=>{
 let claims=0,submissions=0;
 const wallet={purchasedDispatchVerifier:()=>async()=>{
  claims++;if(claims!==1)throw Error('single-use purchase already claimed');
  return proof;
 }};
 const s=scenario({wallet,provider:async()=>{submissions++;return {operation:'one-task'};}});
 const results=await Promise.allSettled([submitPurchasedProviderRequest(s.args),submitPurchasedProviderRequest(s.args)]);
 assert.equal(submissions,1);assert.equal(claims,2);
 assert.deepEqual(results.map(x=>x.status).sort(),['fulfilled','rejected']);
});
test('ambiguous accepted provider attempt has no automatic second dispatch',async()=>{
 let calls=0;
 const s=scenario({provider:async()=>{calls++;throw Error('unknown provider acceptance')}});
 await assert.rejects(submitPurchasedProviderRequest(s.args),/unknown provider acceptance/);
 assert.equal(calls,1);
});
