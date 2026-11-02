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


## 2026-10-16 follow-up: verified Render, PR #42 containment, preview/real video acceptance

**Owner authorization:** Agent 5 may issue coordination instructions and make scoped coordination changes, but no production merge, charge, live paid provider generation, destructive DB change or publishing unapproved media is authorized by this note.

### Render facts (direct account read at 2026-10-16)
- Render workspace: `My Workspace`, id `tea-dalqjcm7bikc73a8lu6g`.
- PostgreSQL `video-uniquifier-db`, id `dpg-dalqp7dbedkc738098pg-a`, status `available`, plan `0.1c-256mb`, updated `2026-10-16T10:49:37Z`. **Paid database tier already active; the earlier FREE DB expiry warning is obsolete for the checked instance.** Do not request a second upgrade. Render billing invoices/charge confirmation are not exposed by this read; payment collection date is UNKNOWN.
- Live web service `video-variator-android`, id `srv-dalqnkoae00c73caj8vg`: `main` auto-deploy, paid compute `0.5c-512mb`. Never equate draft BASE branch with live production. No HA on checked DB; independently test recoverable backup and restore path before migrations/launch.

### PR #42: immediately contain scope instead of rewriting already completed code
- At this inspection PR #42 is **OPEN DRAFT**, target `main`, **763 commits / 230 changed files / mergeable=false**. Treat as a large, currently unready integration PR, **not a lane for ongoing feature commits**.
- **FREEZE DIRECT FEATURE DEVELOPMENT IN #42** for all coding agents. Each agent finishes its already-claimed bounded change on its OWN branch/PR targeting `deepsyq-platform`, with evidence and non-overlapping files. Merge only reviewed/green, dependency-compatible scoped PRs into the BASE integration branch, one at a time. The branch may receive review-approved integrations and necessary coordination, not ongoing mixed feature editing.
- Do NOT close/force-push/reset/rebase #42, blindly split via cherry-picking, direct-merge it to production `main`, or duplicate work to manufacture smaller PRs. Once the existing integration is stable and independently previewed, plan controlled release slices. Parent #42 itself will remain large until consciously reviewed; freezing it alone does not erase its past commits.
- Detect & resolve collision: PRs **#65 and #70 both edit `server/generation-entitlements.js`, `.github/workflows/base-free-plan.yml`, `tests/generation-entitlements-unit.mjs`** under BASE #44. ONE owner reconciles them (prefer preserving the newer validated work), closes/supersedes redundant PR only with documented review; other agents must not merge both blindly. Check #62 pricing and #66 provider pricing shared checklist edits against current blob before merging. Block 5 PRs #46–#50 are previously accumulated work; don't merge nested content twice.
- The claim/status board is a coordination registry, not automatic execution. Agent 5 can post GitHub issues/comments; chat sessions only execute after refreshing and accepting tasks, with atomic claims.

### Locked Home real-video / visual review gate (owner reiteration)
- Respect `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md` and **`docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md`**. There are **13 specified scenes: one actual 16:9 Hero Girl video plus twelve original cinematic cards**. Do not replace the owner's subjects, identity, colors, composition, or layer text into the video; do not substitute an animated screenshot or generic footage.
- Current Home code `app/src/main/assets/home-experience.js` already supports the muted/visible/autoplay/cyclic hero carousel and explicit graceful fallback when there are no real featured video URLs. The full Home remains visually UNACCEPTED until actual approved playable content exists. Do NOT redesign or build a second hero/carousel.
- First complete an isolated **visual-only Deepsyq preview**, using existing `npm run preview:deepsyq` / `docs/DEEPSYQ_PREVIEW.md`, no secrets or paid endpoints, and produce desktop and mobile screenshot evidence against the canonical owner PNG. If deploying preview, use a separate disposable no-secret preview service, only on a free/nonbillable plan and without touching the live `main` service. Never say screenshot fidelity is verified until images were actually compared.
- Prepare **V01 Hero Girl** authentic motion video FIRST from the exact preserved original reference (see master shot list). Before any Runway/other paid generation require explicit approved spend, actual provider/credit availability and rights. After owner's visual approval, prepare V02–V06 then V07–V13; require real MP4/poster files, valid public media URLs, per-clip provenance, QA and owner approval before enabling Inspiration/hero flags. The preview must honestly show static fallback until those clips exist.
- Benchmark `https://ai.byteplus.com/lumina/en` by USER JOURNEY, not copying its code/media: real moving showcase → clear Quick Create → existing Studio → real credit quote/consent → real provider → durable History → reuse. Preserve existing pricing and tools.

