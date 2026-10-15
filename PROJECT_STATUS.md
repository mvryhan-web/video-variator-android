# PROJECT_STATUS.md — Deepsyq live project state

Last updated: 2026-10-15
Repository: `mvryhan-web/video-variator-android`
Brand: **Deepsyq**
This file is the shared live progress board for all coding agents.

> Read `AGENTS.md` first. Do not mark anything DONE without implementation + verification.

## Current priority gate

**ACTIVE NOW:** finish the currently assigned production/TXT scope already being handled by the current ChatGPT Work agent.

Visible active work in GitHub:
- branch: `ai-generation-studio`
- open PR: **#40 — Prepare compact AI video, image and audio studios; keep generation and billing gated**
- PR #40 remains the earlier generation-studio branch. The active continuation is now `deepsyq-platform` / draft PR **#42**, which builds on that work plus current `main`.
- Neither PR is treated as merged production. Always inspect the current PR head before continuing because the branch is actively changing.

**Important:** do NOT assign the current Work agent all roadmap blocks 1–7 by default. Its job is to finish and hand off its current bounded TXT/production scope. Additional agents may take separate non-overlapping roadmap blocks after the relevant shared foundations are stable, or earlier only when the owner explicitly assigns them and collision risk is low.

Before any agent starts a roadmap block, it must audit the latest code/branches/PRs because another agent may already have implemented part of it.

## Existing production baseline

This is an existing production project, not a greenfield app. Preserve and reuse the working codebase, PostgreSQL, authentication, Stripe/billing pieces, Video Uniquifier, utilities, deployment and other existing functionality.

The exact completion state of older components must be verified from the current code and tests. Do not infer completion from names alone.

## Active work ownership

| Workstream | Owner / Agent | Branch / PR | Status | Rule |
|---|---|---|---|---|
| Current TXT / generation-studio scope | Current ChatGPT Work agent | `ai-generation-studio` / PR #40 | IN PROGRESS / OPEN PR | Preserve provider and billing foundations. |
| Deepsyq BASE / current TXT continuation | Current ChatGPT Work agent | `deepsyq-platform` / PR #42 | IN PROGRESS | Reuse existing auth/database/Stripe/providers. Commercial job + wallet foundations are feature-gated; no live billing/provider activation. |

When another agent joins, add one row per claimed workstream before substantial implementation. One agent should own one bounded workstream at a time.

## Approved queued roadmap

| # | Workstream | Status | Assigned owner | Notes |
|---|---|---|---|---|
| 1 | Multi-AI Compare + Smart Model Routing | NOT STARTED / QUEUED | UNASSIGNED | One prompt -> multiple real AI providers, compare, combine, cost/credit tracking |
| 2 | User Agent — “Do it for me” | NOT STARTED / QUEUED | UNASSIGNED | Multi-step execution through Agent Orchestrator |
| 3 | Inspiration / Create Yours | NOT STARTED / QUEUED | UNASSIGNED | Original owned gallery, prompts/templates, Clone/Create Yours flows |
| 4 | Studio + My Workspace | NOT STARTED / QUEUED | UNASSIGNED | Creation editor/templates/skills + personal project workspace |
| 5 | Internal Product Watcher Agent | NOT STARTED / QUEUED | UNASSIGNED | Owner-only scheduled monitoring, recommendations, approvals, daily/weekly reports |
| 6 | Deepsyq Voice Agent | NOT STARTED / QUEUED | UNASSIGNED | Realtime voice interface across Deepsyq, Device Cleanup skill, owner voice access to Product Watcher |
| 7 | Pricing, Credits, Stripe & Unit Economics | NOT STARTED / QUEUED | UNASSIGNED | Reuse existing Stripe; AI credits/top-ups, provider cost, reservations, margins; no unlimited Lifetime AI |

Full requirements: `docs/DEEPSYQ_ROADMAP.md`.

## Multi-agent execution strategy

Use multiple agents deliberately instead of giving one agent the entire backlog.

Recommended split after the current TXT scope is stable enough:

