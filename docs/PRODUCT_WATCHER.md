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

Known limits: in the first slice, the health route can say OK even when sign-in or Stripe is misconfigured; separate authenticated checks and Stripe webhook diagnostics must be added later, and checks must not claim to test live payments. Failures are counted for the last 24 hours; stuck processing/finalizing and held reservations include older unfinished jobs. One API check does not prove the whole product is available. Database migration and deployment have not been run.


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

## Provider failure and recorded-cost checks (code prepared, no paid API calls)

- Read-only operational-signals.js reads existing generation-job metadata. No customer prompts/media, API keys, billing changes, or payment actions.
- Provider health alert requires 10 last-hour jobs, at least 5 failures, and 40% failure rate; this is an observational heuristic, not verified provider downtime.
- Per-currency last-hour recorded spending is compared to the preceding 23-hour hourly average. Alert threshold: 3x, with at least 5 recent and 20 baseline tracked jobs. Separately, unit-cost anomaly threshold is 2.5x; model mix and usage volume may explain either change. Never sum EUR/USD, invent exchange rates, claim margin or assert provider officially changed prices.
- Ready jobs lacking actual recorded provider cost create COST_VISIBILITY_GAP warnings instead of fictitious zero expenses.
- The last-hour snapshot is sampled by the existing 15-minute runner; no separate deployed hourly scheduler or official pricing watcher exists yet.

## Owner-only alert queue (code prepared)

- Same opt-in watcher migration adds vv_product_watcher_alerts. The job report and deduplicated signal observations commit in one transaction, otherwise both roll back.
- Entries are keyed by a stable fingerprint per code/source/provider/currency; retain first/last seen and observation count. Acknowledged means reviewed, NOT fixed or automatically resolved.
- Owner-only API supports GET /api/product-watcher/admin/alerts (50 newest) and POST /api/product-watcher/admin/alerts/ack (explicit matching alertId/confirmAlertId) with existing admin audit transaction.
- The standalone owner page shows observed alerts and contextual review recommendations using text-only insertion. No automatic repricing, routing, Stripe changes, refunds or provider calls.
- Remaining: official provider feed monitoring, notifications and escalation, safe approvals/application policy, daily and weekly briefs, verified Render deployment.

## Official model/provider changes — review only (code, NOT live)

- Static allowlist contains official BytePlus ModelArk product updates, Google Gemini API changelog and OpenAI API changelog. Source paths are fixed in server/product-watcher/official-sources.js; callers cannot submit network URLs.
- Enable ONLY when owner approves private worker monitoring: PRODUCT_WATCHER_ENABLED=true, PRODUCT_WATCHER_SCHEDULER_ENABLED=true, PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED=true. Existing owner pause still prevents all external fetches. No credentials, paid API calls or redirects.
- Private worker polls each allowlisted source at most every six hours using durable last_checked_at and PostgreSQL advisory locking. Downloads are capped to 1 MiB per source and 9-second timeout; non-HTTPS, redirects, wrong MIME, truncated/invalid content fail closed. Unexpected errors are collapsed to safe codes without any raw URL/user input.
- First successful page is only a reference baseline: NO new model or price inferred. A subsequent page-text checksum difference generates a deduplicated pending human-review entry linked to the original official URL, with prior/new hashes. Hash changes are NOT factual confirmation of pricing, release, deprecation or API compatibility. Source body/HTML is not stored.
- Owner only GET /api/product-watcher/admin/official-sources and POST /api/product-watcher/admin/proposals/review with matching proposal IDs; decisions are reviewed/dismissed, audited transactionally. No approve-and-apply route exists and no model, Stripe, secret, pricing or production settings are modified.

## Europe/Paris reports (code, NOT live)

- PRODUCT_WATCHER_BRIEFS_ENABLED=true opts into a separate durable daily 08:00 Deepsyq Daily Brief and Monday 09:00 Weekly Product Audit. Schedules use Intl Europe/Paris local time and handle summer/winter DST, recover same-day after service restart, and use PostgreSQL advisory lock plus UNIQUE(kind,period_key) to prevent duplicates.
- Briefs are deterministic compilations of recorded watcher checks, alerts, official page changes (always marked unverified), recorded costs grouped by currency, and pending source reviews. They include New / Changed / Problems / Costs / Recommendations / Pending approvals (source review only) and weekly high/medium/low priority estimates. Revenue, provider price rates, gross margin, actual Stripe payments and unverified product claims are never invented.
- Owner-only GET /api/product-watcher/admin/briefs lists recent locally saved reports. No external delivery, email, SMS, Telegram, webhook, LLM cost or official release fact is assumed from the existence of a report.
- Remaining schedules: 06:00 content/template actual workflow tests and 07:00 product discovery are NOT implemented. Hourly standalone provider error/cost checks are not separately scheduled (currently rolling 1h metrics sampled in 15m health reports). External Render/cron activation, delivery notifications and independent acceptance remain pending.

## Security, readiness and release gates

- All additional tables are additive in server/migrations/20261015-product-watcher.sql and are NOT in the BASE migration manifest; must be reviewed and applied after owner-approved database backup. Production Postgres may be scheduled for expiration; do not unilaterally upgrade, delete or replace it.
- Feature flags OFF by default; owner control defaults PAUSED. The current branches do not include an enabled private Render service or a public Product Watcher API.
- CI exercises fake network responses and temporary PostgreSQL 16; no real commercial provider or Stripe request is made. Real provider fetch behavior, Render uptime, OAuth owner sign-in, E2E UI, negative security probes, privacy review and notification delivery still require a separate owner-controlled staging test.
