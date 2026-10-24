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

## CI follow-up — 2026-10-24

The earlier failed reruns were attempts 2 of workflows created on 2026-10-22. Their synthetic merge used PR head `357b4b1` with stale base `4b2ecb6`; those failures are not a current verdict. A no-file sync commit refreshed PR #368 at `d66b6fef464de74c8764360d214044f5dbf0d341`. Fresh Actions checkout log for verify run [40094962628](https://github.com/mvryhan-web/video-variator-android/actions/runs/40094962628) says `Merge d66b6fe into 7f04176`. All 18 PR-triggered workflow runs for this head are terminal **SUCCESS** (including [Video Core](https://github.com/mvryhan-web/video-variator-android/actions/runs/40094962637) and [Studio account boundary](https://github.com/mvryhan-web/video-variator-android/actions/runs/40094962647)). No assertion was weakened. PR #368 remains open; required B/D review and DEV merge are still pending.
