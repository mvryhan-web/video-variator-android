# Deepsyq — MVP release readiness map
**Snapshot:** 2026-10-24 (UTC)  
**Repository:** `mvryhan-web/video-variator-android`  
**Working branch:** `deepsyq-platform`  
**DEV HEAD before this map update:** `608eebb60325fc194a3f81f234bc8b9e18bba9bc`  
**Related application source commit:** `f15693a8557440fba58c2343acb8aa195dcddd82`  
**Release rule:** DEV/preview publication is not a production release. Main/production, live Stripe, paid provider calls and billing/entitlement changes remain gated.

## What is published now

| Area | Status | Evidence |
|---|---|---|
| Deepsyq public design preview | **LIVE — preview only** | Render deploy `dep-dbe95b4s728c73bf4u30`, commit `f58bb65`; https://deepsyq-visual-preview-20261016.onrender.com/ |
| Preview health | **PASS** | `/api/health` returned `ok:true`, `paymentsEnabled:false`, `aiGenerationEnabled:false`. Browser showed Image, Video, Audio, Everyday Tools, Canvas, AI Apps and Pricing entry points. |
| Server source map | **CURRENT** | `docs/DEEPSYQ_CODE_MAP.md` and `.json` generated for `f15693a`: server only, 52 indexed files, 141 named symbols, 50 checked relations. This is a code navigation map, not the product checklist. |
| TTS server access guard | **MERGED + DEPLOYED TO DEV** | PR #391 merged at `f15693a`; focused no-spend regression tests passed 5/5. DEV `/api/speech/config` returns `enabled:false`. No site TTS generation call was made. |
| Approved design screens | **MERGED; preview redeployed** | PR #374 merged. Historical acceptance is recorded in `PROJECT_STATUS.md`; verify on preview before accepting any new visual changes. |

The preview labels the work as in progress. The live home page reports that no approved playable featured video is currently available. This is not a customer-ready commercial launch.

## MVP release gates

| Gate | Current status | Required before first commercial release |
|---|---|---|
| Approved Home and media | **PARTIAL** | Publish owner-approved playable hero/gallery media and finish visual acceptance; current preview has no playable featured video. Preserve approved Home while doing so. |
| Account/session privacy | **CI GREEN; PR REVIEW/MERGE PENDING — P0** | PR #368 head `d66b6fef464de74c8764360d214044f5dbf0d341` is open and mergeable. Fresh synthetic merge `c4b19ed1ed6e2d599a5f521411a62d030aefdcba` used current-at-run DEV base `7f04176416d137d38e2a30fa9d4a5abcea95ea25`; all 18 PR workflow runs completed successfully, including `verify`, Video Core acceptance and Studio account boundary. Complete required independent B/D review and owner-authorized DEV merge. |
| Image/Video generation journey | **PARTIAL** | UI, model catalog and guarded provider adapters exist. Public preview has generation disabled. Prove authenticated user → approved model/quote/consent → purchased credits → provider job → private result/history → download. |
| Payment and unit economics | **BLOCKED** | PR #333 remains draft. Its mock/code checks do not prove live net proceeds or the owner-required >=2x margin after provider, compute, storage, payment fees, refunds and taxes. Keep checkout off until full calculations and test-mode purchase/webhook/ledger path pass. |
| Legal, SEO and production operations | **NOT VERIFIED FOR RELEASE** | Complete launch/privacy/legal/indexation review, then verify production auth, DB continuity/backups, migration plan and rollback. A public preview URL does not satisfy these checks. |
| Audio/TTS | **DEV-GATED** | Provider adapter and credential are staged in DEV, but `/api/speech/config` returns `enabled:false`. No site TTS call has been made. Keep it disabled until an eligible account and permitted no-spend test path are available; never grant a synthetic Pro entitlement. |

## Work order to minimum release

1. Finish required independent review and merge of PR #368 into DEV; verify the resulting DEV checks and two-account privacy behavior.
2. Complete Wave 0 launch readiness: owner-approved Home media, privacy/legal and SEO acceptance.
3. Prove the smallest paid vertical slice in test mode: registration, confirmed test purchase/webhook/credit ledger, one permitted provider job, private saved result and download.
4. Verify real all-in provider economics and the >=2x floor before enabling checkout or live AI billing.
5. Only after these gates and explicit production approval, prepare and verify production release and rollback.

