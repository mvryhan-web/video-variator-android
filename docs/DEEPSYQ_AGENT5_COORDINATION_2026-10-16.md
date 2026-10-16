# Deepsyq — Agent 5 governance and Lumina-direction audit (2026-10-16)

**Role:** Agent 5 is the owner's **technical coordinator / reviewer**, NOT a fifth concurrent coding lane, not an autonomous background process, and not the Block 5 Product Watcher. Agents A–D continue the original BASE requirements; Agent 5 watches collisions, prioritization, fidelity, release gates and truthful reporting. This note is coordination guidance, not a replacement product specification, and it grants no permission to make production changes.

## Source of truth and conflict resolution (highest priority first)

1. **The owner's latest explicit instruction and non-negotiable production/data safety.** Four coding agents currently prioritize the 55 original BASE items; Agent 5 coordinates rather than claiming any of those lanes. Do not start new Block 1–7 work while this direction applies, but preserve already implemented block code/PRs.
2. **Immutable original owner requirements:** BASE = `docs/DEEPSYQ_PLATFORM_SPEC.md`, **not Block 1**; Blocks 1–7 = the respective, separate `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_N.txt`. Original text must not be rewritten to change scope. If the owner approves a later change, record it separately with a date and precise scope.
3. **Owner-approved Home visual lock:** `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md` and its owner-provided canonical PNG. Its approved 16:9 real-video carousel and under-hero Quick Create amendment is more specific and newer than the BASE's broad hero ideas; preserve the approved purple/blue/magenta design. Do not recreate missing reference assets.
4. **Mandatory collaboration rules:** `AGENTS.md`; real-time work claims: `PROJECT_STATUS.md` and `docs/DEEPSYQ_BASE_55_COORDINATION.md`. The latter's A–D allocations are suggested responsibility, not proof that a session is actually executing.
5. **Implementation evidence:** current code, latest branch commits, focused CI, integrated PR evidence, provider/Stripe/production checks. The `docs/DEEPSYQ_BASE_CHECKLIST.md` is the itemized audit, *not* the original product request. When status documents disagree, reconcile them against tested code before changing a label.

**Status vocabulary:** `UNCLAIMED` / `IN PROGRESS` / `CODE PREPARED` / `CODE VERIFIED` / `BLOCKED (reason)` / `READY TO MERGE` / `MERGED TO BASE` / `MERGED TO MAIN` / `DEPLOYED` / `LIVE VERIFIED`. Never equate passing mock tests with a live generation or Stripe purchase. The word DONE requires the full acceptance criteria of the item, including external real-world gates where applicable.

## Four coding lanes and a fifth coordination role

| Coding lane | BASE numbers | Avoid crossing into |
|---|---|---|
| A | 1,3,4,24,25,26,31,32,45,46 | Home visual redesign, Video provider/server, billing |
| B | 5,6,7,8,9,10,11,12,33,34,39,40,41,42 | Image owner files, parallel provider/router/ledger |
| C | 19,20,21,22,23,27,28,29,30,35,36,38 | Studio core, BASE router/Stripe, modifying approved Home visuals |
| D | 2,13,14,15,16,17,18,37,43,44,48,49,50,51,52,54,55 | Unapproved live spend, Stripe changes, destructive DB migration |

These are provisional: existing explicit per-item GitHub claims and changed-file ownership win. Before starting any item, read the applicable full source TXT, check `main`, `deepsyq-platform`, open PRs, the board and actual implementation. Claim **one specific row** on both shared boards, push the claim, verify it remained unique, then code only on an isolated branch. Report test evidence/commit/PR and re-open that row for another agent only on explicit handoff. Preserve previous working behavior. Never force-push or silently resolve an overlapping claim.

**Agent 5 checks at each requested audit:** newest source/head, individual active claims, new PR file overlap, status-vs-CI mismatch, deviations from Lumina *workflow* and from locked Deepsyq design, blockers, main/deployment risk, and the single next highest-impact fix. Post a concise dated owner report: completed/verified, newly blocked, at-risk, current priorities, required owner decision. Agent 5 must not claim credit for another agent's changes or assert that it can command other open chats automatically.

## Concrete snapshot, 2026-10-16 (verify again before future action)

