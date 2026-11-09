## OWNER D28 — 2026-11-09 — ASSEMBLED CAR / ONE REQUEST = ONE SURGICAL CHANGE

**CURRENT OWNER SCOPE RULE. Effective immediately for Coordinator P, Administrator, Antigravity and any future executor. D28 clarifies the scope of D27; D27's verified publication, TEST/MAIN separation and security/billing safeguards remain in force. If historical instructions below demand a whole-project audit for a local task, D28 overrides that demand.**

1. **An assembled car, not a rebuild.** DEEPSYQ is an existing, approved platform. If the Owner asks to change a headlight's color, change ONLY that headlight; do not rebuild the car. If the Owner asks to move one button, edit ONLY that button's existing code/style. Preserve every neighboring control, page, component, route, model, setting, design, API and user datum.
2. **No whole-project inspection by default.** Go straight to the Owner-named page/component/element. Read only its current relevant source, its direct dependencies when necessary, and the minimum instructions needed to act safely. Do NOT re-audit the whole repository, repeat recovery procedures, inventory unrelated PRs/issues, or inspect all F1–F6/BASE items for each small request. A broad audit requires the Owner's explicit request or a specific demonstrated risk that cannot be isolated.
3. **Fast and scoped execution.** Locate -> inspect the narrow affected range -> make the smallest correct diff -> run only relevant syntax/targeted checks -> deploy to an isolated Cloudflare TEST Preview when the requested work changes the website -> verify the exact requested result on the real URL, including mobile if relevant -> report. Do not treat unrelated failing CI as permission to alter unrelated code or claim an unverified success.
4. **No collateral changes.** No redesigns, refactors, global reformatting, dependency upgrades, replacement of entire files with old snapshots, unrelated cleanup, or speculative improvements. If another area appears broken, report it separately and do not touch it unless the Owner authorizes that area. Do not duplicate existing systems.
5. **One instruction is not an invitation to extra work.** Do not repeatedly check the same HEAD or re-explain the entire project unless the specific task or concurrent edits require it. The smallest necessary pre-change check and focused post-change verification are enough.
6. **Example (scope only, not a new implementation request):** Mobile JARVIX Chat -> Studio Settings -> close X overlapping Image/Video/Audio: adjust only that close X positioning and necessary local styling. Do not change the Image/Video/Audio fields, other Studio Settings, universal header, JARVIX functions, Pricing or Video Uniquifier.
7. **Completion and authority.** Owner approval remains required for MAIN/production. Do not spend money on tests, bypass required security/financial gates, or declare website work DONE before permitted Cloudflare TEST publication and targeted live verification. If blocked, say BLOCKED / NOT PUBLISHED with the concrete reason. A GitHub-only rule/documentation change is effective when committed to the intended GitHub branch; it does not itself require a website deployment.

---

## OWNER D27 — 2026-11-09 — COMPLETE THE TASK THROUGH VERIFIED PUBLICATION

**HIGHEST PRIORITY CURRENT OWNER RULE, effective immediately. It supersedes all D26/D25/D24 "administrator-only", "P audit-only", "do not deploy", and "commit/PR is completion" restrictions. The old wording below is historical and NOT an instruction to stop work.**

