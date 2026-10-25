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

## Render recovery audit — 2026-10-25 (Europe/Paris)

- Confirmed the Render workspace is **My Workspace**. The only Managed Postgres instance listed is `video-uniquifier-db`, status **available**, on the production Video Uniquifier service. No separate staging database is configured in this workspace.
- The database Recovery page shows point-in-time recovery for the **past 3 days**, but **Restore database** is disabled. The Export list has **0 rows**, and **Create export** is disabled. This is evidence of a recovery window, not a verified backup export or a completed restore test; BASE #48 remains open.
- Production Render service remains attached to branch `main` with auto-deploy enabled. Browser verification of `https://video-variator-android.onrender.com/` still shows the Video Uniquifier home page, so BASE #2 is not published.
- Read-only audit only: no export, restore, migration, setting change, or deploy was started.

## Selected BASE queue reprioritization — 2026-10-25

Execution order is **#1 → #50 → #48 → #2**, with the separate P0 BASE #24/#35/#36 privacy and provider-consent gates also required before any commercial production launch.

- **#1 — first, still PARTIAL.** Exact DEV documentation head `3f0f82a4045515ea50e051b2827baa265aa7dbd7`: coordinator no-spend #40188563046, batch-entry #40188563158, root/legacy #40188564175, site-wide design #40188563210 all passed. But current-DEV BASE #30 mobile drawer #40188563065 failed 2 mobile projects at test line 49: the center point of the open Home brand link was not a pointer hit target (10 passed, 2 failed, 12 skipped). Browser install succeeded; this is an assertion-level blocker. Failure handed to Agent C in Issue #74 comment #6397057001 for a minimal owner-lane diagnosis/fix with pointer, Escape, overflow, and zero-paid-call checks preserved.
- **#50 — second, code/tests PASS, rollout OFF.** Keep generation/public-discovery switches off while validating no-spend behavior; never count code presence as rollout approval.
- **#48 — third, release-safety gate remains BLOCKED.** Render has no separate staging DB. Production DB shows 3-day PITR, restore disabled, no exports and export creation disabled. Still required: a non-production restore test/path, staging regression, signed Stripe test purchase/refund, legacy login/subscription checks, current mobile QA, and tested rollback. Do not use or copy production customer data for staging.
- **#2 — last.** Production root still serves Video Uniquifier. Cutover remains held until #48 and the P0 privacy/consent gates pass.

No source changes, flags, Stripe actions, DB exports/restores, Render configuration changes or production deploys were made in this coordinator review.


## Latest execution checkpoint — 2026-10-25 (Europe/Paris)

