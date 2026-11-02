// Owner P0 #182 — server-only authorization contract, intentionally UNWIRED.
// A boolean from client JSON, a promotional balance or an owner pilot is NEVER
// an authorization to send a paid request to a provider.
//
// Integration requirement: verifyPurchasedReservation MUST be a privileged
// D-owned atomic DB ledger claim, not an ordinary balance lookup or client input.
// The gate intentionally defaults to deny until D's verified proof is wired.
const denied=()=>{throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');};
const textId=(v,max=256)=>typeof v==='string'&&v.length>0&&v.length<=max&&/^[A-Za-z0-9._:@-]+$/.test(v);

export async function requirePurchasedDispatchAuthorization({
 env={},user=null,job=null,request=null,model=null,quote=null,
 verifyPurchasedReservation=null
}={}){
 if(env.AI_PURCHASED_ONLY_DISPATCH_ENABLED!=='true')denied();
 if(typeof verifyPurchasedReservation!=='function')denied();
 if(!user||!textId(user.id)||user.isOwner===true||user.isAdmin===true||
   user.scope==='owner'||user.scope==='admin')denied();
 const email=String(user.email||'').trim().toLowerCase();
 if(env.ADMIN_EMAIL&&email===String(env.ADMIN_EMAIL).trim().toLowerCase())denied();
 if(!job||!textId(job.id)||job.userId!==user.id||job.status!=='processing'||
   job.operation!=null||job.providerStarted===true||job.deleted===true)denied();
 if(!request||request.consent!==true||!textId(request.model,120)||
   !['image','video','music','voice'].includes(request.kind)||!textId(request.fingerprint,128))denied();
 if(!model||model.adapter!==true||!textId(model.id,120)||!textId(model.provider,120)||
   model.id!==request.model||model.kind!==request.kind)denied();
 if(!quote||quote.model!==model.id||quote.provider!==model.provider||
   quote.kind!==request.kind||!Number.isSafeInteger(quote.credits)||quote.credits<1||
   !Number.isSafeInteger(quote.providerCostMicros)||quote.providerCostMicros<1||
   !/^[a-z]{3}$/.test(quote.currency||''))denied();
 // All fields above are server-derived. Never accept the proof from request
 // JSON or from an unsigned, mixed available-credit wallet balance.
 let receipt;
 try{receipt=await verifyPurchasedReservation(Object.freeze({
  userId:user.id,jobId:job.id,kind:model.kind,modelId:model.id,
  provider:model.provider,requestFingerprint:request.fingerprint,credits:quote.credits
 }));}catch{denied();}
 if(!receipt||receipt.source!=='settled_stripe_purchase'||receipt.purchaseConfirmed!==true||
    receipt.refunded!==false||receipt.dispatchClaimedExactlyOnce!==true||
    !textId(receipt.purchaseId)||!textId(receipt.reservationId)||receipt.userId!==user.id||
    receipt.jobId!==job.id||receipt.modelId!==model.id||
    receipt.requestFingerprint!==request.fingerprint||
    receipt.provider!==model.provider||receipt.creditsReserved!==quote.credits||
    !Number.isSafeInteger(receipt.purchasedCreditsAvailableBeforeReserve)||
    receipt.purchasedCreditsAvailableBeforeReserve<quote.credits)denied();
 return Object.freeze({
  authorized:true,scope:'purchased_customer_only',userId:user.id,
  jobId:job.id,modelId:model.id,provider:model.provider,
  reservedCredits:quote.credits,reservationId:receipt.reservationId
 });
}
