# DEEPSYQ BASE SPEC CHECKLIST

Source of truth: `docs/DEEPSYQ_PLATFORM_SPEC.md` (the original owner TXT).

Status legend:
- **DONE** — implemented and verified at the current feature-branch level.
- **PARTIAL** — real implementation exists, but the original requirement is not fully met.
- **BLOCKED** — repository work is prepared as far as practical; external credentials/account/service/owner approval is required.
- **NOT STARTED** — no meaningful implementation yet.

This checklist covers only the original BASE/TXT. Roadmap Blocks 1–7 remain separate in `docs/DEEPSYQ_ROADMAP.md`.

| # | Original requirement | Status | Current state / next action |
|---|---|---|---|
| 1 | Product becomes Lumina-style AI creative platform | PARTIAL | Deepsyq dashboard/studios exist on feature branch; public product is not launched. |
| 2 | New AI platform becomes `/` | BLOCKED | `DEEPSYQ_HOME_ENABLED` exists but defaults OFF. Enable only after launch gates pass. |
| 3 | Hero / Canvas workspace | PARTIAL | Studio composer, references, model/settings and examples exist; unified Canvas is not complete. |
| 4 | Image generation | PARTIAL / BLOCKED | Google + BytePlus image adapters prepared; live BytePlus key/model activation and commercial flow pending. |
| 5 | Video generation | PARTIAL / BLOCKED | Google + BytePlus async video adapters prepared; live provider activation/storage/commercial flow pending. |
| 6 | BytePlus first provider adapter | PARTIAL / BLOCKED | Server-only ModelArk adapter exists for Seedream/Seedance. Real account activation/key/smoke call pending. |
| 7 | AI Provider Router | PARTIAL | Shared dispatch/catalog now has server-side smart pre-dispatch candidate ordering and an owner route preview. Public multi-provider routing and live reliability/cost scoring remain incomplete. |
| 8 | Fallback | PARTIAL / SAFETY-GATED | Compatible fallback candidates are ordered before dispatch, but automatic post-dispatch fallback remains intentionally disabled so ambiguous paid calls are never duplicated. |
| 9 | Provider config in admin | PARTIAL | Feature-gated owner API/UI support enable override, maintenance, priority, markup and internal cost, plus a no-spend route preview showing primary/candidate models. |
| 10 | Normal generation-job database entity | PARTIAL | Commercial `vv_generation_jobs` now stores provider/model/prompt/lifecycle/cost/credits/settings/assets/error fields and additively migrates legacy `vv_generation_pilot` rows. Production migration/rollback is still unverified. |
| 11 | Permanent object storage | PARTIAL / BLOCKED | Gated S3-compatible server storage, signed PUT/GET/DELETE and Studio persistence are implemented. Real production bucket/credentials are still required; fallback pilot bytes remain only when storage is disabled. |
| 12 | Background jobs | PARTIAL | Async provider task IDs persist and an opt-in restart recovery poller can resume existing async tasks without starting duplicate generations. A dedicated production commercial worker/service is still required. |
| 13 | Internal AI credit system | PARTIAL | Separate AI wallet exists and is wired to generation jobs behind `AI_STUDIO_WALLET_ENABLED=false`; public entitlements/live economics remain gated. |
| 14 | Credit ledger | PARTIAL | Purchase/reserve/capture/release/refund/debt ledger primitives exist; generation success now captures a prior reservation behind the disabled commercial wallet flag. |
| 15 | Credit reservation | PARTIAL | Generation reserves approved server-priced AI credits before provider execution and captures only after durable output; ambiguous submission errors remain held for review. Feature remains disabled by default. |
| 16 | Stripe subscriptions + credit packs | PARTIAL | Existing Stripe reused; sandbox AI packs/webhook primitives exist; live AI packs not configured. |
| 17 | Unit economics | PARTIAL | Job cost/credit fields + provider metrics endpoint + pricing foundation added; real provider costs not configured. |
| 18 | Pricing engine | PARTIAL | Server-side `AI_MODEL_PRICING_JSON` engine + safe credit estimate endpoint added; no invented/default prices. |
| 19 | AI Apps | NOT STARTED | Future roadmap/inspiration/template work should reuse shared generation stack. |
| 20 | Product Video workflow | NOT STARTED | No finished guided product-video workflow yet. |
| 21 | AI Agents | NOT STARTED (BASE) | Deeper implementation is Roadmap Block 2. |
| 22 | Inspiration / Discover | NOT STARTED (BASE) | Full implementation is Roadmap Block 3. |
| 23 | Template system | NOT STARTED | Needs data-driven templates and admin management. |
| 24 | History | PARTIAL | Durable `GET /api/studio/jobs`, metadata, result reopening and prompt reuse now exist for owner Studio. Public commercial history still gated. |
| 25 | My Creations | PARTIAL | User-scoped job access exists; full library/project experience is Roadmap Block 4. |
| 26 | Canvas | PARTIAL | Studio generation workspace exists; richer unified Canvas still incomplete. |
| 27 | Existing Video Uniquifier preserved under Tools | PARTIAL | Existing functionality preserved and linked from Deepsyq; root switch not launched. |
| 28 | Utilities gathered in Tools | PARTIAL | Everyday Tools hub exists; final per-tool allowance policy and some planned utilities remain incomplete. |
| 29 | Final navigation | PARTIAL | Deepsyq dashboard/navigation exists; queued modules are not yet live. |
| 30 | Desktop / Android / iPhone responsive | PARTIAL | Browser/mobile CI exists; physical iPhone/Android acceptance remains outstanding. |
| 31 | Generation UX/status | PARTIAL | Queued/processing/finalizing/ready/failed/unknown states now exist, including localized queued/finalizing labels; public commercial UX and billing-review resolution remain incomplete. |
| 32 | Friendly error handling | PARTIAL | Provider errors are normalized in pilot; broader public error taxonomy remains incomplete. |
| 33 | Safe retry | PARTIAL | No automatic paid retries on ambiguous failure; recovery polls only existing provider task IDs. Commercial retry policy still needs dedicated worker integration. |
| 34 | Server-side rate/concurrency limits | PARTIAL | Feature-gated server policy now enforces per-user concurrent-job and hourly-job limits with advisory locking. Final per-plan values/public entitlement wiring remain unapproved. |
| 35 | Security | PARTIAL | Keys server-side, auth/user scoping, safe provider URLs, Stripe verification foundations exist; launch security review still required. |
| 36 | Privacy | PARTIAL | Reference media is not persisted by current pilot; final Terms/Privacy/provider disclosures and retention policy pending. |
| 37 | Business analytics | PARTIAL | Existing account analytics plus new owner provider/model job metrics foundation; revenue/margin/churn dashboard incomplete. |
| 38 | Admin dashboard | PARTIAL | Owner AI Control now shows model controls, route preview, provider/model metrics and held-credit review/release. Users/payments/templates and broader commercial analytics remain pending. |
| 39 | Provider performance | PARTIAL | Owner metrics endpoint aggregates provider/model jobs, success/failure, processing, average time, cost and charged credits. |
| 40 | Model routing registry | PARTIAL | Shared catalog/capabilities plus server-side compatible candidate ordering and owner priorities exist. Logical cross-provider product model IDs and measured quality/reliability routing remain future work. |
| 41 | Internal model capabilities | PARTIAL | ratios/references/quality/duration/provider metadata exist; full capability schema is incomplete. |
| 42 | Persist BytePlus output in our storage | PARTIAL / BLOCKED | Adapter downloads/validates media and Studio can move completed bytes into configured S3-compatible storage before wallet capture. Real storage provisioning and live BytePlus verification remain external gates. |
| 43 | Pricing page | PARTIAL | Existing plan display/checkout reused; final Deepsyq AI subscription/credit economics not approved. |
| 44 | Free plan | PARTIAL | Existing non-AI trials/tools exist; safe AI acquisition allowance not defined. |
| 45 | Onboarding | NOT STARTED | Needs creation-goal onboarding after registration. |
| 46 | Homepage conversion | PARTIAL | Deepsyq dashboard exists; full public conversion homepage/examples require launch content. |
| 47 | Do not expose BytePlus as our product | DONE | Provider stays implementation detail; Deepsyq branding used. |
| 48 | Production safety / regression | PARTIAL | Feature flags, CI and no-live-change discipline exist; backup/staging/live regression still required before launch. |
| 49 | Database migrations | PARTIAL | Additive commercial-job migration is repeatable and has an isolated PostgreSQL migration test, including legacy pilot copy. Production backup/migration/rollback still has not been run. |
| 50 | Feature flags | PARTIAL | Major Deepsyq/studio/billing gates exist; future modules need their own flags as implemented. |
| 51 | First commercial vertical slice | PARTIAL | Gated code path now supports approved price → reserve → provider job → S3/DB persistence → finalizing → capture, plus held-credit reconciliation and abuse limits. Live provider/storage/Stripe/margin verification is still incomplete. |
| 52 | Required implementation order | IN PROGRESS | Continue BASE before Roadmap Blocks 1–7. |
| 53 | Explicit non-goals for now | DONE / RULE | No unnecessary marketplace/social network/Photoshop/huge provider sprawl should be built during BASE. |
| 54 | BASE readiness criteria | NOT MET | Cannot mark BASE done until a real new user can buy/get AI credits, generate image/video, leave/return, retrieve result, see correct charge/refund and old tools still work. |
| 55 | Required final report | PENDING | Produce only after BASE verification/deployment gate. |