1. **No exclusive administrator requirement.** The Owner may directly assign implementation, verification, integration and deployment to Coordinator P (ChatGPT), the Administrator or Antigravity. An explicitly assigned executor performs the work directly; do not wait for a separate Administrator solely because of an obsolete role rule. Preserve the Owner as final authority.
2. **Work does NOT stop at a plan, code diff, commit, pull request or merge.** Keep going until the owner-requested change is PUBLISHED to the permitted Cloudflare environment, verified on the actual URL (including the relevant mobile interaction) and reported with exact revision and link. Only then mark **DONE**. If a real technical/permission blocker prevents publication, report **BLOCKED, NOT PUBLISHED** accurately; do not pretend success or bypass safety checks.
3. **Scope and appearance are immutable except for the requested element.** Preserve the current Owner-approved design, controls, data and behavior. No redesigns, reverts to stale design snapshots, new systems or unnecessary files. The immediate task is ONLY the JARVIX Chat mobile Studio Settings close X overlapping Image/Video/Audio.
4. **TEST first, PROD only with separately explicit Owner approval.** The canonical `deepsyq.pages.dev` is a production-branch alias, NOT isolated TEST; use a uniquely named `https://<preview>.deepsyq.pages.dev` deployment and verify the main deployment is unchanged. Preserve existing Cloudflare Worker/API, Stripe/Neon credentials, purchased credits and all working assets. No paid AI calls in testing.
5. Before each release, use current DEV HEAD, inspect requested diff, verify syntax and targeted real desktop/mobile behavior, publish and report the actual state. Do not stop solely because the change is small; the publication requirement applies to every requested change unless the Owner explicitly forbids publication.

---

# OWNER D26 — 2026-11-08 — CLOUDFLARE MIGRATION ($0 RENDER), FAST-TRACK LAUNCH & PROFIT RULES

**This is the CURRENT binding rule. It supersedes D25/D24 wherever older rules reference Render (`onrender.com`) or restrict owner-assigned Antigravity deployments.**

- **Render Decommissioned ($0/month):** All Render services and the paid Render PostgreSQL database (`video-uniquifier-db`) are suspended/deleted. Do not deploy to or re-enable Render.
- **Cloudflare Pages + Edge Worker + Neon PostgreSQL:**
  - **Preview / TEST:** `https://deepsyq.pages.dev` (and branch preview URLs `*.deepsyq.pages.dev`) + local `START_DEEPSYQ_LOCAL.bat`.
  - **Main Domain:** `https://deepsyq.app` (updated only with owner verification and approval).
- **Executors:** Administrator and Antigravity (acting on direct owner instructions) are authorized to implement surgical edits and publish to Cloudflare Pages; Coordinator P (ChatGPT) performs independent verification, audits, and reporting.
- **Assembled-Car Principle + Profit Rules:** Preserve all existing approved UI and features; change only requested lines; maintain unit economics ≥ 2:1 and `$0` test spend.

---

# OWNER D25 — 2026-11-07 — ONE CAR, ONE ADMINISTRATOR, SURGICAL REPAIR

**This is the CURRENT binding rule. It overrides D24/D23 wherever older rules imply that Antigravity, P or other agents may develop/publish application features.**

## Who does what now

- **Administrator — sole application developer and sole owner-authorized TEST publisher.** Takes only the owner's specific requests, implements code, verifies, merges and publishes accepted integrated DEV. Administrator is still subject to owner approvals, all CI/lock rules and the TEST-only limit.
- **Antigravity — retired from ALL DEEPSYQ tasks, code edits and deployments, effective immediately.** No new assignments, PRs or deploys; do not delete their existing code, files, histories or contributions.
- **P — coordination, independent checking, documentation/governance updates and status reports only.** Not a second application coder or publisher under D25. Other retired agents/Jules remain retired. PROD/main remains frozen.
- This file changes the workflow policy; to actually revoke write/deploy ability the owner must separately configure GitHub repository roles/Rulesets and Render team/service permissions.

## The owner's assembled-car principle (non-negotiable)

Imagine DEEPSYQ is an assembled car built over several weeks. The owner wants different dashboard buttons — replace ONLY those buttons. The seats, rear lights, windows, steering wheel, mechanics and existing button functions stay exactly as they were. If owner wants a different seat shape, change ONLY seat shape: electric adjustment, position memory and every other working system remain unchanged. **A task is a minimal delta, not a rebuild.**

