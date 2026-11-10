## OWNER D33 — 2026-11-10 — ОБЯЗАТЕЛЬНАЯ ТОЧЕЧНАЯ ПУБЛИКАЦИЯ (SURGICAL RELEASE)

**Прямое решение владельца, действует для P, Администратора, Antigravity и всех будущих исполнителей. Уточняет D28 и D32; не отменяет безопасность D31.**

1. **ОДНО ПОРУЧЕНИЕ = ОДИН ОГРАНИЧЕННЫЙ НАБОР ИЗМЕНЕНИЙ = ОДИН ПРОВЕРЕННЫЙ ВЫПУСК.** Исполнитель изменяет только названный владельцем раздел, элемент или файл и минимальные необходимые прямые зависимости. Нельзя молча добавлять в выпуск другие новые или накопившиеся неопубликованные изменения из DEV, старые версии страниц, переработку глобальных компонентов или обновление всего сайта «заодно».
2. **Публикация должна быть точечной по содержимому.** Пример: исправление Video Uniquifier не изменяет Home, JARVIX, Studio, Pricing, аккаунты или чужие компоненты. Если затронут общий файл, заранее установить все реально затронутые страницы и доказать отсутствие побочного изменения их поведения.
3. **Перед MAIN:** зафиксировать текущую live-версию, список и контрольные суммы изменяемых ресурсов; сравнить candidate и live по всем остальным ресурсам и Worker/Functions, определить разрешённый diff и подготовить откат. При отличиях вне разрешённого набора — остановить публикацию, а не молча выкатывать все файлы из локальной/DEV-сборки.
4. **Cloudflare Pages выпускает версию deployment целиком.** Цель «точечной публикации» — гарантированно изменить только разрешённые ресурсы/поведение, сохранив все остальные байты и backend; нельзя обещать физическое обновление одного файла без deployment или без сохранения Worker. Запрещено делать статический Pages deploy, который сбросит live `_worker.js`, `_headers`, `uses_functions:true`, API, Neon/Stripe/auth/credits. Доказательство сохранности Worker и bindings обязательно.
5. **Если live Worker недоступен для безопасного воспроизведения, отличается baseline, не хватает доступа или полного разрешённого списка изменений, статус `BLOCKED_MAIN — NOT PUBLISHED`.** Не обходить защиту, не публиковать «почти такое же», не переписывать серверный код наугад. Описать точную причину и доступный безопасный следующий шаг.
6. **После публикации:** проверить изменённый раздел на `https://deepsyq.app` и выборочно подтвердить сохранность критичных незатронутых функций (авторизация, Stripe, кредиты, API/Worker, Home/JARVIX по риску). Статус DONE только после живой проверки; вернуть ссылку, конкретный diff, revision/deployment и доказательство, что остальные разделы остались неизменными.
7. **TEST остаётся резервом по D32**, не обязательным первым этапом. Это правило — защита от побочных изменений, а не разрешение создавать вторые страницы, отдельные чаты, новые продукты или менять защищённый Pricing. Для этого решения не требуется публикация сайта: достаточно подтверждённого обновления документов GitHub.

**Технический механизм автоматического выпуска одного логического участка не считается внедрённым лишь потому, что это правило записано.** До подтверждённых ограничителей CI/deployment работать только в безопасных пределах или честно докладывать о блокировке.

---

> **АКТУАЛЬНЫЙ ЕДИНЫЙ СВОД (10.11.2026):** [docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md](docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md) — четыре основные цели, SEO, экономика ≥ 2:1, действующие D20–D32, роли, безопасность и релизы. **При противоречии с историческими разделами ниже применять этот свод и более позднее прямое решение владельца.** Предыдущая редакция 25 правил сохранена в [архиве](docs/archive/DEEPSYQ_CANONICAL_OPERATING_RULES_20261018.md). Ниже сохранён журнал решений/контекст, а не второй конкурирующий набор команд.

## OWNER D32 — 2026-11-09 — PRODUCTION-FIRST; TEST IS RESERVE

**New explicit owner instruction, effective immediately; supersedes D29 and older TEST-first/publish-only-to-TEST rules solely on the default publication destination. Applies to Coordinator P, Administrator, Antigravity and every future DEEPSYQ executor.**

1. **Publish new owner-requested and accepted changes directly to MAIN `https://deepsyq.app` as the normal destination.** Do not treat TEST publication as a mandatory first step or ask for a separate routine deployment confirmation after the owner assigns the change. Keep the edit strictly scoped to what the owner requested.
2. **Keep TEST `https://test.deepsyq.pages.dev` as a reserve/rollback/diagnostic environment.** Use it only when specifically requested or when a risky change cannot be safely verified without isolated testing; it must not replace or silently diverge from MAIN.
3. **Safety gates remain binding.** MAIN already has a Cloudflare Pages Worker/Functions, live generation, Neon, Stripe, authorization and user credits. Never do a static-only Pages deployment to production, overwrite an unverified Worker, change financial secrets/credits, or bypass D31 protected pricing. Before each production release verify matching Worker/Functions and bindings, backup/rollback, exact diff, security and readiness; verify the live result afterward.
4. **If a safe MAIN deployment cannot be proven, stop and report `BLOCKED_MAIN — NOT PUBLISHED` with the exact obstacle.** The owner’s production-first preference is not permission to break working services, erase data, or ignore security checks. Do not claim completion without a verified live production deployment.

---

# ==============================================================================
# D31 / OWNER RULE — 2026-11-09 — PERMANENT LOCK: PRICING & AI CREDITS FREEZE
# ==============================================================================
**STRICT PERMANENT RULE FOR ALL AGENTS, COPILOT, ADMINISTRATOR, P, AND ASSISTANTS:**
1. Under no circumstances may any agent or assistant modify:
   - \pricing.html   - \pricing-page.js   - \pricing-page.css   - \pricing-wallet.js   - \pricing-wallet.css   - AI credit packages, pricing, or checkout configurations in \_worker.js   WITHOUT DIRECT, EXPLICIT, UNAMBIGUOUS WRITTEN APPROVAL FROM THE DEEPSYQ OWNER.
2. Bonus credits (1,000+200, 10,000+3,333, etc.) are permanently active and included.
3. No agent may alter these pages or backend pricing routes during any future task.

---


# ==============================================================================
# JARVIX SINGLE CHAT — PERMANENT RULE (ВЛАДЕЛЕЦ DEEPSYQ)
# ==============================================================================
1. В DEEPSYQ разрешён только один пользовательский JARVIX Chat.
2. Image, Video и Audio являются режимами единого JARVIX Chat, а не отдельными чатами.
3. При переключении между Image, Video и Audio пользователь остаётся внутри одного JARVIX Chat; общая история переписки сохраняется.
4. Оригинальная нижняя панель ввода является защищённым компонентом. Запрещено менять её дизайн, создавать альтернативные версии, добавлять новые сферы справа или дублировать кнопки настроек без прямого разрешения владельца.
5. На Home, внутри JARVIX Chat и во всех режимах используется одна и та же эталонная нижняя панель ввода.

