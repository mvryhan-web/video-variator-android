# DEEPSYQ — New Chat / Agent Continuity & Handoff Protocol

## Mandatory owner rule — SAME ROW ON RESUME, NO SHORT-TASK HOPPING (2026-10-17)

### Read the exact replacement-chat and repeat-command templates

See [`DEEPSYQ_AGENT_SESSION_RESUME_COMMANDS.md`](DEEPSYQ_AGENT_SESSION_RESUME_COMMANDS.md) for **separate ready-to-paste startup messages for agent 5 and A/B/C/D** and the short repeat command to send when a chat voluntarily pauses. The messages supersede older generic messages where "finish a task" was ambiguous. At an impending system/context limit preserve `current BASE #N / current PR / last SHA / completed criteria / remaining acceptance / exact next action`. **Only a technical session limit, real blocker, necessary owner approval or genuine full DONE** justifies ending an active row's work; a test/commit/PR is NOT a stop point. Do not promise a next chat automatically opens or work continues between prompts.


**Read [`docs/DEEPSYQ_ONE_ITEM_TO_DONE_PROTOCOL.md`](DEEPSYQ_ONE_ITEM_TO_DONE_PROTOCOL.md).** The replacement session resumes the **same original BASE #N and its existing PRs**. A CHECKPOINT, one finished code subtask, old green test run or new session does **not** free the claimed row. Continue fixing its remaining original acceptance criteria until whole-row DONE; do not spread work across multiple numbered BASE rows. For genuine external/CI/cross-lane blocking, finish all safe work, save exact unblocking condition and request a documented Agent-5 reassignment **before** another row; preserve the old claim/PR for resumption. No automatic assignment inferred from chat silence. The old "move to next item after finished task" command is overridden by the stricter meaning **finished original numbered requirement**.


**Owner-approved policy (2026-10-16).** Canonical repository: `mvryhan-web/video-variator-android`; BASE integration branch `deepsyq-platform`; production integration branch `main`. **This document describes session recovery and coordination only; it does not change any original BASE or Block 1–7 requirement and does not authorize production actions.**

## What this solves / does not solve

A ChatGPT conversation may reach its context or interaction limit. A new ChatGPT chat **cannot automatically know which of several old chats ended, which chat owns which PR, or what was written in unsaved thoughts**. Chat identity, account access, time since the last GitHub commit, and issue activity are **not reliable proofs** of an agent's identity or that a session is inactive.

**Reliable continuity** = stable **lane + scoped issue/BASE row + feature branch/PR + GitHub handoff/checkpoint**. Code, CI and current repository state prevail over a stale note. The owner should need only one reusable first message, not a history retelling.

## Stable agent directory (these are roles, NOT live session identifiers)

