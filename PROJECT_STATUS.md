# PROJECT_STATUS.md — Deepsyq live project state

Last updated: 2026-10-15  
Repository: `mvryhan-web/video-variator-android`  
Brand: **Deepsyq**  
This file is the shared live progress board for all coding agents.

> Read `AGENTS.md` first. Do not mark anything DONE without implementation + verification.

## Canonical integration policy — owner instruction 2026-10-15

**Target: one existing repository and `main` branch for Deepsyq BASE + all seven blocks (1–7).** Feature branches and draft PRs are temporary development workspaces. Every verified block must be reconciled with the latest BASE, merged into `main` through reviewed tests and conflict resolution, and then separately validated on Render where required. See `AGENTS.md` and `docs/DEEPSYQ_ROADMAP.md`. No force-push, no replacement architecture, and no blind copy of feature branches to production.

**Actual release status:** `main` still serves the existing application. BASE is in draft PR #42; Product Watcher Block 5 is in separate draft PR chain #49 → #48 → #47 → #46. These are **NOT MERGED TO MAIN**, and the other roadmap blocks must be checked individually. Render currently auto-deploys `main`; the free PostgreSQL `video-uniquifier-db` is reported available with expiry **2026-10-17**. Before the first functional integration/deploy, verify database continuity, independent recoverable backup, compatibility, CI and rollback. Documentation commits use `[skip render]` to avoid redeployment. Do not claim live migration, backup or readiness until verified.

## Current priority gate

**ACTIVE NOW:** finish the currently assigned production/TXT scope already being handled by the current ChatGPT Work agent.

Visible active work in GitHub:
- branch: `ai-generation-studio`
- open PR: **#40 — Prepare compact AI video, image and audio studios; keep generation and billing gated**
- current branch head referenced by that PR: `144e1e9a1a9e9e98951d4ef4aa49c29fdb630f6c`
- PR reports compact AI video/image/audio studios, provider preparation, gated billing, and passing automated checks; it is still an open PR and is **not treated as merged production**.

**Important:** do NOT assign the current Work agent all roadmap blocks 1–7 by default. Its job is to finish and hand off its current bounded TXT/production scope. Additional agents may take separate non-overlapping roadmap blocks after the relevant shared foundations are stable, or earlier only when the owner explicitly assigns them and collision risk is low.

Before any agent starts a roadmap block, it must audit the latest code/branches/PRs because another agent may already have implemented part of it.

## Existing production baseline

This is an existing production project, not a greenfield app. Preserve and reuse the working codebase, PostgreSQL, authentication, Stripe/billing pieces, Video Uniquifier, utilities, deployment and other existing functionality.

The exact completion state of older components must be verified from the current code and tests. Do not infer completion from names alone.

## Active work ownership

| Workstream | Owner / Agent | Branch / PR | Status | Rule |
|---|---|---|---|---|
| Current TXT / generation-studio scope | Current ChatGPT Work agent | `ai-generation-studio` / PR #40 | IN PROGRESS / OPEN PR | Finish, test, hand off. Do not automatically absorb blocks 1–6. |

When another agent joins, add one row per claimed workstream before substantial implementation. One agent should own one bounded workstream at a time.

## Approved queued roadmap

| # | Workstream | Status | Assigned owner | Notes |
|---|---|---|---|---|
| 1 | Multi-AI Compare + Smart Model Routing | NOT STARTED / QUEUED | UNASSIGNED | One prompt -> multiple real AI providers, compare, combine, cost/credit tracking |
| 2 | User Agent — “Do it for me” | NOT STARTED / QUEUED | UNASSIGNED | Multi-step execution through Agent Orchestrator |
| 3 | Inspiration / Create Yours | NOT STARTED / QUEUED | UNASSIGNED | Original owned gallery, prompts/templates, Clone/Create Yours flows |
| 4 | Studio + My Workspace | NOT STARTED / QUEUED | UNASSIGNED | Creation editor/templates/skills + personal project workspace |
| 5 | Internal Product Watcher Agent | NOT STARTED / QUEUED | UNASSIGNED | Owner-only scheduled monitoring, recommendations, approvals, daily/weekly reports |
| 6 | Deepsyq Voice Agent | NOT STARTED / QUEUED | UNASSIGNED | Realtime voice interface across Deepsyq, Device Cleanup skill, owner voice access to Product Watcher |
| 7 | Pricing, Credits, Stripe & Unit Economics | NOT STARTED / QUEUED | UNASSIGNED | Extend existing Stripe/AI wallet with verified provider economics; see roadmap |

Full requirements: `docs/DEEPSYQ_ROADMAP.md`.

## Multi-agent execution strategy

Use multiple agents deliberately instead of giving one agent the entire backlog.

Recommended split after the current TXT scope is stable enough:

- **Foundation agent:** shared AI Provider Router, jobs, usage/credits, provider configuration.
- **Agent A:** Block 1 — Multi-AI Compare.
- **Agent B:** Block 2 — User Agent / Do it for me.
- **Agent C:** Block 3 — Inspiration.
- **Agent D:** Block 4 — Studio + My Workspace.
- **Agent E:** Block 5 — Product Watcher.
- **Agent F:** Block 6 — Voice Agent.

This split is only a coordination model, not a requirement to hire six agents. One agent may take several blocks sequentially, but no agent should be expected to keep all six in active context at once.

Dependency rule:
- Blocks 1 and 2 should share the same provider/router/job/usage foundations.
- Block 4 should reuse existing generation-studio work rather than recreate it.
- Block 6 should reuse the Agent Orchestrator from Block 2.
- Product Watcher in Block 5 stays technically separate from user Agent permissions but may later expose owner-approved data to Block 6 Voice Owner Mode.

## How a new task is added

When the owner invents a new lasting feature:

1. Add the full requirement to `docs/DEEPSYQ_ROADMAP.md` or another appropriate spec.
2. Add one concise row here with status `NOT STARTED / QUEUED`.
3. Leave it `UNASSIGNED` until an agent is actually chosen.
4. The chosen agent changes it to `IN PROGRESS`, records its branch/PR, and works only on that bounded scope.
5. When verified and merged/deployed as appropriate, change it to `DONE`.

This keeps the roadmap complete without forcing the current agent to implement everything immediately.

## Recommended execution order

1. Current Work agent finishes/hands off the active TXT/generation-studio scope.
2. Reconcile this status file with the real merged code and open PRs.
3. Stabilize shared foundations needed by several roadmap blocks.
4. Assign separate roadmap blocks to available agents.
5. Use separate branches for parallel workstreams.
6. Merge only after tests and conflict review.
7. Update this file after every meaningful handoff/merge.

## Blockers / external dependencies

Record only real current blockers here. Examples include missing API credentials, provider approval, domain/OAuth console configuration, unavailable production secrets, or an external service that has not actually been provisioned.

Current queued-roadmap dependencies to verify before implementation:
- real provider/API credentials for enabled AI providers;
- provider/model availability and pricing;
- production-safe object storage/jobs where required;
- voice provider capability and cost;
- OS/browser permissions for Device Cleanup;
- Render scheduling/worker configuration for Product Watcher.

## Handoff — update this before ending a meaningful work session

**Workstream:**  
**Owner/agent:**  
**Status:**  
**Changed:**  
**Verified/tests:**  
**Files/modules:**  
**Blockers:**  
**Branch/commit/PR:**  
**Next action:**  

Replace this handoff section with the latest concise handoff. Historical details remain in Git.