- **Foundation agent:** shared AI Provider Router, jobs, usage/credits, provider configuration.
- **Agent A:** Block 1 — Multi-AI Compare.
- **Agent B:** Block 2 — User Agent / Do it for me.
- **Agent C:** Block 3 — Inspiration.
- **Agent D:** Block 4 — Studio + My Workspace.
- **Agent E:** Block 5 — Product Watcher.
- **Agent F:** Block 6 — Voice Agent.
- **Agent G / later billing pass:** Block 7 — Pricing, Credits, Stripe & Unit Economics.

This split is only a coordination model, not a requirement to hire six agents. One agent may take several blocks sequentially, but no agent should be expected to keep all six in active context at once.

Dependency rule:
- Blocks 1 and 2 should share the same provider/router/job/usage foundations.
- Block 4 should reuse existing generation-studio work rather than recreate it.
- Block 6 should reuse the Agent Orchestrator from Block 2.
- Product Watcher in Block 5 stays technically separate from user Agent permissions but may later expose owner-approved data to Block 6 Voice Owner Mode.

## How a new task is added

When the owner invents a new lasting feature:

1. Add the full requirement to `docs/DEEPSYQ_ROADMAP.md` or another appropriate spec.
2. Add one concise row here with status `NOT STARTED / QUEUED`.
3. Leave it `UNASSIGNED` until an agent is actually chosen.
4. The chosen agent changes it to `IN PROGRESS`, records its branch/PR, and works only on that bounded scope.
5. When verified and merged/deployed as appropriate, change it to `DONE`.

This keeps the roadmap complete without forcing the current agent to implement everything immediately.

## Recommended execution order

1. Current Work agent finishes/hands off the active TXT/generation-studio scope.
2. Reconcile this status file with the real merged code and open PRs.
3. Stabilize shared foundations needed by several roadmap blocks.
4. Assign separate roadmap blocks to available agents.
5. Use separate branches for parallel workstreams.
6. Merge only after tests and conflict review.
7. Update this file after every meaningful handoff/merge.

## Blockers / external dependencies

Record only real current blockers here. Examples include missing API credentials, provider approval, domain/OAuth console configuration, unavailable production secrets, or an external service that has not actually been provisioned.

Current queued-roadmap dependencies to verify before implementation:
- real provider/API credentials for enabled AI providers;
- provider/model availability and pricing;
- production-safe object storage/jobs where required;
- voice provider capability and cost;
- OS/browser permissions for Device Cleanup;
- Render scheduling/worker configuration for Product Watcher.

## Handoff — 2026-10-15

**Workstream:** Deepsyq Dashboard / navigation / pricing and SEO entry, current TXT scope.
**Owner:** current ChatGPT Work agent.
**Status:** PARTIAL / feature branch only; current Dashboard CI passed.
**Quota integration:** existing PR28 reservation/settlement code reused with additive migration, CI-only PostgreSQL fixture, and production-URL guard. Legacy five shared trial tasks retained provisionally; requested per-tool trials remain PARTIAL.
**Changed:** responsive Deepsyq shell reuses existing studio, tools, email auth, token, plan config and Stripe checkout; honest availability; Lifetime separated; $0.99 Trial visibly not purchasable; comparative SEO; deep links. Main Telegram/docs changes retained.
**Verified foundation (5c28ac7):** Dashboard CI 38551913472 passed (25 unit, 70 browser cases with one retry); general web CI passed (327 passed, 3 retry-passed, 75 skipped); Android build/emulator CI 38551913541 passed. Quota integration (db289716): 28 local checks passed, isolated PostgreSQL integration passed; 70 Deepsyq browser cases passed without retries; Android build/emulator passed. Full web CI 38623063405 passed: 358 passed, 3 retry-passed, 74 skipped. Not a real production login/payment test.
**Branch:** `deepsyq-platform` built from `ai-generation-studio` PR40 plus main 14de516.
**Blockers:** owner-only AI, BytePlus profile/payment activation and missing secure key, public job/credit/storage flow, real Trial entitlement, existing PR28 quota reconciliation. No live production changes.
**Next:** keep post-dispatch fallback disabled until provider idempotency is verified; finish external object-storage provisioning/retention, real provider economics, public AI entitlements/limits, and live Stripe AI products only after owner/external gates. Repository-safe routing, rate limits, storage abstraction and billing-review reconciliation are now implemented behind disabled flags. Roadmap blocks 1–7 stay queued.
**Continuation 2026-10-15:** work-limit efficiency rule added to `AGENTS.md`. Owner-only `GET /api/studio/jobs` now exposes the latest 50 non-deleted generation records as safe metadata for History; it does not expose media bytes. Unit fixture updated to cover listing and deletion filtering. No provider activation, payment, production database, deployment or public-access change was made. Durable generation-job metadata migration was added (provider/model/lifecycle/cost/credit fields), Studio My Results now renders saved jobs and can reopen a stored result, and a config-driven server-side generation pricing engine plus safe credit-estimate endpoint were added. No default AI prices were invented; pricing remains unconfigured until verified provider economics are entered.

