# DEEPSYQ — OWNER LAUNCH PRIORITIES / 54 ACTIVE BASE ROWS
Owner decision: 2026-11-01. This is a **priority/acceptance overlay**, not an amendment deleting or weakening original BASE requirements, and it does not grant a production/main/Stripe/paid-provider release.

## Accounting
- Original BASE checklist contains 55 numbered rows.
- BASE #20 was cancelled by the owner on 2026-10-20, remains **RETIRED** (legacy links must not revive it): **54 active rows**.
- Original F1–F8 are names for existing Blocks 1–8, not eight additional BASE rows.
- These buckets describe **delivery priority**, not verified percent-complete, CI status, or authorization. A row can be merged in DEV and still be PARTIAL for original LIVE acceptance.

## Agreed launch triage

| Bucket | Count | Original BASE numbers | Delivery rule |
| --- | ---: | --- | --- |
| Launch Core / commercial first release | 33 | 1–7, 10–18, 24, 27–36, 42–43, 48–51 | Implement/accept the **necessary launch slice** before public paid release, including registration/auth, image/video generation, confirmed purchased credits, provider routing, async job, private storage + History, credit reconciliation, errors, safe rollback and real regression. |
| Product expansion / parallel only if independent | 14 | 8–9, 19, 22–23, 25–26, 37–41, 45–46 | Finish safe working pieces where independent; full versions can follow the commercial core if they are not launch dependencies. Inspiration/Canvas UX may be promoted by explicit owner choice; existing owner image DEV preview is not discarded. |
| Defer from first release | 2 | 21, 44 | #21 full autonomous AI Agents after purchased-credit E2E (a clearly limited no-spend preview may be prepared). #44 paid Trial $0.99 is still **OFF** until owner explicitly approves exact terms; do not restore a free AI plan or welcome credits. |
| Governance/acceptance rather than separate build features | 5 | 47, 52–55 | Continue enforcing Deepsyq branding, order, no-go scope, real release acceptance and final reporting. #47 and #53 already historically DONE as rules; don't create redundant app components. |
| Cancelled | 1 | 20 | Retired by owner; do not revive Product Video entry, routes or gallery. |

Count check: 33 + 14 + 2 + 5 = **54 active**; + cancelled #20 = 55 original.

**Important:** This is a roadmap triage; the original acceptance criteria stay intact. A user-facing core feature cannot be counted ready because its code or mocks are green. Original row status `DONE` only after appropriate real working/deployed acceptance including release gates, privacy, credits and billing where applicable. `MERGED_TO_DEV`, `DEPLOYED_PREVIEW`, `CODE_VERIFIED`, and `BLOCKED_EXTERNAL` remain distinct. Never claim production readiness from the isolated noindex DEV Preview.

## Execution
1. **First close real missing product capability**, not another test-only incremental PR. Check latest DEV HEAD, claims, current PR, and original row; reuse merged code and preserve owner Home/six MP4.
2. A/B/C/D own their existing lanes and may D16 self-merge a narrowly scoped safe improvement after final-head CI + required independent B↔D finance/security review. Coordinator handles claims and safe DEV Preview publication, not serial approval bottlenecks.
3. For each user-visible feature: actual app/API behavior → functional negative/positive tests → current-SHA CI → safe DEV merge → isolated preview deploy and observed route/API → record the next real gap. Do not label paid/provider commercial feature fully DONE without authorized real purchase→AI→private output→History and all-in net margin evidence.
4. **No provider costs, Stripe live, main/production, risky migrations or owner protected media changes without separate explicit release authorization.** Mark the real external blocker, retain the current claim, and finish the next independent safe gap.
5. Already merged examples must not be repeated: PR149 fallback initial work, PR226 and PR448 navigation, PR443 localized errors, PR442 Video Uniquifier access, PR446/461/462 feature flags, PR467 owner 28 Inspiration previews.

## Google Jules tasks / conditional next work
- Jules1 Issue #316, W5.5 owner-only watcher delivery-readiness policy: CURRENT TASK **UNVERIFIED READY**; finish the original two files and DEV-target PR before assigning the next Block5 stage.
- Jules2 Issue #317, W4.3 Workspace sections/search: CURRENT TASK **UNVERIFIED READY**; finish original two files and account-safe tests before Block4 successor. Never restore removed Favorites/Challenges menu items.
- Jules3 Issue #278, V6.2 microphone opt-in preview: CURRENT UI STATUS **UNKNOWN**, two later dispatch attempts FAILED_TO_CREATE_TASK; preserve original task and code, do not start duplicate. Next Block6 stage only after actual completion and approved claims.
- For all three, **GitHub issue ACK does not prove the Jules task is running or complete**. Check the original Jules task UI, final READY report, actual scoped PR/branch/SHA, real free CI, collisions and deployment scope. Do not relabel/restart blindly. A GitHub comment cannot resume a paused Jules task.

Links: [master roadmap #237](https://github.com/mvryhan-web/video-variator-android/issues/237), [coordinator #233](https://github.com/mvryhan-web/video-variator-android/issues/233), [approved BASE55 plan](DEEPSYQ_BASE55_F1_F8_EXECUTION_PLAN_20261020.md), [Decisions](../DECISIONS.md), [original BASE](DEEPSYQ_BASE_CHECKLIST.md).


## Owner Jules sunset / operational correction — 2026-11-01

The **owner explicitly declined Google Antigravity and any Jules migration**. Permit completion of existing Jules slots only up to **2026-11-11** (owner-observed Jules cutoff), then stop further Jules assignments. Preserve committed/pushed code, scoped source/test files, final PR+SHA+native results and honest incomplete handoffs **in GitHub before access is restricted**. No guarantee that a bot ACK corresponds to a running task.

- **Jules1 #316 W5.5:** current task `3016109186533092867` ended with **Google bot unexpected error**, not READY. Inspect existing committed GitHub work and use `NO_CODE_PUSHED / BLOCKED` if nothing was actually pushed; do not repeatedly relabel.
- **Jules2 #317 W4.3:** current task `7709543839242461379` posted **READY** and code+tests on [PR471](https://github.com/mvryhan-web/video-variator-android/pull/471) HEAD `3c990e0cdd474560ed3f7cc9dc28ef788d6cbfa7`. GitHub branch is **wrongly based on `main`**, not `deepsyq-platform`; coordinator converted **same PR471 to DRAFT**, requested clean non-force DEV reconciliation of precisely two source/test files. Not merged, not DONE_TO_DEV. Owner removed Favorites/Challenges from visible navigation; pure internal section data is not permission to restore UI.
- **Jules3 #278 V6.2:** latest new-task creation FAILED; prior original task `10433459474091459526` UI status unknown; preserve any existing pushed source or mark unavailable. No blind retry.
- No new Jules roadmap assignments, no duplicate issues or PRs, no production/main merge. When current work is correctly integrated, future ordinary A–D assignments follow the same owner-approved BASE 54 / F1–F8 queues and release gates.

This operational note updates only task/evidence status, **not** the original BASE requirements, bucket counts, or owner production permissions.
