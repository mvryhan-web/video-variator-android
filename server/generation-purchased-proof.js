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
export function purchasedMarginProof({paidCredits,otherSpentCredits,requiredCredits,
 worstNetRevenueMicros,worstRemainingCredits,providerCostMicros}={}){
 if(!purchasedFundingProof({paidCredits,otherSpentCredits,requiredCredits}))return false;
 const net=safeCount(worstNetRevenueMicros),remaining=safeCount(worstRemainingCredits),cost=safeCount(providerCostMicros);
 if(remaining<1||cost<1)return false;
 // Compare rationals with BigInt, avoiding a rounded per-credit margin.
 return BigInt(net)*BigInt(requiredCredits)>=2n*BigInt(cost)*BigInt(remaining);
}
async function purchasedEconomics(c,{userId,jobId=null,currency}={}){
 const order=await c.query(`WITH sources AS (
  SELECT p.session_id,
   (p.credits-CEIL(p.credits::numeric*p.refunded_amount/p.amount))::bigint AS remaining_credits,
   GREATEST(p.net_revenue_micros::numeric-p.refunded_amount::numeric*10000,0)::numeric AS remaining_net_revenue_micros
  FROM vv_ai_purchase p
  LEFT JOIN vv_ai_order o ON o.session_id=p.session_id
  WHERE p.user_id=$1 AND p.currency=$2
    -- Freeze the whole account's paid dispatch, including other packs, while
    -- ANY receipt has dispute exposure/fees not independently reconciled.
    AND NOT EXISTS (SELECT 1 FROM vv_ai_dispute_quarantine d
      JOIN vv_ai_purchase disputed ON disputed.payment_intent=d.payment_intent
      WHERE disputed.user_id=$1)
    AND p.net_revenue_micros IS NOT NULL AND p.settlement_verified_at IS NOT NULL
    AND p.processor_fee_amount IS NOT NULL AND p.tax_amount IS NOT NULL
    AND p.settlement_livemode=true
    AND p.refunded_amount>=0 AND p.refunded_amount<p.amount AND p.amount>0 AND p.credits>0
    AND ((p.session_id ~ '^cs_live_[A-Za-z0-9]+$' AND p.payment_intent ~ '^pi_[A-Za-z0-9]+$' AND o.user_id=$1
          AND o.snapshot->>'billingMode'='live' AND o.snapshot->>'currency'=p.currency
          AND o.snapshot->>'credits'=p.credits::text
          AND o.snapshot->>'priceId' ~ '^price_[A-Za-z0-9]+$'
          AND CASE WHEN o.snapshot->>'amount' ~ '^[0-9]+$'
                   THEN p.amount=(o.snapshot->>'amount')::bigint+p.tax_amount ELSE FALSE END))
 ), live_sources AS (
  SELECT * FROM sources WHERE remaining_credits>0 AND remaining_net_revenue_micros>0
 ), worst AS (
  SELECT session_id,remaining_credits,remaining_net_revenue_micros
  FROM live_sources
  ORDER BY remaining_net_revenue_micros/remaining_credits ASC,session_id ASC LIMIT 1
 )
 SELECT COALESCE((SELECT SUM(remaining_credits) FROM live_sources),0)::bigint AS paid_credits,
  (SELECT session_id FROM worst) AS source_id,
  (SELECT remaining_net_revenue_micros::text FROM worst) AS worst_net_revenue_micros,
  (SELECT remaining_credits FROM worst) AS worst_remaining_credits`,[userId,currency]);
 const other=await c.query(`SELECT COALESCE(SUM(
  CASE WHEN res.status='captured' AND audit.entries=1
      AND audit.returned>=0 AND audit.returned<=res.credits
    THEN res.credits-audit.returned
    ELSE res.credits END),0)::bigint AS used
  FROM vv_ai_reservation res
  LEFT JOIN (
    SELECT reference,COUNT(*)::int AS entries,
     MAX(available_delta-debt_delta)::bigint AS returned
    FROM vv_ai_ledger WHERE user_id=$1 AND kind='captured'
    GROUP BY reference
  ) audit ON audit.reference=res.job_id
  WHERE res.user_id=$1 AND ($2::text IS NULL OR res.job_id<>$2)
    AND res.status IN ('held','captured')`,[userId,jobId]);
 return {paidCredits:safeCount(order.rows[0]?.paid_credits),sourceId:order.rows[0]?.source_id||null,
  worstNetRevenueMicros:order.rows[0]?.worst_net_revenue_micros||null,
  worstRemainingCredits:order.rows[0]?.worst_remaining_credits??null,
  otherSpentCredits:safeCount(other.rows[0]?.used)};
}
export async function checkPurchasedGenerationMargin(c,{userId,jobId=null,kind,credits,fingerprint,modelId,provider,
 providerCostMicros,currency,wallet}={}){
 if(!textId(userId)||!Number.isSafeInteger(credits)||credits<1||
    !Number.isSafeInteger(providerCostMicros)||providerCostMicros<1||!['eur','usd'].includes(currency))return false;
 const economics=await purchasedEconomics(c,{userId,jobId,currency});
 const allowed=purchasedMarginProof({...economics,requiredCredits:credits,providerCostMicros});
 return allowed?{...economics,allowed:true}:false;
}
export async function claimPurchasedGeneration(c,{env={},userId,jobId,kind,credits,fingerprint,modelId,provider,
 providerCostMicros,currency,wallet}={}){
 if(env.AI_PURCHASED_ONLY_DISPATCH_ENABLED!=='true'||env.AI_BILLING_MODE!=='live'||
    env.AI_LIVE_BILLING_APPROVED!=='true'||env.AI_PUBLIC_GENERATION_ENABLED!=='true'||
    env.AI_STUDIO_WALLET_ENABLED!=='true')deny();
 if(!textId(userId)||!textId(jobId)||!['image','video','music','voice'].includes(kind)||
    !textId(fingerprint)||!textId(modelId)||!textId(provider)||
   !Number.isSafeInteger(credits)||credits<1||credits>10_000_000||
   !Number.isSafeInteger(providerCostMicros)||providerCostMicros<1||!['eur','usd'].includes(currency)||
    !wallet||!Number.isSafeInteger(wallet.reserved)||wallet.reserved<credits||wallet.debt!==0)deny();
 // Only verified Stripe settlement rows in the provider-cost currency count.
 // Refunded gross is subtracted from revenue without assuming tax was returned;
 // this intentionally underestimates margin and fails closed.
 const economics=await purchasedEconomics(c,{userId,jobId,currency});
 const paidCredits=economics.paidCredits,purchaseId=economics.sourceId;
 if(!textId(purchaseId)||!purchasedMarginProof({...economics,requiredCredits:credits,providerCostMicros}))deny();
 // Each paid source is reduced by CEIL(refund_ratio * original_credits),
 // exactly matching wallet.refund's cumulative revocation math. Zero paid
 // remainder contributes zero; bonus/admin credits never increase paid funding.
 // Account for actual trusted captured usage, not merely the original
 // reservation. Settle returns surplus via (available_delta - debt_delta);
 // exactly ONE matching captured ledger entry is required to trust a return.
 // If audit is missing, duplicated or malformed count the FULL reserved sum.
 // Count held/captured historical, promotional, admin and subscription jobs
 // against paid funds so bonuses never subsidize provider requests.
 const otherSpent=economics.otherSpentCredits;
 const reserve=await c.query(`SELECT user_id,credits,fingerprint,status FROM vv_ai_reservation
  WHERE job_id=$1 AND user_id=$2 FOR UPDATE`,[jobId,userId]);
 const held=reserve.rows[0];
 if(!held||held.status!=='held'||Number(held.credits)!==credits||held.fingerprint!==fingerprint)deny();
 const job=await c.query(`SELECT user_id,kind,model,provider,status,operation,deleted,request_fingerprint,credits_reserved
  FROM vv_generation_jobs WHERE id=$1 AND user_id=$2 FOR UPDATE`,[jobId,userId]);
 const j=job.rows[0];
 if(!j||j.kind!==kind||j.status!=='processing'||j.deleted!==false||j.operation!=null||
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
