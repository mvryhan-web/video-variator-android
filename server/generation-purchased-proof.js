// Owner P0 #182. Server-only database-backed proof; NEVER grants credits or calls a provider.
// Caller must hold the matching vv_ai_wallet user row FOR UPDATE throughout this function.
const textId=(v,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max&&/^[A-Za-z0-9._:@-]+$/.test(v);
const safeCount=v=>{if((typeof v!=='number'&&typeof v!=='string')||(typeof v==='string'&&!/^\d+$/.test(v)))throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');return n;};
const deny=()=>{throw Error('AI_PURCHASED_DISPATCH_NOT_AUTHORIZED');};
export function purchasedFundingProof({paidCredits,otherSpentCredits,requiredCredits}={}){
 const paid=safeCount(paidCredits),used=safeCount(otherSpentCredits),required=safeCount(requiredCredits);
 if(required<1||required>10_000_000||paid<required||paid-used<required)return false;
 return true;
}
export async function claimPurchasedGeneration(c,{env={},userId,jobId,credits,fingerprint,modelId,provider,wallet}={}){
 if(env.AI_PURCHASED_ONLY_DISPATCH_ENABLED!=='true'||env.AI_BILLING_MODE!=='live'||
    env.AI_PUBLIC_GENERATION_ENABLED!=='true'||env.AI_STUDIO_WALLET_ENABLED!=='true')deny();
 if(!textId(userId)||!textId(jobId)||!textId(fingerprint)||!textId(modelId)||!textId(provider)||
    !Number.isSafeInteger(credits)||credits<1||credits>10_000_000||
    !wallet||!Number.isSafeInteger(wallet.reserved)||wallet.reserved<credits||wallet.debt!==0)deny();
 // A verified signed Stripe grant creates vv_ai_purchase. Credit packs
 // require original LIVE Checkout; subscriptions additionally require an
 // invoice provenance row written after fully validated, LIVE invoice.paid.
 const order=await c.query(`SELECT
  COALESCE(SUM(credits),0)::bigint AS paid_credits,MIN(session_id) AS source_id
  FROM (
    SELECT (p.credits-CEIL(p.credits::numeric*p.refunded_amount/p.amount))::bigint AS credits,p.session_id FROM vv_ai_purchase p
    JOIN vv_ai_order o ON o.session_id=p.session_id
    WHERE p.user_id=$1 AND o.user_id=$1 AND o.snapshot->>'billingMode'='live'
      AND p.session_id LIKE 'cs_live_%' AND p.payment_intent LIKE 'pi_%'
      AND p.refunded_amount>=0 AND p.refunded_amount<p.amount AND p.amount>0 AND p.credits>0
    UNION ALL
    SELECT (p.credits-CEIL(p.credits::numeric*p.refunded_amount/p.amount))::bigint AS credits,p.session_id FROM vv_ai_purchase p
    JOIN vv_ai_verified_subscription_invoice v ON v.invoice_id=p.session_id
      AND v.user_id=p.user_id AND v.payment_intent=p.payment_intent
    WHERE p.user_id=$1 AND v.livemode=true
      AND p.session_id LIKE 'in_%' AND p.payment_intent LIKE 'pi_%'
      AND p.refunded_amount>=0 AND p.refunded_amount<p.amount AND p.amount>0 AND p.credits>0
  ) eligible_paid_purchases`,[userId]);
 const paidCredits=safeCount(order.rows[0]?.paid_credits),purchaseId=order.rows[0]?.source_id;
 if(!textId(purchaseId))deny();
 // Each paid source is reduced by CEIL(refund_ratio * original_credits),
 // exactly matching wallet.refund's cumulative revocation math. Zero paid
 // remainder contributes zero; bonus/admin credits never increase paid funding.
 // Count EVERY other held/captured reservation against purchases, including
 // historical, promotional, admin and subscription jobs. This deliberately
 // undercounts spendable purchased credits rather than subsidizing a provider.
 const other=await c.query(`SELECT COALESCE(SUM(credits),0)::bigint AS used
  FROM vv_ai_reservation WHERE user_id=$1 AND job_id<>$2
  AND status IN ('held','captured')`,[userId,jobId]);
 const otherSpent=safeCount(other.rows[0]?.used);
 if(!purchasedFundingProof({paidCredits,otherSpentCredits:otherSpent,requiredCredits:credits}))deny();
 const reserve=await c.query(`SELECT user_id,credits,fingerprint,status FROM vv_ai_reservation
  WHERE job_id=$1 AND user_id=$2 FOR UPDATE`,[jobId,userId]);
 const held=reserve.rows[0];
 if(!held||held.status!=='held'||Number(held.credits)!==credits||held.fingerprint!==fingerprint)deny();
 const job=await c.query(`SELECT user_id,model,provider,status,operation,deleted,request_fingerprint,credits_reserved
  FROM vv_generation_jobs WHERE id=$1 AND user_id=$2 FOR UPDATE`,[jobId,userId]);
 const j=job.rows[0];
 if(!j||j.status!=='processing'||j.deleted!==false||j.operation!=null||
    j.model!==modelId||j.provider!==provider||
    j.request_fingerprint!==fingerprint||Number(j.credits_reserved)!==credits)deny();
 const claim=await c.query(`INSERT INTO vv_ai_purchased_dispatch_claim
  (job_id,user_id,purchase_reference,credits,fingerprint,provider,model)
  VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (job_id) DO NOTHING RETURNING job_id`,
  [jobId,userId,purchaseId,credits,fingerprint,provider,modelId]);
 if(claim.rows.length!==1)deny();
 return Object.freeze({source:'settled_stripe_purchase',purchaseConfirmed:true,refunded:false,
  dispatchClaimedExactlyOnce:true,purchaseId,reservationId:jobId,userId,jobId,
  modelId,provider,requestFingerprint:fingerprint,creditsReserved:credits,
  purchasedCreditsAvailableBeforeReserve:paidCredits-otherSpent});
}
