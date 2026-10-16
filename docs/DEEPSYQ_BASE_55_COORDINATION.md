# Deepsyq BASE — 55-item parallel work coordination (2026-10-16)

**Owner direction:** all four coding agents should prioritize the 55 numbered requirements of **BASE**; this is **not Block 1** and it does not authorize reproducing Blocks 1–7. The full original, immutable source is `docs/DEEPSYQ_PLATFORM_SPEC.md`. The authoritative detailed audit and evidence per item is `docs/DEEPSYQ_BASE_CHECKLIST.md`; `PROJECT_STATUS.md` is the shared agent/workstream registry. This file is a coordination board, not proof of implementation, deployment or live testing.

**Snapshot:** all 55 canonical checklist rows read directly from `deepsyq-platform` (source checklist blob `e3a869a3698eba507db80de2adf04e80b6fbd55a`). Exactly **2** items (#47 and #53) are already marked DONE/RULE; the other **53 require some combination of gap work, verification, owner approval, live integration or final reporting**. Partial means **existing code, not start-from-zero**. This source snapshot may grow stale; re-fetch the current branch, PRs, status and test evidence before every claim.

## Four suggested, non-overlapping BASE lanes (NOT confirmed active agent claims)

| Slot | Exact BASE item numbers | Focus / shared-file boundaries |
|---|---|---|
| **A** | 1, 3, 4, 24, 25, 26, 31, 32, 45, 46 | Image Studio, Canvas, History, account onboarding and UX. No Video provider/server, Stripe, Home redesign. |
| **B** | 5, 6, 7, 8, 9, 10, 11, 12, 33, 34, 39, 40, 41, 42 | Video Studio, provider adapters/router, existing generation jobs and worker, model catalog. Preserve Image/UI owners; never initiate a paid call or create a second wallet/router. |
| **C** | 19, 20, 21, 22, 23, 27, 28, 29, 30, 35, 36, 38 | AI Apps, Product Video, templates, Tools, navigation, responsive/privacy/admin UI, security verification. BASE #21/#22 are interface/integration handoffs only; deeper User Agent and Inspiration belong to their separate original Blocks 2/3 TXT and must **not** be rebuilt here. Owner-approved Home design is locked. |
| **D** | 2, 13, 14, 15, 16, 17, 18, 37, 43, 44, 48, 49, 50, 51, 52, 54, 55 | Existing credit ledger/Stripe/pricing, usage analytics, migration/flags/preflight, coordinated release and final acceptance. No live Stripe, database migration or Render deploy without owner-approved backup, staged validation and explicit launch authorization. |

Each listed item belongs to **exactly one** lane here, but a lane assignment is a proposed responsibility, **not proof that one of the other three sessions has started or accepted it**. If existing `PROJECT_STATUS.md` or open PR shows a different current owner, the existing owner wins; coordinate handoff before touching its files. One agent should claim one bounded item/subtask at a time, not claim the whole lane as complete. Other agents with different owners already have code in PR #42 — never overwrite it.

## Shared claim protocol — mandatory for ALL FOUR agents

1. **Before any code:** fetch the newest `deepsyq-platform`, `main`, PR #42, `AGENTS.md`, `PROJECT_STATUS.md`, the **whole original BASE TXT** (`docs/DEEPSYQ_PLATFORM_SPEC.md`), `docs/DEEPSYQ_BASE_CHECKLIST.md`, and the current code/tests for the proposed row. Check other agents' branches/PRs and recent commits. Respect the exact approved Home reference. Existing code plus verified checks outrank stale labels.
2. **Claim before editing:** find one genuinely incomplete, dependency-unblocked row in your assigned lane that is not already claimed in `PROJECT_STATUS.md` or this board. First record a claim in BOTH the single shared `PROJECT_STATUS.md` workstream table and that row's `Claim state / Agent, branch` below: `IN PROGRESS / <agent session label> / <branch-or-PR>`. Push the claim before feature changes, fetch again and ensure no other agent claimed it. A reserved lane by itself is **not** a claim.
3. **Concurrency:** documentation claims on shared branch use current GitHub blob SHA / optimistic concurrency. If changed by another agent, **re-fetch and reconcile**; never force-push or replace someone's newer status. Implement substantial changes on a unique feature branch and a focused PR based on freshly synchronized BASE. No two agents edit the same module without a documented handoff.
4. **Implement missing requirement only**, not an extra invention and not a rewrite of completed modules. Keep scope to the original TXT, with existing auth, PostgreSQL, Stripe, provider router and Video Uniquifier. Preserve feature flags OFF and owner-locked design. For externally blocked items, complete safe repository preparation, record the exact external blocker, and move to another unclaimed item — never fake a live DONE or spin on redundant local tests.
5. **Finish and prove:** focused tests + relevant integration/browser checks, no regressions, PR + SHA + evidence. Update the BASE checklist's detailed evidence, `PROJECT_STATUS.md`, and this board to `CODE VERIFIED` / `BLOCKED` / `READY TO MERGE` as actually supported. Mark `DONE` only if the original requirement is genuinely met by the agreed completion criteria; `CODE VERIFIED` is not `MERGED TO MAIN`, `DEPLOYED`, or `LIVE VERIFIED`.
6. **Release gate:** never merge functional BASE code into `main` or enable paid/public AI without checking its automatic Render deployment, restore-capable production backup, database lifecycle (reported free PostgreSQL expiry **2026-10-17**), migration/rollback, official provider costs/keys, Stripe webhooks, and the owner's necessary approvals. Do not turn "finish today" into a risky database/production overwrite.
7. **Keep working within the assigned BASE lane** after completing one verified, unclaimed item. Share a handoff when blocked. Roadmap Blocks 1–7, particularly already coded Block 5/PR #50, should be **paused rather than duplicated** while this four-agent BASE-first instruction is active; their existing work must be preserved.

## BASE 1–55 inventory and claim board

**Reading:** `Snapshot status` comes from the canonical checklist, not new acceptance. `Action` identifies whether to leave done code alone, finish partial requirements or handle a legitimate gate. `Claim state` is unclaimed until an agent actually updates and pushes its ownership. Multiple agents must not silently assume the same work.

| # | Original BASE checklist requirement | Snapshot status | Lane | Action | Claim state | Agent / branch / PR |
|---:|---|---|:---:|---|---|---|
| 1 | Product becomes Lumina-style AI creative platform | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 2 | New AI platform becomes `/` | BLOCKED | D | EXTERNAL GATE; SAFE CODE ONLY | — | — |
| 3 | Hero / Canvas workspace | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 4 | Image generation | PARTIAL / BLOCKED | A | FINISH SAFE CODE; EXTERNAL GATE | — | — |
| 5 | Video generation | CORE CODE VERIFIED / ADVANCED & LIVE BLOCKED | B | FINISH SAFE CODE; EXTERNAL GATE | — | — |
| 6 | BytePlus first provider adapter | PARTIAL / BLOCKED | B | FINISH SAFE CODE; EXTERNAL GATE | — | — |
| 7 | AI Provider Router | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 8 | Fallback | PARTIAL / SAFETY-GATED | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 9 | Provider config in admin | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 10 | Normal generation-job database entity | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 11 | Permanent object storage | PARTIAL / BLOCKED | B | FINISH SAFE CODE; EXTERNAL GATE | — | — |
| 12 | Background jobs | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 13 | Internal AI credit system | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | MERGED TO BASE / BROWSER REGRESSION VERIFIED (#96 + #104; CI 38912419194 and 38912155019 PASS; LIVE BLOCKED) | BASE-D-StudioWallet / base13-studio-wallet-20261016 |
| 14 | Credit ledger | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | CODE VERIFIED / MERGED TO BASE (scoped; PR #90 · CI 38906957706) | Agent-D |
| 15 | Credit reservation | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | CODE VERIFIED / BASE MERGED (scoped; PR #102 · PostgreSQL CI 38911667162) | Agent-D |
| 16 | Stripe subscriptions + credit packs | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | MERGED TO BASE / POSTGRES VERIFIED (#127+#129+#135+#137; CI 38931399846,38931399839 PASS; LIVE BLOCKED) | BASE-D-CheckoutReuse / base16-checkout-reuse-20261016 |
| 17 | Unit economics | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | PR #89 + #124 / CODE VERIFIED (scoped; NOT LIVE) | Agent-D / CI 38906320339; Agent-D / PR #124 · CI 38925241210 |
| 18 | Pricing engine | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | MERGED #83 + #112 / CODE VERIFIED (scoped, LIVE BLOCKED) | BASE-D-ProviderPricing / base55-d-provider-pricing-20261016; Agent-D / PR #112 · CI 38922082875 |
| 19 | AI Apps | PARTIAL | C | EXISTING PRODUCT VIDEO FALLBACK VERIFIED; REAL TEMPLATE ASSETS + LIVE GATED | CODE VERIFIED / MERGED TO BASE (partial) | ChatGPT lane C / PR #71 / CI 38901487492 / merge 59dea3d3 |
| 20 | Product Video workflow | PARTIAL | C | REORDER+PRESERVE COMPLETE; DURATION BRIDGE AND LIVE GATED | CODE VERIFIED / MERGED TO BASE (partial) | ChatGPT BASE lane C / PR #63 / run 38899612960 / merge b8dc6c18 |
| 21 | AI Agents | NOT STARTED (BASE) | C | VERIFY BASE SCOPE; NO BLOCK DUPLICATE | — | — |
| 22 | Inspiration / Discover | NOT STARTED (BASE) | C | VERIFY BASE SCOPE; NO BLOCK DUPLICATE | — | — |
| 23 | Template system | PARTIAL — PRODUCT NAME VALIDATION CODE VERIFIED | C | REAL TEMPLATE ASSETS, MIGRATION & LIVE GATED | CODE VERIFIED / MERGED TO BASE (PR #88) | Agent C / Issue #74 / merge `8cc09747` / CI 38906432334 + 38906432137; unrelated payment CI failure to D #75 |
| 24 | History | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 25 | My Creations | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 26 | Canvas | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 27 | Existing Video Uniquifier preserved under Tools | PARTIAL | C | ROOT SWITCH/PRODUCTION REGRESSION GATED | CODE VERIFIED (BASE, not live) | ChatGPT Lane C / PR #61 / `base-27-video-uniquifier-tools-20261016` / CI 38898789990 |
| 28 | Utilities gathered in Tools | PARTIAL — AUDIO/COLLAGE/PHOTO COMPRESSION/TELEPROMPTER VERIFIED | C | REMAINING UTILITIES + REAL DEVICE & RELEASE GATED | CODE VERIFIED / MERGED TO BASE (PRs #67/#113/#121) | Agent C / PR #121 merge `5699de20`; browser CI 38924678239; compression 38924678343 / collage 38924678471 PASS |
| 29 | Final navigation | PARTIAL — AI APPS HISTORY/CREDITS + ACCOUNT LINKS CODE VERIFIED | C | WHOLE-APP ACCOUNT NAV AND DEVICE/LIVE GATED | CODE VERIFIED / MERGED TO BASE (PRs #68 + #110) | Agent C / Issue #74 / PR #68 CI 38900798943 / PR #110 merge `89477d7b` CIs 38915655213 + 38915655095 |
| 30 | Desktop / Android / iPhone responsive | PARTIAL — AI APPS MOBILE CODE VERIFIED | C | PHYSICAL DEVICE + WHOLE-APP ACCEPTANCE PENDING | CODE VERIFIED / MERGED TO BASE (PR #79) | Agent C / Issue #74 / merge `c389045d` / CI 38904085432 / Agent 5 reviewed |
| 31 | Generation UX/status | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 32 | Friendly error handling | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 33 | Safe retry | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 34 | Server-side rate/concurrency limits | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 35 | Security | PARTIAL — TEMPLATE OWNER AUTHORIZATION CI VERIFIED | C | OTHER IDOR/UPLOAD/WEBHOOK/KEY/PRODUCTION REVIEWS PENDING | CODE VERIFIED / MERGED TO BASE (PR #94) | Agent C / Issue #74 / merge `6a3b2d2a` / PostgreSQL CI 38907935442 |
| 36 | Privacy | PARTIAL — WORKER CRASH REDACTION CODE VERIFIED | C | TERMS/MEDIA PROVIDER PAYLOADS + LIVE PRIVACY REVIEW REMAIN | CODE VERIFIED / MERGED TO BASE (PR #109) | Agent C / Issue #74 / merge `e89aefc7` / focused CI 38914175144 |
| 37 | Business analytics | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | PR #64 + #119 / CODE VERIFIED (scoped, NOT LIVE) | BASE-D-Analytics-ChatGPT / PR #64 · CI 38899113996; Agent-D / PR #119 · CI 38924145417 |
| 38 | Admin dashboard | PARTIAL — ADMIN MOBILE CODE VERIFIED | C | REAL DEVICES / AUTH AND LIVE RELEASE ACCEPTANCE PENDING | CODE VERIFIED / MERGED TO BASE (PR #98) | Agent C / Issue #74 / merge `fb9ce2a1` / CI 38912222509 |
| 39 | Provider performance | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 40 | Model routing registry | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 41 | Internal model capabilities | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 42 | Persist BytePlus output in our storage | PARTIAL / BLOCKED | B | FINISH SAFE CODE; EXTERNAL GATE | — | — |
| 43 | Pricing page | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | MERGED TO BASE / CODE VERIFIED (PR #132 · CI 38929739219 + 38929739237 PASS, LIVE BLOCKED) | BASE-D-ChatGPT / base55-d-pricing-integrity-20261016 |
| 44 | Free plan | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | CODE VERIFIED / MERGED TO BASE (scope only) | Agent D PR #70; Issue #75 audit |
| 45 | Onboarding | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 46 | Homepage conversion | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 47 | Do not expose BytePlus as our product | DONE | — | DO NOT REBUILD | — | — |
| 48 | Production safety / regression | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | MERGED TO BASE / CODE VERIFIED (#117 + #123; CI #38925102380 PASS, LIVE BLOCKED) | BASE-D / base55-d-release-review-issue75-20261016 |
| 49 | Database migrations | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | IN PROGRESS — never return possibly advisory-locked connection to pool | BASE-D-MigrationSafety / base55-d-migration-readonly-20261016 |
| 50 | Feature flags | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | CODE VERIFIED / MERGED TO BASE (partial; #87) | Agent-D / CI 38905747621 |
| 51 | First commercial vertical slice | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | IN PROGRESS (AI Studio launch gate; #130 code preserved) | Agent-D / base51-studio-enabled-readiness-20261016 |
| 52 | Required implementation order | IN PROGRESS | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 53 | Explicit non-goals for now | DONE / RULE | — | DO NOT REBUILD | — | — |
| 54 | BASE readiness criteria | NOT MET | D | FINAL GATE | — | — |
| 55 | Required final report | PENDING | D | FINAL GATE | — | — |

## Release outcome required for BASE #54–55

A real new user must be able to sign up, receive/buy approved credits, request Image and Video, leave the page and return, retrieve output in History, see accurate reservation/capture/refund, while old tools still work. Test on actual supported devices, verify safety and permitted provider/Stripe endpoints, document blocked approval/credentials. Write the final report (#55) with per-item code/test/main/live state and remaining blockers **only after evidence**, not by deadline alone.