**Continuation 2 — repository-safe BASE work:** Added feature-gated owner model controls (enable override, maintenance, priority, markup, internal cost), an owner-only AI Control page, and priority-based default model selection. Studio History now lists durable jobs, reopens results and reuses prompts. Server-side pricing remains config-only with no invented rates. Added an opt-in recovery poller that resumes only existing async provider task IDs after restart and never starts a replacement generation; unit coverage asserts that behavior. No provider key, live Stripe AI price, production migration or deployment was changed. See `docs/DEEPSYQ_BASE_CHECKLIST.md` for the point-by-point original TXT status.

**Detail:** `docs/DEEPSYQ-FOUNDATION-HANDOFF.md`, `docs/DEEPSYQ_BASE_CHECKLIST.md`, and original TXT in `docs/DEEPSYQ_PLATFORM_SPEC.md`.

**External verification:** CI production probe on Oct 14 reached health/config and found billingConfigured=true, Google and Apple unconfigured (503). The smoke step permits failure; a green workflow does not establish production OAuth readiness. Apple remains intentionally disabled. Oct 15 BytePlus console is signed in but blocks model configuration on an unchecked terms/customer agreement/data-processing consent dialog; no acceptance or activation performed.


### Continuation 3 — 2026-10-15

- Studio now reads/writes commercial `vv_generation_jobs`; migration additively copies legacy `vv_generation_pilot` rows without deleting the old table.
- Existing `GenerationWallet` is shared with Studio behind `AI_STUDIO_WALLET_ENABLED=false`.
- When enabled with approved pricing, generation reserves credits before provider execution. Immediate or polled output is persisted in `finalizing` state before wallet capture; capture recovery never regenerates media.
- Confirmed terminal provider failures release reservations; ambiguous provider-submission failures retain the reservation for billing review rather than guessing/refunding.
- Studio UI understands queued/finalizing states and insufficient-credit / wallet-unavailable errors.
- No live Stripe AI product, provider key, Render secret, production DB migration, public entitlement, deployment or root switch was enabled.
- Latest branch CI is running after these changes; do not mark this continuation verified until the current head is green.


### Continuation 4 — 2026-10-15

- Added safe pre-dispatch Smart routing with compatible candidate ordering. Default existing models keep preferred base priority unless owner overrides it.
- Added owner route preview; it never performs a provider call.
- Automatic fallback after a provider request may have started remains intentionally disabled.
- Added feature-gated server-side per-user concurrent-job and hourly-job limits using PostgreSQL advisory locking.
- Added S3-compatible object storage abstraction with server-side SigV4 PUT/GET/DELETE. When enabled, generated media is stored externally and PostgreSQL keeps metadata rather than result bytes.
- Added owner held-credit review/release flow with explicit job confirmation, note and audit metadata; no generation retry is triggered.
- Added isolated PostgreSQL migration test for repeatable legacy pilot → commercial generation-job migration.
- New environment switches/storage credentials are documented in `.env.example`; all remain disabled/unconfigured by default.
- No live provider key, Stripe AI price, production object-storage credential, production database migration, deployment, root switch or public AI access was enabled.
- Latest CI for the current head is still the verification gate; do not call this continuation verified until those workflows are green.


