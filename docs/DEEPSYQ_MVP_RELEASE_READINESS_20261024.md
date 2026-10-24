# Deepsyq — MVP release readiness map
**Snapshot:** 2026-10-24 (UTC)  
**Repository:** `mvryhan-web/video-variator-android`  
**Working branch:** `deepsyq-platform`  
**DEV HEAD at snapshot:** `f58bb65b801bac55364396924f1fba38bb808a62`  
**Related source commit:** `f15693a8557440fba58c2343acb8aa195dcddd82`  
**Release rule:** DEV/preview publication is not a production release. Main/production, live Stripe, paid provider calls and billing/entitlement changes remain gated.

## What is published now

| Area | Status | Evidence |
|---|---|---|
| Deepsyq public design preview | **LIVE — preview only** | Render deploy `dep-dbe95b4s728c73bf4u30`, commit `f58bb65`; https://deepsyq-visual-preview-20261016.onrender.com/ |
| Preview health | **PASS** | `/api/health` returns `ok:true`, `paymentsEnabled:false`, `aiGenerationEnabled:false`. Browser shows the Image, Video, Audio, Everyday Tools, Canvas, AI Apps and Pricing entry points. |
| Server source map | **CURRENT** | `docs/DEEPSYQ_CODE_MAP.md` and `.json` regenerated for source commit `f15693a`: server only, 52 indexed files, 141 named symbols, 50 checked relations. This is a code navigation map, not a product completion checklist. |
| TTS server access guard | **MERGED + DEPLOYED** | PR #391 merged at `f15693a`; focused no-spend regression tests passed 5/5. TTS config is disabled on the DEV API. Google credential is held only in the Render DEV secret store; no value belongs in this file or Git. |
| Approved design screens | **MERGED; preview redeployed** | PR #374 is no longer open. Historical acceptance record is in `PROJECT_STATUS.md`; verify on the preview before treating any new visual change as accepted. |

The preview itself labels the work as in progress. The live home page reports that no approved playable featured video is currently available. Do not call this a customer-ready commercial launch.

## MVP release gates

| Gate | Current status | Required before first commercial release |
|---|---|---|
| Approved Home and media | **PARTIAL** | Publish the owner-approved playable hero/gallery media and finish owner visual acceptance; current preview has no playable featured video. Preserve the approved Home while doing so. |
| Account/session privacy | **BLOCKED — P0** | PR #368 remains open at `357b4b1`. Its latest recorded exact-head result has two failing acceptance workflows (Video Core and AI Studio preview). Agent A's independent cross-account browser run passed 32/32, but that does not clear the remaining exact-head gate. Resolve the real failures without weakening privacy assertions; then obtain required B/D review and rerun exact-head CI. |
| Image/Video generation journey | **PARTIAL** | UI, model catalog and guarded provider adapters exist. The public preview has generation disabled. Prove the path from authenticated user through approved model/quote/consent and purchased credits, to provider job, private result/history, and download. |
| Payment and unit economics | **BLOCKED** | PR #333 is still draft. Its 43 mock/code checks are not proof of live net proceeds or the owner-required >=2x margin after provider, compute, storage, payment fees, refunds and taxes. Keep checkout off until the full calculation and test-mode purchase/webhook/ledger path pass. |
| Legal, SEO and production operations | **NOT VERIFIED FOR RELEASE** | Complete the current launch/privacy/legal/indexation review, then verify production auth, DB continuity/backups, migration plan and rollback. A public preview URL does not satisfy these checks. |
| Audio/TTS | **DEV-GATED** | Provider adapter and secret are staged in DEV, but `/api/speech/config` returns `enabled:false`. No site TTS call has been made. Keep it disabled until an eligible account and permitted, no-spend test path are available; never grant a synthetic Pro entitlement. |

## Next work order

1. Close the P0 account-isolation gate on the existing PR #368 and record final-head CI plus B/D review.
2. Complete Wave 0 launch readiness: approved Home media, privacy/legal and SEO acceptance.
3. Prove the smallest paid vertical slice in test mode: registration, confirmed test purchase/webhook/credit ledger, one permitted provider job, private saved result and download.
4. Verify real all-in provider economics and the >=2x floor before enabling checkout or live AI billing.
5. Only after the gates and explicit production approval, prepare and verify the production release/rollback.

Do not infer a single completion percentage from code volume or green unit tests. The release remains blocked by the listed acceptance and external-economics gates. Update this dated snapshot from fresh branch/CI/Render evidence after each material milestone.


## CI follow-up — 2026-10-24

The failed reruns above were attempts 2 of workflows originally created on 2026-10-22. Native checkout logs show their synthetic merge used PR head `357b4b1` with stale base `4b2ecb6`; the old test expected `#sidebarToggle`. Current DEV's corresponding test uses the current `#menu` control. Therefore those 30/12 failures are **stale-base results**, not a fresh verdict on current DEV + PR #368. A no-file sync commit `d66b6fef464de74c8764360d214044f5dbf0d341` has now refreshed the PR and started 20 checks on the current merge; latest observation: 19 queued, one in progress. Watch fresh `verify` workflow 40094962628 and `core-video` 40094962637, then update this gate only from terminal results. Do not weaken the dialog-boundary assertions; if a fresh failure still reports `bounds.x=0`, inspect its current trace/source before deciding whether it is a UI defect or stale fixture.
