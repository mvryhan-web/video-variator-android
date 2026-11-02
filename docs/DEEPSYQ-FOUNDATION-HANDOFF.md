# Deepsyq current TXT scope — 2026-10-14

Status: PARTIAL; feature branch only. No public launch, provider call, secret, production database or payment changes.

## Source of truth

`DEEPSYQ_PLATFORM_SPEC.md` retains the user's supplied TXT verbatim. The subsequent owner instruction names the platform **Deepsyq**, makes Video Uniquifier secondary, renames Free Tools to Everyday Tools, requests an eventual $0.99 Trial, separates Lifetime tools from paid AI generation, and requires honest comparative SEO with no DeepSeek affiliation. These override earlier Video Uniquifier-first product naming. Do not change technical package IDs, JWT issuer/audience, existing database namespaces or Stripe identifiers for branding.

New roadmap blocks 1–6 remain queued as recorded in PROJECT_STATUS; do not implement them implicitly.

## Architecture audit

- One Express service (`server/server.js`), static bundled Android/PWA assets; original `index.html` and `app-v4.js` own the video dashboard. Android package remains `com.videovariator.app`.
- One PostgreSQL connection `server/db.js`, vv_users and current usage/history tables; existing email auth and verified provider tokens, `vv_token` client session. Deepsyq reuses them. Native login delegates to original Android browser-return implementation.
- Original Stripe subscription/Lifetime checkout and verified webhook remain unchanged. Current advertised config: Basic $9/750, Pro $24/2250, Business $99/15000, Lifetime EUR2999. These are tool credits, not a validated AI generation allowance.
- Existing generation-studio module owns the catalog/provider dispatch, Google and BytePlus adapters, owner-only pilot jobs. Existing AI wallet/billing foundation remains gated/sandbox-only; no second ledger/router added by this workstream.
- Main 14de516 contains shared collaboration docs and Telegram preview changes. Those are reconciled into this branch; do not revert them.
- Existing PR28 (`tools-subscription-access`, ae9a5a7) already implements transactional shared tool quota, reservation/commit/cancel. Its module is now integrated into this feature branch, verified by integration CI. It currently keeps three tools permanently free, differing from the latest request for a trial for each tool. Per-tool trial policy and remaining utility entry points still require reconciliation; this is not marked complete.

## Changes in this pass

- `deepsyq.html/css/js`: compact responsive Dashboard linking to existing image/video/audio studios, Everyday Tools, original Video Uniquifier, histories and original account view; existing email component and Google auth API; explicit logout; pricing rendered from `/api/config` and original `/api/billing/checkout`.
- `generate-studio.*`: Deepsyq branding/navigation; existing latest-result view deep link, no processing changes.
- `app-v4.js`: original history, plans, profile and sign-in deep links; all existing processing code preserved.
- Existing tool navigation labels renamed to Everyday Tools; no utility processing rewritten.
- `deepsyq-vs-deepseek.html`, `deepsyq-seo.css`: original crawlable comparison, metadata and internal links; explicitly discloses no affiliation and no current general-purpose chat. No unverified superiority claims.
- Optional `DEEPSYQ_HOME_ENABLED=true` serves the new Dashboard at `/`. Defaults OFF. `/index.html` always remains the original tool; root mobileAuth and checkout return queries continue through the original app. `/dashboard` and `/deepsyq.html` permit review without changing root. Draft Dashboard currently noindex; remove draft noindex only when launch is approved and canonical root truly enabled.

## Database / environment / Stripe

Added repeatable additive migration `server/migrations/20261014-tool-access.sql` for the existing PostgreSQL database: `vv_users.tools_trial_used` and `vv_tool_runs`. It has NOT run in production. No new database or infrastructure created. New flag: `DEEPSYQ_HOME_ENABLED`, default off; not installed in Render. No secrets changed. No Price/Product IDs created or modified. No checkout submitted to Stripe in tests.

Trial $0.99 is visible as **not available for purchase**. It must not become a fake pay button. Before enabling it define included tools/AI usage, term, expiry/renewal/refund behavior, configure/reuse an actual verified Stripe price and implement entitlement via verified webhook in existing billing. Do not silently charge a different plan.

Lifetime existing rights remain untouched. New pricing explicitly excludes unlimited future paid AI generation. Existing subscribers must not lose already purchased tool access.

## Real remaining blockers / release gate

- BytePlus account model activation was blocked on profile/payment completion; no API key was created or installed in prior work. Free-credits-only guard had been enabled; re-check current console before activation.
- AI generation is owner-only, not a complete public paid platform. No live provider result was verified in this pass.
- Long-song provider, general-purpose AI assistant, full durable per-user generation history/restart recovery/object storage, commercial job-credit settlement and provider administration remain incomplete. Extend existing modules, not another architecture.
- PR28 quota code is integrated in this branch: account locking, reservations, success settlement, cancellation/refunds and client retry queue. Each-tool trial policy and all utility entry points remain incomplete. Local processing means this is cooperative client enforcement, not proof of processing on a trusted server.
- Android app branding/manifest/platform root rollout, localized Dashboard copy, full public SEO suite and launch privacy/terms need further work before launch.
- No production backup/migration, real Google login, real Stripe payment/refund or physical iPhone/Android journey was performed here. Never label fixture tests as production acceptance.

