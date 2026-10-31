# Block 5 — safe integration into canonical main

Status: **INTEGRATION BLOCKED / NOT DEPLOYED** (audit 2026-10-15). This is an execution checklist for the already approved owner rule in `AGENTS.md`; it does not authorize a deployment, production migration, payment or secret change.

## One destination

The existing repository `mvryhan-web/video-variator-android` and its `main` branch are the final integration destination for **BASE and Blocks 1–7**. All intermediate Block 5 branches/PRs are temporary review layers, not separate permanent apps, databases, providers, Stripe integrations or Render deployments.

## Observed pull request topology

| Order | PR | Head branch | Targets | Last observed status |
|---|---|---|---|---|
| BASE first | [#42](https://github.com/mvryhan-web/video-variator-android/pull/42) | `deepsyq-platform` | `main` | DRAFT; **not mergeable** |
| Watcher foundation | [#46](https://github.com/mvryhan-web/video-variator-android/pull/46) | `deepsyq-block5-product-watcher` | `deepsyq-platform` | DRAFT; **not mergeable** |
| Readiness checks | [#47](https://github.com/mvryhan-web/video-variator-android/pull/47) | `deepsyq-block5-readiness-gate` | `deepsyq-block5-product-watcher` | DRAFT; mergeable at audit |
| Billing ledger observation | [#48](https://github.com/mvryhan-web/video-variator-android/pull/48) | `deepsyq-block5-billing-observer` | `deepsyq-block5-readiness-gate` | DRAFT; mergeable at audit |
| Webhook configuration observation | [#49](https://github.com/mvryhan-web/video-variator-android/pull/49) | `deepsyq-block5-webhook-diagnostics` | `deepsyq-block5-billing-observer` | DRAFT; mergeable at audit |

These are point-in-time GitHub mergeability indicators, **not** passing release acceptance. Re-fetch every PR head and base before acting. The compare API found that BASE diverged from main (612 commits ahead, 3 behind) and that #46 diverged from BASE (71 ahead, 68 behind) at audit. PR #47 was also diverged from #46 (4 ahead, 7 behind). Never force-push or blindly reset any branch to simplify the graph.

## Conflict-sensitive shared files

Watch for `server/server.js`, `PROJECT_STATUS.md`, `.github/workflows/product-watcher.yml`, `app/src/main/assets/product-watcher-admin.js`, and `server/product-watcher/admin-api.js`. BASE is actively edited by other agents. Treat `PROJECT_STATUS.md` and `AGENTS.md` as cumulative owner instructions: merge, do not replace newer content with older snapshots. Preserve the owner's locked Home design unchanged. Block 5 billing observation must not modify Stripe handlers, subscriptions, wallet, existing payment logic or Block 7 prices.

## Required integration sequence (not yet executed)

1. **BASE release gate:** resolve #42's current merge conflicts against fresh main while preserving both its BASE work and main's latest rules. Review whole diff, run relevant automated browser/backend tests; verify migrations and existing production backward compatibility. Ensure production PostgreSQL continuity and a tested independent backup/restore path **before** any functional main merge. The free database was reported to expire 2026-10-17; reconfirm its real status rather than relying on the old date.
2. **Do not interrupt other agents:** notify BASE owner before reconciling shared `server/server.js` and `PROJECT_STATUS.md`. Do not rebase/force-push their branch without coordination. When #42 is ready, merge through reviewed PR to `main`, with paid AI/public rollout and risky feature flags still OFF.
3. **Consolidate Block 5 inward:** after re-checking mergeability and current-head tests, integrate #49 into #48, #48 into #47, and #47 into #46 in that order **only once ready for review**. Alternatively prepare an isolated integration branch from the latest BASE and cherry-pick/merge verified watcher-only commits after conflict review. Avoid merging partial/missing nested functionality.
4. **Reconcile Watcher with updated BASE:** #46 currently conflicts with its base. Resolve file-by-file, particularly the existing HTTP server hooks and current authentication middleware. Keep the Watcher OFF by default; do not create a second billing/provider/auth stack. Run watcher Node unit/security checks plus isolated PostgreSQL migration/owner authorization tests **and** focused base routes, admin UI and browser tests.
5. **Merge to canonical main only after gates:** verify all PRs contain no secrets, incompatible migrations, risky auto-start worker or paid provider requests. Existing primary Render web service must remain backward-compatible when `PRODUCT_WATCHER_ENABLED` is unset/false. Review deploy-trigger rules and rollback, then merge through reviewed PR.
6. **External rollout separately:** owner explicitly approves PostgreSQL backup/restore, additive watcher schema migration, private Render worker/schedule, environment flags, owner authentication and alert credentials. Test persistent runs/heartbeat, 15-minute checks, Europe/Paris briefs and notification receipts in staging. **Never claim MERGED or DEPLOYED from local tests.** Production feature switches remain OFF until separate approval and successful staging verification.

## Required progress reporting

Update `PROJECT_STATUS.md` with each Block's independent states: implementation / tests / merge to main / deployment acceptance. Only mark Block 5 DONE after verified main integration and applicable real private-worker, data and owner-access acceptance. No business payment or schema upgrade is allowed just because the branch can merge.
