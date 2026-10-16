# AGENTS.md — Deepsyq shared rules for all coding agents

This repository is the single production codebase for Deepsyq (formerly Video Variator / Video Uniquifier). These rules apply to every coding agent, cloud agent, AI assistant, and human contributor working in this repository.

## Mandatory read order before any work

Before changing code, always read and reconcile:

1. `AGENTS.md` — collaboration and safety rules.
2. `PROJECT_STATUS.md` — live progress, current owner, blockers, and next work.
3. **The exact original owner TXT specification for the assigned scope:** BASE = `docs/DEEPSYQ_PLATFORM_SPEC.md`, or Roadmap Block N = `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_N.txt` (N = 1…7). Read the **whole applicable original** before deciding what to implement. For tasks spanning multiple scopes, read each corresponding TXT.
4. `docs/DEEPSYQ_ROADMAP.md` and `docs/DEEPSYQ_BASE_CHECKLIST.md` — secondary roadmap/status references, NEVER replacements for the original TXT.
5. Any relevant existing production specifications, especially `docs/PRODUCTION_SPEC.md` and `PRODUCTION_DEPLOYMENT_SPEC.md`.
5. The latest Git history, current branch, recent commits, open PRs, and the actual implementation.

Do not assume a feature exists or works because a file, route, button, or function has a promising name. Verify the code and tests.


## Original owner TXT files are mandatory and authoritative (2026-10-16)

**Non-negotiable owner instruction:** The original, separate TXT for the workstream governs what to build. Do not invent a parallel feature roadmap from agent suggestions, a progress summary, or generic checklists.

- **BASE** — the owner's original large TXT `Вставленный текст(9).txt`, faithfully and byte-for-byte reflected in the existing `docs/DEEPSYQ_PLATFORM_SPEC.md`. BASE is **not Block 1**. Follow its numbered requirements and `docs/DEEPSYQ_BASE_CHECKLIST.md` for completion state.
- **Block 1** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_1.txt`, Multi-AI Compare + Smart Model Routing.
- **Block 2** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_2.txt`, User Agent / Do It For Me.
- **Block 3** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_3.txt`, Inspiration / Create Yours.
- **Block 4** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_4.txt`, Studio + My Workspace.
- **Block 5** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_5.txt`, Internal Product Watcher Agent.
- **Block 6** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_6.txt`, Deepsyq Voice Agent.
- **Block 7** — `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_7.txt`, Pricing, Credits, Stripe & Unit Economics.

All seven TXT copies originate from the owner's separately saved original files, not assistant-authored paraphrases. The owner's combined `DEEPSYQ_BLOCKS_1-7_CANONICAL.txt` is an additional cross-reference; it does **not** collapse these separate scope files. **Do not edit/rewrite any copied source TXT to reflect implementation progress**; put statuses in `PROJECT_STATUS.md` / scoped checklists instead. Any newly approved owner amendment should be separately documented and linked, not silently woven into the original.

**Required workflow for every agent and every new scoped task:**
1. Identify whether the work is BASE or Block 1–7. Read the whole exact source TXT for that specific scope *before coding*. Do not confuse numbered sections inside BASE with Roadmap Blocks.
2. Map requested requirements to the existing code, owner/branch, and relevant checklist. Mark which are already genuinely implemented versus incomplete; respect concurrent agents and do not duplicate their work.
3. Implement **the next incomplete original TXT requirement within your assigned workstream**, not an unrelated useful-sounding feature. Handle external blockers honestly without substituting endless tests or fake completion. Do not touch other blocks without assignment.
4. After the coherent feature is implemented, run the appropriate targeted checks once, record the actual verified result, and continue with the next TXT requirement. `CODE VERIFIED`, `MERGED TO MAIN`, `DEPLOYED`, and `LIVE VERIFIED` are distinct states.
5. If the applicable TXT cannot be accessed or its requirements conflict with existing owner-approved constraints, **do not fabricate the missing source or silently substitute the summary roadmap**. Locate/recover the source and reconcile the conflict first.

## Work-limit efficiency — avoid redundant verification

Use the smallest verification scope that is safe for the current change.

