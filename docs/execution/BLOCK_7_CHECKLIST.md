# Block 7 — PRICING, CREDITS, STRIPE & UNIT ECONOMICS

**Источник:** исходный `DEEPSYQ_BLOCKS_1-7_CANONICAL.txt` (библиотека пользователя), скопирован дословно ниже. Это именно Block 7, не BASE.

**Учёт:** 25 последовательных этапов реализации и проверки; 141 маркированных строк и 21 строк стрелочной цепочки в оригинале. Строки оригинала включают примеры, ограничения и настройки — это НЕ 162 независимых задач.

**Приоритет:** выполнять этапы 01→25 по порядку в рамках данного блока; не перескакивать из-за скуки/желания сделать другой раздел. Сначала проверить уже существующий код/тесты, затем закрывать только реальный остаток. Зависимость от других блоков или owner approvals = `BLOCKED` с доказанным blocker; не подменять готовностью. Продолжать только явно независимые безопасные задачи, указывая исключение в отчёте.

**Статусы:** `[ ] TODO`, `🟡 PARTIAL`, `✅ VERIFIED`, `⛔ BLOCKED`, `⏳ MAIN/DEPLOY PENDING`. Галочку ✅ ставить только с PR/commit/тестами. Успешный CI не означает запущенный рабочий сайт. Каждый пункт должен получить ссылку на доказательство или причину блокировки; не копировать чужую работу.

**Существующее на 2026-10-15:** BASE PR #42 содержит частичный AI wallet, quote, ledger, Stripe; коммерческий end-to-end и реальные unit economics не подтверждены.

## Исполнительный чек-лист — 25 этапов

- [ ] **B7-01. Провести точную инвентаризацию существующего Stripe/Checkout/Products/Prices/webhooks, users, wallets, jobs.**
  - Критерий: Не создавать второй billing/ledger/customer stack и не менять старые Price IDs.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-02. Сохранить текущие Basic $9, Pro $24, Business $99 и отдельный Lifetime €2,999.**
  - Критерий: Lifetime относится к утверждённым старым функциям, не к unlimited paid AI.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-03. Собрать утверждаемую политику Trial $0.99: срок, кредиты, функции, продление, expiry, refunds, anti-abuse.**
  - Критерий: Trial не включается, пока поля политики и экономика не утверждены.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-04. Использовать Lumina тарифы и пакеты лишь как benchmark, а не реальные цены Deepsyq.**
  - Критерий: Никаких скопированных значений без расчёта маржи.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-05. Собрать понятную Pricing страницу: plan, price, first-month/monthly credits, features, limits, best-for, CTA.**
  - Критерий: Планы и покупки отображаются только при реальном Stripe/entitlement конфиге.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-06. Разъяснить в FAQ: кредиты, разные цены моделей, failed/refund, renewals, packs, Lifetime, limits, rollover.**
  - Критерий: Неутверждённые refund/rollover policies не заявляются как работающие.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-07. Проверить/расширить существующий AI Wallet и аудируемый ledger: purchase, reserve, capture, release, refund, debt.**
  - Критерий: Каждое изменение баланса связано с идемпотентной операцией и пользователем.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-08. Выполнить server-side quote и проверить balance/entitlement ДО дорогого запроса.**
  - Критерий: Без резерва никакой платный AI не отправляется.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-09. Атомарно резервировать кредиты и создавать job с идемпотентным ключом.**
  - Критерий: Повтор не создаёт двойной job и двойной charge.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-10. После сохранённого результата фиксировать реальную цену и захватывать подтверждённые кредиты.**
  - Критерий: Нет оплаты без результата/согласованного расчёта.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-11. Возвращать неиспользованный резерв или подтверждённый failed job.**
  - Критерий: При неопределённой провайдерской отправке резерв остаётся на ручной разбор, а не auto-refund.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-12. Проводить подписки и одобренные Trial/packs через существующий Stripe.**
  - Критерий: Не перенаправлять пользователя оплачивать провайдеру напрямую.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-13. Начислять кредиты только после подтверждённого Stripe webhook и документировать event ID.**
  - Критерий: Frontend success не считается источником истины.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-14. Обеспечить idempotent grants, monthly grant, duplicate webhook and refund reconciliation.**
  - Критерий: Дубликаты событий не удваивают баланс.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-15. Добавить Buy Credits и реальные one-time top-ups только после утверждения стоимости.**
  - Критерий: Бенчмарк 1K/10K/100K/1M/10M — не обязательные коммерческие продукты.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-16. Собирать usage/cost каждого провайдера по типу задач, токенам/секундам/видео/аудио.**
  - Критерий: Фактические тарифы подтверждены официальными источниками.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-17. Учитывать Stripe fees, infrastructure, failure/retry risk, markup и целевую маржу.**
  - Критерий: Формула sustainability не использует выдуманные расходы.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-18. Определять model/capability/duration/size-specific credit price server-side/config-driven.**
  - Критерий: Frontend получает лишь безопасную quote в Deepsyq credits.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-19. Сохранять estimate и actual cost в job и сравнивать расхождение.**
  - Критерий: Нельзя скрыто заменить задачу существенно более дорогой моделью.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-20. Сделать Owner economics: purchases, subscriptions, sold/held/used/refunded credits, costs.**
  - Критерий: Статистика разграничена по валютам и реальным источникам.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-21. Считать margin по пользователям, генерациям, моделям, провайдерам и планам только при полных данных.**
  - Критерий: Если нет FX/затрат — показывать «недостаточно данных», не ложную прибыль.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-22. Проверить аномалии расходов и запрет автоматического изменения тарифов без согласия владельца.**
  - Критерий: Нет бесконтрольной финансовой экспозиции.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-23. Отделить Everyday Tools free/limited use от дорогих AI-операций в entitlements.**
  - Критерий: Старые оплаченные права не ломаются.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-24. Протестировать полный путь Stripe → webhook → grant → reserve → provider → persist → capture/release.**
  - Критерий: Включить негативные кейсы duplicate/failed/ambiguous без реальных списаний.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B7-25. Выполнить production backup/migration/preflight, main merge, staging acceptance и безопасный запуск.**
  - Критерий: Только после real economics и owner approval отметить блок DONE.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.

