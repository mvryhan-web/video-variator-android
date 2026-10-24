// Owner P0 #182 — single Studio provider-call boundary. No paid API request
// before D's atomic Stripe-funded claim and B's consent/model/quote guard.
import {requirePurchasedDispatchAuthorization} from './generation-paid-dispatch-authorization.js';

// Distinct internal error class proves NO provider was invoked. Vendor errors,
 // even if they use the same message, must never trigger an unsafe refund.
export class PurchasedDispatchDenied extends Error {
 constructor(){super('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');}
}
const deny=()=>{throw new PurchasedDispatchDenied();};
const sameQuote=(a,b)=>!!a&&!!b&&['model','provider','kind','credits','providerCostMicros','currency'].every(k=>a[k]===b[k]);

export async function submitPurchasedProviderRequest({
 env={},wallet=null,user=null,job=null,request=null,model=null,quote=null,
 originalQuote=null,fingerprint=null,provider=null
}={}){
 if(typeof provider!=='function'||!wallet||
   typeof wallet.purchasedDispatchVerifier!=='function'||!job||!request||!model||!quote||
   !sameQuote(quote,originalQuote)||!sameQuote(quote,job.settings?.purchasedQuote)||
   job.user_id!==user?.id||job.kind!==request.kind||job.model!==model.id||
   job.provider!==model.provider||job.requestFingerprint!==fingerprint||
   !Number.isSafeInteger(job.creditsReserved)||job.creditsReserved!==quote.credits||
   job.settings?.dispatchConsent!==true||
   job.cost_currency!==quote.currency||
   !Number.isFinite(Number(job.estimated_cost))||
   Math.round(Number(job.estimated_cost)*1_000_000)!==quote.providerCostMicros)deny();
 let proof;
 try{ proof=await requirePurchasedDispatchAuthorization({
  env,user,
  job:{id:job.id,userId:job.userId,status:job.status,operation:job.operation,
       deleted:job.deleted,providerStarted:job.providerStarted===true},
  request:{kind:request.kind,model:request.model,consent:job.settings.dispatchConsent,fingerprint},
  model,quote,
  verifyPurchasedReservation:wallet.purchasedDispatchVerifier({env})
 }); }catch(_){ deny(); }
 if(proof.authorized!==true||proof.userId!==user.id||proof.jobId!==job.id||
    proof.modelId!==model.id||proof.provider!==model.provider)deny();
 // Do not auto-submit a second time when acceptance by a provider is unknown.
 // D's database claim is committed exactly once before this single call.
 return provider(request,{env,authorization:proof});
}
