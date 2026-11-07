# OWNER D24 — 2026-11-07 — No unrelated edits, no isolated preview overwrite

**Binding for P, Administrator, Google Antigravity, and any future coding assistant.** This owner decision supersedes earlier general permission to "tidy", "improve", "polish", "restore from my branch", or deploy a personal worktree without explicit scope. Existing deployed and owner-approved behavior is the starting point, not disposable material.

## Rule 1 — Start with the actual owner task

Before ANY change, the executor must read (in order): `AGENTS.md` topmost/current OWNER rule; `DECISIONS.md`; this file; the latest DEV HEAD; the actual current TEST Render deployed SHA; relevant existing UI/functional tests. The executor must write a brief GitHub task checkpoint (in an Issue or PR) specifying:
- verbatim owner request / evidence, and **what is explicitly NOT requested**;
- baseline DEV SHA, current deployed TEST SHA, target page and user journey;
- exact **allowed files and exact section/functions** to change;
- **protected neighboring flows** to preserve (Studio Settings, model selection, aspect previews, mobile header, JARVIX, Pricing, etc.);
- 2–5 acceptance checks (desktop + mobile where relevant).
No task, no claim, no code. General promises of "improve entire site" are not permission to touch another component.

## Rule 2 — Only change the authorized lines

Never overwrite, copy back, replace entire HTML/CSS/JS files, autoformat unrelated code, cherry-pick stale versions, revert user-approved behavior, or modify shared components as collateral work. Especially when a feature already works: **carry forward its latest approved source and all later commits**. New code must merge into today's DEV, not into yesterday's local copy. Never delete or replace owner artwork, assets, layout, cards, nav, model support, account privacy or billing gates when the task is for another feature. Use a focused PR with the exact diff. If an unforeseen adjacent change is necessary, STOP and obtain new specific owner permission (or split a separate PR); don't silently expand scope.

**Hot zone — Studio Settings.** Protect the existing parent dialog (`#studioSettingsHub`), its explicit X close, persistence after choosing models/aspects + Done, true 1:1/9:16/16:9 frame geometry, button-anchored placement, and approved simplified Video settings. The approved baseline starts from DEV `8c5f527ebf6e572d30cd8983d5a9adc234fd7b6d` (PRs #560–#562). A JARVIX/language/header task does NOT authorize redesigning the Studio controls even if they share `generate-studio.js`. A necessary shared-file edit must be minimal, with an exact function/hunk diff and regression tests; new Studio changes require a new owner instruction for **that** interface.

## Rule 3 — One branch/PR per bounded task; prove the change list

Do not push to `deepsyq-platform` directly or merge another executor's PR wholesale. Branch from its latest HEAD. Open a PR, complete the mandatory **OWNER_SCOPE** declaration in the PR template: owner request, baseline SHA, exact changed paths, protected-component approval link if applicable, preserved behavior, desktop/mobile tests and safe deployment plan. Every changed path must be declared. No globs, "all files", or blanket permission. Never modify the scope declaration to disguise unrelated changes. New PRs must pass `owner-change-scope` CI plus the relevant component-specific, browser and privacy/security gates. `CODEOWNERS` is advisory unless GitHub rules require its review.

If another executor advanced DEV, re-fetch the current commit, inspect the changed paths and rebase/reconcile deliberately. Any overlap with a protected file requires review of both diffs and re-running its tests. Never force-push a shared or protected branch.

## Rule 4 — Publishing is a distinct, owner-controlled action

**Production/main is frozen.** Only the canonical isolated Render TEST service `srv-db91k1vf3r2c73fpj350` is in scope for already authorized safe previews. No paid providers, live Stripe or unsafe migrations.

Before a **TEST deploy**:
1. PR code/CI and required independent review have passed; fix or explicitly record unrelated pre-existing red gates without claiming that they passed.
2. Accepted changes are in the latest `deepsyq-platform`; check `git rev-parse origin/deepsyq-platform` and `git merge-base`. **Deploy only the exact current DEV SHA. Never deploy a loose PR HEAD, old snapshot, or an executor's separate branch**, even if that branch descends from DEV. Execute the repository's `owner-change-scope` deploy preflight.
3. Confirm the SHA includes other people's last accepted work, particularly the last tested Studio Settings contract. Review any new/modified `generate-studio*`, `studio-composer-popovers*`, shared navigation and header files.
4. If the current TEST commit differs from DEV, compare it before publishing; don't silently discard someone else's unpublished preview. Coordinate any unresolved preview-only changes first. **No deployment overwrite simply because today's task is ready.**
5. After deploy, confirm Render LIVE at that exact SHA and open actual TEST URL(s) on desktop/mobile, compare screenshots and complete click paths. If live interaction cannot be checked, report `TEST_LIVE / LIVE_UI_UNVERIFIED`, not DONE. Supply an exact direct TEST link.

A PR's green check or Render LIVE alone is not full user acceptance. This procedure is mandatory for Administrator just as for P.

## Incident evidence — Nov 7

- On 2026-11-07, isolated TEST was LIVE at `4de99be9fa74999ece8284804e6f06c7b3697feb` (PR #559), while the shared DEV HEAD was `8c5f527ebf6e572d30cd8983d5a9adc234fd7b6d`.
- Git comparison proves the PR commit is **four commits AHEAD of DEV**, not an obsolete ancestor. Nevertheless TEST was built from an unmerged PR head with a 14-file change set including `generate-studio.html`, `generate-studio.js`, `studio-composer-popovers.js`, mobile navigation and JARVIX; it changed the approved Settings composition. A newer branch is not automatically an authorized release.
- This record does **not** claim the author intended to revert work or that every one of those edits is defective. The breach is publishing an independent mixed-scope revision without the complete scoped UI acceptance and reconciliation. Preserve PR #559 and all work for comparison; do not roll back automatically.

## Repository protection still requiring owner configuration

As inspected 2026-11-07, GitHub reports `deepsyq-platform.protected=false`. Workflow checks **report** violations, but cannot stop someone with direct write access from pushing/merging or using Render Manual Deploy. Repository owner must enable GitHub **Settings → Rules → Rulesets** (or Branch protection):
- target `deepsyq-platform` and `main`;
- require PR before merge, no direct pushes, no force pushes, no deletions, restrict bypass actors;
- require latest-base / non-stale branches, the `owner-change-scope` status and relevant UI/security workflows;
- require real owner CODEOWNERS review for protected files, ideally using an account separate from Administrator;
- restrict Render deploy permissions to the coordinator/owner; manual deploy must run the exact-DEV preflight above.

**If Administrator and owner share the same GitHub account, CODEOWNERS cannot distinguish them**; separate identities and ruleset permissions are required to make an actual approval boundary. Do not claim these repository settings have been enabled until separately verified.

Status labels: `SCOPE_APPROVED`, `CODE_CHANGED`, `SCOPED_CI_PASS`, `MERGE_BLOCKED`, `TEST_LIVE`, `VISUAL_NOT_VERIFIED`, `OWNER_ACCEPTED`. Never use DONE just for writing code.
