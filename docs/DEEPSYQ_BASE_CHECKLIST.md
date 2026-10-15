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
| 7 | AI Provider Router | PARTIAL | Shared dispatch/catalog exists, but full provider-neutral router contract + admin routing/fallback remains incomplete. |
| 8 | Fallback | NOT STARTED | Do not auto-retry paid provider calls until ambiguity/idempotency rules are implemented. |
| 9 | Provider config in admin | PARTIAL | Feature-gated owner API now supports model enable override, maintenance, priority, markup and internal cost. Full primary/fallback routing UI is still pending. |
| 10 | Normal generation-job database entity | PARTIAL | Durable job metadata migration now stores provider/model/prompt/lifecycle/cost/credits/settings. Current table remains pilot-oriented and needs commercial migration/cleanup. |
| 11 | Permanent object storage | BLOCKED | Current pilot stores result bytes in PostgreSQL; production S3-compatible storage/service credentials are still required. |
| 12 | Background jobs | PARTIAL | Async provider tasks persist external operation IDs; in-process kickoff is not a restart-safe commercial worker. |
| 13 | Internal AI credit system | PARTIAL | Separate AI wallet exists; not yet connected to commercial generation jobs. |
| 14 | Credit ledger | PARTIAL | Purchase/reserve/capture/release/refund/debt ledger primitives exist. Commercial job integration pending. |
| 15 | Credit reservation | PARTIAL | Atomic reservation/settlement exists in wallet; generation-job wiring pending approved pricing. |
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
| 31 | Generation UX/status | PARTIAL | Processing/ready/failed/unknown flows exist; commercial queued/finalizing/reserved-credit UX incomplete. |
| 32 | Friendly error handling | PARTIAL | Provider errors are normalized in pilot; broader public error taxonomy remains incomplete. |
| 33 | Safe retry | PARTIAL | No automatic paid retries on ambiguous failure; durable commercial retry/recovery needs worker integration. |
| 34 | Server-side rate/concurrency limits | PARTIAL | Owner pilot has durable attempt cap; public per-plan concurrency/rate limits not implemented. |
| 35 | Security | PARTIAL | Keys server-side, auth/user scoping, safe provider URLs, Stripe verification foundations exist; launch security review still required. |
| 36 | Privacy | PARTIAL | Reference media is not persisted by current pilot; final Terms/Privacy/provider disclosures and retention policy pending. |
| 37 | Business analytics | PARTIAL | Existing account analytics plus new owner provider/model job metrics foundation; revenue/margin/churn dashboard incomplete. |
| 38 | Admin dashboard | NOT STARTED | Needs owner UI for users/jobs/providers/models/credits/templates. |
| 39 | Provider performance | PARTIAL | Owner metrics endpoint aggregates provider/model jobs, success/failure, processing, average time, cost and charged credits. |
| 40 | Model routing registry | PARTIAL | Shared model catalog/capabilities exists, but logical product model IDs and dynamic routing are incomplete. |
| 41 | Internal model capabilities | PARTIAL | ratios/references/quality/duration/provider metadata exist; full capability schema is incomplete. |
| 42 | Persist BytePlus output in our storage | BLOCKED | Adapter downloads/validates media; permanent object storage is not provisioned. |
| 43 | Pricing page | PARTIAL | Existing plan display/checkout reused; final Deepsyq AI subscription/credit economics not approved. |
| 44 | Free plan | PARTIAL | Existing non-AI trials/tools exist; safe AI acquisition allowance not defined. |
| 45 | Onboarding | NOT STARTED | Needs creation-goal onboarding after registration. |
| 46 | Homepage conversion | PARTIAL | Deepsyq dashboard exists; full public conversion homepage/examples require launch content. |
| 47 | Do not expose BytePlus as our product | DONE | Provider stays implementation detail; Deepsyq branding used. |
| 48 | Production safety / regression | PARTIAL | Feature flags, CI and no-live-change discipline exist; backup/staging/live regression still required before launch. |
| 49 | Database migrations | PARTIAL | Additive migrations are used; production migrations have not been run for current feature branch. |
| 50 | Feature flags | PARTIAL | Major Deepsyq/studio/billing gates exist; future modules need their own flags as implemented. |
| 51 | First commercial vertical slice | PARTIAL | UI/provider/jobs/history foundations exist; live credits→generation→storage→margin chain is not complete. |
| 52 | Required implementation order | IN PROGRESS | Continue BASE before Roadmap Blocks 1–7. |
| 53 | Explicit non-goals for now | DONE / RULE | No unnecessary marketplace/social network/Photoshop/huge provider sprawl should be built during BASE. |
| 54 | BASE readiness criteria | NOT MET | Cannot mark BASE done until a real new user can buy/get AI credits, generate image/video, leave/return, retrieve result, see correct charge/refund and old tools still work. |
| 55 | Required final report | PENDING | Produce only after BASE verification/deployment gate. |

## Repository work completed in the current continuation

- Added Work-limit efficiency rule to `AGENTS.md`.
- Added durable generation-job metadata migration with provider/model/prompt/lifecycle/cost/credit/settings fields.
- Extended Studio History/My Results to list durable jobs, reopen results and reuse prompts.
- Added config-driven server-side AI pricing engine with no invented defaults.
- Added safe owner-only generation credit estimate endpoint.
- Added owner-only provider/model performance metrics endpoint.
- Added feature-gated owner model controls for enable/disable, maintenance, priority, markup and internal cost; generation and estimates honor them when enabled.
- Recorded Roadmap Block 7 — Pricing, Credits, Stripe & Unit Economics.
- Added/updated unit and browser test coverage for these changes.

## Repository-safe next tasks

These can be implemented without spending provider credits, but must remain feature-gated:
1. finalize the commercial generation-job schema/repository instead of the pilot naming;
2. add primary/fallback provider routing policy and owner UI on top of the model-control registry;
3. connect AI wallet reserve/capture/release to commercial jobs behind disabled feature flags;
4. add server-side public concurrency/rate-limit policy;
5. build templates/onboarding/admin UI foundations where they do not depend on live provider output.

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

