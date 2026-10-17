# P0 #182 — purchased-only server dispatch proof (Agent D)

Owner rule: never run paid AI tests or any owner-funded paid provider requests. Only a real customer with a signed, settled, unrefunded **live** Stripe Checkout purchase may authorize future billable generation; no owner pilot, welcome/admin credits or plain wallet balance may justify provider spend.

## What this branch implements

- A new server-only `GenerationWallet.claimPurchasedDispatch` and `claimPurchasedGeneration` prove a purchase originated from a durable `vv_ai_purchase` row AND original server-side `vv_ai_order` snapshot with `billingMode=live` and a real live Checkout session reference, and require already-held reservation, matching job, user, model, provider, fingerprint and credits.
- Conservative available purchased budget counts **all** other held and captured reservations as already spent, even if funded from welcome/promotional/admin credits. Partially or fully refunded purchases do not add to the paid budget; outstanding wallet debt blocks authorization. Older unlabeled or test-mode payments are never considered eligible. A missing DB relation, migration, job, record, model/quote binding, flags or trusted source always denies.
- `vv_ai_purchased_dispatch_claim` is a new additive table via the existing versioned `ai-migrations` manifest. Unique `job_id` is an immutable, single-use dispatch claim. Duplicate or concurrent claims fail, not rerun providers or grant credits. No destructive migration, production DB write, external Stripe, real AI models, paid GPU or owner paid smoke tests are performed.
- B-owned `requirePurchasedDispatchAuthorization` in PR #198 can later consume the receipt via `verifyPurchasedReservation`, including server-derived consent, authorized customer, signed quote and approved model adapter. **This D branch intentionally does NOT call a provider, wire Studio dispatch, enable any public flags or mark commercial readiness.** The helper alone is NOT launch authorization.

## Acceptance still required

- Zero-cost disposable PostgreSQL tests of two migration applications, live-marked synthetic signed purchase records, concurrent retry rejection, fake promotional credits, refunds and mixed balances; pure unit test on credential, reservation, user/model/fingerprint and no-provider state. All production Stripe/live provider calls strictly prohibited.
- Agent B and D coordinate a single verified pre-dispatch integration **before** `provider(...)`, a safe transactional job preflight and no automatic retries of ambiguous provider spends. No billable dispatch is allowed before this gate is on for every model/queue path. Owner approval + real customer payment is a separate production requirement, never an agent-funded test.

BASE #16/#44/#51 and launch #54 remain PARTIAL/BLOCKED until the complete paid-only control is integrated and audited. This is a proof mechanism, not end-to-end spend authorization.