Translate this to code:
1. Identify the exact visible element, approved behavior and requested change **before** editing. Record allowed file(s), specific functions/lines and unchanged neighboring behavior.
2. Work from the current integrated approved code. A file containing the target element is not automatically permission to rewrite the full file, move unrelated controls, change shared styles, alter callbacks, redesign dialogs, change translations or restore old components.
3. Preserve all approved code and assets, selected model/aspect, saved work, page visuals and behavior. If a user asks for a color or shape, do not change the function. If a user asks for a function, do not redesign it unless explicitly instructed.
4. Review exact diff BEFORE merge. Any extra file, hunk or behavioral change is a regression until justified by the owner. Separate unavoidable neighboring changes into a new requested task; otherwise remove **only** the unintended edits.
5. A release is the **entire last accepted site plus the requested delta only**. Merge the approved minimal change into current DEV, not a personal branch snapshot. Compare actual TEST LIVE commit with DEV; retain other accepted work; never overwrite it accidentally. Publish only merged reviewed latest `deepsyq-platform` SHA to TEST, by Administrator only.
6. Validate desktop and mobile, normal use and neighboring behavior. For Studio Settings confirm persistent parent panel until X, model/ratio selections preserved, correct ratio-frame proportions, popover placement beside gear and simplified Video Settings. Nothing else may change.

## Administrator's mandatory repair of the morning TEST publication

On 2026-11-07 TEST was deployed from the **unmerged** PR #559 SHA `4de99be9fa74999ece8284804e6f06c7b3697feb`, 4 commits ahead of the prior DEV baseline `8c5f527ebf6e572d30cd8983d5a9adc234fd7b6d`. The comparison has **14 changed files**, including `generate-studio.html`, `generate-studio.js`, `studio-composer-popovers.js`, `deepsyq-mobile-shell.js` and JARVIX sources. Owner reports unintended added/overlapping buttons and changed previously accepted Image, Video and Audio Studio Settings.

**Administrator must repair this before the next feature release:**
- Compare the exact LIVE TEST #559 tree, the previous approved baseline (#560–#562), the current DEV HEAD, and the actual owner assignments for the morning. Identify which changes were explicitly requested. Do not assume every new line in #559 is authorized or that every line is wrong.
- **Keep all authorized morning enhancements exactly as approved. Restore only unrelated/unrequested edits** to their earlier approved code and UI. Especially restore the Studio Settings design/interactions and remove accidental duplicate/overlapping buttons, preserving every earlier working behavior.
- Do NOT reset the entire repo to yesterday, revert PR #559 wholesale, replace whole CSS/JS/HTML files with earlier snapshots, delete history, discard approved JARVIX features or modify unrelated functionality.
- Produce precise per-file before/after diff, screenshots before and after (desktop/mobile), and run no-spend UI regression tests across Image, Video and Audio, their model choices, ratios, parent Settings hub, Done and X, and shared navigation.
- Integrate corrected minimal changes into latest `deepsyq-platform` alongside D25 rules. Never publish a detached or stale PR branch; run exact-SHA preflight and only publish the **complete reconciled DEV** to isolated TEST. Confirm LIVE exact commit and actually open the page to verify the final UI.
- If not possible to distinguish requested from unrequested changes, make an exact comparison for owner approval first; DO NOT guess and DO NOT publish.

## Mandatory after every new task

The Administrator reports: (a) what the owner requested; (b) exact changed files/functions; (c) what was intentionally left unchanged; (d) tests, screenshots and result; (e) exact reviewed DEV and LIVE TEST SHA. Never report DONE from a mere commit, PR or Render status.

**Security / access gap:** `deepsyq-platform` is not yet protected by GitHub Rulesets. Repository owner must enable mandatory PR/required checks/owner reviewer and remove Antigravity write/bypass permissions; also revoke Antigravity's Render deploy rights and give only Administrator the permitted TEST deployment role. Code instructions do not themselves revoke API tokens or deployment access.

**Owner decision:** https://github.com/mvryhan-web/video-variator-android/issues/233#issuecomment-6704526345

---

# OWNER D24 — 2026-11-07 — Historical detailed change-control (superseded by D25 for roles)

