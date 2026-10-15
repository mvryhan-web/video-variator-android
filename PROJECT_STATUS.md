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

## Current owner direction — BASE-first implementation (2026-10-15)

Owner asked to prioritize building out the full BASE and website instead of repeatedly triaging CI failures. Keep already-working functionality and production/billing untouched. Defer optional CI-error analysis and broad regression work to the later integrated acceptance phase; do not mistake that pause for verification of unfinished code or permission to skip necessary release safety gates.

Current bounded contributions in PR #42: the homepage Canvas offers optional model-catalog-based aspect ratio preferences, preserves the choice only in the current tab's draft, and hands it to the existing Studio for model-specific validation. Dashboard also shows the four most recent user-owned Studio jobs read-only via the existing authenticated history API, without duplicating media or job storage. **Status: IMPLEMENTED / UNVERIFIED** per owner instruction; no browser/CI test has been run for these additions. Continue BASE from the original TXT and the checklist, without creating duplicate components.

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
| 3 | Inspiration / Create Yours | CODE READY / CONTENT + BROWSER CI GATED | BLOCK 3 IMPLEMENTED | Original gallery, filtered image/video previews, Studio prefill, owner rights controls, approved migration path; needs owned/licensed publish content, live rollout approval and final browser CI. See `docs/BLOCK3_INSPIRATION_CHECKLIST.md`. |
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

## Continuation — 2026-10-15: Dashboard quick-create and CI hardening

- Added a real prompt-first Image/Video entry on the existing Deepsyq dashboard (HTML/JS/CSS). It uses the existing IndexedDB/session-based Studio handoff, does not send prompt/media to the server, never starts generation automatically, and requires the existing Studio consent step.
- Added dashboard route and browser handoff regression checks for the new workflow.
- Fixed a JavaScript parsing error in Studio AI-credit ledger presentation (mixed nullish coalescing with logical OR); extended the platform CI JS syntax checks to include Studio and handoff.
- Updated stale unit mocks for Studio recovery claim SQL, commercial job INSERT arguments, cost-currency analytics and audited owner endpoints.
- Coordinated destructive PostgreSQL generation-job fixture tests with a shared advisory lock so concurrent Node test files do not drop each other's tables.
- BASE Canvas/main site remain **PARTIAL**. These are feature-branch changes only, not proof of deployed production functionality. Latest CI must pass; live paid AI, public root switch, production migrations and provider activation remain gated.

## BASE Canvas follow-up — 2026-10-15

- Feature branch `deepsyq-platform` / PR #42: homepage quick-create now allows user-authored Image/Video prompts plus up to four local PNG/JPG reference images (1 MB each), file picker or drag/drop, preview and removal. Uses the existing `studio-handoff.js` transfer, retains Studio's per-model reference limits and explicit consent before generation. No upload or paid request on selection.
- Added Create / Canvas sidebar shortcut; restored featured AI Apps homepage section and corrected its API origin. No invented or auto-seeded templates; section stays hidden if active featured templates are absent.
- Added route and Playwright coverage for local handoff, references/removal, featured workflows and navigation. Local source syntax inspected; GitHub Actions for the current head are still queued/not yet confirmed. Do **not** mark BASE verified or deployed.
- Production root switch, migrations, payment/provider activation remain blocked pending approval and live prerequisites. Next: inspect latest GitHub Actions run logs after runners finish, resolve remaining failures before further BASE claims.

## Isolated design preview preparation — 2026-10-15

- Added `server/deepsyq-preview.js`, a **visual-only, read-only preview entrypoint** using existing Deepsyq frontend assets. No production DB, authentication, wallet, provider or Stripe integration is instantiated. Preview API blocks paid/writing endpoints and advertises the real public model catalog with every model disabled.
- Added `npm run preview:deepsyq`, `tests/deepsyq-preview.mjs`, focused CI checks and `docs/DEEPSYQ_PREVIEW.md` with a separate free Render web-service deployment checklist.
- Repository code is committed to `deepsyq-platform` / PR #42; **preview service is NOT deployed**. The owner deferred a staging URL to focus on site construction. Do not launch a preview or change production without renewed explicit approval.
- Latest GitHub Actions for the feature branch remain queued; no verified passing CI or externally accessible test URL can be claimed yet.
- BASE remains in progress, legacy production and existing billing stay untouched. Continue with specific CI failures once runners finish; do not start independent roadmap Blocks 1–7 before BASE handoff without owner instruction.

## BASE CI repair and prompt-starter continuation — 2026-10-15