## Repository work completed in the current continuation

- Added Work-limit efficiency rule to `AGENTS.md`.
- Replaced the pilot job path with commercial `vv_generation_jobs`, including additive migration of legacy pilot rows and broader lifecycle/assets/error/cost/credit fields.
- Extended Studio History/My Results to list durable jobs, reopen results and reuse prompts.
- Added config-driven server-side AI pricing engine with no invented defaults.
- Added safe owner-only generation credit estimate endpoint.
- Added owner-only provider/model performance metrics endpoint.
- Added feature-gated owner model controls for enable/disable, maintenance, priority, markup and internal cost; generation and estimates honor them when enabled.
- Added owner-only AI Control page linked only for admin accounts; no API keys/secrets are exposed.
- Added opt-in restart recovery polling for already-created async provider task IDs; it never creates a replacement generation.
- Added safe server-side smart routing candidate ordering and owner route preview; no automatic fallback is allowed after a provider call may have started.
- Added feature-gated per-user concurrency/hourly generation limits.
- Added S3-compatible object storage with signed server-side PUT/GET/DELETE; generated bytes leave PostgreSQL when storage is enabled.
- Added owner held-credit review/release with explicit job confirmation and audit metadata.
- Added isolated PostgreSQL test for repeatable legacy-pilot → commercial-job migration.
- Wired the existing AI wallet into Studio behind `AI_STUDIO_WALLET_ENABLED=false`: reserve before provider execution, durable `finalizing` state, capture after output persistence, retry capture without regenerating, release on confirmed terminal provider failure, hold ambiguous failures for review.
- Recorded Roadmap Block 7 — Pricing, Credits, Stripe & Unit Economics.
- Added/updated unit and browser test coverage for these changes.