- Do one focused audit before a coherent work block, then reuse that verified context while the relevant files/config have not changed.
- Do not re-read the same files, re-check the same branch/PR state, or re-run the same GitHub/Render/production inspections after every small edit.
- Batch related edits first, then run the relevant tests once at the end of the logical block.
- Re-check earlier facts only when the related code/config changed, an unexpected result appears, or the change touches a critical boundary such as production, database migrations, Stripe, authentication, secrets, provider activation, or destructive operations.
- Prefer targeted tests for the changed area; run broader regression only at a meaningful release/merge gate or when the blast radius justifies it.
- Never skip a necessary safety check just to save tool calls, but do not spend Work limit proving the same unchanged fact repeatedly.

## Canonical main branch — BASE + all seven roadmap blocks (owner rule, 2026-10-15)

**Final integration target: `main`.** Deepsyq BASE and **every one of Blocks 1–7** belong in this **existing repository** and must eventually be merged into the canonical `main` branch as a single integrated application. A feature branch, draft PR, or independent Render service is **not** the final home of any completed block.

- During parallel development, use isolated feature branches and PRs to protect other agents' work. That is temporary, not a different product or release branch. Do not commit unfinished, unreviewed or conflicting work directly to `main`.
- Before integration, inspect the latest `main`, the active BASE branch/PR, other open PRs, actual code and `PROJECT_STATUS.md`. Integrate dependencies first; preserve the owner-approved Home, existing functions and the newest verified work of other agents. Never overwrite or force-push `main` to resolve a conflict.
- Integration order: verify the shared BASE, merge it to `main`, then merge each ready block through reviewed, tested, conflict-resolved PRs. Block 5 Product Watcher has nested PRs #49 -> #48 -> #47 -> #46; reconcile them with the current BASE before the final `main` merge. Other blocks follow their actual dependencies; no block is presumed complete merely because its PR exists.
- Record a block as **IN PROGRESS / READY TO MERGE / MERGED TO MAIN / DEPLOYED AND VERIFIED** separately. A green CI run or merge is not proof of a working production deployment. Mark DONE only after all applicable tests, `main` integration and required end-to-end verification.
- **Production is a separate safety gate.** Render currently auto-deploys `main`; before any functional merge that could deploy, check migration/backup/restore readiness, database continuity, production compatibility, disabled-by-default paid features, secrets and relevant owner approvals. Never deploy risky changes just to satisfy the canonical-branch rule. Documentation-only commits to `main` should use `[skip render]` in the commit message to avoid unnecessary redeployment.
- Maintain one GitHub repository, one `main` production integration branch, the existing application/Render service, and shared PostgreSQL/auth/Stripe/provider foundations. Do not create a permanent second Deepsyq stack or abandon a finished block in a private branch.

## One project, no duplicate architecture

- Continue the existing production project. Never create a second Deepsyq project, parallel database, duplicate authentication system, duplicate Stripe setup, duplicate router, or replacement architecture unless the owner explicitly asks for it.
- Reuse working components, database tables, auth, billing, video processing, UI primitives, deployment, and provider abstractions wherever practical.
- Do not rebuild working features from scratch merely because a new agent joined the project.
- Never silently migrate production infrastructure to another platform.

## Synchronize before starting

Every agent must, before work:

- fetch/pull the latest repository state;
- inspect recent commits and open PRs;
- read `PROJECT_STATUS.md`;
- inspect the relevant existing code;
- confirm that the task has not already been implemented by another agent.

If the status file and the code disagree, the code plus verified tests are the technical truth. Update `PROJECT_STATUS.md` to remove the mismatch.

## Bounded ownership — do not overload one agent

Do not assume the current agent owns the entire roadmap.

Each agent should normally receive one bounded workstream or a small coherent set of tightly related tasks.

Before substantial work:
- claim the workstream in `PROJECT_STATUS.md`;
- record the agent/workstream and branch/PR when practical;
- check that no other agent is already modifying the same area.

When multiple agents are available, parallelize **non-overlapping** work instead of making one agent hold all roadmap blocks in active context.

## Claim work and avoid collisions

When multiple agents are active:

- prefer a separate branch per substantial task;
- do not have two agents edit the same feature/module at the same time unless explicitly coordinated;
- mark a substantial task as `IN PROGRESS` in `PROJECT_STATUS.md` with the agent/workstream and branch when practical;
- re-sync before merging;
- resolve conflicts by preserving the newest verified working behavior, not by blindly overwriting.