Do not infer completion percentage from code volume or green unit tests. DEV has a live design preview, but the commercial release remains blocked by the gates above. Update this dated snapshot from fresh branch, CI and Render evidence after each material milestone.

## P0 privacy sub-queue — 2026-10-24

- **Studio account boundary / PR #368:** head `d66b6fef464de74c8764360d214044f5dbf0d341`; 18/18 fresh PR workflows passed, and existing A23 browser acceptance passed 32/32 on the unchanged source candidate. Fresh synthetic merge tested DEV code at `7f04176`; the two DEV commits after that changed only this readiness document. GitHub currently reports the PR mergeable. The PR remains open; required B/D review and safe DEV integration remain pending. This client-side slice does not by itself prove server-side tenant isolation or provider consent revocation.
- **Smart Reminders / PR #350:** exact branch head `d48f560816e69f899e5032c11fde35f5b8b46d91`; five current-head workflow runs passed. Independent B/D scoped privacy reviews passed on the immutable source/test blobs. Remains open; refresh against current DEV, verify the same three C-owned paths, rerun current-head CI, then C performs the D16 DEV self-merge.
- **Photo OCR / PR #352:** exact branch head `c8111042fff40cd019f1899fd0d1daf4238a3b6d`; five current-head workflow runs passed. Independent B/D scoped privacy reviews passed on the immutable source/test blobs. Remains open; sequence after #350, refresh against the then-current DEV, verify the same three C-owned paths, rerun current-head CI, then C performs the D16 DEV self-merge.

These are separate client privacy slices; they do not clear the overall #24/#35/#36 release gate, the server-side consent-before-provider gap, or production privacy acceptance.

## Current-source consent re-audit — 2026-10-24

Latest DEV readback before this documentation update: `fbb04a6f06dfa4ddc30d652c5d3feb00129412e4`.

- Current `server/generation-purchased-provider-boundary.js` blob `c5af1f66d03078384ad83605d5175f4dcad7fcd8` requires `job.settings.dispatchConsent === true`, then verifies purchased-dispatch authorization and invokes the provider. It does not itself re-read a revocable user-consent record immediately before the external call.
- Current `server/ai-migrations.js` blob `4bf2462fd9aaeae326074d62947c09e1d96b44e2` lists provider-task-id and purchased-dispatch-claim migrations; `server/generation-consent.js` is absent from DEV.
- Therefore the existing client account boundary PR #368 and C Reminders/OCR slices do **not** complete BASE #35. Durable consent storage, revoke-before-dispatch enforcement, and no-provider-call/credit-reservation regression cases remain an owner/D security-release handoff through the existing consent PR #323. Its 49-file draft remains stale and conflicted; do not merge it wholesale. No DB or provider actions were performed.

## CI follow-up — 2026-10-24

The earlier failed reruns were attempts 2 of workflows created on 2026-10-22. Their synthetic merge used PR head `357b4b1` with stale base `4b2ecb6`; those failures are not a current verdict. A no-file sync commit refreshed PR #368 at `d66b6fef464de74c8764360d214044f5dbf0d341`. Fresh Actions checkout log for verify run [40094962628](https://github.com/mvryhan-web/video-variator-android/actions/runs/40094962628) says `Merge d66b6fe into 7f04176`. All 18 PR-triggered workflow runs for this head are terminal **SUCCESS** (including [Video Core](https://github.com/mvryhan-web/video-variator-android/actions/runs/40094962637) and [Studio account boundary](https://github.com/mvryhan-web/video-variator-android/actions/runs/40094962647)). No assertion was weakened. PR #368 remains open; required B/D review and DEV merge are still pending.


## Owner-priority update — BASE #1, #2, #48, #50 / 2026-10-24

**Current execution order:** #1 platform acceptance → #50 flag acceptance → #48 release-safety evidence → #2 production root cutover. BASE #48 remains the required production gate for #2.

