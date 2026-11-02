# Block 5 — AI Stripe credit-ledger reconciliation (read-only)

**Scope:** This is a small, dedicated, optional Product Watcher signal, **not** a Stripe integration or a Block 7 billing implementation. No files in the existing Stripe webhook handler, wallet, pricing, provider router, user accounts or BASE modules are altered.

## What is actually measured

When `PRODUCT_WATCHER_ENABLED=true` **and** `PRODUCT_WATCHER_BILLING_SIGNALS_ENABLED=true`, one existing Product Watcher check reads only aggregates from the **existing** `vv_ai_order` and `vv_ai_purchase` tables:

- Number of AI credit checkout orders and orders with Checkout session references created in the preceding 24 hours.
- Number of Checkout session references older than 48 hours, from the last seven days, without a matching locally recorded credit purchase. **These may be legitimately unpaid, abandoned, cancelled or expired; they are not proof that a customer paid, nor proof a webhook failed.** A warning requires at least three.
- Count of AI credit purchases without any matching local order. Requires manual owner examination.
- Count of refund ledger rows with `refunded_amount > amount`, which is a critical **internal consistency** warning. It does **not** automatically refund, revoke credits or retry Stripe calls.

The module selects **no** customer, Checkout session or payment intent identifiers and makes no Stripe API calls. It returns `stripeWebhookVerified=false` and `stripeApiChecked=false` on every result. When the feature is disabled, it does not even query the billing tables. Missing optional AI tables are reported as a coverage gap; they are not silently treated as successful payments.

The owner-only Product Watcher page shows the last captured aggregate and explicitly states the Stripe uncertainty. Warnings enter the existing deduplicated owner alert/history process. The existing Daily Brief includes a manual-review recommendation when warranted. No paid provider, customer-credit, refund or subscription operation is triggered.

## Limitations / future verification

The current platform does **not** persist separate Stripe webhook delivery outcomes. Existing database tables alone cannot prove which Stripe webhook arrived or whether an expired checkout was ever paid. For genuine delivery monitoring, the owner must approve a separately designed, privacy-safe event/outcome log in the **existing** verified Stripe handler, or a restricted Stripe event reconciliation mechanism, with its own security review and tests. Block 5 does not add another webhook endpoint, duplicate Stripe integration or speculative error claims.

This implementation does not measure subscription renewal webhook delivery or business-wide revenue, payout balances or profit. It focuses strictly on AI credit order/purchase reconciliation, keeping legacy subscription systems and Block 7 responsibilities unchanged.

## Tests and rollout

- `node --test tests/product-watcher-billing-unit.mjs`: missing ledger/feature flags, cancelled-session uncertainty, refund inconsistencies, secret-safe failure, aggregate-only SQL.
- The existing Product Watcher CI boots a **throwaway** PostgreSQL 16 database and exercises real SQL against minimal AI order/purchase fixtures; it does not touch Render or Stripe.
- Do not apply migrations or turn on Product Watcher production flags without owner approval, a tested backup and a safe plan for the Render database's reported expiration on 17 October 2026.

**Status:** implemented in an isolated branch, awaiting CI and owner-controlled staging acceptance. Not deployed, no live Stripe events verified.

## B5-07 — malformed purchase-ledger review (2026-10-16)

The existing read-only aggregate now also counts AI credit purchase rows with impossible internal values: non-positive purchased credit count or amount, negative cumulative refunded amount, or missing/malformed three-letter currency. The owner-only signal is `AI_PURCHASE_LEDGER_INCONSISTENT` (critical); when an over-refund is also observed, the existing `AI_REFUND_LEDGER_INCONSISTENT` code takes precedence while both counters remain visible. This is **internal database consistency evidence only**, not proof of a Stripe event failure or successful webhook delivery.

No user/payment/session identifiers, monetary balances, private snapshot JSON, secrets or event bodies are returned. No billing handler, Stripe API, AI wallet, customer record or production migration is modified. The observer still requires both disabled-by-default Watcher and billing-signal flags; real Stripe delivery, provider availability and Render worker activation remain unverified. Node tests plus a disposable PostgreSQL malformed-record fixture were added in PR #50; refer to the CI run for actual verification status.
