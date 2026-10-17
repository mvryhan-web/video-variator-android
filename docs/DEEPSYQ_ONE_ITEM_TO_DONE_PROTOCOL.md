# DEEPSYQ — ONE BASE ITEM UNTIL DONE (owner directive, 2026-10-17)

**ОБЯЗАТЕЛЬНО ДЛЯ АГЕНТОВ A, B, C, D И КООРДИНАТОРА 5.**
This is a work-execution rule, NOT a new product scope. Original BASE TXT (`docs/DEEPSYQ_PLATFORM_SPEC.md`) and original Blocks 1–7 TXT stay unchanged and authoritative. It supersedes older workflow text saying to move to the next item after any small "task" or automatically when blocked.

## Why the previous workflow failed

The sentence "finished a task → move to next free point" let agents count a test, helper, patch or PR as a completed task. They opened many draft PRs and moved between BASE rows although the **original numbered requirements** remained PARTIAL. A short code fix, a document, a passing subset, or a queued CI run is **not a completed 55-point requirement**. No more progress by counting patches, commits, PRs or test cases.

## Non-negotiable execution loop

1. **Recover and claim ONE exact numbered BASE requirement**, inside your original A/B/C/D lane. Before work inspect original BASE TXT, current 55 checklist row, existing code, OPEN PRs, tests and other agents' claims. If you already own a partially finished row, **resume that row and its existing branches/PRs**. Do not claim several rows in parallel merely because your lane lists them. No duplicate features, second stacks or rebuilds.
2. **Write acceptance conditions before the next code edit** as a small checklist attached to your existing issue/PR/checkpoint: each part of the original requirement; existing code already satisfying it; remaining gaps; dependencies/owner approvals; exact integration and offline tests. Do not quietly shrink original BASE scope to make DONE easier. Mark the user-facing behaviour to verify.
3. **Implement until that one BASE row meets ALL feasible acceptance criteria.** Multiple commits, tests and even related PRs are allowed if necessary, but all belong to the **same row**. Prioritize finishing and reconciling **existing** draft PRs before proposing additional small improvements. Fix failed tests and regressions in the same row. Do not move to unrelated rows, invent side features, endlessly audit unchanged code, or claim a subtask is a fully completed row.
4. **Verify the final version, not an old SHA:** run targeted offline tests; integration/Playwright/disposable PostgreSQL if appropriate; confirm no critical regression, no conflict with another agent's work, exact final PR-head results and required current-branch integration. Record the URLs and actual outcomes. A queued, skipped, failed, or old-head CI run is NOT passing evidence. Never test with a billable AI provider or charge owner's credits; never silently turn on production flags.
5. **Only then close the row:** update the 55-row checklist + claim board + PROJECT_STATUS with exact row number, a succinct acceptance proof, test URLs, committed SHA/PR, known release gates. Set `DONE` **only if the complete original requirement truly meets its stated definition**. `CODE VERIFIED`, `READY TO MERGE`, `MERGED TO BASE`, `DEPLOYED` and `LIVE VERIFIED` must not be conflated. Where a requirement needs real production/customer/provider acceptance, it remains PARTIAL/BLOCKED until that acceptance is real. A row is not DONE merely because a UI exists.
6. **Only after row DONE** choose the next unclaimed, unblocked BASE item **from the same lane**, repeating from step 1. The user's instruction "no OK GO" means keep progressing within the already authorized, unblocked row without asking permission after each commit/test; it does NOT authorize unsafe changes or jump to arbitrary scope.

## Genuine external blocker — the ONLY exception to no-switch rule

