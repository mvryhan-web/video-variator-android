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
