# Agent D — Issue #75 / BASE #44 deduplication and guarded release review

Date: 2026-10-16. Scope: original BASE TXT section 44, release safety #48–49 and GitHub coordination. User-facing code, original TXT, owner-locked Home and production untouched. Read AGENTS.md, PROJECT_STATUS.md, the full BASE source TXT, the 55-point checklist and claim board, Agent 5 governance notes and active branches/PRs. This is a scoped evidence audit, NOT live acceptance.

## Verified duplicate: PR #65 versus PR #70

Authoritative Free AI code: [PR #70](https://github.com/mvryhan-web/video-variator-android/pull/70) **MERGED** into deepsyq-platform, merge commit 222196f8c5c880d1c884d906b39f6a30f2f6d244.

Draft [PR #65](https://github.com/mvryhan-web/video-variator-android/pull/65) remains open but all its actual feature artifacts have identical Git blob SHA to merged #70 AND the current BASE:
- server/generation-entitlements.js: d8eb065cd047c44f2710df77ca6527ea5404ef72
- tests/generation-entitlements-unit.mjs: 23e23109d6ab24e6d33d65293b29a52561088b84
- .github/workflows/base-free-plan.yml: 47d1db8872925c8ecd4fc750bc911a900656496c

The extra PR #65 .env.example Free configuration explanation is now covered by merged docs/BASE_44_FREE_AI_PLAN.md. Its checklist said IN PROGRESS / CI PENDING, which is stale: reconcile only the #44 status and preserve other agents' checklist rows. **Decision: #70 is the single authoritative implementation; DO NOT replay/merge #65.** After this documented review is posted on the old PR, close it as superseded, without deleting its branch or history.

Code checks on reconciled #70 head: [Free policy CI 38900866559](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900866559) SUCCESS; [AI Studio CI 38900866789](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900866789) SUCCESS. The Free flag is OFF by default; no welcome grant, Stripe call or provider dispatch was performed. **BASE #44: CODE VERIFIED / MERGED TO BASE (scoped), overall PARTIAL / NOT LIVE**, not DONE.

## Render database and recovery: read only

Render workspace My Workspace, database video-uniquifier-db (dpg-dalqp7dbedkc738098pg-a) is **available**, paid plan 0.1c-256mb, PostgreSQL 16, 1 GB disk, high availability disabled (direct Render account read 2026-10-16). The earlier free-database expiration warning is obsolete FOR THIS INSTANCE. Billing collection timing UNKNOWN. Production web service video-variator-android (srv-dalqnkoae00c73caj8vg) autoDeploy=yes from **main**, paid compute 0.5c-512mb: never casually merge the large draft PR #42 to main.

[Official Render backup guidance](https://render.com/docs/postgresql-backups): paid instances are eligible for point-in-time recovery; the recovery window depends on workspace plan. Logical exports are manually generated on the Recovery page; restoring PITR creates a separate, potentially billable database. The available app read does **not** include actual export timestamps, current restorable window, independently verified backup or restore outcomes. This specific customer's recoverability remains **UNVERIFIED**. Did not start export, PITR clone, production query or migration.

Required owner-authorized pre-production safety: inspect the actual Render database Recovery page; take a secure logical export before migrations; verify backup manifest/integrity; perform isolated restore rehearsal ONLY with explicit cost approval; verify accounts/ledger/schema after restore and a rollback; verify legacy auth, Stripe webhook idempotency and Video Uniquifier. No main or paid rollout until complete.

## #62 / #66 / #69 / #70: collision-safe review order

All three remaining D-lane draft PRs share only the status checklist path. **Feature files are distinct**, so their PR owners should re-sync from latest deepsyq-platform and reconcile their ONE checklist row (optimistic SHA), not overwrite others' statuses. Historical scoped green CI does NOT prove mergeable against fresh BASE:
1. [#69 migration read-only safety](https://github.com/mvryhan-web/video-variator-android/pull/69) — server/ai-migrations.js and focused tests, [CI 38900828078](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900828078) SUCCESS; integrate first after owner rebase/review. Existing migrate:ai:check was reported to call schema-writing bootstrap before this change; DO NOT call it truly read-only on production until verified corrected code is merged.
2. [#66 provider pricing keys](https://github.com/mvryhan-web/video-variator-android/pull/66) — server/generation-pricing.js and focused tests, [CI 38900266382](https://github.com/mvryhan-web/video-variator-android/actions/runs/38900266382) SUCCESS; integrate after #69/re-check cost/currency behavior without inventing rates.
3. [#62 Pricing display](https://github.com/mvryhan-web/video-variator-android/pull/62) — ai-pricing.js, ai-pricing-display.js and presentation tests, [CI 38898930526](https://github.com/mvryhan-web/video-variator-android/actions/runs/38898930526) SUCCESS; integrate after approved pricing server behavior with accurate customer labels.
4. #70 already BASE-merged. Never remerge. #65 is obsolete after exact SHA review.

[PR #42](https://github.com/mvryhan-web/video-variator-android/pull/42) is giant DRAFT and conflicted against main in Agent 5's review. Freeze direct feature edits, keep current Home locked, and integrate bounded PRs only after review/tests into deepsyq-platform. No force push, reset, automatic main merge or Render deployment.

## Release verdict

**NO-GO for commercial production**: verified export/isolated restore, reviewed migrations/rollback, owner-approved Free economics and abuse limits, signed Stripe event test, model provider/storage cost validation, visual/media sign-off by Agent 5 and real user Image/Video→History/Download→ledger acceptance are still required. No claim of full 55/55 DONE. No database, Stripe or provider mutation was performed during Issue #75.
