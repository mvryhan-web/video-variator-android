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
| 13 | Internal AI credit system | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 14 | Credit ledger | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 15 | Credit reservation | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 16 | Stripe subscriptions + credit packs | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 17 | Unit economics | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 18 | Pricing engine | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 19 | AI Apps | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 20 | Product Video workflow | PARTIAL | C | DURATION PREF HANDOFF — existing workflow preserved | IN PROGRESS | ChatGPT BASE lane C / `base20-product-video-duration-20261016` |
| 21 | AI Agents | NOT STARTED (BASE) | C | VERIFY BASE SCOPE; NO BLOCK DUPLICATE | — | — |
| 22 | Inspiration / Discover | NOT STARTED (BASE) | C | VERIFY BASE SCOPE; NO BLOCK DUPLICATE | — | — |
| 23 | Template system | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 24 | History | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 25 | My Creations | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 26 | Canvas | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 27 | Existing Video Uniquifier preserved under Tools | PARTIAL | C | ROOT SWITCH/PRODUCTION REGRESSION GATED | CODE VERIFIED (BASE, not live) | ChatGPT Lane C / PR #61 / `base-27-video-uniquifier-tools-20261016` / CI 38898789990 |
| 28 | Utilities gathered in Tools | PARTIAL — AUDIO TOOLS CODE VERIFIED | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 29 | Final navigation | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 30 | Desktop / Android / iPhone responsive | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 31 | Generation UX/status | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 32 | Friendly error handling | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 33 | Safe retry | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 34 | Server-side rate/concurrency limits | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 35 | Security | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 36 | Privacy | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 37 | Business analytics | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | IN PROGRESS | BASE-D-Analytics-ChatGPT / base55-d-business-analytics-20261016 |
| 38 | Admin dashboard | PARTIAL | C | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 39 | Provider performance | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 40 | Model routing registry | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 41 | Internal model capabilities | PARTIAL | B | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 42 | Persist BytePlus output in our storage | PARTIAL / BLOCKED | B | FINISH SAFE CODE; EXTERNAL GATE | — | — |
| 43 | Pricing page | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | IN PROGRESS | BASE-D-ChatGPT / base55-d-pricing-integrity-20261016 |
| 44 | Free plan | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 45 | Onboarding | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 46 | Homepage conversion | PARTIAL | A | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 47 | Do not expose BytePlus as our product | DONE | — | DO NOT REBUILD | — | — |
| 48 | Production safety / regression | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 49 | Database migrations | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 50 | Feature flags | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 51 | First commercial vertical slice | PARTIAL | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 52 | Required implementation order | IN PROGRESS | D | AUDIT IMPLEMENTATION; FINISH GAP | — | — |
| 53 | Explicit non-goals for now | DONE / RULE | — | DO NOT REBUILD | — | — |
| 54 | BASE readiness criteria | NOT MET | D | FINAL GATE | — | — |
| 55 | Required final report | PENDING | D | FINAL GATE | — | — |

## Release outcome required for BASE #54–55

A real new user must be able to sign up, receive/buy approved credits, request Image and Video, leave the page and return, retrieve output in History, see accurate reservation/capture/refund, while old tools still work. Test on actual supported devices, verify safety and permitted provider/Stripe endpoints, document blocked approval/credentials. Write the final report (#55) with per-item code/test/main/live state and remaining blockers **only after evidence**, not by deadline alone.