## OWNER D32 — 2026-11-09 — DIRECT DEPLOYMENT TO MAIN (MAIN FIRST)

**DIRECT OWNER INSTRUCTION FOR ALL AGENTS, ADMINISTRATOR, P, AND COPILOT:**
- **ONE PRIMARY TARGET (MAIN):** https://deepsyq.app (--project-name=deepsyq --branch=deepsyq-platform). All new verified features and fixes are deployed **directly to the MAIN production site** in one step to eliminate redundant double work.
- **TEST ENVIRONMENT IN RESERVE:** https://test.deepsyq.pages.dev is kept in **reserve**. It is used only when explicitly requested by the owner for high-risk isolated testing.
- Always preserve _worker.js and _headers (uses_functions: true) during deployment.

---

## OWNER D29 — 2026-11-09 — TWO CANONICAL DEEPSYQ DEPLOYMENT URLS

**CURRENT OWNER RELEASE RULE for P, Administrator, Antigravity, every executor. Overrides older deployment-URL examples in D28/D27/D26; preserves surgical scope, safety and billing protections.**

- **ONE stable TEST:** `https://test.deepsyq.pages.dev` — Cloudflare Pages project `deepsyq`, preview branch `test`, deploy using `--project-name=deepsyq --branch=test`. Every executor publishes approved TEST work to this SAME branch alias, serialized to prevent overwriting colleagues. Check deployed SHA and actual visible result at the stable alias. NEVER promote a hash URL or personal branch alias as the new test link.
- **ONE MAIN:** `https://deepsyq.app`. `https://deepsyq.pages.dev` is the PRODUCTION alias because Cloudflare production branch is `deepsyq-platform`, NEVER test. No unattended MAIN changes before owner approval.
- **Owner approval to release:** when the owner explicitly accepts the EXACT tested revision, promptly release ONLY that approved revision to MAIN without requesting a redundant second approval. Preserve all accepted changes, prepare rollback, check functional/auth/financial safety. A generic acknowledgement or approval of unrelated work is NOT release approval.
- **Fail-closed MAIN gate:** current Pages production includes Worker/Functions (`uses_functions:true`). NEVER deploy only `app/src/main/assets` to MAIN: that strips Functions. Verify original production Worker source, bindings, Stripe, Neon, auth, purchased credits and rollback before any promotion. Existing Worker-content retrieval previously failed 403; until safely resolved report `BLOCKED_MAIN`, not DONE.
- **Only these TWO links appear as current user-facing environments.** Cloudflare creates immutable `<hash>.deepsyq.pages.dev` addresses for every deployment, and old ones may remain visitable; they are technical historical artifacts, not current test sites. Do NOT claim old URLs were deleted. All old per-PR preview workflows need migration to the stable TEST lane before their next owner-facing publication.
- Written rules alone do not revoke deploy tokens or enforce branch permissions; verify Cloudflare/GitHub protections separately before claiming technical exclusivity.

**Verified Cloudflare API 2026-11-09 11:07 UTC (read-only):** `2fa7fbd4.deepsyq.pages.dev` is the CURRENT production deployment: `environment=production`, `branch=deepsyq-platform`, `trigger=ad_hoc`, `commit_dirty=true`, `uses_functions=true`, deployment commit metadata `3a45020a7f150d2dbce72b00b20f0de2743511fd` (not present as a retrievable GitHub repository commit). **This is NOT Antigravity TEST.** The inspection did not identify the human publisher. No exact `https://test.deepsyq.pages.dev` branch alias was found among the last 80 deployments; do NOT tell the owner that stable TEST is live until it has been deployed with the COMPLETE original Worker/Functions and verified. Audit: https://github.com/mvryhan-web/video-variator-android/actions/runs/42606643537 .

---

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

## OWNER D26 — 2026-11-08 — CLOUDFLARE MIGRATION ($0 RENDER), FAST-TRACK LAUNCH & PROFIT RULES