### Four coordinated coding instructions, effective once each agent reads and claims
- **Agent A — Home/Image/Canvas:** finish current claimed scope first. Own BASE #1/#3/#46 visual fidelity audit and no-secret preview evidence, plus Image/Canvas/Historical UX only if unclaimed. Do not replace original visual; do not fake V01–V13. Handoff requests for external video production and visual assets to owner/Agent 5.
- **Agent B — Video/provider:** preserve confirmed core BASE #5 tests; finish only safe incomplete Video/adapter/background support and one verified provider/storage/billing-ready vertical slice when real credentials/permissions available. Do NOT rerun unchanged core tests endlessly, spend credits, overwrite A's Home, or create a second router.
- **Agent C — AI Apps/Tools/mobile:** finish the actually claimed #28/#29 PRs before taking new work; protect existing #20 and #27 merged/verified work. Verify real navigation links, responsive gallery/Quick Create handoff and working old tools; no Home redesign or new Block 3 duplicate.
- **Agent D — credit/release/integration:** one owner must resolve #65 vs #70 on #44, review open #62/#66/#69 and actual claim statuses, handle read-only upgrade/backup/rollback checks; protect Stripe/wallet, leave charge date unknown until invoice data exists; keep release blocked without demonstrated restore and provider/payment acceptance. Do not merge to `main`.
- **Agent 5 — coordinator:** update overlap/readiness matrix, publish issue assignments and decision log, compare visual evidence to approved reference, report real progress and blockers to owner. No live-chat control or automatic watcher is implied.

**Every agent's closeout:** exact BASE requirement, existing implementation reused, changed files, targeted CI link, PR link, status `CODE VERIFIED / READY TO MERGE / MERGED TO BASE / LIVE VERIFIED` as justified, and next unclaimed task. Do not advertise real video creation, DB charge settlement, or deployed UX without the evidence.


### Confirmed isolated preview deploy (2026-10-16 12:36 UTC)
- **Render deploy SUCCESS / LIVE**: service `srv-db91k1vf3r2c73fpj350`, first deploy `dep-db91k2nf3r2c73fpj4v0`, URL `https://deepsyq-visual-preview-20261016.onrender.com`; source branch `deepsyq-platform`, deployment commit `6d3ee3409c8f6da313c7f3ae21299a0730c850c1`. Explicit Render service plan `free`, auto-deploy `no`; no DB/Stripe/provider env variables supplied. This is a separate **visual-only, disposable preview**, not a new commercial backend.
- **Verification boundary:** Render reported successful deploy; actual browser screenshot, matching exact locked mockup, mobile interaction, external HTTP reachability from the evaluator and live hero videos are **NOT VERIFIED**. Agent A should inspect and provide screenshot evidence and actionable deltas. The isolated inspection environment could not resolve public Render DNS, so do not label external HTTP/screenshot test passed.


### Two canonical Home screenshot references require explicit mapping (2026-10-16)
- Agent 5 inspected **both actual owner Library images**, not only the descriptions:
  1. `/Deepsyq/Approved Design/DEEPSYQ_OWNER_APPROVED_HOME_2026-10-15.png`, **1448×1086**, SHA-256 `7198fb20b8300e8f8d90c4788a0288570a49be569df23cb82f06da29e1b0db47`: premium full header/sidebar, Hero Girl, **large Canvas / AI Agent / AI Apps blocks**, Inspiration mosaic of eight visible tiles.
  2. `/Deepsyq/Approved Design/DEEPSYQ_HOME_13_EXACT_SCENE_REFERENCES.zip` embedded `SOURCE/USER_APPROVED_HOME_REFERENCE_ORIGINAL.png`, **1536×1024**, referenced by `docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md`: same dark brand / Hero Girl but a **different top-screen arrangement**, 13 cinematic scenes total (hero + twelve gallery tiles), with no three large Canvas/Agent/Apps sections in that first screen.
- GitHub chronology: first approved design lock document committed `2026-10-15T17:07Z`, carousel extension `17:37Z`; the 13-scene shotlist committed **later at 18:39Z**, but later source creation is not proof that the owner intended to remove formerly approved feature sections. **These two images are NOT pixel-identical and cannot both be the exact same above-the-fold screenshot.**
- **Safe temporary policy:** preserve both originals byte-for-byte. No agent may claim exact visual conformity to both; do not remove Canvas/Agent/Apps or overwrite owner images. Use the newer 1536 screenshot **only as scene-by-scene V01–V13 animation reference** pending explicit owner choice for first-screen layout. Retain the 1448 source as the existing documented Home block/layout lock until the owner confirms whether the 1536 version supersedes its above-the-fold arrangement. A possible (NOT YET APPROVED) compromise is newest 1536 Hero+13 videos at top and substantial Canvas/Agent/Apps blocks lower, with Quick Create adjacent to Hero. Agent A must provide a before/after comparison and request one explicit visual decision before changing locked layout.


