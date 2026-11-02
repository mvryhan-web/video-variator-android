import test from 'node:test';
import assert from 'node:assert/strict';
import {requirePurchasedDispatchAuthorization as authorize} from '../server/generation-paid-dispatch-authorization.js';

const env={AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'};
const user={id:'customer-1',email:'customer@example.test',scope:'public'};
const job={id:'job-1',userId:user.id,status:'processing',operation:null,providerStarted:false};
const request={kind:'video',model:'veo-3.1-lite-generate-preview',fingerprint:'approved-fingerprint',consent:true};
const model={kind:'video',id:request.model,provider:'Google',adapter:true};
const quote={kind:'video',model:model.id,provider:'Google',credits:60,providerCostMicros:200000,currency:'usd'};
const proof={source:'settled_stripe_purchase',purchaseConfirmed:true,refunded:false,
 dispatchClaimedExactlyOnce:true,purchaseId:'pi_paid-123',reservationId:'reserve-1',
 userId:user.id,jobId:job.id,modelId:model.id,provider:model.provider,
 requestFingerprint:request.fingerprint,creditsReserved:60,
 purchasedCreditsAvailableBeforeReserve:80};
const params=(x={})=>({env,user,job,request,model,quote,verifyPurchasedReservation:async()=>proof,...x});
const denied=/AI_PURCHASED_DISPATCH_NOT_AUTHORIZED/;

test('P0 #182 default is DENY even with a forged or high available-credit proof',async()=>{
 let claims=0;
 await assert.rejects(authorize(params({env:{},verifyPurchasedReservation:async()=>{claims++;return proof;}})),denied);
 await assert.rejects(authorize(params({verifyPurchasedReservation:null})),denied);
 assert.equal(claims,0);
});

test('P0 #182 owner/admin and missing paid consent are never eligible',async()=>{
 let claims=0;const verifier=async()=>{claims++;return proof;};
 for(const account of [
  {...user,id:'owner',email:'owner@example.test'},
  {...user,isOwner:true},{...user,isAdmin:true},{...user,scope:'owner'},
  {...user,id:''}
 ])await assert.rejects(authorize(params({user:account,verifyPurchasedReservation:verifier})),denied);
 await assert.rejects(authorize(params({request:{...request,consent:false},verifyPurchasedReservation:verifier})),denied);
 assert.equal(claims,0);
});

test('P0 #182 unpaid, welcome, admin and mixed-wallet credits cannot authorize provider',async()=>{
 for(const receipt of [
  {...proof,source:'welcome_grant'},
  {...proof,source:'admin_adjustment'},
  {...proof,purchaseConfirmed:false},
  {...proof,refunded:true},
  {...proof,creditsReserved:50},
  {...proof,purchasedCreditsAvailableBeforeReserve:50},
  {...proof,dispatchClaimedExactlyOnce:false}
 ])await assert.rejects(authorize(params({verifyPurchasedReservation:async()=>receipt})),denied);
});

test('P0 #182 confirmed, sufficient, atomically claimed purchased reservation qualifies only exact job',async()=>{
 let calls=0;
 const receipt=await authorize(params({verifyPurchasedReservation:async expected=>{
  calls++;assert.deepEqual(expected,{userId:user.id,jobId:job.id,kind:'video',
   modelId:model.id,provider:'Google',requestFingerprint:request.fingerprint,credits:60});
  return proof;
 }}));
 assert.equal(calls,1);assert.equal(receipt.authorized,true);
 assert.equal(receipt.scope,'purchased_customer_only');
 assert.equal(receipt.jobId,job.id);assert.equal(receipt.reservedCredits,60);
 assert.equal(Object.isFrozen(receipt),true);
});

test('P0 #182 duplicate/unknown/in-flight provider job never verifies or dispatches',async()=>{
 let calls=0,verifier=async()=>{calls++;return proof;};
 for(const bad of [
  {...job,operation:'operations/already-started'},
  {...job,providerStarted:true},{...job,status:'ready'},
  {...job,status:'queued'},{...job,deleted:true},{...job,userId:'other'}
 ])await assert.rejects(authorize(params({job:bad,verifyPurchasedReservation:verifier})),denied);
 assert.equal(calls,0);
});

test('P0 #182 reject forged receipt identifiers, mismatched price and model',async()=>{
 for(const receipt of [
  {...proof,jobId:'other'}, {...proof,userId:'other'},
  {...proof,modelId:'other'}, {...proof,provider:'BytePlus'},
  {...proof,requestFingerprint:'other'}, {...proof,purchaseId:''}
 ])await assert.rejects(authorize(params({verifyPurchasedReservation:async()=>receipt})),denied);
 for(const changed of [
  {quote:{...quote,credits:0}}, {quote:{...quote,provider:'BytePlus'}},
  {quote:{...quote,providerCostMicros:0}}, {model:{...model,adapter:false}},
  {request:{...request,fingerprint:''}}
 ])await assert.rejects(authorize(params(changed)),denied);
});

test('P0 #182 ledger errors and unknown eligibility fail closed without leaking DB details',async()=>{
 await assert.rejects(authorize(params({verifyPurchasedReservation:async()=>{
  throw Error('secret DB connection details');}})),e=>
   e.message==='AI_PURCHASED_DISPATCH_NOT_AUTHORIZED'&&!e.message.includes('secret'));
});
