// Optional BASE #16 AI grants for *existing* paid Tool subscriptions.
// This is not the existing Tool allowance: every AI credit count is explicitly
// approved in env, disabled by default, and recorded once per signed paid invoice.
const PLANS=['basic','pro','business'];
const PRICE_KEYS={basic:'STRIPE_PRICE_BASIC',pro:'STRIPE_PRICE_PRO',business:'STRIPE_PRICE_BUSINESS'};
const validCredits=n=>Number.isSafeInteger(n)&&n>0&&n<=10_000_000;

export function subscriptionCreditConfig(env={}){
 if(env.AI_SUBSCRIPTION_CREDITS_ENABLED!=='true')return {enabled:false,entries:[]};
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
const stripeId=(value,prefix)=>typeof value==='string'&&
  new RegExp('^'+prefix+'[A-Za-z0-9]+$').test(value)&&value.length<=175;
const subscriptionId=invoice=>{
 const value=invoice?.subscription??invoice?.parent?.subscription_details?.subscription;
 return typeof value==='string'?value:value?.id;
};

export async function grantPaidSubscriptionInvoice({event,env={},pool,wallet}){
 if(event?.type!=='invoice.paid')return false;
 const config=subscriptionCreditConfig(env);
 if(!config.enabled)return false;
 const invoice=event.data?.object;
 const lines=invoice?.lines?.data;
 if(!Array.isArray(lines))return false; // not a verified subscription-line invoice
 const matching=lines.filter(line=>config.entries.some(e=>e.priceId===line?.price?.id));
 if(!matching.length)return false; // legacy Stripe invoice outside AI grant rollout
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
    !stripeId(invoice.customer,'cus_'))
  throw Error('AI_SUBSCRIPTION_INVOICE_INVALID');
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
 // grantOnce already uses a transactional (user_id,kind) uniqueness gate and
 // repays debt before issuing available balance. One kind per *paid invoice*.
 await wallet.grantOnce({userId:rows[0].id,kind:'subscription:'+invoice.id,credits:grant.credits});
 return true; // caller must ALSO process the existing legacy invoice.paid event
}
