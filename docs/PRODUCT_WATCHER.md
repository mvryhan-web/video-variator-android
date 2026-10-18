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

## 06:00 metadata check and 07:00 internal recommendations (code, not deployed)

- Opt-in only: PRODUCT_WATCHER_CONTENT_TASKS_ENABLED=true, in addition to parent Product Watcher/worker gates. A shared advisory lock and UNIQUE(kind, period_key) persist one content check and one opportunity snapshot per Paris calendar date. If the private worker restarts after the due time, it can complete missing same-day checks once.
- Reads existing vv_ai_template and vv_ai_inspiration metadata from the **current BASE and Block 3 schema**, never modifies a record or invents a new template, illustration, rights declaration, or media asset.
- 06:00: count existing active templates and media previews; note incomplete thumbnail/prompt, source media/rights metadata. Checks metadata only, NOT that links work or rights evidence is legally verified.
- 07:00: generate explicitly labelled internal suggestions from observed gaps, e.g. lack of approved image/video examples or missing rights notes. These are NOT market trends, competitive intelligence, customer demand, or marketing claims.
- Existing Daily Brief incorporates the latest same-day content check and suggestions when present. Missing schemas are reported as not_ready/not_checked, never as zero existing media.
- Existing owner-only GET /api/product-watcher/admin/content-tasks and standalone owner panel show 20 recent snapshots. No published edits.

## Optional owner-only Telegram critical alert delivery (code, not deployed)

- Uses the EXISTING Telegram bot token, not a second bot/webhook. Requires PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED=true, TELEGRAM_BOT_TOKEN and a specifically configured positive PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID. Do not commit the real bot token or chat ID.
- Only critical, unacknowledged system alerts can send; at most 3 per worker tick. The query excludes alerts with an existing Telegram delivery claim **before** selecting the newest three. Backlogs drain over later worker ticks instead of repeatedly selecting previously notified alerts. The message contains only alert source/code and tells the owner to open the private Watcher panel; no user data or private error stack.
- Each alert+channel delivery is claimed ONCE in additive watcher DB before sending. An ambiguous network result is saved as delivery_unknown and NOT automatically retried, preventing unnoticed duplicate messaging. Delivery receipts require Telegram API HTTP 200 AND ok=true; unknown records require human review.
- Owner-only GET /api/product-watcher/admin/notifications displays delivery status without bot tokens or owner chat details. Email/SMS and general notification rules are NOT implemented.
- Feature remains OFF and no message has been sent to a real account. Verify a permitted private owner chat and delivery in staging before considering production activation.

## Current release status

The Block 5 **code** now includes: site/DB/job health, recorded operational cost/provider-error heuristics, persistence and owner alert review, opt-in 6-hour official changelog checks with provenance, 06/07 internal content diagnostics and suggestions, 08:00 local Daily Brief, Monday 09:00 Weekly Audit, and gated Telegram critical alerts. All require explicitly approved schema/worker configuration. Official source page changes are unverified until reviewed, and reviewed decisions never execute production changes.

Still blocked/incomplete: independent real provider API uptime & verified published API price parsing, authenticated end-to-end browser tests, actual media link/playback checks, complex product-market discovery, Stripe webhook diagnostic checks, production migration after a backup, Render worker deployment, notification delivery to real owner, real operations acceptance and any auto-apply path. No owner approval means NO production deployment, paid requests, live billing or critical changes.

## B5-04 existing-job completion latency (code only; not provider API speed)

- Read-only per-provider aggregate covers completed `vv_generation_jobs` rows with valid `started_at` and `completed_at`. It compares observed average duration for the last hour against the preceding 23 hours, without selecting user, prompt, media or provider-task identifiers.
- `GENERATION_COMPLETION_LATENCY_SPIKE` is a **heuristic** owner alert only when at least 5 timed recent completions, 20 timed baseline completions, current average >=30 seconds and >=2.5x historical average. Sparse/missing timing samples do not create a false slowdown claim. Model mix, queue, storage and local processing may contribute. This is **not** a network probe and cannot prove vendor uptime or API performance.
- Existing site and database health, failed-job alerts, recorded cost anomalies and owner review remain unchanged. No extra API calls, provider spend, schema change or customer data access. B5-04 is still **PARTIAL** until real server metrics and external provider availability are verified in staging.

## B5-05 catalog URL syntax guard — 2026-10-16

