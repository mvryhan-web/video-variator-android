import test from 'node:test';
import assert from 'node:assert/strict';
import {
  billingObserverEnabled,checkBillingReconciliation,summarizeBillingReconciliation
} from '../server/product-watcher/billing-signals.js';

const enabled={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_BILLING_SIGNALS_ENABLED:'true'};
const orders={
  recent_orders_24h:12,
  recent_checkout_sessions_24h:10,
  unmatched_old_sessions_7d:0
};
const purchases={orphan_credit_purchases:0,over_refunded_purchases:0,invalid_credit_purchases:0};
function fake({schema='both',rows=orders,purchaseRows=purchases,throwSecret=false}={}) {
  const seen=[];
  const client={async query(sql){
    seen.push(sql);
    if(throwSecret)throw Error('SECRET: postgres://account:password@private');
    if(sql.includes("to_regclass('public.vv_ai_order')"))
      return{rows:[{
        orders:schema==='both'||schema==='orders'?'vv_ai_order':null,
        purchases:schema==='both'||schema==='purchases'?'vv_ai_purchase':null
      }]};
    if(sql.includes('FROM vv_ai_order o LEFT JOIN vv_ai_purchase p'))return{rows:[rows]};
    if(sql.includes('FROM vv_ai_purchase p LEFT JOIN vv_ai_order o'))return{rows:[purchaseRows]};
    throw Error('UNKNOWN_SQL');
  }};
  return{client,seen};
}

test('disabled by default without touching database',async()=>{
 const f=fake();const r=await checkBillingReconciliation(f.client,{enabled:billingObserverEnabled({})});
 assert.equal(r.status,'healthy');
 assert.equal(r.coverage,'disabled');
 assert.equal(r.stripeWebhookVerified,false);
 assert.deepEqual(f.seen,[]);
 assert.equal(billingObserverEnabled({PRODUCT_WATCHER_ENABLED:'true'}),false);
 assert.equal(billingObserverEnabled(enabled),true);
});

test('missing ledgers are disclosed as coverage gaps and not payment failures',async()=>{
 for(const schema of ['none','orders','purchases']){
  const f=fake({schema});
  const r=await checkBillingReconciliation(f.client,{enabled:true});
  assert.equal(r.status,'warning');
  assert.equal(r.code,'AI_BILLING_LEDGER_NOT_READY');
  assert.equal(r.coverage,'incomplete');
  assert.equal(r.stripeWebhookVerified,false);
  assert.equal(f.seen.length,1);
 }
});

test('normal metadata never claims Stripe webhook delivery, payments or income',async()=>{
 const f=fake();const r=await checkBillingReconciliation(f.client,{enabled:true});
 assert.equal(r.status,'healthy');
 assert.equal(r.code,'BILLING_LEDGER_NO_SIGNAL');
 assert.equal(r.coverage,'internal_ledger_only');
 assert.equal(r.stripeWebhookVerified,false);
 assert.equal(r.stripeApiChecked,false);
 assert.equal(r.counters.recentCheckoutOrders24h,12);
 assert.equal(r.counters.recentOrdersWithCheckoutSession24h,10);
 assert.equal(JSON.stringify(r).includes('revenueVerified":true'),false);
 assert.ok(f.seen.every(s=>s.startsWith('SELECT')));
 assert.ok(f.seen.every(s=>!s.includes('user_id')&&!s.includes('payment_intent')&&!s.includes('snapshot')));
});

test('three 48-hour unmatched checkout sessions warrant review, not asserted webhook failure',()=>{
 const r=summarizeBillingReconciliation({orders:{...orders,unmatched_old_sessions_7d:3},purchases});
 assert.equal(r.status,'warning');
 assert.equal(r.code,'AI_PAYMENT_RECONCILIATION_REVIEW');
 assert.equal(r.counters.oldUnmatchedCheckoutSessions7d,3);
 assert.equal(r.stripeWebhookVerified,false);
 assert.ok(r.notes.some(s=>s.includes('cancelled')));
});

