# Graphify: pinned, isolated and not yet activated globally

**Source:** https://github.com/Graphify-Labs/graphify @ `86c57be8204673c2a1b9849a3292a7dd3ab373d8` (branch `v8` at audit). Published upstream Python project `graphifyy` v0.9.92. Code-only AST analysis is local; docs/PDF/images may trigger semantic LLM use and are therefore **disabled** under Deepsyq zero-billable-test policy.

## Execution environment
A/B/C/D currently work through separate ChatGPT cloud chats with GitHub connector (not an owner's local terminal); they read repo `AGENTS.md`, original BASE/Blocks, `PROJECT_STATUS.md`, claims and Issue handoffs. ChatGPT connector does not expose a project-local shell/automatic Agent Skills execution. Google Jules runs in its Google-hosted cloud sessions from GitHub Issues and repository rules; automatic `.agents/skills` support and a durable CLI installation **are not established**. Thus this repo integration **does not activate Graphify in A–D/Jules**. In any supported future CLI agent, `.agents/skills/graphify/SKILL.md` can be explicitly loaded; never invent host support. No tools installed on owner's Windows PC.

## Security-first project installation
`.graphifyignore` excludes credentials, `.env*`, dumps, backups, logs, sessions and customer/user media. No cloud trial, Graphify Cloud, LLM backend or paid models, no localhost/postgres introspection, no on-commit / pre-tool hooks. Source pin and source URL are inside `.agents/skills/graphify/SKILL.md`; unlike upstream quickstart no latest/auto install. The GitHub Actions job in this PR runs a **fresh ephemeral CLI from exactly that upstream commit**, after checkout and with empty AI credentials, against the repository `server/` code only. It does not commit/upload extracted graphs.

Official project-scoped installer exists as `graphify install --project --platform agents`, but it reads/writes config and bundled instructions with optional network/semantic behavior. We deliberately do **not** run it blindly: project skill is a non-executable, carefully constrained adapter to the **original** pinned CLI. Only mark production-wide support after host-specific review.

## Required current-head acceptance before READY_TO_MERGE
1. Native GitHub Actions **graphify-offline-pilot** passes on exact PR head; no missing commands or large graph memory errors. No paid provider/API key provided.
2. `tools/graphify/verify-graph.mjs` reads temporary `graphify-out/graph.json` and refuses excluded filenames, credential-like blobs and user data. It checks the real code symbol `submitPurchasedProviderRequest` in the built graph.
3. `graphify query "submitPurchasedProviderRequest"` gives a real scoped clue about purchased credits and the provider dispatch boundary. Confirm manually against `server/generation-studio.js` and the D purchase verifier; **graph results are not authorization/evidence by themselves**.
4. No generated `graph.json` or secrets artifact is uploaded/committed. If any check fails, keep PR **DRAFT/CI_BLOCKED**, fix only this tool's own files, never weaken exclusions.

No change to application, `main`, production, payments, user data or schema.
