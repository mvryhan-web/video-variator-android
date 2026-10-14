# AGENTS.md — Deepsyq shared rules for all coding agents

This repository is the single production codebase for Deepsyq (formerly Video Variator / Video Uniquifier). These rules apply to every coding agent, cloud agent, AI assistant, and human contributor working in this repository.

## Mandatory read order before any work

Before changing code, always read and reconcile:

1. `AGENTS.md` — collaboration and safety rules.
2. `PROJECT_STATUS.md` — live progress, current owner, blockers, and next work.
3. `docs/DEEPSYQ_ROADMAP.md` — approved product roadmap and requirements.
4. Any relevant existing specification files, especially `docs/PRODUCTION_SPEC.md` and `PRODUCTION_DEPLOYMENT_SPEC.md`.
5. The latest Git history, current branch, recent commits, open PRs, and the actual implementation.

Do not assume a feature exists or works because a file, route, button, or function has a promising name. Verify the code and tests.

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