## Verification

- 23 existing Google/BytePlus gating, billing/quote and Telegram auth/quota unit checks passed locally.
- Syntax checks: new Dashboard JS and server passed.
- New Playwright tests cover responsive layout, navigation, reused email form/session/logout with fixture API, original checkout route/error, honest comparative page and original history/profile deep links. CI runs Chromium, Firefox, WebKit and mobile Chromium/WebKit; screenshots retained as artifact. See actual run results before marking verified.
- No local visual browser verification: current Sites managed environment has no advertised control-browser capability. CI is the browser verification path.

## Next action

Review/fix integration CI. Continue this bounded current TXT scope: reconcile per-tool policy, complete verified provider/job/history/credit vertical slice, then Trial and public launch. Root stays on the old application until launch gates pass. Do not publish an APK or claim the public URL changed from a feature-branch commit.

## Verified foundation before quota integration

Head `5c28ac7`: Dashboard CI run 38551913472 passed (25 unit checks; 70 browser cases including one retry); general browser CI 38551913454 passed (327 passed, 3 retry-passed, 75 skipped); Android CI 38551913541 passed including emulator tests. These results predate the quota integration. New quota checks use an isolated ephemeral CI PostgreSQL fixture, guarded against production URLs. No live user login or payment was verified.

## Quota integration verification

Head `db289716`: 28 local checks passed. CI PostgreSQL reservation/concurrency/idempotency/HTTP tests passed, including repeated migration application. Dashboard run 38623063381: 70 browser cases passed without retries. Android run 38623063396 passed. Full web run 38623063405 passed: 358 passed, 3 retry-passed, 74 skipped. Final per-tool allowance policy remains incomplete. No production deployment.

Oct 15 external gate: existing BytePlus console shows an unchecked binding agreements consent dialog; user confirmation is required before acceptance. No key/model activation or paid calls. CI production probe reached health/config, billingConfigured=true; Google/Apple endpoints returned 503 with client IDs absent. The optional smoke step failed internally, so workflow success does not prove production OAuth. Apple intentionally remains off.


## Continuation by current assistant — 2026-10-15

The original owner TXT remains the source of truth. A point-by-point implementation map is now in `docs/DEEPSYQ_BASE_CHECKLIST.md`; use it before claiming the BASE is complete.

Repository-only work completed without enabling live spend:
- durable generation-job migration now records provider/model/prompt/lifecycle timestamps, settings, cost and credit fields;
- owner Studio `My Results` now lists durable jobs, reopens stored results and can reuse saved prompts;
- config-driven `AI_MODEL_PRICING_JSON` pricing engine added with no invented defaults;
- owner-only `POST /api/studio/estimate` returns customer-facing AI credits only when pricing is explicitly configured;
- owner-only `GET /api/studio/admin/metrics` aggregates provider/model jobs, success/failure/processing, average duration, actual cost and charged credits;
- Roadmap Block 7 (Pricing, Credits, Stripe & Unit Economics) is recorded separately from BASE;
- work-limit efficiency rule is permanent in `AGENTS.md`.

Still do not enable public/commercial AI generation yet. Live BytePlus activation/key, verified provider economics, production object storage, restart-safe worker infrastructure, real Stripe AI Products/Prices, staging migrations/backups, real provider smoke calls and physical-device acceptance remain external gates.


## Continuation 4 — routing, storage and billing safety

Additional repository-only foundations now exist behind disabled flags:
- pre-dispatch Smart routing orders compatible models by owner priority/internal cost and exposes an owner route preview; no provider call occurs during preview;
- post-dispatch automatic fallback remains disabled to avoid duplicate paid calls when provider acceptance is ambiguous;
- per-user concurrent-job/hourly-job limits are available through a PostgreSQL advisory-lock policy;
- S3-compatible object storage signs server-side PUT/GET/DELETE requests; when enabled, completed media is stored outside PostgreSQL before wallet capture;
- owner billing review lists only held reservations attached to ambiguous failed generation jobs and allows explicit release with confirmation/note/audit metadata;
- `vv_generation_jobs` migration has isolated PostgreSQL coverage, including repeatable legacy `vv_generation_pilot` migration.

Still external/not activated: real storage bucket credentials and retention policy, BytePlus account/model/key, verified provider prices, live AI Stripe Products/Prices, production database migration/backup/rollback, real paid smoke tests and controlled deployment. Do not turn on the new flags until those gates are satisfied.


## Continuation 5 — templates/onboarding and History

- Data-driven templates and owner template management are implemented without seeding fake content/assets.
- New-account onboarding is persistent and currently offers only real Image/Video Studio destinations.
- Studio History now supports safe filters and actions: Open, Download, Reuse, prepare-only Regenerate, and Delete for non-active jobs. Regenerate never submits a generation automatically.
- History remains owner-only until the public commercial entitlement/provider/storage gates are cleared.
