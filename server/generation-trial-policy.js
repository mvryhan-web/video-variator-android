// Future paid $0.99 Trial: pure fail-closed POLICY PREVIEW, not a live entitlement.
// Does NOT call Stripe, touch the AI wallet, grant credits or authorize provider jobs.
// Do not wire this result to a request handler without real DB+verified Stripe webhook gates.
const DURATION_MS=72*60*60*1000;
const MAX_SAFE_TIME=8640000000000000;
const expected=(s,prefix)=>typeof s==='string'&&s.startsWith(prefix)&&s.length>prefix.length+2&&s.length<=200;
const fail=reason=>({status:'BLOCKED',reason,launchApproved:false,accessGranted:false});
const validTime=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_SAFE_TIME;
const validUser=s=>typeof s==='string'&&s.length>0&&s.length<=200;

// First-time eligibility is an account AND payment-identity policy, NOT the account-creation date.
// Database lookups must be authoritative, transactionally serialized, and anti-abuse verified.
export function previewTrialEligibility(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))return fail('INVALID_INPUT');
 if(!validUser(input.userId))return fail('NO_AUTHENTICATED_USER');
 if(input.accountVerified!==true||input.paymentIdentityVerified!==true||input.historyQueryComplete!==true)return fail('IDENTITY_OR_HISTORY_NOT_VERIFIED');
 if(!Number.isSafeInteger(input.priorAccountTrialPurchases)||input.priorAccountTrialPurchases<0||
    !Number.isSafeInteger(input.priorPaymentIdentityTrialPurchases)||input.priorPaymentIdentityTrialPurchases<0)return fail('INVALID_TRIAL_HISTORY');
 if(input.priorAccountTrialPurchases>0||input.priorPaymentIdentityTrialPurchases>0)return fail('ALREADY_USED_TRIAL');
 return {status:'ELIGIBLE_FOR_REVIEW',launchApproved:false,accessGranted:false,reason:'STAGING_ONLY_FIRST_PURCHASE_CHECK'};
}

// A 3-day pass is a FIXED 72-hour period measured from the verified paid webhook timestamp.
// Never use checkout-button clicks, client-supplied clocks, trial renewal or login visits as start.
export function previewTrialWindow(record,now){
 if(!record||typeof record!=='object'||Array.isArray(record))return fail('MISSING_VERIFIED_PURCHASE');
 if(!validTime(now))return fail('INVALID_SERVER_CLOCK');
 if(!validUser(record.userId)||!expected(record.sessionId,'cs_')||!expected(record.paymentIntent,'pi_'))return fail('INVALID_PURCHASE_ID');
 if(record.verifiedWebhook!==true||record.paymentStatus!=='paid')return fail('PAYMENT_NOT_VERIFIED');
 if(record.checkoutMode!=='payment'||record.amountCents!==99||record.currency!=='usd'||record.oneTime!==true||record.autoRenew!==false)return fail('TRIAL_PRICE_OR_MODE_MISMATCH');
 if(!validTime(record.paidAtMs))return fail('INVALID_PURCHASE_TIME');
 if(record.paidAtMs>now)return fail('PURCHASE_TIME_IN_FUTURE');
 if(record.revoked===true)return fail('TRIAL_REVOKED');
 if(!Number.isSafeInteger(record.refundedCents)||record.refundedCents<0||record.refundedCents>99)return fail('INVALID_REFUND');
 if(record.refundedCents>0)return fail('PAYMENT_REFUNDED');
 const until=record.paidAtMs+DURATION_MS;
 if(!validTime(until))return fail('TRIAL_EXPIRY_OUT_OF_RANGE');
 if(now>=until)return {status:'EXPIRED_WINDOW',reason:'THREE_DAY_WINDOW_ENDED',launchApproved:false,accessGranted:false,expiresAtMs:until};
 return {status:'ACTIVE_WINDOW_PREVIEW',reason:'PAID_WINDOW_WITHIN_72_HOURS',launchApproved:false,accessGranted:false,expiresAtMs:until,remainingMs:until-now};
}

// Webhook replay checks must bind BOTH Stripe identifiers and receipt data to the saved order.
// This does NOT replace DB unique constraints, verified signature checks or atomic credit grants.
export function previewWebhookReplay(purchase,previous){
 if(!purchase||typeof purchase!=='object'||Array.isArray(purchase))return fail('MISSING_PURCHASE');
 if(!expected(purchase.sessionId,'cs_')||!expected(purchase.paymentIntent,'pi_')||!validUser(purchase.userId))return fail('INVALID_PURCHASE_ID');
 if(previous==null)return {status:'NOT_SEEN_IN_SNAPSHOT',launchApproved:false,accessGranted:false,reason:'DB_ATOMICITY_STILL_REQUIRED'};
 if(typeof previous!=='object'||Array.isArray(previous))return fail('INVALID_STORED_PURCHASE');
 if(previous.sessionId!==purchase.sessionId||previous.paymentIntent!==purchase.paymentIntent||previous.userId!==purchase.userId)return fail('PURCHASE_IDENTITY_CONFLICT');
 if(previous.amountCents!==purchase.amountCents||previous.currency!==purchase.currency)return fail('PURCHASE_AMOUNT_CONFLICT');
 return {status:'REPLAY_IGNORED',launchApproved:false,accessGranted:false,reason:'NO_SECOND_GRANT'};
}

export const TRIAL_PREVIEW_DURATION_MS=DURATION_MS;