### Continuation 5 — templates and onboarding

- Added data-driven `vv_ai_template` migration/API matching the original BASE schema; no hard-coded per-card backend architecture and no fake seeded assets.
- Owner AI Control now includes template create/edit/activate/feature/reorder controls.
- Added persistent Image/Video onboarding state and new-account signaling for email, Google and Apple auth.
- Deepsyq onboarding appears only for newly created accounts in this flow and routes to real Image/Video studios; unavailable Product Ads/Avatar workflows are not advertised as working.
- No public AI launch, provider spend, Stripe AI product, production migration or deployment was enabled.


### Continuation 6 — History and AI Apps

- Studio History now has server-whitelisted filters and safe Open/Download/Reuse/prepare-only Regenerate/Delete actions. No History action silently starts a paid generation.
- Added a responsive, data-driven AI Apps page backed by active `vv_ai_template` records only; no fake examples are seeded.
- Use Template prepares the real Studio with prompt/default model/ratio but keeps consent unchecked and does not auto-generate.
- Dashboard main/secondary CTAs now point to real creation and active templates.
- These remain feature-branch changes; no production/root/provider/payment activation occurred.


### Continuation 7 — Product Video workflow

- Added BASE Product Video guided workflow using local-only file handoff into the existing Video Studio.
- Product photos/logo are not sent to a provider from the workflow page; Studio restores compatible references, prompt and ratio locally, consent stays unchecked, and generation is never auto-started.
- No live provider/payment/public entitlement/deployment switch was enabled.


### Continuation 8 — owner read-only business operations

- Owner AI Control now has read-only business, user and generation-job operational views.
- Sensitive auth fields, OAuth subject identifiers, Stripe customer IDs, media and prompts are not returned by these views.
- Confirmed AI-wallet purchases remain separated by currency; gross margin is not fabricated before live economics are approved.
- No manual credit adjustment or Stripe write action was enabled.


### Continuation 9 — audited manual AI credit adjustment

- Added feature-gated owner AI-wallet adjustments with explicit user confirmation, idempotency and audit reason.
- Negative adjustments cannot overdraw available credits or create hidden debt. Stripe is untouched.
- `AI_OWNER_CREDIT_ADJUSTMENTS` remains OFF by default; enabling it requires an owner operational policy decision.


### Continuation 10 — production-safe BASE feature flags

- Added `AI_APPS_ENABLED`, `AI_PRODUCT_VIDEO_ENABLED` and `AI_ONBOARDING_ENABLED`; production defaults OFF unless explicitly true.
- Public APIs/routes and Dashboard visibility honor these flags; owner template preparation remains available while AI Apps public rollout is off.
- Existing provider/billing/root switches remain unchanged and OFF where previously gated.


### Continuation 11 — AI media privacy disclosure

- Added implementation-accurate AI media handling disclosure and links from Studio/Product Video/Dashboard.
- Local Product Video handoff now cleans expired records when the IndexedDB handoff store is accessed.
- Final legal Terms/Privacy and server retention schedule remain external owner/legal launch gates; no unsupported promise was added.


### Continuation 12 — data-driven homepage workflows

- Homepage can now surface up to six owner-approved featured workflows from the shared template API.
- Empty/unavailable catalogs remain invisible instead of showing fake examples.
- No public rollout flag was enabled; content remains controlled by AI Apps feature gating and owner template activation.


### Continuation 13 — commercial safety foundations

