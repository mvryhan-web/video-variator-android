// Verify Stripe's settled charge and calculate a conservative, tax-excluded
// net receipt in micro-units. Read-only Stripe GETs only; no money movement.
const MINOR_TO_MICROS=10_000; // AI credit packs are restricted to EUR/USD (2-decimal currencies).
const safeAmount=n=>Number.isSafeInteger(n)&&n>=0&&n<=100_000_000;
const isId=(v,prefix)=>typeof v==='string'&&new RegExp('^'+prefix+'[A-Za-z0-9]+$').test(v);

export function stripeTaxAmountMinor(value){
 if(!safeAmount(value))throw Error('AI_SETTLEMENT_TAX_UNVERIFIED');
 return value;
}

function checkoutTax(session){
 const details=session?.total_details;
 if(!details||!safeAmount(details.amount_tax)||!safeAmount(details.amount_discount)||
    !safeAmount(details.amount_shipping)||details.amount_discount!==0||details.amount_shipping!==0)
  throw Error('AI_SETTLEMENT_TAX_UNVERIFIED');
 if(session.amount_total!==session.amount_subtotal+details.amount_tax)
  throw Error('AI_SETTLEMENT_TOTAL_MISMATCH');
 return details.amount_tax;
}

function invoiceTax(invoice){
 // Stripe exposes invoice taxes as total_taxes in the current API and
 // total_tax_amounts in older API versions. An explicit empty list proves 0.
 const lists=[invoice?.total_taxes,invoice?.total_tax_amounts].filter(Array.isArray);
 if(!lists.length)throw Error('AI_SETTLEMENT_TAX_UNVERIFIED');
 const sums=lists.map(rows=>rows.reduce((sum,row)=>{
  const amount=row?.amount;
  if(!safeAmount(amount)||sum+amount>100_000_000)throw Error('AI_SETTLEMENT_TAX_UNVERIFIED');
  return sum+amount;
 },0));
 if(new Set(sums).size!==1)throw Error('AI_SETTLEMENT_TAX_CONFLICT');
 return sums[0];
}

export function stripeCheckoutTaxAmount(session){return checkoutTax(session);}
export function stripeInvoiceTaxAmount(invoice){return invoiceTax(invoice);}

export function verifyStripeNetRevenue({paymentIntent,expectedAmount,expectedCurrency,taxAmount,expectedLivemode}={}){
 if(!paymentIntent||!isId(paymentIntent.id,'pi_')||paymentIntent.status!=='succeeded'||paymentIntent.livemode!==!!expectedLivemode||
    !safeAmount(expectedAmount)||expectedAmount<1||paymentIntent.amount_received!==expectedAmount||
    paymentIntent.currency!==expectedCurrency||!['eur','usd'].includes(expectedCurrency))
  throw Error('AI_SETTLEMENT_PAYMENT_UNVERIFIED');
 const charge=paymentIntent.latest_charge;
 if(!charge||typeof charge!=='object'||!isId(charge.id,'ch_')||charge.paid!==true||charge.captured!==true||
    (typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id)!==paymentIntent.id||
    charge.livemode!==!!expectedLivemode||charge.currency!==expectedCurrency||charge.amount_captured!==expectedAmount)
  throw Error('AI_SETTLEMENT_CHARGE_UNVERIFIED');
 // A delayed paid event must not attest original proceeds after Stripe has
 // already reversed/disputed the Charge. Require explicit zero-reversal facts;
 // missing fields are not evidence that the payment remains eligible.
 if(charge.disputed!==false||charge.refunded!==false||charge.amount_refunded!==0)
  throw Error('AI_SETTLEMENT_CHARGE_REVERSED_OR_UNVERIFIED');
 const transaction=charge.balance_transaction;
 if(!transaction||typeof transaction!=='object'||!isId(transaction.id,'txn_')||
    transaction.source!==charge.id||transaction.type!=='charge'||transaction.currency!==expectedCurrency||
    transaction.amount!==expectedAmount||!safeAmount(transaction.fee)||transaction.fee>expectedAmount||
    transaction.net!==expectedAmount-transaction.fee)
  throw Error('AI_SETTLEMENT_BALANCE_TRANSACTION_UNVERIFIED');
 const tax=stripeTaxAmountMinor(taxAmount);
 const netMinor=transaction.net-tax;
 if(netMinor<=0)throw Error('AI_SETTLEMENT_NET_REVENUE_INVALID');
 return Object.freeze({
  currency:expectedCurrency,
  processorFeeAmount:transaction.fee,
  taxAmount:tax,
  netRevenueMicros:netMinor*MINOR_TO_MICROS,
  stripeChargeId:charge.id,
  stripeBalanceTransactionId:transaction.id,
  livemode:!!expectedLivemode
 });
}

export async function retrieveStripeNetRevenue({stripe,paymentIntentId,expectedAmount,expectedCurrency,taxAmount,expectedLivemode}={}){
 if(!stripe?.paymentIntents?.retrieve||!isId(paymentIntentId,'pi_'))throw Error('AI_SETTLEMENT_STRIPE_UNAVAILABLE');
 const paymentIntent=await stripe.paymentIntents.retrieve(paymentIntentId,{expand:['latest_charge.balance_transaction']});
 if(paymentIntent?.id!==paymentIntentId)throw Error('AI_SETTLEMENT_PAYMENT_UNVERIFIED');
 let charge=paymentIntent?.latest_charge;
 if(typeof charge==='string'){
  if(!stripe?.charges?.retrieve)throw Error('AI_SETTLEMENT_STRIPE_UNAVAILABLE');
  const expectedChargeId=charge;
  charge=await stripe.charges.retrieve(expectedChargeId,{expand:['balance_transaction']});
  if(charge?.id!==expectedChargeId)throw Error('AI_SETTLEMENT_CHARGE_UNVERIFIED');
 }
 if(charge&&typeof charge.balance_transaction==='string'){
  if(!stripe?.balanceTransactions?.retrieve)throw Error('AI_SETTLEMENT_STRIPE_UNAVAILABLE');
  const expectedTransactionId=charge.balance_transaction;
  const transaction=await stripe.balanceTransactions.retrieve(expectedTransactionId);
  if(transaction?.id!==expectedTransactionId)throw Error('AI_SETTLEMENT_BALANCE_TRANSACTION_UNVERIFIED');
  charge={...charge,balance_transaction:transaction};
 }
 const expanded={...paymentIntent,latest_charge:charge};
 return verifyStripeNetRevenue({paymentIntent:expanded,expectedAmount,expectedCurrency,taxAmount,expectedLivemode});
}