| Role code | Permitted coding/coordination lane | Primary coordination issue |
| --- | --- | --- |
| **A** | BASE Image / Canvas / Home visual fidelity / UX | [#72](https://github.com/mvryhan-web/video-variator-android/issues/72) |
| **B** | BASE Video / provider adapters / jobs / storage | [#73](https://github.com/mvryhan-web/video-variator-android/issues/73) |
| **C** | BASE AI Apps / Tools / product video / responsive / navigation | [#74](https://github.com/mvryhan-web/video-variator-android/issues/74) |
| **D** | BASE Stripe / wallet / pricing / DB migration and release review | [#75](https://github.com/mvryhan-web/video-variator-android/issues/75) |
| **5** | Technical coordinator / audit / collision/release-quality reviewer. **Not a fifth feature-coding lane.** | [PR #42 coordination](https://github.com/mvryhan-web/video-variator-android/pull/42), dated Agent 5 audit |

The four lanes are **ownership boundaries**, not a guarantee exactly four ChatGPT tabs are running. Several independent scoped tasks may exist within one lane (e.g., D #44 and D #48); identify by **exact issue + BASE requirement + branch/PR**, not "the last agent D" alone. Existing specific claims in `PROJECT_STATUS.md` and `docs/DEEPSYQ_BASE_55_COORDINATION.md` override the default lane suggestion. Roadmap Blocks 1–7 remain separate from BASE; current owner priority is BASE-first. Do not revive paused blocks from a stale handoff.

## Mandatory universal startup message — copy into ANY newly opened ChatGPT chat

> Продолжай разработку Deepsyq, репозиторий `mvryhan-web/video-variator-android`. Это новый чат после завершения предыдущей сессии; я могу не знать, какой агент прервался. Сначала через GitHub прочитай `AGENTS.md`, `docs/DEEPSYQ_CHAT_CONTINUITY.md`, `PROJECT_STATUS.md`, `docs/DEEPSYQ_BASE_55_COORDINATION.md`, актуальные Issues #72–75, PR #42 и открытые PR/ветки. Определи по последним handoff-записям точную задачу, роль A/B/C/D/5, BASE-пункт, ветку и результаты. Не дублируй и не забирай чужую активную работу. Если нельзя однозначно понять, какую сессию я заменяю, коротко покажи возможные незавершённые задачи и спроси, какую продолжать — до изменений кода. После определения роли прочитай весь оригинальный TXT её направления, проверь актуальный код и тесты, продолжай уже начатую задачу, сохраняй изменения отдельным PR и оставляй новый handoff. Не меняй утверждённый дизайн, существующий Stripe/базу/production без отдельной проверки и согласования.

The same message is deliberately **role-neutral**: the owner does not have to remember an agent letter. **Do not guess** the target from "this is a new chat" alone. If the user knows a PR, issue or role, honor that hint and verify its current ownership.

## Every new session: deterministic recovery (READ FIRST, NO CODE YET)

1. Connect to the existing GitHub repo (ask user to connect GitHub only if it is genuinely unavailable), confirm current `main`, `deepsyq-platform` and PR #42; **never create a new repository or a second paid stack**.
2. Read `AGENTS.md`, this file, `PROJECT_STATUS.md`, the current 55-row board, coordination Issues #72–75, **recent issue comments labelled `CHECKPOINT` / `HANDOFF` / `TAKEOVER`**, relevant open PRs and their commit/CI/status, and any approved design amendment. Use fresh data rather than the last dated snapshot.
3. If the user gave a lane/issue/branch, map it to one actual scoped claim and verify that no other session is currently editing the same files. If **none is named**, inspect reported handoffs and open in-progress claims and prepare a **short candidate list** with issue, BASE row, branch, last verified step, and whether another agent may still be working.
4. **If more than one plausible interrupted workstream, ask one direct question** ("Продолжаем A #... или C #...?"). **Never assert knowledge of which chat reached the limit**; GitHub does not reveal that event. If exactly one candidate is explicit in available evidence *and* no competing active owner, propose it for confirmation unless owner had already instructed this exact continuation.
5. Once identified, read **the whole original scope TXT**: for BASE use `docs/DEEPSYQ_PLATFORM_SPEC.md`; for an explicitly permitted Block N use `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_N.txt`. Read `docs/DEEPSYQ_BASE_CHECKLIST.md`, affected source files and tests. Never infer completeness from docs alone.
6. For resuming an already-claimed row: **reuse the old branch/PR**, if safe and authorized; note `TAKEOVER` on the corresponding issue. The old row does not become "free" merely because a chat ended. A second independently running session must not continue in parallel. If owner confirms the predecessor chat is ended, an explicit takeover is allowed; preserve existing work.
7. Only then resume the SAME numbered BASE row until the whole original acceptance is DONE, not merely a subtask; do bounded edits, targeted tests, commit, open/update existing scoped PR targeting `deepsyq-platform`, and maintain board/status with optimistic SHA re-fetch. Do not switch rows for external block without documented Agent-5 approval. **No unrelated feature commits directly to giant PR #42**, no force push, no direct `main` production deployment.
8. Reply to owner concisely in Russian: `Продолжаю роль [A/B/C/D/5], BASE #[n], Issue #[n], PR #[n], уже сделано [...], дальше [...], риски [...]`. If unknown say UNKNOWN, not "done".

## Every continuing session: leave durable CHECKPOINTS, not just an end-of-chat note

After **every coherent and pushed work block** (not every keystroke), write a short `CHECKPOINT` comment to the agent lane issue (or, when appropriate, a specific claimed task issue) and synchronize the existing status/claim board after meaningful changes. This ensures recovery even when a chat ends **without warning**.

**Recommended issue-comment format:**

```text
[DEEPSYQ CHECKPOINT] 2026-MM-DD HH:MM UTC
Role: A | B | C | D | 5
Scope: BASE #<N> [subtask] / Block <N> only if owner re-authorized
Owner/claim: <agent/session label>; claim still ACTIVE / released / blocked
Task issue: #<number> ; branch: <branch>; PR: #<number or none>
Commit: <SHA pushed>; BASE head examined: <SHA>
Finished/verified: <what really works>; CI: <run URL + result or NOT RUN>
Remaining: <exact next code/file/test step>
Files owned/no-touch: <paths>; other session overlap: <none/which>
External blockers: <keys/media/Stripe/DB/owner approval, or none>
Next: <single immediate action>
```

Before switching scopes, nearing a conversation limit, or ending a normal session, add a `[DEEPSYQ HANDOFF]` comment with the same information plus `Session: ENDING / REPLACED / PAUSED / CONTINUING` and whether the exact task **claim remains reserved**. The assistant must **not claim it can know when the platform will end the chat**. If interrupted unexpectedly, the last CHECKPOINT serves as the recovery point. The **exact pushed SHA and PR** are essential; uncommitted private chat-only work may be unrecoverable.

At the first approved replacement, post `[DEEPSYQ TAKEOVER]` to that issue:

```text
Role: <A/B/C/D/5>
Resuming: Issue #..., BASE #..., branch ..., PR ...
Predecessor: previous ChatGPT session ended as confirmed by owner / handoff
Last verified checkpoint: <comment URL or SHA>
Current source HEAD: <SHA>
Conflict check: <result>
Next: <one task>
```

Never auto-release a claim after a time limit, a missing CHECKPOINT, or inactivity. If an agent cannot write to GitHub, it must **say so and give the owner the text to paste**, not pretend persistence.

## Compact owner-facing ID card to include in each agent's final work response

```text
Deepsyq: Агент [A/B/C/D/5] | Задача BASE #... | Issue #... | PR #...
Статус: CODE VERIFIED / IN PROGRESS / BLOCKED / ...
Следующий шаг: ...
GitHub handoff: <exact issue comment URL>
```

When ChatGPT asks the owner to start a new conversation, include the role/task **card**, plus this one-line shortcut (or link to this document). Owner does not need to save the entire discussion. If the agent cannot make a GitHub handoff, warn about the lost-work risk clearly.

## Known coordination/release constraints to always preserve

- `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md` (including latest approved amendment) and exact owner media are protected. Big original girl first, scene miniatures and visible 16:9 carousel — **visual implementation/video acceptance may still be pending**.
- Existing Video Uniquifier and Tools remain operational; BASE + Blocks 1–7 are one integrated codebase, not separate products.
- PR #42 is a broad draft integration; finish bounded PRs first. A separate PR's presence does not prove merge or live deployment.
- Production Render service auto-deploys `main`; do not merge unrehearsed database/Stripe/provider code to production. Always distinguish `CODE VERIFIED`, `MERGED TO BASE`, `MERGED TO MAIN`, `DEPLOYED`, and `LIVE VERIFIED`.
- The coordinator can create GitHub issues/comments but **cannot remotely command or interrupt an already open ChatGPT tab**. Each tab must fetch the repository instructions.

## Recovery examples

- User: "Новый чат, я не знаю, кто закончился." → check registry/issues; offer **only relevant plausible candidates**, ask which prior task to continue if ambiguous. **Do not immediately start coding.**
- User: "Был агент по видео, закончил лимит." → likely B; verify its exact BASE row/branch/PR from latest issue and board before takeover. Don't rewrite video generation.
- User: "Продолжай PR #62" → resolve lane D and task #43 from PR metadata, check if superseded/merged; preserve its scope and status.
- User: "Ты пятый агент, продолжай контроль" → resume role 5; audit claims/PR conflicts/report; **no extra feature lane**.

**This protocol is a discoverability and accountability workflow, not an automatic live agent manager.**