### OWNER DECISION — initial Hero Girl + later thumbnail grid + VISIBLE carousel (2026-10-16)
- The owner has now resolved the earlier **two screenshots** conflict for the intended Home hierarchy. **Preserve the initial approved girl as the main large 16:9 cinematic Hero.** Use the later 13-scene package for its additional **twelve small miniature scene references** directly following/near the hero. Keep the approved Deepsyq dark purple/blue/magenta brand and all full Canvas/Agent/AI Apps/Inspiration modules lower on Home, with Quick Create next to/below the hero/gallery.
- **Critical correction:** the carousel/gallery MUST be visible/open on Home by default. It must not disappear merely because no rights-approved MP4 exists. Use only real owner-approved, rights-cleared static posters or an honest unavailability state with visible layout and functional controls for the data actually available. Playback, muted autoplay and cyclic transitions require actual playable videos. Never present static thumbnails as playing video, never invent clips or copy protected media.
- The earlier temporary rule `Use 1536 only as a scene reference pending explicit owner choice` is **RESOLVED**: now the later image is explicitly approved as the MINIATURES' content reference, **NOT** as a replacement for the original girl's visual or existing lower page sections. The original files remain immutable.
- **Owner scope:** this authorizes the specific Home layout correction and opening/visibility of existing carousel; **not** paid AI video generation, changing Stripe/provider/database, public site rollout or wholesale redesign. Implementation belongs to **Agent A's separately claimed BASE #3/#46** scope and a focused PR, NOT a direct new feature change inside PR #42 or an Agent 5 code edit. Coordinate with any active branch owner before touching shared UI code.
- Source of truth: newest approval addendum in `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md`. Acceptance requires actual browser preview screenshots/interaction checks plus honest licensed video-state reporting. No media/visual DONE yet.


## 2026-10-16 — superseding owner design choice and CI regression triage (Agent 5)

**This dated addendum overrides historical "awaiting owner Home selection" text above.** The owner confirmed the approved original large girl is the hero; 12 distinct supplementary miniatures belong to the scene catalog; a carousel remains visibly open with honest non-playing fallback when no legitimate video exists. The update is now recorded in the merged [Home design amendment PR #76](https://github.com/mvryhan-web/video-variator-android/pull/76) (merge `f0959888`). **Layout/media browser acceptance remains pending**; this is a design requirement, not a claim about released footage or a verified production page.

Agent C [PR #79](https://github.com/mvryhan-web/video-variator-android/pull/79) (BASE #30 mobile AI Apps) and [PR #88](https://github.com/mvryhan-web/video-variator-android/pull/88) (BASE #23 template readiness) have been merged into BASE following passing **dedicated** checks; however their broader CI was **red**. Review these red runs before any production merge: [browser regression 38905303815](https://github.com/mvryhan-web/video-variator-android/actions/runs/38905303815) and [AI Studio 38906432469](https://github.com/mvryhan-web/video-variator-android/actions/runs/38906432469). Specific failures, true owner boundaries and non-duplicating fixes are in [`docs/DEEPSYQ_AGENT5_REGRESSION_REVIEW_20261016.md`](DEEPSYQ_AGENT5_REGRESSION_REVIEW_20261016.md).

The cross-lane failure likely involving **D-owned Checkout** is a real `409 !== 200` replay expectation from a PostgreSQL fixture; correct the mismatched source/test safely, without weakening idempotency or live Stripe protections. Home non-playable MP4 mock and mobile sidebar off-viewport errors belong to A/C respectively, whereas old Lifetime copy assertion belongs to D. Do not blame scoped C code without a demonstrated causal diff.

The original #44 duplicate [PR #65](https://github.com/mvryhan-web/video-variator-android/pull/65) was closed unmerged after authoritative [PR #70](https://github.com/mvryhan-web/video-variator-android/pull/70) merged; Agent D documented the resolution in merged PR #80. Do **not** treat an old "both open" summary as current.

**New-chat continuity protocol** merged to BASE in [PR #81](https://github.com/mvryhan-web/video-variator-android/pull/81) (merge `dd1c9bd3`), providing role-specific issue checkpoints so owner does not reconstruct previous context. Other chats still must fetch it: no automatic remote session switch.

**Agent 5 responsibility is ongoing on demand, not unattended:** check actual latest heads/CI before each conclusion. Neither this document nor a branch CI authorizes `main` deployment, paid AI, Stripe checkout, production migration or a real-data change.