## Repository-safe next tasks

These can be implemented without spending provider credits, but must remain feature-gated:
1. keep automatic post-dispatch fallback disabled until provider idempotency/accepted-task semantics are verified;
2. finish production object-storage provisioning/retention policy once real credentials are available;
3. define public AI entitlements and per-plan concurrency/hourly values after pricing is approved;
4. extend owner analytics from provider/job metrics into revenue/margin/credit-pack reporting after live Stripe AI products exist;
5. build remaining BASE onboarding/template/admin foundations that do not depend on live provider output.

## External / owner / Work-required gates

These cannot be truthfully marked complete from repository code alone:
- accept/complete BytePlus account agreements/profile requirements;
- activate approved BytePlus models and create/store the API key securely;
- verify current live provider pricing and approve Deepsyq credit economics;
- provision production object storage;
- configure required Render secrets/services/background worker;
- configure/verify real AI Stripe Products/Prices and webhook behavior;
- run real paid provider smoke tests;
- run staging database migration/backup and rollback checks;
- verify real Google login and any desired Apple login;
- physical Android/iPhone acceptance;
- controlled production deployment and post-deploy regression.



## Continuation 3 — commercial job + wallet foundation

Current feature-branch code now uses `vv_generation_jobs` rather than the pilot table for Studio reads/writes. The migration is additive and copies legacy pilot rows without deleting the old table. The existing AI wallet is shared with Studio only when `AI_STUDIO_WALLET_ENABLED=true` and approved pricing exists. The default remains OFF. Provider execution cannot start until a reservation succeeds; successful media is first persisted as `finalizing`, then wallet capture is attempted. Recovery may retry only the wallet capture or an existing provider task ID, never a replacement generation. Confirmed terminal provider failures release the reservation; ambiguous submission failures keep the reservation held for owner review. CI for the latest head is running; do not treat this continuation as verified until those checks pass.


## Continuation 4 — routing, storage and safety foundations

Repository-only work now includes:
- safe pre-dispatch Smart routing candidate ordering by owner priority and internal cost; existing default models retain a higher base priority when no override exists;
- owner route preview that never calls a provider;
- no post-dispatch automatic fallback, preserving the no-duplicate-paid-call rule;
- feature-gated per-user concurrent-job and hourly-job limits;
- server-side S3-compatible object storage with signed PUT/GET/DELETE; when configured, generated media is stored there and PostgreSQL keeps output metadata instead of result bytes;
- owner-only held-credit review and explicit release flow for ambiguous failed jobs, with confirmation and audit metadata;
- isolated PostgreSQL migration coverage for repeatable `vv_generation_pilot` → `vv_generation_jobs` migration.

All new commercial switches remain OFF by default. Real bucket credentials, provider keys, live Stripe AI products/prices, production migrations and deployment are still external gates. Latest CI must pass before these changes are treated as verified.