**LATEST BINDING OWNER INSTRUCTION; overrides D25/D24/D23 on Render hosting, active executors, and deployment URLs.**
**CLOUDFLARE ACCESS / FOR EVERY NEW DEEPSYQ CHAT — VERIFIED 2026-11-09:** Before saying Cloudflare is inaccessible or requesting a token, **READ [`docs/DEEPSYQ_CLOUDFLARE_ACCESS_RUNBOOK.md`](docs/DEEPSYQ_CLOUDFLARE_ACCESS_RUNBOOK.md)**. The connected GitHub app can use existing GitHub Actions secret **`CLOUDFLARE_API_TOKEN`** and `CLOUDFLARE_ACCOUNT_ID` to check/publish an isolated Pages Preview (verified live). This token is active and can read Pages but reads the production Pages-managed Worker content with **403**. Never expose or recreate keys unnecessarily; no MAIN release if it would drop existing Pages Functions (`uses_functions:true`). See [permission audit](https://github.com/mvryhan-web/video-variator-android/actions/runs/42582178313). A runbook makes access **discoverable** to other connected chats; it does not reveal secret values or alter permission scopes.


1. **HOSTING MIGRATED FROM RENDER TO CLOUDFLARE + NEON POSTGRESQL ($0/MONTH BANDWIDTH & SERVERS):**
   - All Render web services, static sites, and the paid Render PostgreSQL database (`video-uniquifier-db`) have been **suspended/deleted** by owner order to eliminate Render monthly bandwidth and server charges ($0.00 Render spend).
   - **Never deploy to or re-enable Render (`*.onrender.com`).**
   - **TEST / Preview environment:** Cloudflare Pages (`https://deepsyq.pages.dev` and branch preview URLs `https://<branch>.deepsyq.pages.dev`) + local preview (`START_DEEPSYQ_LOCAL.bat` / `http://127.0.0.1:3019`).
   - **MAIN / Production domain:** `https://deepsyq.app` (and `https://www.deepsyq.app`), served via Cloudflare Pages + Cloudflare Edge Worker (`_worker.js`) + 30-day Edge Cache + Neon PostgreSQL (`DATABASE_URL` / `JARVIX_QUOTA_DATABASE_URL`). Production updates require owner verification and explicit approval.

2. **ACTIVE ROLES:**
   - **Owner** — final authority on UI, pricing, features, and release.
   - **Administrator & Antigravity (by direct owner assignment)** — authorized executors to implement scoped code changes, run verification, and publish to Cloudflare Pages (`deepsyq`).
   - **Coordinator P (ChatGPT)** — audits tasks, checks live deployment/billing state, and maintains status reports; does not independently alter application code.
   - Preserve all historical code and assets; never delete working features.

3. **THE ASSEMBLED-CAR RULE + TWO-SPEED WORKFLOW FOR FAST LAUNCH:**
   - **Surgical Scope (Assembled Car):** Change ONLY the exact element requested by the owner. Never touch neighboring controls, Studio Settings, shared navigation, JARVIX, Pricing, or Video Uniquifier unless explicitly requested.
   - **Fast-Track (UI / copy / CSS / 1–3 files):** Direct surgical edit on `deepsyq-platform` → verify exact `git diff` → deploy to Cloudflare Pages (`wrangler pages deploy`) → verify live HTTP 200 & desktop/mobile visual result → report direct URL to owner.
   - **Full Gate (Stripe billing, AI credits, DB schema, auth):** Mandatory unit test suite (`pricing`, `generation-readiness`, `webhook-config`), strict `AI_BILLING_MODE=test` / `$0` test spend until explicit Live approval, and exact diff review.

4. **OWNER PROFIT, CONVERSION, RETENTION & SEO DIRECTIVE:**
   - **Unit Economics ≥ 2:1:** Every paid AI generation must yield at least 2x revenue over provider API cost. Deduct credits BEFORE provider execution (auto-refund only on provider error). Test budget = `$0`.
   - **Subscription & Credit Pack Conversion:** Free Tools (`free-tools.html`), Video Uniquifier (`index.html`), and free-tier `JARVIX` serve as SEO traffic magnets that convert users into paid plans and the 5 Stripe AI Credit Packs (`1,000` to `10,000,000` credits on `pricing.html`).

---

## OWNER D25 — 2026-11-07 — ONE INTEGRATED SITE / ADMINISTRATOR ONLY

**LATEST BINDING OWNER INSTRUCTION; overrides D24/D23 on roles, executor permissions, deployment and scope.**
**Administrator is the ONLY active DEEPSYQ application developer and the ONLY person authorized by the owner to publish a reviewed integrated update on isolated TEST.** Antigravity MUST STOP ALL DEEPSYQ CODING, TASKS AND DEPLOYMENTS. P may coordinate, audit, maintain governance instructions/checkpoints and review proposed diffs, but must NOT independently change application features or publish. Preserve all historical code, branches, assets, PRs and tests from retired contributors. GitHub/Render credentials still need separate owner-side restriction for hard enforcement.

**THE OWNER'S CAR RULE (exact meaning):** Treat the current approved DEEPSYQ site like a fully assembled car. If asked to change dashboard buttons, change ONLY those buttons — do NOT touch the steering wheel, seats, window controls, lights, underlying wiring or previously implemented behavior. If asked to change seat appearance, do NOT also change the electric adjustment mechanism. On the website, changing a button design never authorizes changing its function, Studio Settings, layout, media, menus, unrelated styles or another page. **Minimal requested delta + the entire previous accepted product preserved.** A shared file may be edited only in the specifically requested lines/functions, never wholesale restored from a stale branch.

**PUBLISHING RULE:** Integrate only explicitly approved task changes into the latest reviewed `deepsyq-platform`, preserve ALL other accepted changes, compare current TEST LIVE SHA to DEV, run scoped and desktop/mobile regression checks, then Administrator alone deploys the exact latest accepted DEV SHA to TEST. No stand-alone PR branch, no old copy, no extra features, no production/main.

**TODAY'S ADMIN INCIDENT — REQUIRED SURGICAL REPAIR:** PR #559 TEST commit `4de99be9fa74999ece8284804e6f06c7b3697feb` included unrequested changes overlapping approved Studio Settings and other UI. Administrator must retain ONLY owner-requested morning changes and restore each unrelated altered element to its last approved state (Studio #560–#562 baseline `8c5f527ebf6e572d30cd8983d5a9adc234fd7b6d`), WITHOUT hard-resetting the whole site or erasing approved newer work. Review 14-file PR diff and owner requests, fix overlapping buttons and verify actual Image/Video/Audio settings, mobile/desktop screens; then release integrated DEV TEST only. If owner intent for a change is unclear, do not assume it was approved.

Read full current D25 addendum in [OWNER_CHANGE_CONTROL_20261107.md](docs/OWNER_CHANGE_CONTROL_20261107.md) and Issue [#233 owner decision](https://github.com/mvryhan-web/video-variator-android/issues/233#issuecomment-6704526345) BEFORE every task. The older D24/D23 active-team references below are historical and superseded where inconsistent.

---

## OWNER D24 — 2026-11-07 — ADMIN / P / ANTIGRAVITY: NO UNREQUESTED EDITS, NO UNMERGED TEST DEPLOYS

**CURRENT TOP-PRIORITY ORDER.** Every executor, especially Administrator, must first read [OWNER_CHANGE_CONTROL_20261107.md](docs/OWNER_CHANGE_CONTROL_20261107.md) and the newest owner decisions, compare the current DEV HEAD and actual Render TEST deployed SHA, and record **exact authorized paths/functions, preserved components, and tests**. Edit only the requested section. Never replace whole files with an older worktree, silently alter approved Studio Settings, navigation, design, model/popup UX, or unrelated features. New work must include all accepted later commits. A model/JARVIX task does NOT authorize altering Studio settings.

**Mandatory PR scope and deploy safety:** use the OWNER_SCOPE PR template, `owner-change-scope` CI, relevant UI browser tests and owner review for protected files. No direct DEV pushes by executors. **TEST deployment must use exact latest merged `deepsyq-platform` SHA; never deploy a separate PR branch**, even when ahead of DEV. No auto publication of concurrent, unreviewed mixed-scope work. Real Render LIVE + real page validation required before DONE. MAIN/production remains frozen. GitHub branch protection is **currently disabled**, so the owner must also enable Rulesets; CI/doc rules alone cannot prevent direct pushes or manual Render deployments. Full binding rule and incident evidence in the linked doc.

---

## OWNER D23 — 2026-11-06 — GOOGLE JULES 1/2/3 RETIRED IMMEDIATELY / KEEP ALL CODE

**Latest owner instruction overrides every older Jules dispatch, continuation, cutoff (including 11 Nov), monitoring and handoff instruction below.** Google Jules 1, 2 and 3 are **not active DEEPSYQ executors**. Do not issue, re-label, re-dispatch, revive, wait for, or ask any of them to complete work. Do not run Jules-specific automation. **Active team is ONLY P, Administrator and Google Antigravity.** Unfinished functionality goes into P's ordinary backlog, never a Jules assignment.

**Preserve all prior implementation:** no deletion of existing code, merged or unmerged commits, tests, PR diffs, branches, comments, images or reports. Historical Jules mentions in this file remain archival and are not an active order. Git backups and the retirement record: [`docs/DEEPSYQ_JULES_RETIREMENT_ARCHIVE_20261106.md`](docs/DEEPSYQ_JULES_RETIREMENT_ARCHIVE_20261106.md). Close Jules-only issues as CANCELLED / NOT_PLANNED, not feature DONE. No changes to `main`, production, paid APIs, Stripe, or page-design locks. GitHub shutdown does not itself prove external Google Jules sessions terminated.

---

## OWNER RULE — 2026-11-03 — EVERY SAFE TASK ENDS ON TEST, NOT AT PR

Owner requires that safe, completed DEEPSYQ work be **published to the existing isolated Render TEST site and verified there** as the default final step, rather than stopping at commit/PR/CI. No repeated permission request for each permitted TEST publication. Before changing `deepsyq-platform` or redeploying, compare the running Render commit with DEV and **carry forward concurrently published, approved changes**; no silent site regressions. After publication prove the selected SHA is LIVE **and** test the actual target URL in desktop/mobile browser. If a relevant acceptance gate fails, fix it or record exact `NOT_TEST_DEPLOYED`; unrelated historical CI failures do not prove the new feature broken, but may not be bypassed to merge a failing PR. Never claim test publication from GitHub merge, Render request or status alone. No production deployment, provider spending, unsafe migrations or fake claim of real AI from SVG fallback.

---

## OWNER FINAL ACCEPTANCE GATE — 2026-11-03 — «СДЕЛАНО» ТОЛЬКО ПО ФАКТИЧЕСКОМУ РЕЗУЛЬТАТУ

**Обязательно для P, администратора, Antigravity, Jules и всех новых рабочих чатов.** Это операционное уточнение существующих правил #11/#13 (`DONE` только после настоящей проверки), а не разрешение обходить CI, менять защищённые дизайны, оплачивать тесты или публиковать production.

1. **Задача сначала, код потом.** Перед работой записать точную просьбу владельца и 2–5 проверяемых критериев приёмки: *что пользователь должен увидеть/суметь сделать, где, как выглядело раньше, что запрещено трогать*. Не заменять смысл просьбы своим удобным техническим предположением.
2. **Для «верни как раньше» исходник должен быть доказан.** Найти именно утверждённую прежнюю версию/вид, а не файл с похожим названием. Сверить исходный визуальный эталон с реальным отображением (картинка, CSS, JS, SVG viewBox/crop, слой, кеш и размеры); не считать исправление одного CSS-параметра доказательством восстановления.
3. **Строгое ограничение области.** Исправлять лишь то, что попросил владелец. До и после проверить Git diff/затронутые файлы; не менять остальные баннеры, страницы, функции, тексты или настройки. При параллельной работе проверить свежий DEV и состав точного развёртываемого SHA; не откатывать чужие изменения.
4. **Две независимые проверки:** (A) исходный код, нужные тесты, CI, корректный SHA и успешная публикация; (B) **реальный пользовательский результат** на той самой запрошенной тестовой странице. Успешный коммит, PR, CI, Render `LIVE` или HTTP 200 подтверждает только этап A, **не B**.
5. **Для визуальных правок B означает открыть фактически опубликованный URL в браузере, получить и изучить свежий screenshot целевой страницы (минимум desktop и mobile, когда это влияет на макет), сравнить с подтверждённым прежним эталоном и убедиться, что изменился именно запрошенный элемент.** Проверять отсутствие скрытия, неверного crop/viewBox, растяжения, кэша и перекрывающих слоёв. Если визуальный браузер/screenshot недоступен, статус **`VISUAL_NOT_VERIFIED`**, а не `DONE`; не подменять это анализом GitHub, Render-логов или уверениями.
6. **Для функциональных правок B означает выполнить реальный безопасный пользовательский сценарий в целевом окружении, проверить ожидаемый вывод и основные регрессии;** mock-only не доказывает live-работоспособность. Реальные платные вызовы, Stripe и production по-прежнему требуют прежних отдельных разрешений.
7. **Не оставлять владельцу собственную проверку вместо своей.** Сообщать «готово / восстановлено / опубликовано и работает» только после выполненных применимых проверок и доказанного результата. Когда результат нельзя подтвердить, честно сообщить: `CODE_CHANGED`, `DEPLOYED_NOT_VISUALLY_VERIFIED`, `VISUAL_NOT_VERIFIED`, `CI_BLOCKED` или `BLOCKED`; назвать конкретный недостающий факт. Не перекладывать ошибку на браузерный кэш без проверки.
8. **Финальный отчёт строго по сути:** исходный запрос → что изменено → что проверено на реальном URL → точный SHA/Render deploy → что осталось. Для дизайна ссылаться на реальные скриншоты/визуальные доказательства, если они доступны; не придумывать подтверждения.
9. **Если владелец велел ничего не делать, не делать никаких новых изменений или deploy.** При обнаруженном несовпадении не самоуверенно объявлять задачу закрытой. Законченная техническая операция ≠ принятый владельцем визуальный результат.

**Урок инцидента Everyday Tools (03.11.2026):** восстановление было ошибочно объявлено завершённым после правки двух CSS-селекторов и статуса Render `LIVE` без сверки screenshot. Это **НЕ ПРИЕМЛЕМО**; повторно такую операцию считать только `DEPLOYED_NOT_VISUALLY_VERIFIED`, пока фактический вид баннера не подтверждён. Действующие запреты на production, платные API, рискованные миграции и обход красного обязательного CI сохраняются.

---

## OWNER FINAL DESIGN APPROVAL — 2026-11-03 — PRICING AND VIDEO UNIQUIFIER

The owner explicitly approved the currently published TEST Pricing (including all twelve actual CDN originals, portal framing, full-width AI Credits banner, removed microcopy and 95% opaque credit panels) and Video Uniquifier. Their design is FINAL. No agent, model, program, automated update or contributor may change their artwork, layout, typography, colors, text, opacity or responsive composition without a NEW explicit instruction from the owner permitting that specific change. Silence, another task, prior blanket autonomy, old image-removal rules or historical locks are not permission. This rule supersedes conflicting older Pricing instructions below. Preserve functionality. Apply to these pages on all domains; it grants NO production publication. Never revert to mislabeled historical image bytes. See docs/OWNER_FINAL_PAGE_DESIGN_LOCK.json; changing its baseline also requires explicit owner permission.

---

## OWNER OVERRIDE — 2026-11-03 — REJECTED PRICING PHOTOS MUST NOT RETURN

The owner explicitly rejected the Pricing main hero image and all five Pricing plan-card screenshot images (Trial / Basic / Pro / Business / Lifetime). Delete these six binaries from the TEST branch, remove their active JS/CSS usage, and never restore them from Git history, old CloudFront, coordinator snapshots, or agent copies without the owner's NEW explicit visual approval. The exact blocked filenames are listed in `docs/PRICING_OWNER_ART_LOCK.json` under `blockedAssetNames`. Earlier statements that all twelve Pricing images must remain are superseded. **The five AI Credits card images and the AI Credits wide banner are explicitly retained**; do not alter them. Do not substitute screenshots or generate replacements without the owner first reviewing each candidate here. Changes to Pricing images require owner approval before any new preview deployment; production remains frozen. This owner instruction supersedes all conflicting older Pricing image locks below.

---

## OWNER RULE — 2026-11-03 — TEST SITE FIRST; PRODUCTION PUBLICATION FROZEN

**Standing owner authorization:** publish every completed, appropriately checked change to the existing DEEPSYQ test site so the owner can inspect its actual behavior, without asking again for each safe test publication. Deploy only the intended reviewed revision and verify the deployed page; a commit, PR, merge or accepted deploy request alone is not proof that the owner can see the change.

- **Canonical test site:** https://deepsyq-visual-preview-20261016.onrender.com/ — Render service `srv-db91k1vf3r2c73fpj350`, workspace `My Workspace` (`tea-dalqjcm7bikc73a8lu6g`), normal source branch `deepsyq-platform`. Keep the isolated test entrypoint `npm run preview:deepsyq`. After a permitted test deployment, return a direct link to the changed page and distinguish working features from mock/unavailable ones.
- **Main site / frozen release destination:** https://video-variator-android.onrender.com/ — Render service `srv-dalqnkoae00c73caj8vg`, branch `main`. Disable its Render automatic deploys. No automatic or manual production publication, main update, release hook, restart-as-release, or preview-to-production promotion without a later explicit owner release instruction. Do not delete or suspend the service, domain, database or existing user data; the owner requested a publication freeze.
- **Future release:** finish and review the product on the test site first. The intended eventual production address is the existing main site above, using the existing repository/infrastructure. Actual promotion requires the owner's separate explicit approval, release/security/financial gates, a known revision and rollback plan.
- **No hidden spending or protection bypass:** test-site publication does not authorize paid AI, live Stripe, unsafe migrations, changing frozen artwork, bypassing mandatory checks, or presenting mock features as live. A UI-only preview may use the isolated preview server only when its scoped checks pass and unrelated full-backend blockers are recorded; this does not permit merging a failing PR or deploying the financial backend.
- **Verification:** record actual Render settings/deploy state separately from this policy. If the connected tool cannot change automatic deployment settings, report that limitation and keep the change marked pending rather than claiming auto-deploy is disabled.

This owner decision supersedes earlier automatic-production-publication instructions. Historical records below remain preserved.

---

## OWNER RULE — 2026-11-03 — СТРУКТУРА ФУНКЦИОНАЛА DEEPSYQ F1–F6 (JARVIS И ПЕРЕНОС ТАРИФОВ)

**Обязательное распоряжение владельца от 03.11.2026 для всех участников (P, Администратор, Antigravity, Jules, любые модели):**
Структура ключевых функциональных направлений платформы окончательно реорганизована в **6 канонических блоков (F1–F6)**:
- **F1 — Compare AI + Smart Routing:** Параллельное сравнение текстовых/генеративных моделей и смарт-выбор.
- **F2 — Jarvis (Voice & User AI Assistant):** Единый голосовой и пользовательский ИИ-ассистент в шаре (Orb). Прежние F2 (User Agent) и F6 (Voice Agent) **объединены в один пункт F2**. Включает микрофон, синтез мужским тембром-баритоном, мгновенный barge-in, текстовый чат, сценарии «Сделай за меня» и системные команды.
- **F3 — Inspiration / Create Yours:** Каталог вдохновения и библиотека шаблонов.
- **F4 — Studio / My Workspace:** Единое рабочее пространство (генераторы, холст Canvas, History, My Creations).
- **F5 — Product Watcher:** Внутренний мониторинг аптайма, защита транзакций Stripe и себестоимости (owner-only).
- **F6 — Pricing / Credits / Stripe:** Тарифные планы, пакеты AI-кредитов, Stripe биллинг и баланс кошелька (**бывший F7 перемещён на место F6**).
- **Бывший F8 (Virtual Pet Companion / Питомцы) полностью закрыт и удален из кодовой базы.**

Запрещается использовать старую нумерацию F1–F8 или повторно разделять Jarvis на отдельные F2 и F6.

---

## OWNER PERMANENT PRICE DESIGN FREEZE — 2026-11-02

See `docs/PRICING_OWNER_ART_LOCK.json` and `docs/PRICING_OWNER_ART_LOCK.md`. Pricing's original 12 owner-selected images, hero, five plans/five credit cards and CSS/HTML may NEVER be changed/replaced/redesigned by autonomous agents without a NEW explicit owner request. Pricing art lock CI + CODEOWNERS apply even to unrelated shared-header/translation work. Keep checkout and wallet protections unchanged.

## OWNER OVERRIDE — 2026-11-02 — SINGLE-CHAT TEAM, NO ACTIVE LEGACY CHAT AGENTS

**Новый действующий состав DEEPSYQ (распоряжение владельца 02.11.2026):**

- **P — главный координатор ChatGPT (ранее координатор №5, Issue #233).** Единая точка управления BASE 54, claims, GitHub, разработкой/проверкой, распределением и приёмкой; владелец проекта утверждает решения.
- **Администратор — действующий технический исполнитель**, сохраняет свою работу и полномочия в разрешённых границах.
- **Antigravity — отдельный исполнитель для сложного программирования**, только назначенные непересекающиеся изменения.
- **Google Jules 1/2/3 — отдельные временные исполнители уже согласованных задач**; последний owner-approved срок продолжения Jules до 11.11.2026, без дублей и несанкционированных новых задач.
- **Четыре прежние ChatGPT-роли A, B, C, D упразднены.** Их больше не считать активными исполнителями, владельцами claims, обязательными ревьюерами, согласующими или адресатами новых заданий. Старые распределения по буквам и правила D16 о самостоятельном слиянии этих ролей **заменены настоящим решением**; старые материалы ниже — только исторические свидетельства.
- **Не удалять, не откатывать и не переписывать код, тесты, ветки, PR, merge SHA, комментарии, handoff и историю этих ролей.** Сохранить незавершённые PR как задачи проекта, а не как активных агентов. P через Issue #233 фиксирует новые claims и распределяет свободные задачи между P, администратором и Antigravity с учётом существующей работы Jules.
- **Не отменять независимые security/financial peer gates**: автору рискованной финансовой реализации нужен действительно независимый от него проверяющий, но это больше не назначение прежней чат-роли D. Никакого самоподтверждения критичных изменений.
- **Остаются действующими** ограничения на изменения `main`/production, живой Stripe, платный AI, миграции, утверждённый Home, модельные права, credits и отсутствие дублирования PR. Новый порядок ролей не разрешает production release.
- **История в этом и других документах не удаляется**: при противоречии более ранних описаний ролей применять это распоряжение и соответствующее решение в `DECISIONS.md`.

---

## OWNER RULE — 30 OCT 2026 — JULES FINISH CURRENT TASK TO VERIFIED READY

**For Google Jules #1/#2/#3 on the already-dispatched issues [#316](https://github.com/mvryhan-web/video-variator-android/issues/316), [#317](https://github.com/mvryhan-web/video-variator-android/issues/317), and [#278](https://github.com/mvryhan-web/video-variator-android/issues/278):** Finish the **same** bounded task to a genuine Jules **READY** / final completion report, reviewable branch/DRAFT PR targeting `deepsyq-platform`, exact SHA, file list, and zero-spend tests. **An ACK, a plan, generated code without verification, or partial files are NOT READY.** Reuse all already completed work; finish the originally approved two files only per issue; fix reproducible defects and retry permitted free tests as needed. Never stop silently while an actionable step remains.

**Safe stop rule:** If genuinely blocked by missing access, owner approval, quota, infrastructure, CI, an external dependency, or any test that could cost money, mark `BLOCKED` with concrete evidence, last exact SHA, which check could/could not run, owner of the unblock and a single next action. No unlimited paid retries, made-up PASS/READY, automatic live deployment, dangerous migrations, new AI provider charges, Stripe live, alterations to protected Home/six MP4, or cross-agent changes. A truly blocked task does **not** count as READY or permit automatic duplication. Once READY is verified, coordinator inspects changed paths, DEV targeting and security/CI before approving further queued work. The bot's `Jules is on it` ACK occupies its slot; do not recreate the same issue, reset its label or start another session until its real current Jules status has been verified. GitHub comments/edited issue text are **instructions for the record**, not proof that an existing Jules VM restarted. To resume an actual paused/awaiting-approval Jules session, use its original task chat/UI. Maximum three concurrent Jules sessions and zero owner spend.

**CURRENT three exact links:** Jules1 W5.5 https://jules.google.com/task/15035598484631377809 ; Jules2 W4.3 https://jules.google.com/task/15999298883849600168 ; Jules3 V6.2 https://jules.google.com/task/10433459474091459526 . D16 A–D independent self-merge and B↔D finance/privacy review remain unchanged. Owner-approved original BASE55/F1–F8, no duplicate Product Video and existing lane claims remain controlling.

---

## OWNER RULE — 25 OCT 2026 — NO SMALL TECHNICAL LABELS IN DEEPSYQ UI

All A/B/C/D/Jules/coordinator agents must follow the owner's permanent public-website copy rule: **no tiny technical captions**, faint developer text, debug/test/CI/PR/SHA/API labels, or unnecessary technical microcopy on banners, imagery, cards, pages, Pricing/AI Credits, Studio, Tools, menus or mobile layouts. Customer-visible text must be clearly readable, simple and meaningful. Keep engineering details in GitHub/docs, not in artwork or the customer interface. **Never obscure** essential truthful prices, credits, limits, availability, consent/privacy/provider disclosures, accessibility, or important errors; show those legibly. This is a design rule for future approved UI work, not permission to rewrite owner-protected Home or deploy/bill. See DECISIONS.md 2026-10-25 rule.

## OWNER DIRECTIVE — 22 OCTOBER 2026 — BEFORE EVERY REQUEST

Before acting on each new owner request, consult current GitHub instructions, the canonical rules, visual reference and relevant checkpoint; check changes since the last read rather than re-reading unchanged archives. All inner pages must use the existing approved Home/carousel visual language. Preserve working Home and its media. A functioning page is not visually complete without deliberate composition and desktop/mobile visual review. The owner explicitly rejected the current Pricing introduction and authorized its rework. [Full clarification](docs/DEEPSYQ_OWNER_DESIGN_CLARIFICATION_20261022.md). No payment/security/release gate is waived.

## OWNER D17 — BASE55 F1-F8 EXECUTION PLAN (20 OCT 2026)

**New active prioritization and acceptance overlay:** [docs/DEEPSYQ_BASE55_F1_F8_EXECUTION_PLAN_20261020.md](docs/DEEPSYQ_BASE55_F1_F8_EXECUTION_PLAN_20261020.md); verbatim owner draft [here](docs/DEEPSYQ_BASE55_F1_F8_OWNER_DRAFT_20261020.txt). Original BASE 55, Blocks 1–8, four immutable owner priorities and the approved Home remain authoritative; F1–F8 are aliases, not new duplicate workstreams. Prioritize commercial E2E and F7, in parallel preserve free independent SEO/mobile/security/F5 Lite work. **D16 self-verify/self-merge A–D still applies, B↔D finance/privacy peer checks still apply.** The draft preview dated 19 Oct is not a real backend/production verification. Trial $0.99 3-day/no-renewal/credit amounts are **not owner-approved**; keep checkout OFF. Docs only: no permission for main/production, paid AI/Stripe or dangerous migrations. See [DECISIONS.md](DECISIONS.md) D17.

## OWNER CANONICAL VISUAL MOCKUP — 2026-10-19 — READ BEFORE UI WORK

**[docs/DEEPSYQ_OWNER_VISUAL_REFERENCE.md](docs/DEEPSYQ_OWNER_VISUAL_REFERENCE.md) is the owner's approved screenshot-based visual standard for ALL Deepsyq pages.** Use the dark navy + cyan/blue/violet/magenta neon colors, matching buttons, rounded luminous cards (“big squares”), compact header/sidebar and existing shared style across all real pages. **The currently working Home carousel and Home content blocks are protected: DO NOT touch, re-render, reorder, recreate or change their source/design.** Do NOT rewrite existing functional code; first verify a genuine difference against the owner's screenshot, then correct only the smallest safe, owner-approved visual mismatch on the owning agent's file/PR. Keep routes and all features working, only no-spend tests. The screenshot itself is attached to the owner's 2026-10-19 chat, not yet stored as a PNG binary in this repository; do not claim literal pixel-level screenshot verification solely from these GitHub docs. This is a DEV documentation constraint, NOT publication authority.

# AGENTS.md — Deepsyq: START HERE (all agents and coordinators)

## OWNER OVERRIDE — 2026-10-20 — SELF-MERGE A/B/C/D, NO COORDINATOR APPROVAL

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-20, D16:** агенты A/B/C/D **САМИ** разрабатывают, запускают и проверяют CI на финальном SHA, согласуют обязательные независимые финансовые peer-gates напрямую B↔D и **САМИ объединяют проверенные PR в `deepsyq-platform`**. Координатор №5 НЕ проверяет и НЕ объединяет их PR, НЕ является approval gate. Безопасная preview-публикация — исполнителю при уже данном разрешении/доступе; production/main, реальные Stripe, деньги, опасные миграции и frozen Home требуют прежних специальных прав/разрешений. [Полное правило](docs/DEEPSYQ_A_D_SELF_MERGE_RULE.md) и [DECISIONS D16](DECISIONS.md). Более старые предложения ниже «only #5 merges», «READY_TO_MERGE — финал агента» являются ИСТОРИЧЕСКИМИ и не действуют для A–D.


## OWNER DIRECTIVE — GRAPHIFY SHARED CODE MAP (19 OCT 2026)

**Every agent A/B/C/D/#5/Jules: map-first, not history-first.** Before broad source searching, open the durable `docs/DEEPSYQ_CODE_MAP.md` and its small relationship index `docs/DEEPSYQ_CODE_MAP.json` **if they exist on current `deepsyq-platform`**. Find the exact symbol/file/line and then inspect only the affected current code or changes since map `source_sha`. The index is a navigation aid, never a substitute for security/financial/acceptance tests. **Current coverage is ONLY `server/`**, not Android UI, docs or other code. If missing, outdated or incomplete, do *narrow* GitHub source search/diff, not full archive/history. Do not claim map present until the generator successfully publishes it.

Graphify source pin unchanged. A GitHub Actions updater builds the real offline AST, removes the raw graph, and persists **only a sanitised source-path/function/edge index** on DEV after passing secret-exclusion tests. It triggers on relevant DEV source changes; a separate manual action can regenerate it. Never publish raw `graphify-out/`. **Ponytail** still applies on every coding task: smallest *complete and tested* change without weakening any BASE requirement. Agents with no Graphify runtime can still READ the shared map through GitHub. `main`/production, users, payments and paid AI remain untouched.


**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](DECISIONS.md).** Последнее обязательное решение: **нет Free AI plan/welcome credits; Trial $0.99 пока НЕ включён; деньги пользователя подтверждает Stripe, provider call только за КУПЛЕННЫЕ credits (Issue #182)**. Бесплатные ИМЕННО тесты (mock/CI/Stripe test-mode и доказанно бесплатные реальные AI-вызовы с жёстким отказом вместо платных перерасходов) разрешены после pre-call CHECKPOINT. Предыдущие строки ниже о free-tier AI относятся **только к тестовому тарифу**, а не к публичному бесплатному продукту. 4 главных приоритета 1–4 не изменены. Состояния CI_BLOCKED, READY_TO_MERGE и DONE=LIVE_VERIFIED действуют; зоны и единый Jules ≤3 задач см. правила #9/#21.


## OWNER DIRECTIVE 2026-10-19 — GRAPHIFY + PONYTAIL, ALL A/B/C/D/#5/JULES

**MERGED into deepsyq-platform:** [Graphify original PR290](https://github.com/mvryhan-web/video-variator-android/pull/290) and [Ponytail original PR291](https://github.com/mvryhan-web/video-variator-android/pull/291). This rule applies to **A, B, C, D, coordinator #5 and Jules when its task loads repository instructions**. Pins, exact host limitations, tested workflows and per-role examples: [docs/DEEPSYQ_AGENT_TOOLS.md](docs/DEEPSYQ_AGENT_TOOLS.md). Preserve owner rules/BASE/claims; only these two tools are authorized.

**Every task:** (1) resume latest role CHECKPOINT + current PR/SHA + claims; read only changed source after SHA, not the whole archive; (2) **Graphify-first if genuinely available**: query the **current safe local code graph**, verify returned paths against HEAD, or use narrow GitHub search/compare if no graph; (3) **Ponytail**: prefer reuse and the *smallest complete* diff, never drop owner requirements, tests, auth, privacy, credits, accessibility or error handling. On compatible skill hosts read `.agents/skills/graphify/SKILL.md` and `.agents/skills/ponytail/SKILL.md`; otherwise these short repo rules provide the non-executable fallback. The pilot caught and fixed a SHA-validation omission: **shorter != safe until acceptance tests pass**.

**Runtime truth:** Graphify ran in GitHub Actions, but **A/B/C/D/#5 ChatGPT cloud GitHub sessions and Google Jules are not verified to run its Python CLI or auto-load repo skills**. Do not falsely claim a graph query, auto-install a package, or block work: write `GRAPHIFY_UNAVAILABLE_IN_HOST` and continue with scoped GitHub source search. Jules does not start a new task just because docs changed.

**Safety:** `.graphifyignore` excludes secrets, env, dumps and user data; Graphify only no-spend local `--code-only`, no Cloud/LLM/document indexing, unsafe hooks or secrets. Do not commit graph outputs. Ponytail never weakens BASE/25 rules. **Only coordinator #5 merges into DEV; main auto-deploys production and only D releases it with owner approval**. No paid AI or real Stripe.

## OWNER ORDER 2026-10-18 (LATEST): VERIFIED FREE REAL AI TESTS / ZERO CHARGES

**Superseding owner test policy (verbatim details: [25 canonical rules, #7](docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md)): ALL genuinely FREE tests may run without asking permission, INCLUDING real AI API/model requests on an authenticated FREE tier, free credits, or truly free model; Stripe TEST mode, unit/mock, free CI/lint/build. ALL tests that charge OR COULD charge the owner's money are forbidden. PAID budget remains 0 for EVERY A–D, Jules1–3 and coordinator #5.** It is NOT correct to prohibit verified genuine free provider calls categorically.

**Mandatory BEFORE every actual AI call:** write a GitHub CHECKPOINT identifying exact service/model, verified no-charge tier or credits, concrete quota and remaining allowance when knowable, proof that any exhausted quota HARD-FAILS WITHOUT automatic overage charging (request refuses), dated source of this proof; NO secrets. If the hard no-charge guarantee, free capacity, or cost of CI is uncertain, do NOT run; mark `BLOCKED`, preserve claim and ask owner only if no free verification is possible. Avoid a paid trial that merely starts free but later auto-charges. Never activate live Stripe, owner spend, production/main or dangerous migrations without owner's explicit permission.

`CI_BLOCKED` remains available; coding agents finish `READY_TO_MERGE` only with open PR + necessary green permitted tests; coordinator #5 reviews/integrates DEV; only D releases production with owner permission; `DONE` only after genuine `LIVE_VERIFIED`. The 7 future BASE queues + five new topic assignments are [in PROJECT_STATUS.md](PROJECT_STATUS.md); queue candidates do NOT count as active claims. Old Jules S2/U2/G2 and deferred Blocks remain preserved; examine existing owners before any claim.

## LATEST OWNER DIRECTIVE — 2026-10-18: EXACT 25 RULES (4 + 16 + 5)

**The controlling, verbatim owner rules are [docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md](docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md), rules 1–25.** This new edition supersedes older conflicting operating instructions here and in ONE_ITEM_TO_DONE, but does NOT alter original 55 BASE or eight Blocks, approved Home/media, prior checkpoints, existing claims, or completed work. Four original priorities remain owner-locked, word for word.

- **Owner rules #7/#23 (latest 18 Oct):** all VERIFIED-COST-FREE unit/mock/Stripe test mode/CI AND genuine free-tier/free-credit/free-model AI calls are allowed without owner permission **after a PRE-CALL GitHub CHECKPOINT** proving service, model, free tier/remaining quota, hard rejection without any billing on overage, dated evidence. Paid/possibly billed tests are FORBIDDEN (paid budget=0), as are owner expenses, live Stripe, production, unsafe migrations and secret leakage. Never log/commit secrets; .env must be ignored.
- **Owner rules #11/#12:** keep the original BASE row while safe work remains. After a *confirmed genuine external blocker*, finish safe work, record BLOCKED/PARTIAL + precise owner/trigger + CHECKPOINT, then independently claim a collision-free available row in the SAME lane, record the new claim and notify coordinator #5. **Do not require a second owner or coordinator advance approval**; coordinator reviews claims/conflicts and may intervene.
- **Owner rules #9/#21/#22:** A Home/Image/Canvas; B Video/providers/jobs/storage; C AI Apps/Tools/navigation; D Stripe/credits/pricing/DB/**production release**; #5 audits, reconciles and safely integrates on dev. Audio, AI Agents, Inspiration, History and SEO have no dedicated lane owner until #5 records an assignment/claim; existing scoped claims must be checked, not erased. Agents prepare READY_TO_MERGE; only D performs production release after gates, owner approval for risky changes.
- **Owner rules #16/#19/#24/#25:** do not re-read unchanged SHA or rerun identical checks without reason; a chat is not automatically background-running. Failed generation must return reserved credits at no customer cost (prove with tests; do not claim implemented without evidence). Follow repository formatter/naming, no cross-lane mass reformat.

## OWNER OVERRIDE — 2026-10-17: confirmed external block permits safe independent BASE claim

The owner explicitly amended the prior “one BASE item until full DONE” rule: complete and test all safely possible work on the current row; when external CI runners, authorized staging, owner permission, or another agent-owned component genuinely block full acceptance, record exact blocker/evidence, owner and fastest safe unblock in PROJECT_STATUS + claim board + lane Issue, **preserve the current PR/SHA and unfinished status**, then claim the next independent AVAILABLE BASE row in the SAME lane after checking all PR/file collisions. Notify coordinator #5 in the shared Issue; a second owner authorization for that documented safe switch is NOT required. Do not turn a fixable bug or merely inconvenient test into a blocker, do not fake DONE or auto-merge, and return to blocked row through the board after its dependency clears. Scope/security/paid-provider/Stripe/production/locked-Home restrictions remain binding. This paragraph supersedes contrary older reassign/only-one-active language in this document; all original BASE requirements remain unchanged.


**Effective: 2026-10-17. Applies to A, B, C, D, coordinator #5, ALL future coordinators/curators/replacement AI chats.**

## 1. Binding rules, in reading order

1. **[FOUR IMMUTABLE OWNER PRIORITIES](docs/DEEPSYQ_OWNER_FOUR_IMMUTABLE_PRIORITIES.md)** — locked Home with real cinematic videos; safe functioning paid AI journey; global SEO/AI search and conversions; broad independent AI creative platform. **Only the owner can directly approve changes.**
2. **[EXACT 25 OWNER RULES — current canonical regulation](docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md)** — four locked priorities, sixteen work rules, five additional rules; source priority, role boundaries, DONE, blocker handling, security, release owner and GitHub handoff. Use this as the first operational checklist, not the old duplicated prose.
3. **Current verified state:** `PROJECT_STATUS.md`, [BASE 55 claim board](docs/DEEPSYQ_BASE_55_COORDINATION.md), Issues [A #72](https://github.com/mvryhan-web/video-variator-android/issues/72), [B #73](https://github.com/mvryhan-web/video-variator-android/issues/73), [C #74](https://github.com/mvryhan-web/video-variator-android/issues/74), [D #75](https://github.com/mvryhan-web/video-variator-android/issues/75), existing branches/PRs/CI, current affected code.
4. **Complete original owner TXT for the exact assignment:**

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](DECISIONS.md).** Ранее «Original source TXT is not editable status material» ниже — историческое правило для АГЕНТОВ; владелец лично разрешил документационному координатору добавить рядом с исходными фразами явные override-заметки, сохраняя старую формулировку. Это не разрешение изменять исходный смысл или код без владельца.
 [BASE original](docs/DEEPSYQ_PLATFORM_SPEC.md) and [55-item evidence checklist](docs/DEEPSYQ_BASE_CHECKLIST.md), OR specific `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_N.txt` for expressly authorized Blocks 1–8 (including the separately approved Block 8). **BASE is NOT Block 1.** Original source TXT is not editable status material.

## 2. Execution in one paragraph

**One coding agent = one currently claimed original BASE number until real DONE** (A Home/Image/Canvas; B Video/Provider/Jobs; C AI Apps/Tools/navigation; D Credits/Stripe/DB/release). Coordinator 5 audits actual ownership, conflicts, exact acceptance and blockers, and is NOT a duplicate fifth coding lane. Do not start over, claim others' work, create duplicate database/auth/wallet/router/Studio, or hop after a small test/commit/PR. Continue next authorized step of SAME numbered requirement during the active session. On a true external blocker finish safe work, preserve the blocked row, document precise dependency and checkpoint; then claim another safe independent available BASE row in the same lane, record it and notify #5 without waiting for prior coordinator permission (new owner rule #12). New chats restore last claim/branch/PR/checkpoint; no autonomous background or power over other tabs.

## 3. Technical rules still binding (not replaced by short summary)

- [One item until DONE](docs/DEEPSYQ_ONE_ITEM_TO_DONE_PROTOCOL.md), [new-chat handoff](docs/DEEPSYQ_CHAT_CONTINUITY.md), [ready-to-paste resume commands](docs/DEEPSYQ_AGENT_SESSION_RESUME_COMMANDS.md).
- [Approved Home design](docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md), [exact original 13-video shot list](docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md), [sole official site + app logo](docs/DEEPSYQ_OFFICIAL_BRAND.md). No changes to owner-locked visuals without permission; never fake media/demo/social features.
- [Global SEO/AI-search release checklist](docs/DEEPSYQ_SEO_RELEASE_CHECKLIST.md), Issue [#156](https://github.com/mvryhan-web/video-variator-android/issues/156).
- [Production AI deployment gates](docs/AI_PRODUCTION_ROLLOUT.md) and `PRODUCTION_DEPLOYMENT_SPEC.md`; purchased-only gate Issue [#182](https://github.com/mvryhan-web/video-variator-android/issues/182).
- [Roadmap](docs/DEEPSYQ_ROADMAP.md) and all **eight** approved roadmap blocks registered: original Blocks 1–7 plus separately owner-approved [Block 8 — «Волшебный нюх»](docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_8.txt) ([Issue #187](https://github.com/mvryhan-web/video-variator-android/issues/187); source merged via PR #188). BASE-first remains effective for four agents; Block 8 is post-MVP and not assigned or implemented. Do not auto-reassign.
- **Repository:** `mvryhan-web/video-variator-android`; development/integration `deepsyq-platform`; `main` auto-deploys Render production. No direct risky merge, destructive DB migration, provider expenses, live billing or production/root activation without required owner authorizations, backups and testing. Protect existing Video Uniquifier and user's data.

## 4. Required update for every meaningful work block

Push scoped code/tests, update current branch/PR and `PROJECT_STATUS.md`, mark true BASE status (not invented DONE), post `[DEEPSYQ CHECKPOINT]` on the lane issue and leave `[DEEPSYQ HANDOFF]` near a session limit with **role, BASE #, issue, PR, SHA, CI, proven acceptance, exact blocker and single next step**. Replacement chat records a verified `[DEEPSYQ TAKEOVER]`. If GitHub cannot be written, say so explicitly instead of claiming persistence.

## Previous verbose rules

[Full pre-consolidation AGENTS.md snapshot](docs/history/DEEPSYQ_AGENTS_RULES_BEFORE_CONSOLIDATION_20261017.md) is kept for historical audit, **not a second set of live competing instructions**. The current canonical regulation explicitly resolves older small-task hopping and the inaccurate three-priority shorthand; no original BASE/Block TXT, media, application code, work claims or actual completion statuses were changed by this docs-only consolidation.