test('one unmatched old checkout session does not establish an error',()=>{
 const r=summarizeBillingReconciliation({orders:{...orders,unmatched_old_sessions_7d:1},purchases});
 assert.equal(r.status,'healthy');
 assert.equal(r.reviewRequired,false);
});

test('credits purchases with no matching order cause manual review',()=>{
 const r=summarizeBillingReconciliation({orders,purchases:{...purchases,orphan_credit_purchases:1}});
 assert.equal(r.status,'warning');
 assert.equal(r.reviewRequired,true);
});

test('refund amounts greater than recorded purchase amounts are critical internal inconsistencies',()=>{
 const r=summarizeBillingReconciliation({orders,purchases:{...purchases,over_refunded_purchases:1}});
 assert.equal(r.status,'critical');
 assert.equal(r.code,'AI_REFUND_LEDGER_INCONSISTENT');
 assert.equal(r.stripeWebhookVerified,false);
});


test('B5-07 invalid credit count, purchase amount, refund sign or currency are internal consistency alarms',()=>{
 const r=summarizeBillingReconciliation({orders,purchases:{...purchases,invalid_credit_purchases:2}});
 assert.equal(r.status,'critical');
 assert.equal(r.code,'AI_PURCHASE_LEDGER_INCONSISTENT');
 assert.equal(r.reviewRequired,true);
 assert.equal(r.counters.invalidCreditPurchases,2);
 assert.equal(r.stripeWebhookVerified,false);
 assert.equal(r.stripeApiChecked,false);
 assert.ok(!('affectedUsers' in r));
 const both=summarizeBillingReconciliation({orders,purchases:{...purchases,over_refunded_purchases:1,invalid_credit_purchases:2}});
 assert.equal(both.code,'AI_REFUND_LEDGER_INCONSISTENT');
 assert.equal(both.counters.invalidCreditPurchases,2);
});

test('B5-07 query validates impossible purchase shapes with read-only, private aggregates',async()=>{
 const f=fake(),r=await checkBillingReconciliation(f.client,{enabled:true});
 assert.equal(r.status,'healthy');
 assert.equal(r.counters.invalidCreditPurchases,0);
 const q=f.seen.find(sql=>sql.includes('FROM vv_ai_purchase p LEFT JOIN vv_ai_order'));
 assert.ok(q.includes('p.credits<=0'));
 assert.ok(q.includes('p.amount<=0'));
 assert.ok(q.includes('p.refunded_amount<0'));
 assert.ok(q.includes("btrim(p.currency) !~* '^[a-z]{3}$'"));
 assert.ok(q.includes('invalid_credit_purchases'));
 assert.ok(f.seen.every(sql=>sql.startsWith('SELECT')));
 assert.ok(!f.seen.join('\n').includes('user_id'));
 assert.ok(!f.seen.join('\n').includes('payment_intent'));
 assert.ok(!('sessionId' in r));
 assert.equal(r.stripeWebhookVerified,false);
});

test('invalid counters or errors never invent a clean status or reveal credentials',async()=>{
 const invalid=summarizeBillingReconciliation({
  orders:{...orders,unmatched_old_sessions_7d:-2},purchases
 });
 assert.equal(invalid.status,'warning');
 assert.equal(invalid.code,'BILLING_METRICS_INVALID');
 const f=fake({throwSecret:true}),r=await checkBillingReconciliation(f.client,{enabled:true});
 assert.equal(r.status,'warning');
 assert.equal(r.code,'AI_BILLING_LEDGER_UNAVAILABLE');
 assert.equal(JSON.stringify(r).includes('password'),false);
});

test('all returned fields are safe aggregates or fixed labels, never user/session IDs',async()=>{
 const f=fake(),r=await checkBillingReconciliation(f.client,{enabled:true});
 const text=JSON.stringify(r);
 assert.ok(!text.includes('cus_')&&!text.includes('pi_')&&!text.includes('cs_'));
 assert.ok(!('userId' in r));
 assert.ok(!('sessionId' in r));
});
