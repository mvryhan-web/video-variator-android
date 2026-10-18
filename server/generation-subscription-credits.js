// Optional BASE #16 AI grants for *existing* paid Tool subscriptions.
// This is not the existing Tool allowance: every AI credit count is explicitly
// approved in env, disabled by default, and recorded once per signed paid invoice.
const PLANS=['basic','pro','business'];
const PRICE_KEYS={basic:'STRIPE_PRICE_BASIC',pro:'STRIPE_PRICE_PRO',business:'STRIPE_PRICE_BUSINESS'};
const validCredits=n=>Number.isSafeInteger(n)&&n>0&&n<=10_000_000;

export function subscriptionCreditConfig(env={}){
 if(env.AI_SUBSCRIPTION_CREDITS_ENABLED!=='true')return {enabled:false,entries:[]};
 // Never interpret unknown billing mode as Stripe test by accident. In a
 // production deployment, a test-only monthly grant cannot serve live buyers.
 if(!['test','live'].includes(env.AI_BILLING_MODE)||
    (env.NODE_ENV==='production'&&env.AI_BILLING_MODE!=='live'))
  throw Error('AI_SUBSCRIPTION_CONFIG_INVALID');
 let amounts;
 try{amounts=JSON.parse(env.AI_SUBSCRIPTION_CREDITS_JSON||'{}');}
 catch(_){throw Error('AI_SUBSCRIPTION_CONFIG_INVALID');}
 if(!amounts||Array.isArray(amounts)||typeof amounts!=='object'||
    !Object.keys(amounts).length||Object.keys(amounts).some(k=>!PLANS.includes(k)))
  throw Error('AI_SUBSCRIPTION_CONFIG_INVALID');
 const entries=Object.entries(amounts).map(([plan,credits])=>({
  plan,credits,priceId:env[PRICE_KEYS[plan]]
 }));
 if(entries.some(e=>!validCredits(e.credits)||typeof e.priceId!=='string'||
    !/^price_[A-Za-z0-9]+$/.test(e.priceId))||
    new Set(entries.map(e=>e.priceId)).size!==entries.length)
  throw Error('AI_SUBSCRIPTION_CONFIG_INVALID');
 return {enabled:true,entries};
}
// Public projection for Pricing contains no Stripe IDs, secrets or guessed
// plan amounts. It is null unless subscription AI credits really are approved.
export function publicSubscriptionCreditGrants(env={}){
 try{
  const config=subscriptionCreditConfig(env);
  if(!config.enabled||
     (env.AI_BILLING_MODE==='live'&&env.AI_LIVE_BILLING_APPROVED!=='true'))
   return null;
  return Object.fromEntries(config.entries.map(e=>[e.plan,e.credits]));
 }catch(_){return null;}
}

const stripeId=(value,prefix)=>typeof value==='string'&&
  new RegExp('^'+prefix+'[A-Za-z0-9]+$').test(value)&&value.length<=175;
const subscriptionId=invoice=>{
 const value=invoice?.subscription??invoice?.parent?.subscription_details?.subscription;
 return typeof value==='string'?value:value?.id;
};
// Stripe invoice objects have used both direct payment_intent and the newer
// invoice.payments list. Only one real, provable payment intent can be used
// for a given paid invoice; do not manufacture a Stripe reference.
export function invoicePaymentIntent(invoice){
 const direct=typeof invoice?.payment_intent==='string'
  ?invoice.payment_intent:invoice?.payment_intent?.id;
 const payments=invoice?.payments?.data;
 const fromPayments=Array.isArray(payments)
  ?payments.filter(p=>p?.payment?.type==='payment_intent')
    .map(p=>typeof p.payment.payment_intent==='string'
      ?p.payment.payment_intent:p.payment.payment_intent?.id)
    .filter(Boolean):[];
 const all=[direct,...fromPayments].filter(Boolean);
 if(!all.length||new Set(all).size!==1||!stripeId(all[0],'pi_'))
  throw Error('AI_SUBSCRIPTION_PAYMENT_INTENT_INVALID');
 return all[0];
}