- Read current GitHub Actions for PR #42 head `be37bc1`: **PASS** Lifetime billing verification, Free Telegram Mini App checks and Build Video Uniquifier APK. **FAIL** platform/browser regression, AI Studio preview browser suite and Validate Video Variator Web. These completed results belong only to the referenced historical head; later commits are not yet proven green.
- Fixed concrete owner-admin defect: `loadPurchases()` existed but was missing from both initial `verifyOwner()` and manual Refresh calls. The purchases table now gets requested. New browser regression is already present in `tests/deepsyq.spec.mjs`.
- In existing Studio History, made the button's action explicit as **Reuse prompt**, matching the browser test; its existing no-auto-generate behavior is retained. Corrected Product Video browser assertions to inspect actual readonly textarea `value` rather than nonexistent text nodes, and corrected its studio URL regex. No provider call, payment flow or legacy tool implementation changed.
- BASE Canvas now offers three **local, editable prompt starters** in the existing homepage quick-create composer. These are examples, not activatable templates or generated outputs; user-authored text is protected by a replacement-confirmation prompt. Added a no-paid-request browser regression.
- New head checks currently **queued/pending**, not marked verified. Live production OAuth checks also returned `google=503, apple=503` at the old head; this is external production configuration, not proof of a frontend regression. Do not change production auth secrets without owner approval.
- Files touched: `app/src/main/assets/deepsyq-admin.js`, `generate-studio.js`, `deepsyq.html`, `deepsyq.js`, `deepsyq.css`, `tests/deepsyq.spec.mjs`, `docs/DEEPSYQ_BASE_CHECKLIST.md`. Next: use fresh GitHub CI failures only to address remaining relevant BASE issues; keep checked historical milestones intact. Preview staging deployment deferred per owner's latest instruction.

## BASE Canvas refresh resilience / web regression follow-up — 2026-10-15

- Existing Deepsyq homepage Canvas now saves **only editable prompt text and Image/Video mode** in tab-scoped `sessionStorage` (key `deepsyq_quick_canvas_draft_v1`). The saved text survives accidental refresh; references are intentionally not persisted. Added a confirmed **Clear draft** action and an explicit privacy note, without a new project database, upload endpoint or AI generation.
- Added Playwright coverage for restore after refresh, nonpersistent reference photos, cancel/confirm reset and no paid AI requests in `tests/deepsyq.spec.mjs`. JS syntax was inspected locally from source; full browser CI for these changes is **pending**, so this remains **PARTIAL**.
- Fixed the **web-browser fixture only** for authenticated AI wallet summary: the test mocked obsolete `/api/ai-billing/balance` while the working UI calls `/api/ai-wallet/balance`. Did not change the wallet backend or billing behavior.
- Historical head `d86b1d9` CI: **SUCCESS** AI Studio preview checks, Lifetime billing, Telegram Mini App; **FAIL** Validate Video Variator Web (wallet fixture route; production OAuth Google/Apple health=503 also seen in earlier runs); **IN PROGRESS** platform regression when last inspected; APK build was cancelled after the newer push. These checks do not certify later Canvas/draft commits.
- Scope: existing `deepsyq-platform`, PR #42. Production, credentials, payment activation and separate Render preview remain untouched/deferred as requested. Keep the BASE status PARTIAL until current-head tests and real user flow pass.


### Block 3 — Inspiration / Create Yours

**CODE COMPLETE / CONTENT GATE on `deepsyq-platform`; scope is limited to Block 3.**

- Data-driven `vv_ai_inspiration` supports Images/Videos, categories, supported aspect ratios, preview/poster, prompt, model/settings, source-input hints, featured/order and action target.
- Public gallery supports All / Images / Videos, category, aspect-ratio and text-search filters. Filter state is reflected in the URL for shareable views, and bounded Load-more pagination keeps larger libraries scalable.
- Publishing requires owned/licensed status **and a recorded rights evidence note**; legacy/invalid active rows without that evidence are excluded from public queries. No inspiration assets are seeded or fabricated.
- Full responsive gallery renders image/video previews plus prompt/template metadata and the required **Create yours / Use this prompt / Clone and Try** actions.
- All currently public actions lead into the real Studio with bounded prompt/settings prefill; no action starts a paid generation automatically and inspiration source assets are never copied into the user's request.
- Homepage contains data-driven Featured AI Apps and Inspiration previews with Explore-all routes plus live Inspiration category shortcuts. Agent examples remain hidden until **both** `AI_INSPIRATION_AGENT_TARGETS_ENABLED=true` and a safe same-origin `AI_INSPIRATION_AGENT_PATH` are configured. Block 3 writes the future handoff to `deepsyq_agent_inspiration_start`; it does not create or fake Block 2.
- AI Apps now cross-links to Inspiration. `AI_INSPIRATION_ENABLED=false` remains the production rollout gate.
- Owner AI Control now includes Block 3 publish-readiness counts/blockers for approved images, videos, featured examples and rights evidence.
- **Only remaining Block 3 dependency is content:** owner must add real Deepsyq-owned or properly licensed image/video examples (with rights evidence) before public rollout.


### BASE CI repair — mobile navigation and WebKit local image handoff

**IN PROGRESS / CI PENDING — PR #42, `deepsyq-platform`.** Targeted work after reviewing the failed GitHub browser suites:

