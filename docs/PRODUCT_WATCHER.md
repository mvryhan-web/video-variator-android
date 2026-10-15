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