- Main integration is `main`; draft `PR #42` tracks the BASE feature branch `deepsyq-platform`. **Neither a draft PR nor branch CI is a production release.**
- 55 BASE item rows: **#47 = DONE; #53 = DONE / RULE** in the shared checklist; 53 others are partial, gated, not started, under verification, or pending. This does **NOT** mean only 2 items have code, nor justify a 2/55 overall implementation-progress percentage. Report completion by scope, evidence and release stage, not invented global percentages.
- Existing claims visible at audit: **#20 lane C** Product Video duration handoff in progress; **#37 lane D** read-only analytics in progress; **#43 lane D** pricing-display scope code verified on PR #62, not full commercial completion. Revalidate each claim as updates land. Separate PR #63 improves Product Video photo ordering but does not itself guarantee duration preference reaches the provider.
- Block 3 Inspiration and Block 5 Product Watcher have substantial isolated code/PR history; neither should be reimplemented. Block 3 requires genuine rights-backed images/videos; Block 5 requires actual deployed worker/cron, credentials and monitoring acceptance. BASE #21/#22 labels do not automatically negate distinct Block 2/3 work.
- User Agent (Block 2), intelligent Compare/Smart routing (Block 1), reusable full My Workspace (Block 4), realtime Voice Agent (Block 6), and Stripe -> verified webhook -> credits -> real paid provider -> accounting (Block 7) cannot be reported as fully live.
- `deepsyq.html` and `home-experience.js` include the approved hero carousel / quick-create structure. **The carousel intentionally hides without genuine rights-cleared playable featured-video URLs.** A working layout is not proof of visual similarity to the canonical PNG or live autoplay.
- `DEEPSYQ_HOME_ENABLED`, `AI_INSPIRATION_ENABLED`, AI wallet/provider activation and other public/paid switches remain release-gated. No direct `main` merge or production secrets/migrations without approval.
- **Urgent verification, not confirmed failure:** `PROJECT_STATUS.md` reports an existing Render FREE PostgreSQL expiration on **2026-10-17**. Confirm the actual database instance/expiry in the owner-approved Render workspace, establish an independently verified restorable backup/upgrade plan before any expiry or migration. Render's official free-postgres policy: https://render.com/docs/free . The GitHub note alone is not account-level confirmation.

## Lumina direction: UX benchmark, not copyrighted duplication

Reference: https://ai.byteplus.com/lumina/en ; https://docs.byteplus.com/en/docs/seedream/lumina-introduction-page

**Target core loop:** discover real original showcase -> pick AI App / prompt or Canvas -> upload references -> choose only an enabled model/capability -> quote transparent credits -> deliberate generation -> see durable jobs/result -> reuse or edit in workspace. Top-level discovery order: Canvas, AI Agents, AI Apps, Inspiration; preserve approved Deepsyq homepage order, graphic style, navigation, and user-selected media.

**Priority gaps, ordered by real owner value:**
1. **P0 — data safety:** verify Render DB expiry, restorable backup, production continuity and migration ownership. Never let the sprint jeopardize existing customer data.
2. **P0 — actual paid vertical slice:** approved image/video provider keys + official cost/allowance + private durable storage + real end-to-end provider operation + wallet/Stripe webhook settlement + account ownership/authorization; do not advertise paid AI before validation.
3. **P1 — real showcase:** approved original/licensed video files and image content; 16:9 carousel and rich Inspiration should honestly show real content, not concept-only posters labeled as generated videos. Verify visual layout against owner's canonical screenshot.
4. **P1 — one simple creator path:** remove unclear duplicate CTAs, maintain one consistent prompt-to-Studio handoff, clear model-availability states, meaningful progress, trustworthy History/Reuse/Download, graceful mobile interaction. Existing modules first; don't create a second Canvas/router/jobs system.
5. **P2 — next roadmap blocks** only after current owner BASE-first directive changes or BASE/dependencies are accepted; staged release with honest `coming soon` is preferable to an unusable all-features launch.

## Coordination change-control and release gates

- Each scope has exactly one current owner, exactly one source TXT, named files, one branch/PR and one evidence record.
- New owner-requested feature or visual change: record the amendment in a dated addendum to the applicable specification/status **without editing original TXT**. If it touches another agent's files, stop and request a documented handoff before touching code.
- For integration, review the changed-file list and head of each PR. PR #42 has a very broad change surface and must not be merged into auto-deploying `main` solely because a subset has passing tests. Preserve older PR work, consolidate deliberately and avoid double-merging nested Watcher PRs.
- Before `main` merge: recoverable backup and tested restore path, staging migrations with rollback, exact feature-flag defaults, production auth, webhooks/idempotency and security acceptance, verified live provider quote/cost, tests for affected platforms, deploy rollback plan, and owner authorization.
- Recommend a small, truthful, gated preview of the homepage only after checking no API/security/storage/customer-data regression; paid generation must remain OFF until live evidence exists. Keep the legacy Video Uniquifier working.

*This dated coordination review does not autonomously monitor repository/Render state. Refresh it against real data in each future session.*