## Definition of DONE

Never mark a feature `DONE` only because code was written.

A feature may be marked `DONE` only when:

- implementation is present;
- relevant tests/checks pass;
- the user-facing flow was verified where applicable;
- no known critical blocker remains;
- the changes are committed/pushed;
- `PROJECT_STATUS.md` is updated with a short verification note and commit/PR reference when available.

Use `PARTIAL`, `IN PROGRESS`, `BLOCKED`, or `NOT STARTED` when that is more accurate.

## Update the shared status after every meaningful task

Before ending a work session, update `PROJECT_STATUS.md` with:

- what changed;
- status of the feature;
- tests/verification performed;
- important files/modules changed;
- blockers or missing credentials;
- what the next agent should do;
- branch/commit/PR reference when available.

Keep `PROJECT_STATUS.md` concise. Detailed historical changes belong in Git commits/PRs, not in an ever-growing diary.

## Approved roadmap and new owner instructions

The approved future product roadmap is in `docs/DEEPSYQ_ROADMAP.md`.

The current Work agent should finish and hand off its current bounded TXT/production scope. It should **not automatically be responsible for all queued roadmap blocks 1–6**.

Roadmap blocks may be assigned to additional agents as separate workstreams once shared dependencies are ready, or earlier when the owner explicitly assigns an independent, non-conflicting block.

When the owner gives a new lasting product requirement:

1. do not lose or overwrite previous approved requirements;
2. add or reconcile the requirement in the appropriate roadmap/spec file;
3. add/update its concise state in `PROJECT_STATUS.md`;
4. leave it unassigned until an agent is chosen, unless the owner explicitly assigns it;
5. then implement according to the current priority and dependency rules.

A chat message is not a reason to duplicate existing work. First inspect the repository and status.

## Production safety

- Never commit API keys, passwords, OAuth secrets, private keys, database credentials, Stripe secrets, or user data.
- Do not perform destructive database/schema/data operations without an explicit migration plan and verification.
- Do not change billing, authentication, production domains, provider credentials, or production data destructively without explicit owner approval.
- Prefer reversible changes.
- Preserve the working Video Uniquifier and existing production functions while expanding Deepsyq.
- A code change is not proof that an external deployment, credential, webhook, provider console, or scheduled service is configured. Verify external setup separately.

## AI/provider rules

- Do not hard-code one provider as permanently best.
- Use the shared provider/router abstraction.
- Model/provider names, IDs, limits, costs, and availability should be configuration-driven where possible.
- Never fake a provider response or present an unavailable integration as working.
- Track usage/cost/credits for paid AI features.

## Handoff rule

Every agent should leave the repository in a state where another agent can continue without asking the owner to repeat the project history.

The next agent should be able to answer, from the repository alone:

- What is already done?
- What is in progress?
- Who owns each active workstream?
- What is next?
- What is blocked?
- What must not be duplicated?
- What was tested?
- Which approved roadmap requirement does the work belong to?



## Production AI rollout
Before any production/public AI activation, read `docs/AI_PRODUCTION_ROLLOUT.md`. Run `npm run ai:preflight` read-only before launch decisions and `npm run migrate:ai` only after a verified production DB backup. Never enable live Stripe/public AI/root switching in the same unverified step.

## Owner-approved Deepsyq Home design — protected visual contract (2026-10-15)

**OWNER-LOCKED:** Before changing the Deepsyq dashboard/menu/hero/Canvas/Agent/AI Apps/Inspiration visual architecture, read `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md` and compare against the exact owner-approved PNG in the owner's persistent Library (`/Deepsyq/Approved Design/DEEPSYQ_OWNER_APPROVED_HOME_2026-10-15.png`, SHA-256 `7198fb20b8300e8f8d90c4788a0288570a49be569df23cb82f06da29e1b0db47`). Do not redesign, replace, reorder or materially restyle the selected purple/blue cinematic layout without **explicit new owner approval**. Keep previous user assets and existing functions. Minor bug fixes/responsiveness/accessibility changes must maintain fidelity and remain gated by existing production safety. The PNG is a reference screenshot, not a real playable video. Do not fake video, functionality, social links, promotional credits or available Agents.
