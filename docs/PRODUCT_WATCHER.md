# Block 5 — Product Watcher (isolated first slice)

Status: **IMPLEMENTED / LOCAL UNIT TESTED / NOT DEPLOYED**. This is the internal, owner-operated core of Block 5, **not** the finished scheduled Product Watcher service, and not the customer User Agent or Voice Agent.

## Scope

- One-shot server-side check of Deepsyq's existing `/api/health` (no paid calls), PostgreSQL connection and aggregate `vv_generation_jobs` problems from the last 24 hours.
- Job checks summarize failures, ambiguous jobs, stale processing after 30 minutes, and held credits requiring review. They **do not** select personal information, prompts, media, credentials, provider answers or prices.
- Consistent health/warning/critical findings; immutable append-only records in **separate** `vv_product_watcher_runs` PostgreSQL table, when the explicit schema has been applied.
- PostgreSQL session advisory lock prevents overlapping runs. No automatic actions, retries, user-facing API, billing changes, data deletion or pricing changes.
- Disabled unless `PRODUCT_WATCHER_ENABLED=true`; one-shot process runs only when externally called. It is **not scheduled/deployed**. No fake last/next-run status.

## Controlled setup (NOT performed yet)

1. Owner approves an external PostgreSQL backup and the additive SQL `server/migrations/20261015-product-watcher.sql`. Apply through the existing approved migration/deployment process; **do not** modify the existing BASE AI migration manifest or production database without coordinating with the BASE owner.
2. Set `PRODUCT_WATCHER_ENABLED=true` **only on a private owner-controlled background worker** with `DATABASE_URL`, `DATABASE_SSL` and `APP_URL` (or optional `PRODUCT_WATCHER_BASE_URL`). Production URL must be HTTPS, root only, without credentials, query or fragments.
3. Test manually: `node server/product-watcher/run-once.js --dry-run` (reads checks, does **not** insert a run), then after SQL approval and verification `node server/product-watcher/run-once.js` (inserts one run). Running in an owner-controlled worker does not expose a public endpoint. Exit codes: 0 healthy/warning/disabled; 1 execution/storage error; 2 critical; 3 skipped because another run is active.
4. Future owner approval: Render Cron Job (or equivalent) and notifications, measured provider/model price/news monitors using official sources, owner/admin UI and approvals. Owner schedule from roadmap: health every 15m, error/cost hourly, provider news 6h, daily 06:00/07:00/08:00 and Monday 09:00 in Europe/Paris. **None of these schedules has been turned on.**

## Safety / next implementation

The future admin UI must use existing authenticated owner checks. It must never expose these internal diagnostics through public routes. Persisted reports have no user data. Do not expand auto-apply rights; price/model/provider/routing changes need explicit owner approval and audit. Product Watcher must not become the User Agent. Tests: `node --test tests/product-watcher-unit.mjs`.

Known limits: in the first slice, the health route can say OK even when sign-in or Stripe is misconfigured; separate authenticated checks and Stripe webhook diagnostics must be added later, and checks must not claim to test live payments. Job window is 24h; earlier stuck jobs are currently not counted. One API check does not prove the whole product is available. Database migration and deployment have not been run.


## Owner Control — integrated code, external rollout disabled

- Isolated owner page (not a Home redesign): /product-watcher-admin.html. The existing shared app authentication supplies the user session; all Product Watcher API routes still independently enforce nonempty ADMIN_EMAIL and provider=google.
- GET /api/product-watcher/admin/status: paused state, 30 newest safe reports, last check, real worker heartbeat; no made-up schedule or fake readiness.
- POST /api/product-watcher/admin/control: JSON action pause or resume. Changes owner-only DB state and writes the existing vv_admin_audit row in the same transaction.
- POST /api/product-watcher/admin/run: owner-only one-shot check. A pause prevents it; a second concurrent run is skipped using the PostgreSQL advisory lock.
- The separate watcher schema must be explicitly migrated. This module does NOT auto-apply SQL or create a new auth/Stripe/DB architecture.

## Private background worker (code only; not deployed)

- Run command only in a dedicated **private** worker: node server/product-watcher/worker.js
- Needs PRODUCT_WATCHER_ENABLED=true and PRODUCT_WATCHER_SCHEDULER_ENABLED=true, verified APP_URL, PostgreSQL, and owner-approved additive schema.
- Worker wakes every 60 seconds, stores a heartbeat, and runs the currently implemented health+jobs checks no more often than every 15 minutes based on last persisted report. If the browser closes or the worker restarts, schedule state comes from PostgreSQL; concurrent workers share the advisory lock.
- If paused, worker heartbeat persists but no monitoring runs. If PostgreSQL is unavailable, the worker logs a generic error (no secrets) and tries again next tick. Scheduler status in admin reflects a **fresh** heartbeat only when explicitly enabled; an environment flag alone does not show it as online.
- This is only the 15-minute check loop; the roadmap's hourly analytics, 6-hour official provider model/pricing discovery, daily briefs and Monday audits need separate task implementations, owner policies and validation before they are shown as available.
- **Not deployed**: no Render worker, cron service, production migrations, live provider/Stripe calls, email/alerts or autonomous modifications were enabled.

## Verification / unresolved gates

- CI checks syntax and security/behavior tests for monitor, admin API and scheduler (Node 22).
- Separate GitHub Actions job provisions ephemeral PostgreSQL 16 and runs the SQL/migration/pause/history/lock/audit acceptance. The test refuses any DB URL except the explicit local database watcher_test, and does not touch production.
- Existing main app production switch stays OFF. Full user-facing browser/mobile verification, Render deployment, long-running resilience/notifications, verified official provider checks and automated recommendation/approval workflows are not finished.
