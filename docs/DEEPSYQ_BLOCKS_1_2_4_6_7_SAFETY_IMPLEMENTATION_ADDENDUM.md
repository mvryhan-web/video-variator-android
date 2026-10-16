# Deepsyq — narrow implementation safety addendum for Blocks 1, 2, 4, 6 and 7
**Agent 5 coordinator review · 2026-10-16 · Documentation only · NOT IMPLEMENTED**

## Purpose, authority and exclusions
This note records missing *implementation/acceptance precision* identified by comparing the five **existing immutable owner source TXT files** to the current first-MVP and zero-spend policy. It does **not** replace, rewrite, claim completion of, or automatically authorize implementation of any Block. In particular:
- The original `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_{1,2,4,6,7}.txt` remain byte-for-byte unchanged.
- **Block 3 (Inspiration) and Block 5 (Product Watcher) are excluded**, as requested by the owner. Do not alter their owners or code.
- The original BASE 55, owner-approved Home, existing auth/PostgreSQL/jobs/wallet/Stripe/router and current A–D scopes are unchanged.
- Launch P0 remains the functional Image, Video, Music/Audio and minimal AI Chat milestone in [#172](https://github.com/mvryhan-web/video-variator-android/issues/172). Do not displace it with Block work.
- [#182](https://github.com/mvryhan-web/video-variator-android/issues/182) is an **overriding owner rule**: no billable AI calls from agents, owner, staging, tests, free users, welcome/promotional/admin credits or demo sessions. Only paying customers after *confirmed successful payment*, sufficient **purchased** credits, verified quote and explicit consent may dispatch billable provider operations. This document does not assert this policy is enforced in code.

## Block 1 — Multi-AI Compare / Smart Routing
Original TXT: one prompt → 2–4 real providers, visible individual results, optional paid synthesis, parallel async calls, timeout/partial failures, and no automatic retry of ambiguous billable calls.

**Required execution guard (not a new feature):**
1. Before sending a **customer-paid** Compare request, server calculates an itemized worst-case bound covering each selected model (max 2–4) and the separately confirmed optional synthesis. Show the price/credit breakdown; obtain consent; atomically reserve sufficient **purchased** credits for the authorized operations via the existing wallet. Deny when the bound is unavailable or unaffordable. Never price on client-supplied totals.
2. Each provider dispatch has a stable job/suboperation idempotency key. Distinguish `not_sent`, `provider_accepted`, `ambiguous`, `complete` and `confirmed_failed`. On network timeouts after dispatch, do not blindly re-dispatch or assume no provider charge. Partial provider failures may leave usable responses; settle only verified incurred amounts and release unused reservation only on supported final evidence.
3. “Combine into one best answer” is **another charged step**, never triggered by viewing Compare results; require a new bounded quote and affirmative confirmation. Smart cannot silently select a more expensive provider than the confirmed policy.

**Offline acceptance fixtures, no paid calls:**
- Quote for 2, 3 and 4 simulated providers; one selected model unavailable; changed quote after user consent; insufficient purchased balance; synthesis not approved.
- Simulated timeout both before and after provider acceptance; duplicate submission / response replay; mixed success/failure; concurrent retries. Assert exactly one billable-intent dispatch per idempotency key and no double capture.

## Block 2 — User Agent / Do It For Me
Original TXT already requires a real asynchronous, resumable, user-owned Agent that previews plan, estimates expense, asks approval, executes tools and saves deliverables.

**Required execution guard:**
1. Persist plan version, immutable approved scope/quote, step state, job IDs and durable output references **before** running externally meaningful tools; reuse current orchestrator/job infrastructure, not a second execution engine. Use safe resumable states (`queued`, `running`, `waiting_approval`, `ambiguous`, `failed`, `complete`).
2. Following worker restart, reconnect to previously accepted jobs and inspect authoritative state; do **not** replay previously accepted paid/destructive operations. Require new confirmation when model, amount, file target, recipient or plan scope changes materially.
3. Each tool invocation is scoped to the signed-in user's authorized workspace/assets. No automatic publication, deletion, purchase, external messaging or permissions escalation. Refusals/revocations must stop dependent steps without silently changing the plan.
4. Billable tools are **disabled** for mock/trial/promotional-credit experiments under #182; mocked workflows must display that no real provider execution occurred.

**Offline acceptance fixtures:** kill and resume at every step boundary; duplicated callback; unknown provider status; approval revoked; modified plan version; two simultaneous requests; unauthorized cross-user job; no real or paid provider calls.

## Block 4 — Studio / My Workspace
Original TXT explicitly says reuse existing Studio/project foundations, clone templates instead of editing masters, and enforce strict user ownership.

**Required execution guard:**
1. Enforce authorization on **every server-side read, write and file retrieval** (list/open/rename/duplicate/archive/delete, template clone, exported job and thumbnail). A client-supplied `user_id`, project ID or object key is never proof of ownership.
2. Master templates are immutable for ordinary users; clones must be assigned to the authenticated account and can include only copyable references. Do not create public URLs for private user media by default; validate any signed URL's owner, asset scope and expiration.
3. Handle soft delete/retention policy, reference cleanup and final confirmation separately from irreversible asset removal. A 404/403 must not expose another user's project title or prompt.

**Offline acceptance fixtures:** two distinct users with identical-looking project names; tampered project/job/asset IDs; direct object-key and download attempts; template mutation attempt; duplicate-and-delete races; stale signed asset access; page reload and mobile flow. Record test evidence separately before claiming security verified.

## Block 6 — Voice Agent / Device Cleanup
Original TXT forbids hidden scanning/recording, restricts browser access to explicitly selected files, requires official native OS permissions, review and confirmation before deletion, and visible microphone status.

**Required execution guard:**
1. Spoken commands such as “clean everything”, “delete duplicates”, “yes” or “always allow” do **not** bypass browser/OS access dialogs, explicit file selection, human review or a **separate final destructive-action confirmation**. Voice-only approval cannot silently extend the scope of a previous grant.
2. Run deduplication *read-only* before review. Present exact duplicates separately from visually similar files; preserve originals unless the user explicitly selects otherwise. Prefer platform Trash/Recently Deleted when supported; otherwise label permanent deletion clearly before confirmation.
3. Permission denial/revocation, unavailable File System Access API, microphone mute, session expiry and mobile background restrictions must fail closed, with an ordinary manual workflow retained.
4. Raw microphone content and discovered file metadata must not be retained or sent to paid models outside the explicit authorized action and #182 payment guard.

**Offline acceptance fixtures:** deny/revoke microphone; unsupported Safari/browser capability; select an accessible folder then change it; say ambiguous “delete all”/“yes”; double-confirmation prevention; no microphone permission; never delete real user files in tests.

## Block 7 — Stripe, Credits and Unit Economics
Original TXT already mandates reused Stripe/wallet/ledger, verified idempotent webhooks, atomic reserve/capture/release, provider cost economics and forbids duplicated products, unlimited paid AI and ambiguous automatic retries.

**Required implementation guard from owner rule #182 (a stricter subsequent directive):**
1. Keep **purchased, settled customer credits** distinguishable from promotional/free/admin/test credits in server-side eligibility and ledger provenance. Promo balance can unlock only genuinely zero-extra-cost permitted paths. **A positive total wallet balance does not itself authorize a billable provider dispatch.**
2. A paid dispatch requires an attributable successful Stripe settlement (or documented approved equivalent confirmed paid purchase), sufficient *uncommitted purchased balance*, an up-to-date server-verified model quote, explicit consent and an atomic idempotent reserve. Never grant purchased-credit provenance merely due to a trial, an unverified checkout redirect or a duplicate webhook.
3. Reconcile accepted/ambiguous provider jobs with ledger hold states; never silently retry, release, refund, or re-charge uncertain costs. Actual capture/release only after supported terminal provider evidence, recorded using idempotent ledger writes.
4. Default closed when Stripe/webhook signature, price ID, tax/currency, purchased provenance, owner-approved model economics or provider-commercial authorization is missing. Show “unavailable” rather than a fake completed checkout/generation.

**Offline acceptance fixtures:** unpaid test account with promotional balance; forged purchased flag; duplicate and out-of-order Stripe webhooks; concurrent purchases/generations; insufficient purchased balance with plenty of promo balance; accepted-but-timeout paid job; failed quote; provider cost overshoot; cancellation/retry. Assert **zero billable provider dispatches** for every unpaid fixture.

## Shared definition of done and ownership
- **Status now: REVIEW RECORDED / NOT CODE-IMPLEMENTED OR LIVE-VERIFIED.** This is a safety acceptance contract, not a claim that any module currently passes it.
- Implementation ownership remains with existing claimed lanes: B (provider routing / Compare integration); C only for already assigned Studio/UX ownership; D (Stripe/wallet/eligibility and release); any User Agent/Voice assignment needs an explicit fresh no-overlap claim. Agent 5 coordinates and reviews only.
- When the MVP blockers in #172 take priority, treat these guards as **requirements to apply whenever that affected behavior is implemented**, not a reason to delay unrelated safe UI progress.
- Use existing mocking/fixture infrastructure; do not call fee-bearing AI APIs, spend owner money, issue production payments, mutate real files or deploy. Capture a test run, changed files, PR/CI and actual acceptance evidence for each implementation before marking DONE.
- Cross-check [AGENTS.md](../AGENTS.md), [PROJECT_STATUS.md](../PROJECT_STATUS.md), [BASE coordination board](DEEPSYQ_BASE_55_COORDINATION.md) and existing Issue #72–75 claims immediately before any code write.

**Review source:** existing immutable Block 1, 2, 4, 6, 7 TXT read at `deepsyq-platform` on 2026-10-16. Blocks 3 and 5 deliberately not inspected or modified in this review.
