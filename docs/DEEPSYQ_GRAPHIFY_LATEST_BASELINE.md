# DEEPSYQ — Graphify + Latest Integrated Baseline (owner instruction, 2026-11-09)

**Purpose:** No developer may unintentionally overwrite another developer's newer approved work, revive an obsolete page, or create duplicate JARVIX/Image/Video/Audio systems.

## Required sequence before EVERY code change

1. Read the latest binding owner rules in `AGENTS.md`, `DECISIONS.md`, `docs/OWNER_CHANGE_CONTROL_20261107.md` and the task's specific GitHub issue/PR. These rules outrank this map. Check `PROJECT_STATUS.md` and the actual current PR/CI evidence for DONE/BLOCKED; **Graphify is a code-navigation graph, NOT a progress ledger**.
2. Fetch the latest integrated `deepsyq-platform` HEAD (full 40-character commit SHA), including other developers' merged changes; record it as `BASE_SHA`. Read the existing `docs/DEEPSYQ_CODE_MAP.md` / JSON and its `source_sha`. If the map's `source_sha` differs, the map is stale: inspect current changed paths and source at HEAD, not an old graph; refresh/rebuild the safe index when the authorized workflow is available.
3. Separately determine **which exact SHA is currently deployed at `https://test.deepsyq.pages.dev`** by verified Cloudflare deployment metadata. Never infer deployed code from the URL alone or use a random hash URL as the baseline. If the live TEST contains accepted, unmerged changes, reconcile those with latest DEV before proceeding; do not overwrite the deployment or discard those changes.
4. Create the task branch from the CURRENT integrated `deepsyq-platform` SHA, not from a saved local copy, yesterday's commit, a pinned preview link, another person's old PR, or `main`. List permitted files/hunks and behaviors to preserve. Only apply the owner's requested minimal change.
5. Immediately before PR integration, fetch latest DEV again. If HEAD advanced, compare/merge/rebase safely, resolving overlapping changed lines and rerun targeted tests; no force push of shared branches. Before any TEST publication, prove the exact merged DEV SHA, retain accepted TEST-only work, and use the owner-approved TEST alias. Release to MAIN only under D29 owner approval and Worker safety gates.
6. Keep the task issue or PR current with `BASE_SHA`, task `HEAD_SHA`, `MAP_SOURCE_SHA`, `TEST_DEPLOYED_SHA` (or **UNVERIFIED**), approved changed files, test evidence and DONE/NOT DONE. Do not claim "updated in real time" if the GitHub workflow is queued/failed or its output SHA is behind DEV.

## Graphify coverage and limits

- Graphify pinned offline `--code-only` analyzes code in `server/`, `app/src/main/assets/` (browser JavaScript) and `app/src/main/java/` (Android Java); `app/src/main/assets/*.html` and `*.css` are indexed by **filename inventory only**. Files included in the inventory are NOT verified behavior or runtime routes.
- The generated safe index is `docs/DEEPSYQ_CODE_MAP.md` and `docs/DEEPSYQ_CODE_MAP.json`. Its `source_sha` identifies source code scanned, **not** the newer commit that publishes the index.
- GitHub Actions triggers on relevant code pushes to `deepsyq-platform`; map generation is asynchronous, not continuous. A stale/failed/queued build must be labelled STALE / FAILED / QUEUED. The CI publish job must not commit an older map on top of a newer HEAD.
- Continue security exclusions: no secrets, private files, uploaded media, raw Graphify graph, cloud API, billable AI or live database access. Graphify hints never replace current source and tests.

## Owner-approved URL rule

**TEST:** https://test.deepsyq.pages.dev (Cloudflare preview branch `test`).
**MAIN:** https://deepsyq.app, owner-approval only; preserve Worker/Functions and bindings.

This document changes only developer navigation and integration discipline. It does NOT authorize a production deployment, site redesign, new chat, price change, Stripe calls or a code overwrite.
