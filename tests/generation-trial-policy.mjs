import test from 'node:test';
import assert from 'node:assert/strict';
import {previewTrialEligibility,previewTrialWindow,previewWebhookReplay,TRIAL_PREVIEW_DURATION_MS} from '../server/generation-trial-policy.js';
const first={userId:'account-1',accountVerified:true,paymentIdentityVerified:true,historyQueryComplete:true,priorAccountTrialPurchases:0,priorPaymentIdentityTrialPurchases:0};
const base=Date.parse('2026-10-15T12:00:00.000Z');
const paid={userId:'account-1',sessionId:'cs_123456',paymentIntent:'pi_abcdef',verifiedWebhook:true,paymentStatus:'paid',checkoutMode:'payment',amountCents:99,currency:'usd',oneTime:true,autoRenew:false,paidAtMs:base,refundedCents:0,revoked:false};

test('eligibility is only a review hint, never a credit or generation entitlement',()=>{
 const result=previewTrialEligibility(first);
 assert.equal(result.status,'ELIGIBLE_FOR_REVIEW');
 assert.equal(result.launchApproved,false);
 assert.equal(result.accessGranted,false);
 assert.ok(!Object.hasOwn(result,'credits'));
});
test('fail closed on missing verified account/payment identity or missing history',()=>{
 for(const overrides of [{accountVerified:false},{paymentIdentityVerified:false},{historyQueryComplete:false},{paymentIdentityVerified:undefined}])
  assert.equal(previewTrialEligibility({...first,...overrides}).reason,'IDENTITY_OR_HISTORY_NOT_VERIFIED');
 assert.equal(previewTrialEligibility({...first,userId:''}).reason,'NO_AUTHENTICATED_USER');
 assert.equal(previewTrialEligibility({...first,priorAccountTrialPurchases:-1}).reason,'INVALID_TRIAL_HISTORY');
});
test('repeated account or same payment identity cannot obtain another trial, even after refund',()=>{
 assert.equal(previewTrialEligibility({...first,priorAccountTrialPurchases:1}).reason,'ALREADY_USED_TRIAL');
 assert.equal(previewTrialEligibility({...first,priorPaymentIdentityTrialPurchases:1}).reason,'ALREADY_USED_TRIAL');
});
test('exact fixed 72-hour window starts from verified paid event, not from a visit',()=>{
 const atStart=previewTrialWindow(paid,base);
 assert.equal(TRIAL_PREVIEW_DURATION_MS,259200000);
 assert.equal(atStart.status,'ACTIVE_WINDOW_PREVIEW');
 assert.equal(atStart.remainingMs,TRIAL_PREVIEW_DURATION_MS);
 assert.equal(atStart.accessGranted,false);
 assert.equal(previewTrialWindow(paid,base+TRIAL_PREVIEW_DURATION_MS-1).status,'ACTIVE_WINDOW_PREVIEW');
 const atExpiry=previewTrialWindow(paid,base+TRIAL_PREVIEW_DURATION_MS);
 assert.equal(atExpiry.status,'EXPIRED_WINDOW');
 assert.equal(atExpiry.remainingMs,undefined);
 assert.equal(atExpiry.launchApproved,false);
 assert.equal(previewTrialWindow(paid,base+TRIAL_PREVIEW_DURATION_MS+3600000).reason,'THREE_DAY_WINDOW_ENDED');
});
test('UTC elapsed-time rule is stable across DST and timezone boundaries',()=>{
 const dst=Date.parse('2026-10-25T00:30:00Z'); // Europe daylight-saving switch
 const r=previewTrialWindow({...paid,paidAtMs:dst},dst+TRIAL_PREVIEW_DURATION_MS);
 assert.equal(r.status,'EXPIRED_WINDOW');
 assert.equal(r.expiresAtMs,Date.parse('2026-10-28T00:30:00Z'));
});
test('browser return, unverified/unfinished payment, recurring mode and mismatched currency all blocked',()=>{
 for(const change of [{verifiedWebhook:false},{paymentStatus:'unpaid'},{checkoutMode:'subscription'},{amountCents:100},{currency:'eur'},{oneTime:false},{autoRenew:true}])
  assert.equal(previewTrialWindow({...paid,...change},base).status,'BLOCKED');
 assert.equal(previewTrialWindow({...paid,paidAtMs:base+1000},base).reason,'PURCHASE_TIME_IN_FUTURE');
 assert.equal(previewTrialWindow(paid,Number.NaN).reason,'INVALID_SERVER_CLOCK');
});
test('revocations, chargebacks and any refund immediately stop trial access',()=>{
 assert.equal(previewTrialWindow({...paid,revoked:true},base+1000).reason,'TRIAL_REVOKED');
 assert.equal(previewTrialWindow({...paid,refundedCents:1},base+1000).reason,'PAYMENT_REFUNDED');
 assert.equal(previewTrialWindow({...paid,refundedCents:99},base+1000).reason,'PAYMENT_REFUNDED');
 assert.equal(previewTrialWindow({...paid,refundedCents:100},base+1000).reason,'INVALID_REFUND');
});
test('repeated Stripe webhook matching saved purchase is ignored without issuing second grant',()=>{
 assert.equal(previewWebhookReplay(paid,null).status,'NOT_SEEN_IN_SNAPSHOT');
 let same={sessionId:paid.sessionId,paymentIntent:paid.paymentIntent,userId:paid.userId,amountCents:paid.amountCents,currency:paid.currency};
 const replay=previewWebhookReplay(paid,same);
 assert.equal(replay.status,'REPLAY_IGNORED');
 assert.equal(replay.accessGranted,false);
 assert.equal(replay.launchApproved,false);
});
test('conflicting replayed Stripe events never rewrite owner, payment or amount',()=>{
 let same={sessionId:paid.sessionId,paymentIntent:paid.paymentIntent,userId:paid.userId,amountCents:paid.amountCents,currency:paid.currency};
 for(const change of [{userId:'other'},{paymentIntent:'pi_mismatch'},{sessionId:'cs_mismatch'}])
  assert.equal(previewWebhookReplay({...paid,...change},same).reason,'PURCHASE_IDENTITY_CONFLICT');
 assert.equal(previewWebhookReplay({...paid,amountCents:1},same).reason,'PURCHASE_AMOUNT_CONFLICT');
 assert.equal(previewWebhookReplay({...paid,currency:'eur'},same).reason,'PURCHASE_AMOUNT_CONFLICT');
});
