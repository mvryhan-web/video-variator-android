# Owner P0 #182: purchased-only provider dispatch contract (Agent B, 2026-10-17)

**State: pure server-only CODE PREPARED, UNWIRED and NOT A LIVE SECURITY GUARANTEE.** Original BASE #33 paid retry and BASE #42 durable storage remain distinct. Actual owner rule: NO paid AI test calls, no owner-funded provider runs, no free/welcome/promotional/admin-granted credit funding a billable request. A real customer's provider submission requires a confirmed settled purchase, sufficient PURCHASED credit reservation, explicit quote+consent and a one-shot server-side dispatch claim.

## This isolated deliverable

`server/generation-paid-dispatch-authorization.js` exports a single async `requirePurchasedDispatchAuthorization` predicate. It defaults to deny without `AI_PURCHASED_ONLY_DISPATCH_ENABLED=true`, blocks owner/admin before ledger access, requires matching user/job/model/provider, exact quote and consent, rejects any pre-existing operation/provider-started/ready/deleted job, and requires a **server-only** `verifyPurchasedReservation` callback.

The callback **MUST** be implemented by Agent D with a transactional, settled Stripe-origin purchase ledger and an atomic one-shot reservation/provider-dispatch claim. The return value currently must identify a settled non-refunded Stripe purchase, purchased-credit-eligible balance before reservation, exact reserved amount for this job/model/fingerprint, and an already claimed unique dispatch reservation ID. Caller-submitted booleans, status JSON, mixed wallet.available, coupon/promotional credits and unaudited DB reads are NOT accepted as proof. Callback is invoked with immutable server-derived details; errors fail closed. This pure helper cannot cryptographically prove a callback's provenance; D must guarantee actual origin, transaction and replay prevention. An injected fake callback would circumvent checks if a server developer intentionally wired it; this is why **it remains UNWIRED** until D's attestation and end-to-end tests are reviewed.

## Deployment gates and responsibilities

1. D Issue #75: implement approved purchased-credit provenance and transactional reservation/claim, signed Stripe settlement/refund/debt/replay validation. Agree return schema with B and include atomic concurrency/retry tests.
2. B Issue #73: after D handoff, integrate the gate into **one actual billable provider dispatch boundary** in existing `server/generation-studio.js` and dedicated background worker. Ensure owner pilot, Smart Routing, fallback, previous-job retry and unknown asynchronous submissions cannot bypass it; no new wallet or second provider router.
3. Agent 5: verify full CI, purchased-only E2E with mock providers, ledger scenarios and commercial license before allowing release; no paid models ever called for tests. Do not expose enable flags solely based on this helper.
4. A/C UI: no visual code or marketing may claim the paid customer-only backend is ready.

Only offline mock tests are authored, with both denial and a **synthetic verified-ledger proof** success case; synthetic approval does NOT establish real Stripe provenance. No production config, Stripe, wallet, migration, provider or Render changes.