- **DEV root is already published:** live browser verified [Deepsyq preview](https://deepsyq-visual-preview-20261016.onrender.com/) at `/`. It displays the Deepsyq workspace, Image/Video/Audio, Canvas, AI Apps, Inspiration, Everyday Tools, History and Pricing. Its banner identifies it as a work-in-progress preview with sign-in, payments and paid AI generation disabled. Render currently runs DEV source `f58bb65b801bac55364396924f1fba38bb808a62`; this map update is committed to DEV at `aaa8f99e115d09c32fd758e6e00e595541474158`, with no app-source changes. DEV auto-deploy is off.
- **Production root is unchanged:** live browser still shows Video Uniquifier at `https://video-variator-android.onrender.com/`; production uses `main`. No production config or deployment change was made.
- **BASE #1 — PARTIAL:** platform navigation and major entry points are present at DEV `/`. Current preview still shows a static, non-playable Hero and AI Agent as coming soon. Complete mobile/visual acceptance and customer-ready sign-in/generation are not verified.
- **BASE #2 — DEV VERIFIED / PRODUCTION BLOCKED:** exact root route is opt-in on literal `DEEPSYQ_HOME_ENABLED=true`; clean visits serve Deepsyq while checkout and mobile-auth returns preserve the Video Uniquifier handler. Live DEV root matches. Production cutover stays blocked until BASE #48 gates pass.
- **BASE #48 — PARTIAL:** PRs #117, #123 and #153 are merged; invalid Stripe signature diagnostics are redacted. Missing evidence: staging regression, verified DB backup/restore, signed Stripe test purchase/refund, existing login/subscription and Video Uniquifier checks, mobile QA, tested rollback.
- **BASE #50 — code verified, no rollout:** PR #87 generation switches and PR #189 public discovery flags are merged. Current DEV blobs for `server/server.js`, `server/platform-feature-flags.js`, BASE48 test, and both BASE50 tests exactly matched local test inputs. Focused no-spend Node suites pass 22/22 across BASE48/50, root gate integration and sitewide static navigation/theme checks. No flags were changed.
- **Mobile test blocker:** the 31-page mobile-Chromium suite could not launch because the workspace lacks the Playwright browser binary. Official install returned a zero-byte/truncated ZIP; tests did not execute, so this is an environment failure, not a UI assertion failure.

No provider requests, Stripe actions, DB backup/migration, secrets, Render environment changes, merges or production deploys were performed. Resume with mobile acceptance when a valid browser artifact/runner is available; gather the staging/backup/rollback evidence for #48; keep production #2 gated until release checks pass.

## Latest validation delta — 2026-10-24 (UTC)

- **BASE #1 — responsive screen candidate PASS, current DEV still PARTIAL.** GitHub Actions run [40128756592](https://github.com/mvryhan-web/video-variator-android/actions/runs/40128756592) completed successfully for the “Owner 31 real screens design acceptance” workflow. It installed Chromium and WebKit and ran `tests/owner-all-pages-design.config.mjs` on PR #352 head `4a5ae196c3d42f6a9bea0583ede44132dcfb4e0d`. That candidate was based on `56d98f7f3ec3b25d1318f2df9dffd456ae73eab4`, behind current DEV `e973d873d318f59d0f64abb00cf283752eae4ddf`; do not treat it as exact-current-DEV acceptance.
- **BASE #1 — DEV no-spend check PASS, scope limited.** Run [40128936438](https://github.com/mvryhan-web/video-variator-android/actions/runs/40128936438) succeeded on exact DEV SHA `e973d873d318f59d0f64abb00cf283752eae4ddf` for the real batch-entry no-spend path. Site-wide design contract run [40128936508](https://github.com/mvryhan-web/video-variator-android/actions/runs/40128936508) also passed on that SHA; its job ran JavaScript checks and two Node unit suites, not the 31-screen browser suite. Platform regression [40128937713](https://github.com/mvryhan-web/video-variator-android/actions/runs/40128937713) passed on the same DEV SHA.
- **BASE #48 — still PARTIAL:** no new evidence for a staging regression, verified DB backup/restore, signed Stripe test purchase/refund, production legacy-login/subscription checks, exact-current-DEV mobile QA, or tested rollback.
- **BASE #2 — production cutover remains BLOCKED by #48. BASE #50 — code verified, switches remain unchanged/off.** No production deploy, Render setting change, Stripe action, provider call, database backup/migration, or flag change was made.
- The GitHub connector can read Actions results but cannot dispatch this workflow. The visible workflow menu did not expose a run control, so no exact-current-DEV 31-screen run was started.

