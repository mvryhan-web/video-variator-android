# Product Watcher — Owner deployment readiness and rollback gates

**Status: read-only preflight implemented, production deployment NOT approved or completed.** This feature belongs to canonical Block 5 and deliberately does not change BASE migration ownership, auth, Stripe, rendering, provider routing, or the approved Home page.

## How to inspect the state safely

- Owner-only endpoint: `GET /api/product-watcher/admin/readiness`, accessible through the **existing** Google owner login even if `PRODUCT_WATCHER_ENABLED=false`.
- Standalone Product Watcher owner panel shows readiness blockers; all displayed strings are codes, table names and booleans, not raw PostgreSQL URLs, secrets, bot tokens or account identifiers.
- The code performs **SELECT only** against `pg_catalog` via `to_regclass` and reads existing Watcher pause/heartbeat rows if the schema exists. It does not create tables, modify a plan, query provider billing, schedule workers or send Telegram messages.
- It checks 9 additive Watcher tables, the existing BASE `vv_generation_jobs` table, opt-in feature flags, a safe root HTTPS health origin, database presence and a real heartbeat from the last three minutes.
- The result always contains `productionVerified=false`, `backupVerified=false` and `workerDeployedVerified=false`. A passing **code-level** preflight is **not** proof of a completed rollout.

## Required owner approvals before any deployment

1. **Database continuity:** check Render PostgreSQL status, expiration, plan and data retention. The free database was previously reported to have an imminent expiration. Do not assume it survives that date, do not replace it with an empty database, and do not automatically upgrade billing.
2. **Backup and recovery:** owner approves a verified independent PostgreSQL backup; test restoration on a separate database. Do not copy connection credentials into code, issues or chat logs.
3. **Schema review:** review `server/migrations/20261015-product-watcher.sql` against the actual production schema and BASE changes. It is intentionally **not** in the BASE migration manifest; apply only with the owner's permission and a transaction-safe rollout plan.
4. **Staging rehearsal:** deploy a private watcher process in isolated staging; verify the nine Watcher tables and the real generation schema, owner authentication, response gating, all schedules in `Europe/Paris`, safe HTTP source fetching, and isolated Telegram owner chat delivery.
5. **Manual production activation:** first deploy with every `PRODUCT_WATCHER_*` flag OFF and owner state PAUSED. After backup, privacy/security and operational tests, enable only individually approved flags. `PRODUCT_WATCHER_SCHEDULER_ENABLED=true` is not enough: the heartbeat must be observed. Do not expose a new public worker endpoint.
6. **Observability:** confirm actual checks, low request volume, per-provider error observations, official page-review proposals, 06:00/07:00/08:00 tasks, Monday 09:00 audit, and false-positive behavior; confirm all approvals are review-only and no price, Stripe or routing changes can execute.
7. **Rollback:** pause owner control first; disable worker flags; stop the private worker if necessary. Preserve append-only reports for audit. No automatic destructive database rollback, refund or user-data deletion.

## Verification scope

GitHub Actions on the isolated feature branch covers syntax/security and **ephemeral PostgreSQL 16** read-only preflight. This is not a live Render deployment test, DNS uptime guarantee, billing verification, data-backup validation, Telegram owner-message delivery confirmation or legally verified media content assessment.

Do **not** mark Block 5 DONE until the owner-approved production and recovery checks are actually performed, documented in `PROJECT_STATUS.md`, and verified. The remaining Stripe webhook-error signals, deeper real provider/media workflow checks and official pricing semantics require separate evidence.