**Historical D24 scope detail: D25 above is the active role rule; Administrator alone handles code and TEST deployment, P is governance-only, Antigravity is retired.** This owner decision supersedes earlier general permission to "tidy", "improve", "polish", "restore from my branch", or deploy a personal worktree without explicit scope. Existing deployed and owner-approved behavior is the starting point, not disposable material.

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


## OWNER CORRECTION 2026-11-07 — PRESERVE ORIGINAL LOWER NAVIGATION

The owner expressly REVOKES the lower-row redesign made in PR #590. Both screenshots were references **only for the existing upper composer controls**, not permission to replace or decorate the lower navigation. The owner demands the **one pre-existing shared lower navigation** unchanged across Home, JARVIX, Image, Video, Audio, Tools and Video Uniquifier; do not add a waveform, pills, new frames, layout styles, separators, spacing, orders or new components to that navigation without a **new explicit owner request**.

**Keep from PR #590 ONLY:** the round centered `+` and round Send paper-plane controls, corrected upper-row alignment and prior microphone/Stop behavior, also on mobile. **Restore:** all former lower-row CSS and layout by dropping PR #590's injected `.j-mode-rail` styles, synthetic `::after` waveform, new shared dock-frame styling and unrelated dock positioning changes. Do not alter existing shared navigation handlers in `jarvix-composer-design.js`. Do not touch the upper header, carousel, Studio, pricing or billing. The preserved existing lower row is not a redesign task; future CI may check only that it has not changed.


## OWNER REQUEST 2026-11-07 — UNIVERSAL HUB, explicit lower-row change

Owner now explicitly approves changing the existing bottom JARVIX chat/Home row: keep only **JARVIX** and **Video Uniquifier** as permanent links, with a temporary glowing **Image/Video/Audio** selected-mode indicator in between. Remove former Image/Video/Audio/Tools permanent quick links **only in this shared Home/Chat component**, no new footer or layout on unrelated pages. This request supersedes the previous restriction on touching the lower row for **this specific change only**; still preserve all other approved styling and behavior. The glowing `+` opens an 8-item Universal Hub: Image, Video, Audio, Tools, AI Apps, Inspiration, Upload and Assets. Upload uses existing validated file picker; Assets goes to existing `my-creations.html`. Remove redundant image/paperclip icons to the right of input, preserve microphone Stop, settings shortcut and circular Send. Settings shortcut opens a matching small panel for existing Image/Video/Audio Studio settings, without changing the Studio settings UI itself. No additional tools, no paid generation, no additional Site or Render services. All new styling scoped to existing plus, settings and dynamic selected badge.


## OWNER 2026-11-07 — ONE UNIVERSAL BOTTOM PANEL IN IMAGE, VIDEO, AUDIO STUDIOS

The owner explicitly accepted the Home/JARVIX 8-tile Universal Hub + bottom two permanent quick links (JARVIX and Video Uniquifier) and requests **the identical bottom panel, not a second panel** in all three existing `generate-studio.html?studio=image|video|audio` routes, on desktop and portrait mobile. The previous Studio visible composer is **replaced visually**, with original protected form `#creator`, native `#prompt`, `#generate`, microphone and Settings/Model handlers reused and moved into one bottom dock via a thin adapter. Do not duplicate generation workflows or add new top/bottom nav. The 8-tile + popover and neon three-card Settings selector stay visually the same. Selecting a mode inside Home/JARVIX Settings **updates mode in place instead of redirecting**, and inside Studio selects the corresponding original Studio mode without navigation; original model/settings hub remains available and unchanged. Image/Video/Audio must retain saved drafts, results, authorized reference images, pricing, explicit quote confirmation and consent. An actual click on Studio Send is the existing Generate submit, never automatic paid generation. The existing Studio does **not** support arbitrary audio/video reference files; it must communicate this limitation rather than pretending it uploaded them. PROD/main unchanged.
