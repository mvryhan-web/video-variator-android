# DEEPSYQ — CHECKPOINT координатора №5: решения владельца о противоречиях

**2026-10-18 / Europe/Paris / DOCS ONLY / owner directive.** Восстановление: сначала [корневой DECISIONS.md](../DECISIONS.md), этот CHECKPOINT, `PROJECT_STATUS.md`, затем изменённые файлы и текущий SHA. Сохранены оригинальные тексты как история. Четыре приоритета 1–4 дословно НЕ МЕНЯЛИСЬ. **Запрещено считать это запуском Trial, AI-провайдеров, Stripe, production или миграций.**

## Что приведено в соответствие

1. **Free AI / BASE §44:** не существует клиентского Free AI plan или welcome AI credits; только ежедневные бесплатные Everyday Tools без платного облачного AI либо локально/жёсткий ежедневный per-user лимит без списаний; будущий платный Trial $0.99 ОТКЛЮЧЁН; Block 7 коммерческий канон.
2. **Issue #182:** подтверждённо купленные и оплаченные AI credits обязательны до каждого provider call. Оплаченный и подтверждённый через Stripe Trial $0.99 БУДЕТ считаться покупкой после отдельных условий владельца; сейчас не запускается. Проверенно бесплатные провайдерные тесты разрешены только с pre-call GitHub checkpoint и жёстким отказом при превышении бесплатного лимита; иначе BLOCKED.
3. **BASE §53 / Blocks 2, 5:** Block 2 STAGE1 только готовые workflow как BASE §21, full orchestrator после LIVE_VERIFIED §51. Block 5 STAGE1 LITE (website uptime, Stripe errors, spend anomalies, owner email); advanced/autonomy только после LIVE_VERIFIED §51 / отдельного решения.
4. **Повторы/каноны:** Block 4 = Workspace/History/My Creations поверх существующих generation jobs; Block 3 = Inspiration и master templates (один дата-каталог); Block 7 = цены/кредиты/Stripe/Trial; BASE §§13–18/22–25/43–44, Blocks 1/2/6/8 и Studio теперь ссылаются на каноны. Никакой второй таблицы/реализации/PR не разрешено.
5. **Block 3 content:** только свои примеры или действительно бесплатно созданные без затрат либо чётко помеченные placeholders; платные AI-примеры без согласия запрещены.
6. **Правила:** статус CI_BLOCKED подтверждён, финиш кодового агента READY_TO_MERGE, полный DONE только после LIVE_VERIFIED; зоны Audio, AI Agents, Inspiration, History, SEO распределены в таблице, Jules — ЕДИНЫЙ исполнитель не более 3 bot-confirmed задач.
7. **История сохранена:** каждый затронутый пункт снабжён «ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. DECISIONS.md» рядом с исходной формулировкой; источник не стёрт и никогда не является основанием к активации более старой политики.

## Файлы документов

- `DECISIONS.md` — новый корневой журнал D01–D15 и вопросы владельцу.
- `docs/DEEPSYQ_PLATFORM_SPEC.md` — аннотации BASE §§13–18, 21–25, 28, 43–44, 53.
- `docs/DEEPSYQ_BASE_CHECKLIST.md` — сохранены 55 строк, аннотированы соответствующие статусы/дубли, §44 зачёркнут как исторический.
- `docs/DEEPSYQ_ROADMAP.md` — стадийность и главные документы Blocks 1–8.
- `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_{1..8}.txt` — к каждому первоначальному оригиналу добавлены датированные заметки, прежние исходные требования не удалялись.
- `docs/DEEPSYQ_CANONICAL_OPERATING_RULES.md`, `AGENTS.md`, `docs/DEEPSYQ_ONE_ITEM_TO_DONE_PROTOCOL.md` — правило тестов, статус/финиш, зоны и один Jules.
- `docs/BASE_44_FREE_AI_PLAN.md`, `docs/DEEPSYQ_TRIAL_099_AND_LUMINA_UX_REVIEW.md`, `docs/DEEPSYQ_TRIAL_099_COST_GATES.md`, `docs/DEEPSYQ_TRIAL_099_PERSISTENCE_HANDOFF.md` — старые реализации/трёхдневные условия чётко помечены как неутверждённая история, без правки кода или SQL.
- `docs/DEEPSYQ_BASE_55_COORDINATION.md`, `PROJECT_STATUS.md` — указатель на новое решение и продолжение claims без фиктивного DONE.
- `docs/DEEPSYQ_OWNER_FOUR_IMMUTABLE_PRIORITIES.md` — БЕЗ ИЗМЕНЕНИЙ.