**Exact DEV HEAD when checked:** `eacf0b7a7ffc1623df513e9501cfae2195575261` (the current app source includes PR #401; its merge commit is `eacf0b7a7ffc1623df513e9501cfae2195575261`). The prior docs-only SHA `3f0f82a...` is no longer the current branch tip.

- **BASE #1 — remains PARTIAL.** At exact HEAD `eacf0b7a7ffc1623df513e9501cfae2195575261`, no-spend coordinator [#40189921815](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189921815), batch entry [#40189920904](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189920904), root/legacy gate [#40189921003](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189921003), and site-wide owner design [#40189920710](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189920710) are SUCCESS. The BASE #30 drawer acceptance [#40189920805](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189920805) still FAILS on both mobile projects at the pointer hit-test in `tests/base30-mobile-drawer.spec.mjs:49`; the broad regression [#40189920905](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189920905) was still running at the last check. Current CSS puts mobile `#sidebar` at z-index 32 and the open Home header above it at z-index 33. This suggests the header overlaps the drawer hit target. Exact diagnosis and minimal correction candidate were handed to the existing C-owned #30 lane in [Issue #74 comment #6397303098](https://github.com/mvryhan-web/video-variator-android/issues/74#issuecomment-6397303098). No CSS/source changes made by coordinator.
- **BASE #50 — safe/no-spend gate passes, rollout stays disabled in production.** BASE 51 launch-switch safety [#40189921785](https://github.com/mvryhan-web/video-variator-android/actions/runs/40189921785) is SUCCESS on this HEAD. The current flag helper only treats literal `true` as enabled in production; unset flags are false in production and default-on only outside production. This is discovery gating, not paid-generation authorization. No flag or provider setting was changed; the full commercial activation gate remains separate.
- **BASE #48 — still BLOCKED/PARTIAL.** Render readback still lists only production Postgres `video-uniquifier-db`; no staging database. The 3-day PITR window remains untested, and no export/restore path was available in the earlier read-only dashboard inspection. Current free DEV API/preview services do not constitute an isolated staging database or restore test. Required evidence remains non-production restore + regression, signed Stripe test purchase/refund, legacy login/subscription checks, physical mobile QA and rollback proof.
- **BASE #2 — last.** The exact DEV root/legacy gate passes, but production remains on `main` and still serves Video Uniquifier. Do not cut over until #48 and P0 BASE #24/#35/#36 privacy/consent gates are complete.

Coordinator work this checkpoint was read-only source/CI/Render verification plus status handoff. No production deployment, provider spend, Stripe transaction, database mutation/export/restore, Render configuration change or feature-flag change.


## BASE #30 correction PR status — 2026-10-25

- Coordinator reproduced the exact-current-DEV mobile drawer failure and diagnosed the stacking overlap: mobile `#sidebar` is z-index 32 while the open Home header was z-index 33.
- Created draft [PR #402](https://github.com/mvryhan-web/video-variator-android/pull/402) from `deepsyq-platform`, exact head `3ddbef343ebeadf640798bb92f56d4be5aac1718`, with only two paths: `app/src/main/assets/deepsyq.css` and `.github/workflows/base30-mobile-drawer.yml`. It lowers the header layer while keeping the menu/close control above the drawer, and includes the CSS path in the focused workflow filter.
- Focused BASE #30, 31-screen visual, Home and broad platform checks are **QUEUED** at latest check. The PR remains DRAFT and unmerged; #1 remains PARTIAL until the exact-head focused browser test and required regression checks finish green, followed by review.
- Handoff is recorded on Issue #74 comment #6397324713. No production/Render, payment, database, provider or feature-flag action was taken.


## PR #402 focused browser evidence — 2026-10-25

Focused drawer workflow [#40190942461](https://github.com/mvryhan-web/video-variator-android/actions/runs/40190942461) passed on PR head `3ddbef343ebeadf640798bb92f56d4be5aac1718`: actual Playwright output **12 passed, 12 skipped, 0 failed**. The mobile Chromium and WebKit runs passed 320/390px pointer hit-test, Escape, outside tap, focus recovery, account navigation and no-paid-call assertions. Desktop navigation checks passed. The 31-screen design, Home UI and broad platform regression workflows were still running at the last check. PR #402 remains DRAFT/unmerged until those exact-head checks finish and the PR base comparison is refreshed. Issue #74 result posted as comment #6397346794.


## BASE #48 database discovery — read-only — 2026-10-25

A connected Neon account has a project named `Deepsyq Google TTS DEV 2026-10-24` on the free subscription, with one default `dev` branch and database `deepsyq`. Read-only metadata reports the branch's `init_source: parent-data`; table names include user/history/reminder tables. **No table rows or customer data were read.** This is a development/TTS database, not a qualified release-staging environment: its data origin/sanitization, app isolation, backup/restore behavior and staging test procedure have not been verified. Do not run release migrations, Stripe tests, restore tests or production-derived data against it. It does not clear BASE #48. Exact Render workspace inventory still contains only the production Postgres service; its recovery/export limitation remains unchanged.


## PR #402 exact-head visual/regression update — 2026-10-25

At PR head `3ddbef343ebeadf640798bb92f56d4be5aac1718`, the **Owner 31 real screens design acceptance** [#40190942498](https://github.com/mvryhan-web/video-variator-android/actions/runs/40190942498) completed SUCCESS. BASE #30 focused drawer [#40190942461](https://github.com/mvryhan-web/video-variator-android/actions/runs/40190942461) remains SUCCESS (12 passed, 12 skipped, zero failed).

The Home UI run [#40190942529](https://github.com/mvryhan-web/video-variator-android/actions/runs/40190942529) has an owner/Home selector failure at `tests/deepsyq.spec.mjs:448` and `:587`: expected `#canvasFeature #quickCreateForm` is absent. This is outside PR #402’s CSS/workflow diff and was handed to Home owner A in Issue #72 comment #6397371827. The broad platform regression [#40190942436](https://github.com/mvryhan-web/video-variator-android/actions/runs/40190942436) and owner media checks [#40190942516](https://github.com/mvryhan-web/video-variator-android/actions/runs/40190942516) are still running; PR #402 remains DRAFT/unmerged pending terminal checks and refreshed base comparison.

## BASE #27 and #29 source-vs-test correction — 2026-10-25

- **BASE #27:** The approved visible entry exists as `.et-showcase .et-uniquifier`, links to `index.html`, and retains the current editor. The failing test selected the separate hidden `[data-legacy-tool]` tile in a collapsed legacy section. [PR #406](https://github.com/mvryhan-web/video-variator-android/pull/406) updates acceptance to follow the visible banner, localizes its copy in EN/RU/FR/UK, and adds the visual script/CSS to the workflow path filter. It does not change the editor. Exact-head browser checks are pending.
- **BASE #29:** The “AI Agents — coming soon” navigation and eight concept cards are present; the obsolete test expected removed development copy. [PR #406](https://github.com/mvryhan-web/video-variator-android/pull/406) includes the replacement acceptance, checking the heading, all eight cards and zero API POSTs. Prior test-only run [#40192849231](https://github.com/mvryhan-web/video-variator-android/actions/runs/40192849231) passed on its exact then-current head; combined exact-head run is pending.
- Earlier draft [PR #404](https://github.com/mvryhan-web/video-variator-android/pull/404) contains the same BASE #29 correction on a stale DEV base and is superseded by #406; #404 remains unmerged.
- No production deploy, provider call, paid operation, database action or feature-flag change. Neither BASE #27 nor #29 is marked DONE until current-head checks and integration finish.



## BASE #27/#29 and #1 small acceptance fixes — 2026-10-25

- **PR #406 — BASE #27/#29, code/test head `e567a36a3cab011a9c260e495fa03fc7bd62a5f8`: BASE #27 PASS.** The earlier run on `1f4080c2cc838b2c2f9d85b7fb61474aa9fcd67a` had 12 passed / 4 failed because the test selected the legacy `#menuBtn`, `#freeToolsLink`, and sidebar. The approved Video Uniquifier shell hides those and uses `.vu-nav-toggle` plus `.vu-side-link[href="free-tools.html"]`; the test now exercises that real menu and route. Exact-head BASE #27 workflow [#40195119554](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195119554) passed **16/16** across Chromium, WebKit, mobile Chromium and mobile WebKit, including local history/media continuity and zero paid writes. No editor, processing, billing, history, or media behavior was changed.
- **BASE #29 / PR #406:** retains the existing “AI Agents — coming soon” disclosure and eight concept cards; no generation API writes. Exact-head BASE #29 workflow [#40195119573](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195119573) is queued.
- **PR #407 — BASE #1 limited disclosure + test alignment, exact head `be9c9edf12b8ce759f7cd5b5f32d747bdc06360c`: CHECKS IN PROGRESS.** The Lifetime text now explicitly says it does not grant unlimited AI generation and requires separate prepaid credits; checkout remains disabled. Two Home tests now assert the actual nine-card Canvas gallery. Exact-head no-spend journeys [#40194892053](https://github.com/mvryhan-web/video-variator-android/actions/runs/40194892053) passed. The 31-screen visual acceptance [#40194891991](https://github.com/mvryhan-web/video-variator-android/actions/runs/40194891991) completed SUCCESS. The Home UI acceptance run [#40194891995](https://github.com/mvryhan-web/video-variator-android/actions/runs/40194891995) has started; its browser checks are in progress. The broad platform regression [#40194891852](https://github.com/mvryhan-web/video-variator-android/actions/runs/40194891852) and owner media checks [#40194891952](https://github.com/mvryhan-web/video-variator-android/actions/runs/40194891952) remain in progress.
- Both PRs remain draft/unmerged until required exact-head checks are green. No production deploy, payment, paid provider call, database action, or feature-flag change was made.


## BASE #1 Home UI test correction — 2026-10-25

The Home UI run [#40194891995](https://github.com/mvryhan-web/video-variator-android/actions/runs/40194891995) reached Playwright and failed one assertion in `tests/deepsyq.spec.mjs:590`: the test still expected “coming soon” inside `#agentFeature`, while current Home presents the “AI Agent” heading and eight concept cards. The browser error-context artifact confirmed this is a stale acceptance assertion; no Home source or feature behavior was changed. PR #407 now asserts the existing heading and eight `.creative-example-card` items at exact test-fix head `d690c5796c7c99199fbcee64f175443287b5ea67`. Fresh Home UI run [#40195460321](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460321) and platform regression [#40195460301](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460301) are pending/in progress; other exact-head checks are queued. The Home UI browser failure is not considered resolved until the new exact-head test passes.


## PR #407 exact-head validation delta — 2026-10-25

On test head `d690c5796c7c99199fbcee64f175443287b5ea67`, the 31-screen visual suite [#40195460294](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460294), BASE #1 no-spend journey [#40195460302](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460302), Inspiration gallery [#40195460304](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460304), official brand icon QA [#40195460351](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460351), SEO preflight [#40195460282](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460282), and Product Video no-paid-call check [#40195460328](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460328) have passed. Home UI [#40195460321](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460321) has no job assigned yet; platform regression [#40195460301](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460301) and owner media [#40195460281](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460281) are still running. The earlier Home UI failure on `be9c9edf...` was the stale “coming soon” expectation documented above; the correction remains unverified until [#40195460321](https://github.com/mvryhan-web/video-variator-android/actions/runs/40195460321) runs. PR #407 remains draft.
