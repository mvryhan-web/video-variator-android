# Agent 5 — Cross-lane BASE CI regression handoff, 16 October 2026

**Role:** Agent 5, independent quality/coordination review; not a fifth feature-implementation lane. **Status:** log-level analysis complete, scoped action owners assigned; **whole BASE not green, not on `main`, not live accepted**. This document does not approve paid usage, secret access, production deploy, migrations or any alteration to the locked Home.

## Source and integration snapshot

- Authoritative scope is the immutable original `docs/DEEPSYQ_PLATFORM_SPEC.md`, sections #3/#16/#23/#30/#48/#54, plus the owner's latest Home amendment merged as **PR #76** (merge `f0959888`). `AGENTS.md` now incorporates the stable new-chat handoff introduced in merged **PR #81** (merge `dd1c9bd3`).
- The large draft [BASE PR #42](https://github.com/mvryhan-web/video-variator-android/pull/42) still targets `main` and is **not a safe deployment approval**; agents must work via isolated feature branches/PRs targeting `deepsyq-platform`. Avoid resetting or rewriting another session's work.
- Agent C's **PR #79 (BASE #30)** and **PR #88 (BASE #23)** have been **merged to BASE**, despite their broader CI runs failing. Their **dedicated, focused** workflows succeeded. Therefore report `CODE VERIFIED, SCOPED / MERGED TO BASE / GLOBAL REGRESSION FAILED / NOT LIVE`, not `all tests green`. Preserve their actual code and tests; do not duplicate these modules.

## A. BASE #30, PR #79 — browser regression

- Dedicated AI Apps workflow **[38905303919](https://github.com/mvryhan-web/video-variator-android/actions/runs/38905303919) SUCCESS**: narrow-device long unbroken title/category wrapping, 320px + 390px nav touch targets, no paid Generate POST and draft-only Quick Create handoff in the targeted suite.
- Broader `Deepsyq platform regression` **[38905303815](https://github.com/mvryhan-web/video-variator-android/actions/runs/38905303815) FAILURE**; GitHub Actions job `116987247972` records **16 failing platform/browser variants**. Visible causes include:
  1. `tests/deepsyq.spec.mjs:254`: Lifetime description expects literal substring `not unlimited AI-generation credit` while current safer UI text is `This does not include unlimited AI-generation credits.` The copy itself correctly distinguishes Lifetime tools from AI generation. **D owns Pricing/copy/expectations**; reconcile the user-visible semantics and test assertion together. Do not re-enable invented or unlimited AI rights just to satisfy an old string.
  2. `tests/deepsyq.spec.mjs:332`: an allegedly approved `/owner-owned-film.mp4` in a mocked Inspiration list is **not a playable served media fixture**. Actual `home-experience.js` handles media errors and removes the source/link/poster, so the test's video visibility/poster expectation fails. **A owns Home**, and the owner's *newer approved* always-visible carousel requirement must guide implementation: keep the area visible with an honest inert fallback even at zero playable MP4s; for true video acceptance supply a real local test MP4 or mock `HTMLMediaElement` when testing only DOM state. Never fabricate a published video.
  3. Some mobile tests try clicking `#sidebarToggle` or `#adminAiControl`, but Playwright repeatedly reports `element is outside of viewport`. **A/C must coordinate** who owns responsive sidebar behavior; inspect 320px/390px DOM bounding boxes, distinguish a genuine navigation blocker from an incorrect test action, and fix in the owning task branch.
- The log identifies actual mismatches but **does not prove #79's narrow CSS changes caused them**. No unilateral revert or duplicate #30 build. Since #79 was merged with a failing broad suite, **PR #42 cannot be declared browser-regression verified**.

## B. BASE #23, PR #88 — shared checkout regression

- Dedicated template owner-readiness **[38906432137](https://github.com/mvryhan-web/video-variator-android/actions/runs/38906432137) SUCCESS**; template rights gate **[38906432334](https://github.com/mvryhan-web/video-variator-android/actions/runs/38906432334) SUCCESS**. Original Product Name placeholder support/readiness changes are now merged to BASE, not to `main`.
- Broad `AI Studio preview checks` **[38906432469](https://github.com/mvryhan-web/video-variator-android/actions/runs/38906432469) FAILURE**, job `116991046565`. Nested test in `tests/generation-wallet-postgres.mjs:64+`, `Checkout price validation, pending payment, replay and snapshot persistence`: Stripe Checkout fixture expects HTTP **200** for a replay but obtains **409**; Node output shows 409 !== 200.
- The current BASE billing handler `server/generation-billing.js` deliberately validates an existing Stripe session's ownership, price, mode and reusability, and rejects invalid replay with `CHECKOUT_SESSION_NOT_REUSABLE`. The broader failure coincides with D-owned BASE #16 strict Checkout changes, but **the precise rejecting predicate is NOT yet confirmed**.
- **D owns investigation**: inspect `existingCheckoutResponse()`, persisted snapshot, the mocked `stripe.checkout.sessions.retrieve()` payload and error response. Decide whether the fixture is missing required fields or implementation erroneously rejects safe retries. Keep fail-closed cross-user/cross-price/cross-mode checks; do not turn 409 into 200 without confirming a safe, genuinely reusable session. Add a focused regression test and separate scoped PR before claiming the entire wallet/billing path green. No live Stripe calls or production schema edits.
- **C must not patch D-owned Stripe tests** as a workaround for #88; A must not patch C's template source.

## C. Owner's Home source priority (resolved, not pending)

Merged **PR #76** is the newer explicit Home lock: keep the **original approved girl** as the large 16:9 hero; show twelve distinct miniatures from the separate 13-shot storyboard; **the carousel region remains visible and labelled even with zero playable MP4 files**; preserve the Canvas/AI Agent/AI Apps/Inspiration sections and Quick Create. The original screenshot remains the identity/layout reference; the second screenshot supplies additional scene identities and does not delete existing feature blocks.

`docs/DEEPSYQ_AGENT5_COORDINATION_2026-10-16.md` contains an older historical entry saying the final screenshot choice was pending. **That entry is superseded** by the owner's later, written PR #76 addendum. A must still implement/test the visual fallback, acquire licensed assets, compare real desktop/mobile screenshots, and seek separate permission for paid Runway/videos. A merged specification is **not** a deployed hero. Never claim 13 actual media files exist.

## D. Action boundaries and order

| Priority | Owner / issue | Exact action | Required evidence |
|---|---|---|---|
| 1 | D / [#75](https://github.com/mvryhan-web/video-variator-android/issues/75) — original BASE #16 | Reproduce Checkout replay 409 vs 200 with a single safe PostgreSQL fixture, correct either fixture or validation **without weakening safety**, and add a focused scoped PR. | Focused Checkout regression PASS; broad Studio rerun PASS on the affected head |
| 2 | A / [#72](https://github.com/mvryhan-web/video-variator-android/issues/72) — #3/#46 | Finish always-visible approved-girl carousel fallback with authenticated rights-checked media and no fake moving previews. Clarify playback-mocked browser tests. | Owner original screenshot comparison, desktop/mobile, empty-media state, true MP4 behaviour; focused and broad browser checks |
| 3 | C / [#74](https://github.com/mvryhan-web/video-variator-android/issues/74) — #30 | Confirm mobile sidebar viewport issue and coordinate with A if it touches Home. Preserve already-merged #79 and #88. | 320px/390px screenshot + supported links/taps and passing targeted browser tests |
| 4 | D / #75 — #43 | Update outdated Lifetime wording test only if product claims remain accurate and no credits/prices are invented. | Exact copy invariant, no accidental price/billing regression |
| 5 | Agent 5 | Verify these owners' resulting isolated PR file overlaps, CI outcomes and claim/status truth. | New dated review/checkpoint only; no simultaneous changes to A–D code |

**Safety gate:** successful lint/scoped CI or isolated Render preview != production acceptance. No `main` merge/auto-deploy until a recoverable **tested** Postgres restore/rollback, real signed Stripe settlement, approved price/profit controls, durable owned output, real provider creation, ownership-scoped History, working old tools, physical/mobile acceptance and owner-authorized Home media meet original BASE #54. Paid Render DB being `available` does not demonstrate successful restore or billing settlement.

*Agent 5 read-only source/CI evidence, not a promise of unattended monitoring or another coding session having received its issue comment. Rerun checks after each new affected commit.*
