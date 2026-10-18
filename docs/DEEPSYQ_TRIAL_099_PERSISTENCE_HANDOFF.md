# Deepsyq $0.99 paid trial — persistent purchase design / implementation handoff

ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. ../DECISIONS.md. Записанные ранее 72 часа/одноразовость/сроки Trial — ИСТОРИЧЕСКАЯ staging гипотеза, не утверждённый контракт. Никаких миграций, Trial activation или купленных кредитов до отдельного решения владельца.

**Current implementation state:** PERSISTENCE CONTRACT VERIFIED IN ISOLATED STAGING ONLY. This is a proposed design, **not** a deployed checkout, production migration, new wallet, or active account entitlement.

**Product terms prepared for owner review:** exactly $0.99 USD, one non-renewing purchase, 72 hours after confirmed payment, no auto-renewal. Trial *credit amount remains unapproved* until real Stripe and provider costs are supplied. Existing Home, Video Uniquifier/Everyday Tools, subscriptions, AI wallet, provider and Stripe webhook must be preserved.

## What already exists

- `server/generation-wallet.js`: the single existing spend/reservation/refund ledger, with available / reserved / debt balances and idempotent credit-purchase grants. Existing balances have **no expiration** and must not be reused as if they did.
- `server/generation-billing.js`: one existing Stripe checkout and signed-webhook integration with one-time purchases and verified order snapshots. **Do not build a duplicate webhook service.**
- `server/generation-trial-policy.js`: current pure fail-closed 72h eligibility, payment/window, refund/replay preview; every result still says `accessGranted:false` and `launchApproved:false`.
- `scripts/trial-economics-preview.mjs`: offline-only conservative credit-budget scenario. It does not declare the credit count approved.
- `docs/DEEPSYQ_TRIAL_099_STAGING_ONLY.sql`: proposed **new auxiliary purchase/eligibility record**, intentionally **NOT registered** in `server/ai-migrations.js`. The table `vv_ai_trial_purchase_staging` exists only inside disposable `vv_ai_test` runs.
- `tests/generation-trial-postgres.mjs`: isolated real PostgreSQL integration tests, only if `NODE_ENV=test` and `AI_TEST_DATABASE_URL` points to **localhost/127.0.0.1** with database name `vv_ai_test`; destroys only the named test table and restores no real customer state.

## Proposed durable purchase record (review before migration)

- `user_id` unique: one trial per authenticated account, independent of refunds.
- `payment_identity_digest` unique: one trial per *verified* payment identity even after creating another account. Use a server-secret **HMAC**, not a plain hash of guessable contact details; never store raw card numbers.
- `stripe_session_id` unique and `stripe_payment_intent_id` unique: duplicate webhooks and conflicting purchase ids fail closed.
- Server-verified `99 USD cents`, `checkout_mode=payment`, `one_time=true`, `auto_renew=false`; no subscription-mode or auto-renewing transaction should be accepted.
- `verified_payment_at_ms` in UTC epoch milliseconds plus `expires_at_ms = verified_payment_at_ms+259200000` (fixed 72-hour duration, unaffected by DST).
- `refunded_cents` monotonically nondecreasing and `revoked` permanently sticky; refunds/revocations never reset eligibility.
- No credit amount or wallet entitlement appears in the proposed table. Expiring real credit allowances require a separately reviewed extension of **the existing** credit ledger, not an unaudited `wallet.grantOnce` call.

## Non-negotiable transaction and replay contract

1. User begins at the existing Pricing or Studio entry, sees clear price, eligible models and **approved number of credits** before purchase.
2. Authenticated server must validate verified account, real payment identity and current credit-price catalog. Use existing Stripe **test** checkout infrastructure and idempotency key, with metadata tied to existing account/order. No grants on redirect, success screen or user-submitted status.
3. Existing **signature-verified Stripe webhook** retrieves the actual Checkout Session / Payment Intent from Stripe and validates payment complete, mode, amount, currency, price ID, metadata, livemode, customer/account binding, and eligibility. Time source is server/Stripe-verified.
4. Purchase record insert is transactionally serialized. The unique account, payment identity, session and payment intent constraints protect against concurrent duplicate and re-played events. Duplicate of the **identical** purchase is a no-op. Mismatch with any existing identity or amount is a hard conflict to owner billing review; no replacement record / no second grant.
5. **Credits are separate from base AI wallet** unless expiry-aware accounting is fully reviewed. The live design should introduce a trial-tagged expiring credit source within existing reservation/capture/release accounting, prioritizing expiring trial credits ahead of nonexpiring paid top-ups. Purchases/top-ups must remain usable after the trial period as their own entitlements. Expired trial credits are unusable immediately at server authorization, regardless of frontend caching.
6. At 72 hours, release **only unspent trial credits**. Held trial reservations require explicit policy for in-flight jobs: no new post-expiry job, but existing paid-before-expiry reservations may settle under controlled bounded duration and refund semantics. Never silently refund already captured provider consumption or turn expired reservations into negative main wallet balances.
7. Full/partial refunds and chargebacks revoke remaining trial rights, with existing wallet debt rules applied only if the grant has been actually spent. Webhook delivery can be delayed, duplicated or reversed: always reconcile against the latest authoritative Stripe state. A refund that arrives before Checkout completion must block subsequent credit grant, not get lost.
8. Resale after refund **must stay blocked** for same account or payment identity; support secure owner dispute/review, not an automatic customer reset. Define lawful personal-data retention and HMAC key-rotation strategy.
9. Grant only with owner-approved credit number, verified provider costs + Stripe settlement fees, staging migrations, backup, signed webhook, test purchase/refund, and explicit production approval.

## What was tested, and what was not

**Current 72-hour preview:** 14/14 offline Node checks passed in [action 38794538782](https://github.com/mvryhan-web/video-variator-android/actions/runs/38794538782).

**Proposed database:** `.github/workflows/deepsyq-trial-economics.yml` adds an independent `postgres:16-alpine` job. It runs the draft SQL twice in isolated `vv_ai_test`, checks concurrent inserts, one trial per account/payment identity, exact expiry, monotonic refunds, failed duplicates and rollback. The purchase identities and $0.99 values are all test fixtures. The script is **not** called from production.

**Not yet tested/integrated:** real Stripe webhook signature with this schema; fraud checks/payment identity; any production migration; generation route entitlements; the existing wallet/Stripe reserve→capture→release consistency under expiry; real provider calls; exact USD costs / taxes / FX; owner credit allowance; consumer checkout terms. **No live trial enabled.**

## Go/no-go gate

No activation until the owner provides: actual included credits, models and price table; the Stripe live/test context and settlement fees; expiry/refund terms for unfinished jobs; commercial/consumer notice; verified live DB backup; and explicit approval for staging→live migration, payment and rollout. Any backend migration must be added via existing `AI_MIGRATION_FILES` only **after** this review and the production-safety checklist. Do not bypass checksum/change history.

**Owner locked Home and licensed media stay unchanged. No new AI providers, no billing live mode, no website deployment.**