## Полный исходный текст Block 7 — без сокращений и перестановок

Секции, параметры, ограничения и примеры ниже сохранены дословно. При сомнении именно оригинальная формулировка имеет приоритет над краткими этапами выше.

```text
BLOCK 7 — PRICING, CREDITS, STRIPE & UNIT ECONOMICS
============================================================

GOAL
Build the commercial Deepsyq system where users pay through the existing Stripe, receive AI credits/entitlements, use AI, and Deepsyq controls real cost and gross margin.

Important:
- reuse existing Stripe
- reuse existing Checkout
- reuse existing Products/Prices where already present
- reuse existing webhooks
- reuse PostgreSQL
- reuse users
- reuse current AI wallet/ledger foundations
- do NOT create a second billing stack
- do NOT duplicate existing plans/Price IDs/backend logic
- do NOT invent provider prices

EXISTING DEEPSYQ PLAN BASE
- Basic — $9
- Pro — $24
- Business — $99
- Lifetime — €2,999

Lifetime:
- separate product
- for Everyday Tools / legacy Free Tools + Video Uniquifier according to approved policy
- NOT unlimited paid AI
- NOT lifetime access to every future provider call

TRIAL
Add a prominent:
Trial — $0.99

Do not finalize/enable it until approved:
- duration
- included AI credits
- included features
- renewal/non-renewal
- expiry
- refund behavior
- abuse protection

No unlimited AI.

LUMINA BENCHMARK
Use Lumina only as a pricing/credits UX benchmark, not as automatic Deepsyq production pricing.

Previously captured benchmark values:
- Trial: $0.99 / 3 days / 299 credits
- $9 tier: 1,260 first-month credits
- $29 tier: 4,200 first-month credits
- $49 tier: 7,800 first-month credits
- $239 tier: 39,000 first-month credits

Credit pack size ladder:
- 1,000
- 10,000
- 100,000
- 1,000,000
- 10,000,000

These are benchmark/reference values only.
Do not adopt them without unit economics.

PRICING PAGE
Show clearly:
- plan name
- price
- first-month total credits
- normal monthly credits
- features
- limits
- best-for
- differences between plans
- CTA
- Buy Credits
- Trial $0.99
- Lifetime separately
- FAQ

FAQ should explain:
- what AI credits are
- why models have different credit costs
- failed generation behavior
- when credits are released/refunded
- monthly renewal
- one-time credit packs
- Lifetime vs AI usage
- plan limits
- rollover only after policy approval
- refunds only after policy approval

AI CREDIT SYSTEM
Need:
- AI wallet
- auditable ledger
- purchase
- reserve
- capture
- release
- refund
- debt/reconciliation primitives
- idempotency

Before expensive generation:
quote
→ verify balance
→ reserve atomically
→ start provider job
→ finish provider job
→ capture approved/actual credits
→ release unused reservation or confirmed failure

Never:
- start expensive work before checking/reserving credits
- automatically refund an ambiguous provider call when provider acceptance is unknown
- automatically retry ambiguous paid generation

STRIPE
All user payments go through the existing Stripe.

Use Stripe for:
- subscriptions
- approved Trial
- one-time AI credit packs
- existing plan checkout
- customer mapping

User pays Deepsyq through Stripe.
Deepsyq separately pays AI providers from business/provider accounts.
A customer’s Stripe payment does not directly “pay the provider per user”.

Credit grants:
- only after verified Stripe webhook
- idempotent
- record webhook event
- duplicate webhook must not duplicate credits

Monthly credits:
- grant after confirmed billing event
- server-side renewal logic

ONE-TIME CREDIT PACKS
Support Buy Credits.

Benchmark sizes:
- 1,000
- 10,000
- 100,000
- 1,000,000
- 10,000,000

Real prices must be derived from unit economics.
Discounts are allowed only while maintaining safe margin.

UNIT ECONOMICS
For each AI call record:
- provider
- model
- task type
- tokens / seconds / images / video duration / audio duration as relevant
- provider list price
- actual provider cost
- internal Deepsyq credit cost
- charged credits
- reserved credits
- markup
- allocated Stripe fees where applicable
- infrastructure allocation where applicable
- retry/failure cost
- final margin

Formula:
provider cost
+ infrastructure
+ Stripe fees
+ expected failure/retry risk
+ safety margin
= minimum sustainable price

Then:
minimum sustainable price
→ Deepsyq credits
→ plan allowance / credit-pack pricing

Do not finalize Deepsyq pricing until real provider prices are verified.

MODEL-SPECIFIC CREDIT COST
Different models may cost different credits.

Pricing must be:
- model-specific
- capability-aware
- duration/size-aware where relevant
- server-side
- config-driven

Do not hardcode stale provider prices in the frontend.

PRICING ENGINE
Server-side pricing engine:
- input provider/model/task
- read verified provider economics
- apply approved markup
- return AI credit quote
- save estimate
- save actual cost after job
- compare estimated vs actual

Frontend receives only safe quote data.
No provider billing secrets exposed.

ADMIN ECONOMICS
Owner/admin should see:
- AI revenue
- confirmed credit purchases
- subscriptions
- provider cost
- infrastructure cost where available
- credits sold
- credits used
- credits held
- refunds/releases
- average cost per user
- average cost per generation
- most expensive models
- highest-failure models
- margin by provider
- margin by model
- margin by plan
- gross margin
- abnormal spend

If currencies differ:
- do not sum them into one fake revenue total without an FX/accounting policy

PRICING SAFETY
Never:
- include unlimited paid AI in Lifetime
- grant credits before confirmed webhook
- create duplicate Stripe Products/Prices
- invent provider pricing
- present a plan as live when Price ID/webhook is not configured
- auto-change public pricing without owner approval
- silently switch an expensive job to a much more expensive fallback model without approved routing policy

EVERYDAY TOOLS
- may have free/limited first use
- then upgrade/plan/limits
- do not confuse cheap/local tools with expensive paid AI provider operations

BLOCK 7 IS REALLY DONE ONLY WHEN
user
→ Stripe payment/subscription
→ verified webhook
→ AI credits granted
→ user starts AI task
→ credits reserved
→ real provider job
→ durable result
→ actual provider cost recorded
→ credits captured/released correctly
→ owner sees revenue/cost/margin
→ no duplicate billing
→ no duplicate paid generation
→ no unlimited-loss pricing
```

## Передача следующему агенту

- Последний подтверждённый этап: _B7-__ / статус_;
- Проверка/доказательство: _ссылка на коммит/CI/скрин/тест_;
- Что готово, но не опубликовано: _..._;
- Точный блокер следующего этапа: _..._;
- Следующее одно действие: _..._;
- Совместимость: _BASE, другие активные агенты, main, Render и DB_;