export async function grantPaidSubscriptionInvoice({event,env={},pool,wallet}){
 if(event?.type!=='invoice.paid')return false;
 const config=subscriptionCreditConfig(env);
 if(!config.enabled)return false;
 const invoice=event.data?.object;
 const lines=invoice?.lines?.data;
 if(!Array.isArray(lines))return false; // not a verified subscription-line invoice
 const matching=lines.filter(line=>config.entries.some(e=>e.priceId===line?.price?.id));
 if(!matching.length)return false; // legacy Stripe invoice outside AI grant rollout
 // A fully discounted/free invoice is not a paid AI credit purchase.
 // Preserve legacy subscription-cycle webhook handling without a grant.
 if(invoice?.amount_paid===0)return false;
 if(!pool||!wallet)throw Error('AI_SUBSCRIPTION_WALLET_UNAVAILABLE');
 // A paid invoice with a configured AI-eligible price must be fully verified,
 // never recognized by customer metadata supplied from browser.
 const mode=env.AI_BILLING_MODE==='live';
 if(invoice?.status!=='paid'||invoice?.paid!==true||
    !['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||
    !Number.isSafeInteger(invoice.amount_paid)||invoice.amount_paid<=0||
    invoice.livemode!==mode||event.livemode!==mode||
    invoice.lines.has_more!==false||lines.length!==1||matching.length!==1||
    matching[0].quantity!==1)
  throw Error('AI_SUBSCRIPTION_INVOICE_INVALID');
 if(mode&&env.AI_LIVE_BILLING_APPROVED!=='true')
  throw Error('AI_SUBSCRIPTION_LIVE_NOT_APPROVED');
 const grant=config.entries.find(e=>e.priceId===matching[0].price.id);
 const id=subscriptionId(invoice);
 if(!stripeId(id,'sub_')||!stripeId(invoice.id,'in_')||
    !stripeId(invoice.customer,'cus_')||
    !/^[a-z]{3}$/.test(invoice.currency||''))
  throw Error('AI_SUBSCRIPTION_INVOICE_INVALID');
 const paymentIntent=invoicePaymentIntent(invoice);
 // Existing legacy subscription/account is the canonical owner. No lookup by
 // untrusted invoice metadata/email, and no synthetic user gets credit.
 const {rows}=await pool.query(
  'SELECT id,plan,stripe_customer_id,stripe_subscription_id,subscription_status FROM vv_users WHERE stripe_subscription_id=$1',
  [id]
 );
 if(rows.length!==1||rows[0].plan!==grant.plan||
    rows[0].stripe_customer_id!==invoice.customer||
    !['active','trialing'].includes(rows[0].subscription_status))
   throw Error('AI_SUBSCRIPTION_ACCOUNT_PENDING');
 // Reuse the SAME durable (invoice ID, payment intent) purchase ledger as
 // packs. The existing cumulative charge.refunded handler can now revoke
 // credits proportionally and apply debt instead of leaving refunded credits.
 await wallet.grant({userId:rows[0].id,sessionId:invoice.id,
  paymentIntent,credits:grant.credits,amount:invoice.amount_paid,currency:invoice.currency,
  allowHistoricalSubscriptionReplay:true});
 // A subscription has no Checkout session_id, so its purchased credit origin
 // needs a SECOND verified trail: only the live, signed invoice.paid path
 // that passed all price/customer/payment validation above may write this.
 // A missing/failed migration leaves its AI credits unusable for paid provider
 // dispatch, and webhook retries safely reconcile after migration is applied.
 if(mode&&env.AI_PURCHASED_ONLY_DISPATCH_ENABLED==='true'){
  await pool.query(`INSERT INTO vv_ai_verified_subscription_invoice
   (invoice_id,user_id,payment_intent,livemode)
   VALUES($1,$2,$3,true) ON CONFLICT (invoice_id) DO NOTHING`,
   [invoice.id,rows[0].id,paymentIntent]);
  const verified=await pool.query(`SELECT user_id,payment_intent,livemode
   FROM vv_ai_verified_subscription_invoice WHERE invoice_id=$1`,[invoice.id]);
  const match=verified.rows[0];
  if(verified.rows.length!==1||match.user_id!==rows[0].id||
     match.payment_intent!==paymentIntent||match.livemode!==true)
   throw Error('AI_SUBSCRIPTION_PURCHASE_PROVENANCE_CONFLICT');
 }
 return true; // caller must ALSO process the existing legacy invoice.paid event
}
