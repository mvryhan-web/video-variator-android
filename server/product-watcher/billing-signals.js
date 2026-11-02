/**
 * Owner-only Stripe/AI credit reconciliation signals.
 *
 * Reads the EXISTING AI order/purchase ledgers. No Stripe API calls,
 * payment actions, raw checkout/session IDs, user IDs, or credentials.
 * This cannot determine whether a Stripe webhook was actually delivered.
 */
export function billingObserverEnabled(env={}) {
  return env.PRODUCT_WATCHER_ENABLED==='true' &&
    env.PRODUCT_WATCHER_BILLING_SIGNALS_ENABLED==='true';
}

const empty = () => ({
  recentCheckoutOrders24h:0,
  recentOrdersWithCheckoutSession24h:0,
  oldUnmatchedCheckoutSessions7d:0,
  orphanCreditPurchases:0,
  overRefundedPurchases:0,
  invalidCreditPurchases:0
});
const integer = value => {
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=0?n:null;
};

/**
 * Operational heuristics are not Stripe delivery evidence.
 * An expired/cancelled unpaid Checkout session can be legitimate.
 * Do NOT refund, issue credits, retry or update a customer's subscription.
 */
export function summarizeBillingReconciliation({orders={},purchases={}}={}) {
  const counters={
    recentCheckoutOrders24h:integer(orders.recent_orders_24h),
    recentOrdersWithCheckoutSession24h:integer(orders.recent_checkout_sessions_24h),
    oldUnmatchedCheckoutSessions7d:integer(orders.unmatched_old_sessions_7d),
    orphanCreditPurchases:integer(purchases.orphan_credit_purchases),
    overRefundedPurchases:integer(purchases.over_refunded_purchases),
    invalidCreditPurchases:integer(purchases.invalid_credit_purchases)
  };
  if(Object.values(counters).some(v=>v===null)) {
    return {status:'warning',code:'BILLING_METRICS_INVALID',
      coverage:'incomplete',stripeWebhookVerified:false,stripeApiChecked:false,
      counters:empty(),reviewRequired:true};
  }
  const inconsistent=counters.overRefundedPurchases>0 || counters.invalidCreditPurchases>0;
  const suspicious=counters.oldUnmatchedCheckoutSessions7d>=3 ||
    counters.orphanCreditPurchases>0;
  return {
    status:inconsistent?'critical':suspicious?'warning':'healthy',
    code:counters.overRefundedPurchases>0?'AI_REFUND_LEDGER_INCONSISTENT':
      counters.invalidCreditPurchases>0?'AI_PURCHASE_LEDGER_INCONSISTENT':
      suspicious?'AI_PAYMENT_RECONCILIATION_REVIEW':'BILLING_LEDGER_NO_SIGNAL',
    coverage:'internal_ledger_only',
    stripeWebhookVerified:false,
    stripeApiChecked:false,
    reviewRequired:inconsistent||suspicious,
    counters,
    notes:[
      'Unmatched Checkout sessions may be unpaid, cancelled or expired; they are not proof of Stripe webhook failure.',
      'These are existing AI credit ledger metadata, not Stripe balances, revenue, payment success or refund verification.',
      'Invalid purchase amount, credit count, refund sign or currency require manual ledger investigation, never automatic charge/refund/regrant.'
    ]
  };
}

export async function checkBillingReconciliation(client,{enabled=false}={}) {
  if(!enabled)return {status:'healthy',code:'BILLING_OBSERVER_DISABLED',
    coverage:'disabled',stripeWebhookVerified:false,stripeApiChecked:false};
  try {
    const schema=await client.query([
      "SELECT to_regclass('public.vv_ai_order') AS orders,",
      "to_regclass('public.vv_ai_purchase') AS purchases"
    ].join(' '));
    const tables=schema.rows?.[0]||{};
    if(!tables.orders||!tables.purchases){
      return {status:'warning',code:'AI_BILLING_LEDGER_NOT_READY',
        coverage:'incomplete',stripeWebhookVerified:false,stripeApiChecked:false,
        tables:{ordersPresent:!!tables.orders,purchasesPresent:!!tables.purchases},
        reviewRequired:false};
    }
    // Only aggregate totals. The JOIN key is used inside PostgreSQL and never selected.
    const orders=await client.query([
      "SELECT",
      "COUNT(*) FILTER (WHERE o.created_at>=NOW()-INTERVAL '24 hours')::int AS recent_orders_24h,",
      "COUNT(*) FILTER (WHERE o.created_at>=NOW()-INTERVAL '24 hours' AND o.session_id IS NOT NULL)::int AS recent_checkout_sessions_24h,",
      "COUNT(*) FILTER (WHERE o.session_id IS NOT NULL AND o.created_at<NOW()-INTERVAL '48 hours'",
      "AND p.session_id IS NULL)::int AS unmatched_old_sessions_7d",
      "FROM vv_ai_order o LEFT JOIN vv_ai_purchase p ON p.session_id=o.session_id",
      "WHERE o.created_at>=NOW()-INTERVAL '7 days'"
    ].join(' '));
    // Purchase table is append-only; no personal/payment identifiers are selected.
    const purchases=await client.query([
      "SELECT",
      "COUNT(*) FILTER (WHERE o.id IS NULL)::int AS orphan_credit_purchases,",
      "COUNT(*) FILTER (WHERE p.refunded_amount>p.amount)::int AS over_refunded_purchases,",
      "COUNT(*) FILTER (WHERE p.credits<=0 OR p.amount<=0 OR p.refunded_amount<0",
      "OR p.currency IS NULL OR btrim(p.currency) !~* '^[a-z]{3}$')::int AS invalid_credit_purchases",
      "FROM vv_ai_purchase p LEFT JOIN vv_ai_order o ON o.session_id=p.session_id"
    ].join(' '));
    return summarizeBillingReconciliation({
      orders:orders.rows?.[0]||{},
      purchases:purchases.rows?.[0]||{}
    });
  } catch {
    // No raw database exception details, payment identifiers, or credentials.
    return {status:'warning',code:'AI_BILLING_LEDGER_UNAVAILABLE',
      coverage:'unavailable',stripeWebhookVerified:false,stripeApiChecked:false,
      reviewRequired:false};
  }
}