- Centralized provider/user-facing AI error codes; no raw upstream error body is exposed.
- Model catalog now exposes normalized capabilities consumed by routing/pricing.
- Provider status polling is atomically throttled across browser and recovery paths.
- Sensitive owner AI actions are written to a dedicated audit log and visible read-only in Owner AI Control.
- Added config-driven public AI plan entitlements behind `AI_PUBLIC_GENERATION_ENABLED=false`; no plan limits or Lifetime AI access are invented.
- Generate creation now supports per-user UUID idempotency/fingerprint conflict protection to prevent duplicate paid jobs.
- All public commercial switches remain OFF pending real provider/storage/Stripe/economics gates.


### Continuation 14 — production rollout controls

- AI credit checkout is now code-ready for explicit test/live Stripe modes; live requires `AI_LIVE_BILLING_APPROVED=true` in addition to live mode/key and AI billing enablement.
- Stripe `charge.refunded` now synchronizes cumulative partial/full AI-credit refunds into the wallet ledger; spent refunded credits become wallet debt rather than free credits.
- Studio exposes AI wallet balance and configured credit packs only when AI billing is enabled; checkout starts only after an explicit user click and the returned URL must be `https://checkout.stripe.com`.
- Provider cost currency is now explicit per pricing row/job; owner analytics keeps costs separated by currency and launch readiness blocks pricing rows without currency.
- Added checksummed transactional `npm run migrate:ai`, read-only `npm run migrate:ai:check`, read-only `npm run ai:preflight`, and standalone `npm run worker:generation`.
- Added `docs/AI_PRODUCTION_ROLLOUT.md`; no production flags/services/keys were enabled by these repository changes.


### Continuation 15 — separated Pricing and wallet activity

- Added `ai-pricing.html`: existing Video/Everyday Tools subscriptions and Lifetime are visually/semantically separate from AI credit packs.
- No AI pack prices are hardcoded; the page uses `/api/ai-billing/config` only, and checkout buttons remain disabled unless AI billing is active.
- Studio wallet now renders recent ledger activity and handles Stripe return/cancel states without claiming payment before webhook confirmation.

- Added missing Studio messages for server-side AI rate/concurrency limits and unapproved pricing.


### Continuation 16 — Dashboard AI wallet

- Authenticated users can see current AI-wallet available/held/debt status in the Deepsyq header when AI billing is enabled.
- The wallet chip is hidden when billing is disabled or unavailable and links to the existing AI Pricing page.


### Continuation 17 — pre-generation credit estimate

- Studio now surfaces server-priced AI credits before Generate without uploading prompt/media for the estimate.
- Estimate recalculation is debounced and cached by settings signature; no provider generation is triggered.


### Continuation 18 — optional welcome AI credits

- Added an explicit, one-time, server-configured welcome AI-credit claim path; default remains OFF/0.
- Welcome grants are idempotent, ledgered and debt-first, and do not touch Stripe.
- Added payment-independent AI-wallet balance/history/config endpoints for safe user visibility.


### Continuation 19 — Pricing wallet activity

- Pricing now gives signed-in users a read-only AI-wallet summary and recent ledger activity without exposing payment/internal identifiers.
- Existing tool-plan credits and AI-generation wallet credits remain visibly separate.


### Continuation 20 — lazy History image previews

- Studio History now lazily loads protected previews for ready image jobs only.
- Video/audio media is not downloaded for card thumbnails; placeholders remain until the user opens/downloads the result.


### Continuation 21 — user-visible AI plan access

- Studio now explains the signed-in account's configured AI plan entitlement and rate/concurrency limits through a read-only access endpoint.
- No public entitlement values are invented; production still depends on approved `AI_PLAN_ENTITLEMENTS_JSON` and disabled rollout gates.

- Added read-only rolling AI usage counters (active jobs / jobs in the last hour) next to configured public plan limits in Studio.


### Continuation 22 — owner AI purchase/refund ledger

- Owner AI Control now includes read-only confirmed AI credit purchases/refunds with net amounts per currency.
- No Stripe identifiers or write/refund actions are exposed in this table.


### Continuation 23 — provider performance windows

- Owner AI Control can inspect provider/model performance over 24h/7d/30d/all-time windows, including success rate, latency, cost and credits.
- No automatic routing behavior was changed; Roadmap Block 1 remains separate.