- Existing 06:00/07:00 owner-only content audit now counts active AI App thumbnail and Inspiration preview/poster metadata whose format does not match a single-slash local path or an HTTPS absolute URL. All checks are bounded SQL aggregates: **no raw link or media URL enters reports**, no arbitrary HTTP requests, no SSRF, no paid model calls, no changes to public records.
- Missing thumbnails/previews remain separate counts. Invalid link syntax produces `TEMPLATE_THUMBNAIL_URL_INVALID`, `INSPIRATION_PREVIEW_URL_INVALID` and `INSPIRATION_POSTER_URL_INVALID` owner recommendations without auto-fixes or public publishing.
- Reports explicitly indicate `linkCheck: syntax_only` and `urlReachability`, `mediaPlayback`, `skills` and `workflows` as `not_checked`. A syntactically valid URL **does not** prove delivery, ownership, playable files, skill availability or functional workflow execution. B5-05 remains PARTIAL; safe external reachability checks and workflow/skill ownership must be designed and separately verified before completion.
- The isolated PostgreSQL test now also verifies actual last-hour versus 23-hour provider-grouped job elapsed-time SQL with 31 synthetic completed jobs. B5-04 remains PARTIAL for true provider availability and production evidence; no fake vendor latency claim.

## B5-05 workflow metadata shape audit (2026-10-16)

Source: original owner Block 5 TXT preserved verbatim in `main:docs/execution/DEEPSYQ_BLOCKS_1-7_CANONICAL.txt`, with sequential acceptance criteria in `main:docs/execution/BLOCK_5_CHECKLIST.md`. BASE is separate from Blocks 1–7.

The existing opt-in owner-only audit now checks active template generation types, supported input-list JSON array elements and settings JSON object shape; inspiration checks allowed studio/agent target, input-list and settings JSON shape. Queries return aggregate counts only, with no raw prompts/config/links; findings are review-only. `workflowMetadata: schema_shape_only` is explicit; actual `workflows`, `skills`, `urlReachability` and `mediaPlayback` remain `not_checked`. B5-05 remains PARTIAL until safe functional/runtime checks are approved. No production user data or paid providers.

## B5-06 — observed usage bursts and unattributed currency (2026-10-16)

Source: the original owner TXT in `main:docs/execution/DEEPSYQ_BLOCKS_1-7_CANONICAL.txt`, Stage B5-06 in `main:docs/execution/BLOCK_5_CHECKLIST.md`: "usage anomalies", "cost anomalies", "no invented cost", and currency separation.

- In existing read-only operations checks, compare per-provider **generation job arrivals** over the last hour against the preceding 23 hours. Raise `GENERATION_USAGE_SPIKE` only at >=25 recent jobs, >=46 historical jobs, and >=4x prior hourly rate. New deployments with no history cannot be described as a spike. Job arrivals are not API calls, paid inferences, unique users or conversion/revenue statistics. No customer identifiers or prompts are retrieved.
- Cost ledger aggregation remains currency-isolated; a recorded non-null `actual_cost` whose `cost_currency` is blank, NULL or not a three-letter ISO-style code produces `COST_CURRENCY_MISSING` with **count only**, never summing that cost with EUR or USD, applying FX or inventing a total. Invalid/unknown currency charges are excluded from denominated cost groups. This is metadata quality, not proof of actual provider billing or actual ISO standard validity.
- No extra network calls, paid-provider requests, database migration, payments, or user-facing route. Alerts persist only fixed codes and small counts/ratios through the existing owner-only queue; duplicate fingerprints use existing PostgreSQL dedup. Synthetic isolated PostgreSQL acceptance exercises both signals. B5-06 is **code implemented / live worker and actual ledger coverage not verified**.

## B5-08 — truthful owner scheduler timestamps (code only, 2026-10-16)

Owner status now separates a **fresh private-worker heartbeat** from the expected schedule. The next-check estimate is shown only when the worker heartbeat is fresh, the Watcher is not paused and the latest saved report implies a future due time. If that due time has already passed, the owner sees `scheduleOverdue=true` instead of a misleading next-run date in the past. Missing or stale heartbeat never claims that checks are live. The owner panel displays the schedule estimate and the existing B5-07 invalid-purchase count. Tests cover fresh/overdue/stale/paused states. Render service, real periodic runs and end-to-end browser acceptance still require an approved deployment; code/CI alone is not B5-08 DONE.


## Optional public-asset reachability slice (2026-10-16; isolated branch)

The existing 06:00 content audit can additionally check a bounded sample of **same-origin public static** active thumbnail/inspiration URLs when `PRODUCT_WATCHER_LINK_CHECKS_ENABLED=true` is explicitly configured on the private worker. It returns only counts plus content record IDs and 404/410 codes, without storing URLs or following redirects. External/signed/private media and actual workflows are intentionally not probed; 403/405/5xx/network failures are inconclusive. The flag defaults OFF. For safeguards, tests and rollout gates see `docs/PRODUCT_WATCHER_LINK_CHECKS.md`. This is code only — not deployed, no migrations, no media playback verification.