When original acceptance genuinely needs something the agent cannot supply (owner-provided approved media, legal provider terms, external S3/Stripe credentials, real device, production deployment authorization, or a different agent's specific cross-lane module):

- **Finish every remaining safe step within the current row first**: code, mocks, documentation of the dependency, tests and ready-to-integrate PR. Do NOT substitute endless repeated tests, helper projects, superficial hardening or invented assumptions for missing credentials.
- Mark `BLOCKED_EXTERNAL` / `BLOCKED_DEPENDENCY` / `CI_BLOCKED`, never DONE. Record the **exact unavailable input**, owner/responsible agent, what proof would unblock, PR/SHA, and the one concrete next step. For `CI_BLOCKED` diagnose once and run meaningful available local verification; GitHub queue delay is not a pass.
- **Escalate immediately to Agent 5 in the lane issue**. Agent 5 must review that no feasible in-scope work remains. Only **after explicit coordinator reassignment recorded in the board** may the agent claim a different already-unblocked BASE row in its lane. Do not silently abandon the original row: preserve its claim, ready PRs and precise resumption trigger. Owner action is requested **only if genuinely necessary**. Do not request repetitive "OK GO".
- If a shared file is owned by another lane, create an explicit A↔B↔C↔D handoff (which function/API, exact test, required commit) rather than simultaneously editing it; keep the original row blocked on the named dependency until integrated.

## Definition of complete progress (no invented percentages)

For each row, report only one current state: `IN_PROGRESS`, `CODE_VERIFIED_PARTIAL`, `CI_BLOCKED`, `BLOCKED_DEPENDENCY`, `BLOCKED_EXTERNAL`, `READY_TO_MERGE`, or `DONE`, with a separate `LIVE_VERIFIED` flag when supported. **Progress is completed original BASE rows out of 55**, not number of files, subtasks, commits, PRs, mock tests or days spent. The two currently checklist-DONE rule/brand points are not proof commercial functions work.

At the end of each session (or before ChatGPT context limit), checkpoint to GitHub **without releasing the same row**. Continue its same branch/PR in the next session. Final concise report: `Agent / BASE # / state / missing original acceptance / exact current PR+SHA / verified tests / external blocker+owner / next action`. If DONE count did not increase, explain precisely why and what is needed; no decorative progress summary.

## Agent 5 — coordinator acceptance duty

- Enforce **one active row per coding agent**; return unapproved scope hops and parallel same-lane feature claims for correction. Do not demand reworking already finished code.
- At every checkpoint, inspect **acceptance evidence for the whole row**. Identify missing original criteria, dependencies and conflicts **once**, provide targeted handoffs, ensure CI/test/deployment status is truthful, and **prioritize closing current rows** over creating additional coordination work or new CI workflows.
- Coordinate and explicitly document exceptional reassignments after verified external blocking; do not call all 53 remaining rows "start from scratch". Keep real customer-paid AI, Stripe live, production PostgreSQL/main and protected Home behind owner-approved gates.
- Do **not** assert control of live ChatGPT tabs. Agents only pick up new GitHub rules when their session reads them. Communicate the new protocol in their existing Issues #72–75, PR #42, and provide the owner one short copy-paste command.

### Owner command to paste to each of four active chats

> **DEEPSYQ — НОВОЕ ОБЯЗАТЕЛЬНОЕ ПРАВИЛО.** Сначала прочитай актуальные `AGENTS.md` и `docs/DEEPSYQ_ONE_ITEM_TO_DONE_PROTOCOL.md`. Продолжай **только свой уже начатый пункт №N из оригинального BASE TXT** и закреплённую роль A/B/C/D. Один пункт = одна цель до **полного DONE**, а не до коммита, теста, PR или отдельной мелкой задачи. Не переключайся на другой пункт, не дублируй и не переписывай сделанное. Сначала закрой все недостающие требования, PR, интеграцию и проверки этого пункта; отметь DONE лишь по полной проверке и доказательствам. При реальной внешней блокировке закончи всю доступную работу, укажи точный блокер и согласуй переключение с агентом 5 через GitHub — не перескакивай самостоятельно. Не запускай платные AI-тесты, не трогай production без разрешения. Сохраняй коммиты, CI, PR, статус и checkpoint в GitHub. Работай до лимита сессии, не жди «OK GO» после каждого действия; отчёт в конце — сколько **полных BASE-пунктов** действительно закрыто и почему остальные текущие пункты не закрыты.

**Rule priority:** Latest explicit owner instruction > original immutable product TXT requirements > production/security/legal hard gates > this execution workflow > older "finish a task, choose next free item" workflow. Never interpret speed or DONE goals as permission to spend provider funds or bypass live/payment/security safeguards.