## READ-ONLY audit: найденные реальные пересечения и риски дублирования кода — НЕ УДАЛЯТЬ БЕЗ РЕШЕНИЯ ВЛАДЕЛЬЦА

1. **ДВЕ разные таблицы контента уже существуют:** `server/migrations/20261015-ai-inspiration.sql` создаёт `vv_ai_inspiration`; `server/migrations/20261015-ai-templates.sql` создаёт `vv_ai_template`, с разными CRUD в `server/generation-inspiration.js` и `server/generation-templates.js`. Это **подтверждённое пересечение «Inspiration/templates как данные» с новым требованием одного канонического каталога**. Не смешивать и НЕ МИГРИРОВАТЬ автоматически; требуется отдельное owner-approved решение о том, какую существующую таблицу принять как канон и как мигрировать/сохранить записи/права/тесты.
2. **Бесплатные AI-кредиты в legacy-коде:** `server/generation-billing.js` содержит `welcomeCreditConfig`, `AI_WELCOME_CREDITS_ENABLED`, `POST /api/ai-wallet/welcome`; `server/generation-wallet.js` содержит `grantOnce(...kind='welcome')` и ledger `welcome_grant`; `app/src/main/assets/studio-credit-wallet.js` до сих пор документирует `Free/promotional AI credits`. **Риск устаревшего free allowance**; этим запросом выключатели/код НЕ меняли; документировать и отдельно подтвердить, что в production нет активации и купленная авторизация Issue #182 остаётся обязательной.
3. **Trial — кодом зашито историческое 72h:** `server/generation-trial-policy.js` содержит `TRIAL_PREVIEW_DURATION_MS`, `THREE_DAY_WINDOW_ENDED`, но помечен `launchApproved:false` / `accessGranted:false`; `docs/DEEPSYQ_TRIAL_099_*` исторически предлагает 3 дня/no-renew. Это НЕ утверждённое условие владельца, не активировать. Legacy `app/src/main/assets/trial-quality.js` относится к старому Video Uniquifier, не считать его бесплатным новым AI-планом.
4. **Дублирующие API-пути, но общий ledger:** `server/generation-billing.js` предоставляет и `/api/ai-wallet/{balance,history}`, и `/api/ai-billing/{balance,history}` к одному `GenerationWallet`. Это **не доказательство второй базы данных**, но два параллельных API имени, требующие аудита/срока совместимости, без немедленного удаления.
5. **Workspace vs History:** `server/generation-studio.js` является текущим пользовательским History/jobs; отдельный чистый модуль `server/workspace-project-policy.js` по Jules2 Task #273 существует только в координационном DEV PR #283 до интеграции. У него нет своей DB таблицы; нельзя делать вторую реализацию History или переносить чужие записи.
6. **Product Watcher code:** текущий `server/product-watcher/*` имеет много advanced компонентов; Stage1 LITE из решения владельца может лишь использовать разрешённую часть, будущий advanced code не удалять. Никакого самостоятельного включения cron/worker или генерации расходов.

Все пункты выше — находки в исходниках или потенциальные пересечения, **не утверждение, что две стороны уже проводят одинаковые финансовые действия**. Реальные migration/DB/production последствия исследуются только после решения владельца.

## ВОПРОСЫ ВЛАДЕЛЬЦУ / BLOCKED

- Trial $0.99: точная **длительность**, **количество приобретённых AI-кредитов и допустимые модели**, **продление/автосписание**, **возвраты/отмена**, **защита от повторных регистраций**; без ответов не включать.
- Какую из двух **существующих** таблиц контента (`vv_ai_template` и `vv_ai_inspiration`) считать единственным каноном Block 3, нужна ли миграция или представление поверх существующей? Никаких автоматических SQL изменений.
- Какие именно облачные Everyday Tools разрешено запускать на гарантированно беззатратном дневном лимите/пользователя; где только локальная реализация?
- Как поступить с существующим **кодом welcome/grant** (удалить позже либо оставить permanently OFF как совместимость) после отдельного аудита? В этой сессии код сохранён.

## Допуск и следующий шаг

**Docs-only:** изменялись исключительно `.md` и оригинальные текстовые `.txt` документы в отдельной ветке; не изменены `.js`, `.ts`, `.sql`, конфигурация оплаты, runtime, CI, фичефлаги, main/Render/Stripe/provider. Не запущены платные тесты и реальные AI-вызовы. После проверки изменения рассматриваются как документационная интеграция в `deepsyq-platform`. **Оригинальные BASE FULL DONE/списки claims этим CHECKPOINT не переоценивались.**
