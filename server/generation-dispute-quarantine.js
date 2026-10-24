// Called only after server.js verifies the Stripe webhook signature.
// Monotonic quarantine, NOT a refund, debit, or assertion of final dispute fees.
const id=(value,prefix)=>typeof value==='string'&&new RegExp('^'+prefix+'[A-Za-z0-9]+$').test(value);
const objectId=value=>typeof value==='string'?value:value?.id;
export function stripeDisputeData(event){
 if(!['charge.dispute.created','charge.dispute.updated','charge.dispute.closed',
      'charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'].includes(event?.type))return null;
 const d=event.data?.object;
 const chargeId=objectId(d?.charge),paymentIntent=objectId(d?.payment_intent);
 if(!id(event.id,'evt_')||!id(d?.id,'du_')||!id(chargeId,'ch_')||(paymentIntent!=null&&!id(paymentIntent,'pi_'))||
    typeof event.livemode!=='boolean'||d.livemode!==event.livemode||
    !Number.isSafeInteger(d.amount)||d.amount<=0||d.amount>100_000_000||
    typeof d.currency!=='string'||!/^[a-z]{3}$/.test(d.currency))throw Error('AI_DISPUTE_EVIDENCE_INVALID');
 return {eventId:event.id,disputeId:d.id,paymentIntent:paymentIntent??null,chargeId,livemode:d.livemode,
  currency:d.currency,amount:d.amount};
}
export const disputeQuarantineSchema=`CREATE TABLE IF NOT EXISTS vv_ai_dispute_quarantine (
 payment_intent TEXT, stripe_charge_id TEXT PRIMARY KEY, stripe_dispute_id TEXT NOT NULL,
 first_event_id TEXT NOT NULL, livemode BOOLEAN NOT NULL, currency TEXT NOT NULL,
 disputed_amount BIGINT NOT NULL CHECK(disputed_amount>0), received_at TIMESTAMPTZ NOT NULL DEFAULT now());`;
export async function quarantineSignedDispute({event,pool,wallet}={}){
 const d=stripeDisputeData(event);if(!d)return false;
 if(!pool)throw Error('AI_DISPUTE_DATABASE_UNAVAILABLE');
 await wallet.init();
 // Persist BEFORE the paid grant if events arrive out of order. The eligibility
 // query links this durable evidence by payment_intent once a purchase exists.
 // No terminal event may delete the quarantine or reinstate customer credit.
 const result=await pool.query(`INSERT INTO vv_ai_dispute_quarantine
  (payment_intent,stripe_charge_id,stripe_dispute_id,first_event_id,livemode,currency,disputed_amount)
  VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(stripe_charge_id) DO UPDATE
  SET payment_intent=COALESCE(vv_ai_dispute_quarantine.payment_intent,EXCLUDED.payment_intent),
  disputed_amount=GREATEST(vv_ai_dispute_quarantine.disputed_amount,EXCLUDED.disputed_amount)
  WHERE vv_ai_dispute_quarantine.stripe_charge_id=EXCLUDED.stripe_charge_id
   AND vv_ai_dispute_quarantine.livemode=EXCLUDED.livemode
   AND vv_ai_dispute_quarantine.currency=EXCLUDED.currency
   AND (vv_ai_dispute_quarantine.payment_intent IS NULL OR EXCLUDED.payment_intent IS NULL
        OR vv_ai_dispute_quarantine.payment_intent=EXCLUDED.payment_intent) RETURNING stripe_charge_id`,
 [d.paymentIntent,d.chargeId,d.disputeId,d.eventId,d.livemode,d.currency,d.amount]);
 if(result.rows.length!==1)throw Error('AI_DISPUTE_EVIDENCE_CONFLICT');
 return true;
}
