# Deepsyq BASE lane D — Issue #75 integration and release-safety review

**Date:** 2026-10-16. **Owner lane:** D. **Scope:** original BASE sections #18, #43–44, #48–49; this document is a no-spend/no-write review for [Agent 5 Issue #75](https://github.com/mvryhan-web/video-variator-android/issues/75), **not** authority to change Stripe, databases, owner-approved Home, Render or `main`.

Sources read: original `docs/DEEPSYQ_PLATFORM_SPEC.md`, `AGENTS.md`, `PROJECT_STATUS.md`, `docs/DEEPSYQ_BASE_55_COORDINATION.md`, [Agent 5 report](DEEPSYQ_AGENT5_COORDINATION_2026-10-16.md), PR #42 discussion, actual branch file blobs, PR #65/#70 patches and workflow results. BASE row #48 was claimed in both shared files before this review PR. Verified statements below mean **GitHub state and code-level checks only**, not operational acceptance.

## 1. BASE #44 collision — resolved in BASE; DO NOT merge the duplicate

**Verified as of this review:**

- [PR #70](https://github.com/mvryhan-web/video-variator-android/pull/70) is **CLOSED / MERGED** into `deepsyq-platform`. It intentionally reconciled the originally claimed [PR #65](https://github.com/mvryhan-web/video-variator-android/pull/65); #65 remains **OPEN / unmerged**.
- In **both #65 and #70 and the current BASE**, these three functional files have identical Git blob SHAs:
  - `server/generation-entitlements.js` — `d8eb065cd047c44f2710df77ca6527ea5404ef72`.
  - `tests/generation-entitlements-unit.mjs` — `23e23109d6ab24e6d33d65293b29a52561088b84`.
  - `.github/workflows/base-free-plan.yml` — `47d1db8872925c8ecd4fc750bc911a900656496c`.
- BASE already contains `docs/BASE_44_FREE_AI_PLAN.md`, Git blob `32c845741490ad8586fd470002bfb3b79446017c`. PR #65 additionally carries historical `.env.example` and shared `docs/DEEPSYQ_BASE_CHECKLIST.md` edits that overlap parallel agents' status updates. Replaying those edits is **not needed** to preserve Free-plan functionality.
- Original [#65 CI](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900312833) and reconciled [#70 CI](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900866559) report **SUCCESS** for the focused Free entitlement checks. No evidence of live Free AI calls.
- Actual `freeGenerationConfig` requires explicit `AI_FREE_GENERATION_ENABLED=true`, `AI_WELCOME_CREDITS_ENABLED=true`, an integer approved 1–1000 welcome amount, an existing trial plan with concurrency 1 and <=10 jobs/hour, plus global public/job/wallet gates. Default OFF. No invented quota is approved for customers.

**Decision:** PR **#70 is the authoritative BASE implementation**; **do not merge #65**. Keep #65's remaining review/history available; its original owner or Agent 5 may mark #65 superseded and close it after acknowledging this blob comparison, without deleting the branch/commits. Do not silently close an actively owned PR. Update the current BASE #44 checklist/board from stale IN PROGRESS to `SCOPED CODE VERIFIED / MERGED TO BASE / LIVE BLOCKED` **with the original #44 owner's coordination**; preserve their owner assignment until explicit handoff.

## 2. Open lane-D PRs and exact merge boundaries

| PR | BASE row | Current change surface | Current evidence | Decision |
|---|---|---|---|---|
| [#62](https://github.com/mvryhan-web/video-variator-android/pull/62) | #43 | `app/src/main/assets/ai-pricing.js`; new `ai-pricing-display.js`, tests, CI; shared BASE checklist | [CI 38898930526](https://github.com/mvryhan-web/video-variator-android/actions/runs/38898930526) SUCCESS (syntax + 6 test cases) | Narrow pricing UI code ready for manual review; browser/login acceptance not verified |
| [#66](https://github.com/mvryhan-web/video-variator-android/pull/66) | #18 | `server/generation-pricing.js`, tests, CI; shared BASE checklist | [CI 38900266382](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900266382) SUCCESS (new + existing pricing suite) | Provider-aware rate keys code verified, but PR currently not mergeable; reconcile with current BASE before merge |
| [#69](https://github.com/mvryhan-web/video-variator-android/pull/69) | #49 | `server/ai-migrations.js`, tests, CI; shared BASE checklist | [CI 38900828078](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900828078) SUCCESS (new + manifest checks) | Prioritize safety fix: truly SELECT-only `--check` and unexpected migration-ledger detection; review before integrating |

The three open PRs do **not** overlap in runtime modules. They **all modify `docs/DEEPSYQ_BASE_CHECKLIST.md`**: preserve the freshest 55-row table and manually combine their own item evidence, rather than accepting an old checklist blob. Their focused CI proves scoped code, not real Stripe/provider/DB rollout. No new feature code should be pushed directly into frozen draft PR #42.

**Non-destructive proposed merge sequence, subject to owner/CI review:**

1. Leave #70's merged Free-plan code in BASE; review and explicitly supersede duplicate #65 only after the original owner's acknowledgment. Never double-merge #65/#70.
2. Re-sync the existing dedicated #69 branch against the latest BASE and reconcile only its checklist row; run its narrow checks and merge **into `deepsyq-platform`**, NOT `main`, only once the reviewer confirms read-only behavior and current migration manifest. No migration apply.
3. Repeat for #66 (resolve non-mergeable state without force push), then #62; after each, re-run the **affected focused** CI rather than every full Video suite. Since the runtime modules are disjoint, there is no reason to rewrite them.
4. Before *any* functional `main` integration: snapshot latest BASE/main diff, verify a **restorable independent Postgres backup**, trial restoring to a disposable isolated database, stage/check migrations and rollback, real Stripe test-webhook and idempotency, provider cost/keys/storage/worker, old Video Uniquifier, auth, mobile and owner-approved Home assets. Keep public/home/billing flags OFF until each gate is satisfied.

## 3. Production / backup / Render — strictly read-only findings

- Per the latest **Agent 5 Issue #75 account-verified report**, the existing `video-uniquifier-db` PostgreSQL instance is **AVAILABLE on paid Render plan `0.1c-256mb`** (as of 2026-10-16). Prior warnings of an **imminent free-plan expiration** for this same database are obsolete. **The actual invoice date or card charge is unknown; do not fabricate it.**
- The commercial service remains auto-deployed from `main`. Do **not** merge draft PR #42 or any new functional code into `main` merely to obtain a preview. The separate no-secret UI preview is not production acceptance.
- This review **did not** query or mutate the live database, run a production migration, download customer data, verify a restorable backup, perform a restore, or establish an RPO/RTO. GitHub source and Agent 5's plan/status observation **do not establish that a recoverable backup currently exists**. Production restore readiness is **NOT VERIFIED / BLOCKING**.
- **Critical current BASE fact:** current `deepsyq-platform:server/ai-migrations.js` still calls `ensureLedger(pool)` before its `checkOnly` branch. That can issue `CREATE TABLE IF NOT EXISTS` even for `npm run migrate:ai:check`. Therefore **do not describe the current BASE check command as read-only against production**. PR #69 contains and tests the fix, but **is not yet merged**.
- Verify the backed-up DB snapshot has a tested restoration procedure, separate permissions, retention and an isolated restore target **before** an approved staging/live migration. With no recorded successful restore, public paid AI and root switch remain blocked regardless of green unit CI.
- Do not activate Runway/BytePlus/Google model spending, Stripe AI checkout, free credit grants or public generation without the owner's specific commercial settings and staged end-to-end evidence.

## 4. Handoff, truthful status and approval

**Completed in Issue #75 review:** compared all Free-plan overlapping blobs; confirmed #70 merged and #65 redundant, reviewed focused CI; checked disjoint #62/#66/#69 module files and their shared docs overlap; identified high-risk outstanding `--check` mutation and restore gap; documented proposed sequence.

**Not completed:** main merge, production backup and restore, approved provider costs/Stripe/webhook transaction, live media, real mobile acceptance, or reconciliation/closure of #65 by its own owner. Original BASE #48 stays **PARTIAL — REVIEW CODE/COORDINATION VERIFIED, RELEASE BLOCKED**; original BASE #44 stays **PARTIAL — CODE VERIFIED/MERGED TO BASE but public Free plan DISABLED**.

**Owner decision before commercial launch:** confirm recoverable backup+restore, approved AI economics and anti-abuse budget, Stripe/provider/bucket secrets and verification, physical device acceptance, and exactly one owner-approved Home layout. Never infer approval from this document.