- Legacy mobile Logout failure (Firefox/mobile-WebKit): the account button was off-screen within a fixed, non-scrollable sidebar; updated only mobile sidebar to scroll within its own viewport. Updated the browser test to open the menu **only if not already open** (previous test toggled it closed just before clicking Logout). Production authentication/logout backend unchanged.
- WebKit local reference handoff failure (Dashboard Canvas and Product Video): changed the **existing** `studio-handoff.js` IndexedDB record to serialize references as transferable ArrayBuffers rather than nested `File` objects. The read path accepts both new `bytes` and legacy `blob` records. All files remain local; no new uploads, project DB, payments or AI provider calls. Source syntax parsed successfully; Safari/WebKit regression remains to be confirmed by current-head CI.
- CI evidence before these changes: last inspected previous branch head `5d1135c` had success on AI Studio preview, Lifetime billing and Telegram, while browser suites still failed on WebKit handoff/mobile menu and a separate admin-mobile action interception; active build runs on later heads may be cancelled by new pushes.
- **Do not mark BASE verified or deploy from this log.** Next: inspect the completed latest-head CI; if WebKit still fails, use failure page status/trace to isolate the actual IndexedDB/transfer error instead of blindly rewriting working code. Agent Block 3 Inspiration files are being edited on this same branch by another workstream — preserve its latest changes.

### BASE Image — continue from existing result (2026-10-15)

- Continued the BASE Image feature in the existing Image/Video/Audio Studio, without starting any of Roadmap Blocks 1–7. The generated-image result now has a **Use as image reference** action. It prepares the selected ready image locally as a bounded JPEG and loads it as a reference in the existing Image workflow. The user writes a new prompt, explicitly consents, and manually presses Generate; this action does not submit provider jobs or debit credits.
- Fixed a concrete implementation issue in the new action: `select()` and `acceptFiles()` intentionally ignore changes while `busy=true`, so the local preparation lock now releases before transferring the new draft. This is an implementation correction, **not a full CI verification**.
- Scope: `generate-studio.html`, `generate-studio.js`, BASE checklist. No production, billing, existing auth, DB schema or deployment changes. Full browser/CI acceptance is deferred at the owner's request. Keep Image and BASE status **PARTIAL / UNVERIFIED**, particularly pending approved real provider access and complete editing controls.


### BASE Image — local reference cropping

- Added a working-code local reference crop workflow to the **existing** Image Studio without adding another app, server, job pipeline or new paid provider action. Each reference tile now offers **Crop**; a modal uses the browser canvas to preview original/1:1/4:5/9:16/3:2/16:9 framing, zoom and horizontal/vertical positioning, including dragging the preview.
- **Apply crop** encodes a bounded JPG within the existing 1 MB upload validation limit, updates only that reference's local file/data pair, and clears prior generation consent. **Original** restores the in-session original uploaded reference; untouched source files on the user's device are never modified. No provider API call, upload, wallet mutation or automatic generation is made by the crop editor.
- BASE item #4 remains **PARTIAL / UNVERIFIED** per owner request to defer extensive CI/browser regression until the integrated site is built. Additional provider-dependent image settings (resolution/quantity/negative prompt/seed where supported) and live verified Seedream access remain unfinished; never expose or submit unsupported settings. Production and Stripe remain unchanged. Seven separate roadmap blocks are not being progressed in this BASE pass.


### BASE Image — per-model output resolution

- Extended the existing Image Generator (not a new Studio) with a model-capability-based **Output resolution** selector. Google/Nano Banana 2 currently exposes 1K / 2K / 4K supported by its wired adapter. The existing BytePlus Seedream adapters remain at their currently wired 2K output sizes; future 4K support must be implemented separately instead of advertising unsupported handling.
- Output resolution is validated on the server for both credit estimates and actual generation, forwarded through the Google generation adapter, persisted with job settings, and restored for reusable Image History items and same-tab drafts. Switching quality resets generation consent.
- AI credit pricing is resolution-aware. An upgraded resolution **cannot** use a wildcard/default-quality cost row: until the owner configures the corresponding explicit model+quality price, the server returns `AI_PRICING_NOT_APPROVED` without starting generation. No fabricated amount or silent premium charge.
- New code remains **IMPLEMENTED / UNVERIFIED**: broad CI/browser suites and real paid provider requests are postponed at the owner's request. Production, provider credentials, live Stripe, migrations, feature activation and the separate seven roadmap blocks remain untouched. BASE #4 is still PARTIAL.


### BASE Image — edit saved History images directly

- The existing authenticated user-scoped Studio History now adds **Edit image** only on ready Image jobs. It fetches that user's saved image via the existing media route, locally converts it to a JPG reference within the existing 1 MB constraint, and opens the existing Image composer; no new API endpoint or second media upload is introduced.
- Reused the same local continuation helper for the just-created result and a saved History item. The Image prompt is kept if already written; for an empty prompt, the saved History description is offered as a starting point. Existing reference photos remain when the model has room, and replacing a full set needs user confirmation. Consent is cleared; **no AI generation, wallet charge, production deployment or settings change happens merely by editing**.
- Implementation is saved to the current `deepsyq-platform` PR #42. Owner-requested whole-site CI/browser acceptance remains deferred. **BASE Image #4 remains PARTIAL / UNVERIFIED**: real BytePlus activation, verified provider economics, production data-storage gates, and further actually supported image capabilities are outstanding. Blocks 1–7 remain separate and untouched.
