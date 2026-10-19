# DEEPSYQ ROADMAP — approved next product phase

> **2026-10-17 — IMPORTANT: THE ROADMAP HAS EIGHT BLOCKS.** The original seven separate owner TXT Blocks 1–7 remain unchanged, and the owner approved a distinct **Block 8 — Virtual Pet Companion / «Волшебный нюх»** on 2026-10-16. The [complete Block 8 source TXT](DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_8.txt) (1,134 lines) entered `deepsyq-platform` through [PR #188](https://github.com/mvryhan-web/video-variator-android/pull/188); see [Issue #187](https://github.com/mvryhan-web/video-variator-android/issues/187). **This registration does NOT mean the virtual pets/animations are implemented or allowed into production.** Block 8 is a post-first-MVP independent roadmap workstream and may not interrupt A–D's existing BASE claims. Four owner-locked priorities remain unchanged.

## OWNER POSITIONING CLARIFICATION — global AI platform (2026-10-17)

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Ранее написано, что оригинальные Block1–7 TXT «byte-identical»; на дату 18 октября владелец **прямо разрешил** добавить датированные пояснения к исходникам без удаления исходных слов. Кроме того, для бесплатных Everyday Tools дневной cap **не разрешает платный AI-provider вызов без купленных credits (Issue #182)**. Историческая фраза ниже сохранена, но не является текущей версией политики.


**Read [`DEEPSYQ_GLOBAL_POSITIONING_REVENUE_VISUAL_SEO.md`](DEEPSYQ_GLOBAL_POSITIONING_REVENUE_VISUAL_SEO.md) before selecting a feature, writing Home/SEO copy or describing target customers.** Deepsyq is a worldwide AI creative platform built for image, video, voice, Canvas, agents, apps, inspiration and creation workflows — **not a single-storefront or single-marketplace solution**. Any individual advertisement or listing example is optional creative output, NOT the platform's identity, homepage, SEO target or default monetization. This editable derived roadmap removes marketplace-specific examples; **the seven earlier original owner TXT files remain byte-identical, while the separate eighth approved TXT is now recorded** and still govern technical scope. Preserve existing unfinished branches and original BASE 55 without claiming the user approved deletion of their requirements. Focus visual Home/real 13-video showcase, first secure paid Image/Video vertical slice, global SEO/AI-search and genuine conversion; no automatic paid AI or production changes.


This file preserves the approved future product requirements so new agents do not lose them.

## Integration and release destination (owner instruction, 2026-10-15)

**One canonical release branch: `main` for BASE and approved Blocks 1–8 (each only after its acceptance, dependencies and explicit release approvals).** The eight blocks are roadmap components of the same Deepsyq app, not separate permanent branches or separately deployed products. Agents may develop on isolated branches to avoid conflicts, but every completed, reviewed and tested block must be integrated into the shared BASE and ultimately merged into `main` after satisfying dependency and production-safety gates.

Use `AGENTS.md` and `PROJECT_STATUS.md` for the merge owner, PR links, current status, test evidence and deployment blockers. Track **feature code complete**, **merged to main** and **deployed/verified** as distinct states. Render follows `main` with automatic deploy, so a feature merge must not precede verified PostgreSQL continuity/backup and required migration, auth, billing, provider, compatibility and rollback checks. This rule does not authorize enabling paid features or changing production secrets.

## Priority and scope rule

Deepsyq is the main product and main dashboard. Video Uniquifier remains an existing secondary tool inside the platform.

**Do not begin these blocks until the currently active TXT/specification work is completed and verified, unless the owner explicitly changes priority.**

Before implementing any block:
- read `AGENTS.md`;
- read `PROJECT_STATUS.md`;
- inspect the current code;
- reuse existing working systems;
- do not duplicate database/auth/Stripe/router/pages/components;
- if part of a block already exists, extend/refine it instead of rebuilding it.

The target product structure includes, as appropriate: Ask Deepsyq, Compare AI, Agent, Inspiration, Studio, My Workspace, AI Apps, Everyday Tools, Video Tools, Pricing, History/credits/account.

---

# BLOCK 1 — Multi-AI Compare + Smart Model Routing

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Цены, кредиты и Trial относятся ТОЛЬКО к Block 7. Issue #182: каждый AI-вызов/синтез — только на подтверждённо КУПЛЕННЫЕ кредиты; никакого бесплатного AI или free allowances. Trial $0.99 пока отключён, срок/кредиты не утверждены.


## User experience

On the main AI screen, place **Smart** and **Compare AI** as clear adjacent modes.

- **Smart**: Deepsyq chooses the most suitable enabled model/provider for the task.
- **Compare AI**: one prompt is sent in parallel to multiple real enabled AI providers and results are shown separately.

Initial provider families to support through configuration, only when actually connected:
- OpenAI;
- Google Gemini;
- Anthropic Claude;
- Mistral AI;
- future provider slot hidden until connected.

Do not hard-code specific model versions into the UI or architecture.

## Compare behavior

- run 2–4 provider calls in parallel depending on plan/availability;
- stream or progressively show results where practical;
- partial provider failure must not destroy successful results;
- support timeout/fallback;
- allow Copy, Save, Continue with this answer;
- add **Combine into one best answer** to synthesize the strongest parts of successful responses;
- clearly identify which provider/model produced each result when appropriate.

## Smart routing

Never assume one provider is always best.

Route using configurable factors such as:
- task type/capability;
- measured historical quality by task category;
- reliability/error rate;
- latency;
- cost;
- context/window/tool requirements;
- plan restrictions.

Record enough telemetry to improve routing over time without exposing secrets.

## Billing

Track provider/model, tokens/usage, estimated/actual cost, credits consumed, status, duration and failure reason where available.

Trial $0.99 may receive a limited sample. No unlimited multi-provider usage unless economics are proven.

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Эта прежняя строка сохранена как ИСТОРИЯ; она НЕ означает одобренный allowance или активацию Trial. Только Block 7 после решения владельца и подтверждения покупки.


---

# BLOCK 2 — User Agent / “Do it for me”

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** ЭТАП 1 — готовые workflow-сценарии по BASE §21, явная цена/согласие, без автономного оркестратора. ЭТАП 2 — полнофункциональный оркестратор только ПОСЛЕ коммерческой цепочки BASE §51, подтверждённой LIVE_VERIFIED, и отдельной авторизации. Технические пункты ниже сохранены как будущее, не как обязательство стадии 1. Коммерция только Block 7; Issue #182.


Create a primary user-facing navigation item:

**Agent**

Main in-page message:

**Do it for me**

Concept:
“Tell Deepsyq what you want to achieve. Your AI Agent will plan the steps, choose the right AI models and tools, and prepare the result for you.”

## It must be an executor, not merely chat

Build/extend a shared **Agent Orchestrator** able to:
- understand a goal;
- make a multi-step plan;
- select appropriate AI providers/tools;
- execute steps asynchronously;
- track progress;
- retry/fallback safely;
- save outputs;
- prepare a final deliverable.

Example quick starts:
- Create an original multi-format creative content pack;
- Create a TikTok ad from product photos;
- Create a 30-second product promo;
- Create social-media content;
- Prepare an ad campaign.

For expensive workflows, show plan/cost estimate and request approval before high-cost steps.

Use existing auth, credits, provider router, jobs and Workspace. Do not build a second isolated agent stack.

Trial $0.99 gets limited agent usage. Track real costs.

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Предыдущее обещание Trial Agent allowance — ИСТОРИЧЕСКОЕ; ни бесплатного AI, ни утверждённых Trial credits пока нет. Trial не включать; смотреть Block 7.


---

# BLOCK 3 — Inspiration / Create Yours

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** ЕДИНСТВЕННЫЙ канон Inspiration + шаблоны: один уже существующий data-driven каталог/таблица шаблонов, без второй реализации или PR. Примеры — собственные, доказанно бесплатно сгенерированные без риска списаний или заглушки с явной пометкой; платную AI-генерацию примеров без согласия не запускать.


Build a rich, original **Inspiration** experience using Deepsyq-owned or properly licensed examples.

Do not copy Lumina protected assets, copy, branding, or exact visual design.

## Homepage

Show preview sections with strong examples and an Explore/View More route:
- AI Agent examples;
- AI Apps;
- Inspiration — Images / Videos;
- relevant categories.

## Full Inspiration

Provide a scalable data-driven gallery with:
- All / Images / Videos and useful category filters;
- multiple aspect ratios such as 1:1, 16:9, 9:16 when supported;
- attractive image/video previews;
- prompt/template metadata;
- search/filter where useful.

Actions:
- **Create yours**
- **Use this prompt**
- **Clone and Try**

The action must lead into the real Studio/Agent workflow with prompt/settings prefilled. Users can replace source assets with their own.

Do not show fake integrations or examples implying a workflow works when it does not.

---

# BLOCK 4 — Studio + My Workspace

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** ЕДИНСТВЕННЫЙ канон Workspace, History, My Creations — Block 4 на уже существующих таблицах generation jobs с проверкой владельца. Не создавать вторую таблицу проектов, History или второй PR. Studio только ПОКАЗЫВАЕТ шаблоны из единого Block 3, не хранит другой master-template каталог.


Keep these as two related but distinct concepts.

## Studio

Studio is the creation environment and library.

Core entry points:
- Create New Project;
- Recent Projects;
- Templates;
- Agent Skills;
- Image;
- Video;
- Tools;
- search/categories/filters.

Support relevant aspect ratios where the underlying model actually supports them.

Template categories may include:
- Product Ad;
- UGC Ad;
- Fashion;
- Beauty;
- Food;
- Jewelry;
- Automotive;
- Explainer;
- Social Media;
- Cinematic;
- Music Video.

Template card:
- Preview;
- Use this template.

Using a template must create/clone a user-owned project in My Workspace. Never edit the master template.

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Create/clone = пользовательское представление/связь поверх существующих jobs/Workspace, а НЕ новая база; оригинал шаблона хранит только Block 3.


## Agent Skills

Initial workflows:
- Create Product Ad;
- Create UGC Video;
- Create Social Media Content Pack;
- Create TikTok Ad;
- Turn Image into Video;
- Create Social Campaign;
- Create Explainer Video.

Actions:
- Preview;
- Use skill -> open Agent with the task prefilled.

## My Workspace

Personal project area with:
- Recent Projects;
- Drafts;
- Completed;
- Favorites;
- dates/status;
- preview;
- Rename;
- Duplicate;
- Archive;
- Delete with confirmation;
- Open/Continue.

Connect Workspace cleanly with Agent, Inspiration, AI Apps, Tools and History.

Reuse existing auth and database.

---

# BLOCK 5 — Internal Product Watcher Agent

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** ЭТАП 1 — LITE: доступность сайта, ошибки Stripe, аномальные расходы и EMAIL владельцу при проблемах; owner-only monitoring, БЕЗ автоматических критических изменений. ЭТАП 2 — остальные новости/рекомендации/автономизация из сохранённого списка ниже только после LIVE_VERIFIED BASE §51 и отдельного допуска. Это устраняет противоречие с BASE §53.


Create a separate owner/admin-only server-side background agent named **Product Watcher**.

This is not the same process or permission set as the user-facing Agent.

## Purpose

Product Watcher continuously/scheduledly helps keep Deepsyq current and healthy even when the owner’s computer is off.

It should monitor, where technically available:
- official provider/model announcements;
- model releases/deprecations;
- API pricing/limits;
- provider availability;
- production uptime/errors;
- job failures;
- Stripe/billing errors;
- broken links/workflows;
- template/skill health;
- AI usage and cost anomalies;
- product opportunities/recommendations.

Prefer official provider sources for factual provider/model/pricing changes. Mark unverified information as unverified.

## Admin UI

Owner-only Product Watcher page:
- ON/OFF;
- Pause/Resume;
- Run check now;
- Running/Paused/Error;
- Last check;
- Next check;
- recommendations;
- pending approvals;
- applied safe changes;
- alerts;
- history;
- costs.

## Change safety

Safe reversible metadata/content updates may be eligible for automation when explicitly allowed and fully audited.

Require owner approval for meaningful changes such as:
- adding/enabling a new provider/model;
- routing strategy changes;
- new workflows;
- major UI/product changes;
- pricing changes.

Never autonomously perform critical changes to Stripe, secrets, authentication, production database, domains, user data, or destructive production code.

Use active -> disabled -> archived rather than destructive deletion where appropriate.

## Required schedule — Europe/Paris

Schedule must be configurable and resilient to service restart.

- every 15 minutes: critical production health;
- every hour: provider errors, usage and cost checks;
- every 6 hours: official provider news/model/pricing changes;
- daily 06:00: content/template checks;
- daily 07:00: product discovery/recommendations;
- daily 08:00: **Deepsyq Daily Brief** with New / Changed / Problems / Costs / Recommendations / Pending approvals;
- Monday 09:00: **Weekly Product Audit** with High / Medium / Low priorities.

Use appropriate Render cron/background-worker infrastructure. Do not claim scheduling is active until the external service is actually deployed and tested.

Use persistent job/state storage so restarts do not silently lose work.

---

# BLOCK 6 — Deepsyq Voice Agent

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Voice/озвучка/AI-запросы только для оплативших пользователей на купленные кредиты из Block 7; бесплатных Voice AI requests, free first-win и бесплатного AI allowance НЕТ. Локальный scan без платного cloud AI может быть Everyday Tool, но не бесплатным голосовым тарифом. Trial $0.99 пока не включён.


Create one shared **Deepsyq Voice Agent** as a voice interface over the whole platform, not a separate AI product.

Final assistant name can be chosen later. Do not use JARVIS as the commercial product name and do not imitate a specific actor’s voice.

## Voice personality

Original Deepsyq voice:
- intelligent;
- calm;
- confident;
- premium;
- friendly;
- natural;
- optional light international/British character;
- not a clone of a real person.

Architecture must allow future voice choices without rewrites.

## First-time introduction

Do not unexpectedly autoplay speech on page load.

Show a clear onboarding such as:
- Meet your Deepsyq Assistant;
- Start voice introduction.

After user action, provide a short introduction explaining that the assistant can answer, use tools, create projects and perform agent tasks.

Offer:
- Ask me something;
- Try a quick task;
- Help me organize my device;
- Not now.

## Realtime conversation

Where the selected provider supports it:
- streaming audio;
- low-latency replies;
- interruption/barge-in;
- stop speaking when interrupted;
- conversation context;
- Voice <-> Text switching;
- transcript;
- Mute / Stop / End conversation.

Use the same Agent Orchestrator/tool layer:

Voice input -> realtime voice/model layer -> Agent Orchestrator -> allowed tool/API -> result -> voice response.

Do not fake tool execution.

## Voice access to Deepsyq

Examples:
- current information queries;
- Smart/Compare AI;
- “Combine the best answers”;
- open/continue Workspace project;
- create project;
- start Agent Skill;
- create TikTok/product ad;
- prepare an original creative content pack;
- image/video tasks;
- permitted Everyday/Video tools.

Destructive/external/financial/account-changing actions require confirmation.

## Device Cleanup / Storage Assistant skill

This is a skill of the same Voice Agent, not a separate seventh product.

Offer, after appropriate onboarding:
“Would you like me to check for duplicate photos/videos or unusually large files taking up space?”

Important:
- a website must never claim unrestricted access to a phone/computer;
- browser access is limited to files/folders the user explicitly selects through supported browser APIs;
- native Android/iOS/desktop uses official OS permission systems only;
- spoken “yes” does not replace an OS/browser permission dialog.

With permission, detect where technically possible:
- exact duplicate photos/videos;
- visually very similar media;
- large files/videos;
- old downloads;
- screenshots;
- blurry photos;
- repeated media;
- temporary/export files only when legitimately accessible.

Show scan results and estimated recoverable storage.

Never delete automatically.

Before deletion:
- show files/results;
- allow review/selection;
- prefer Trash/Recently Deleted when supported;
- require explicit final confirmation;
- estimate files and storage to be removed.

## First-win and monetization

Let a new/trial user experience a small useful amount of voice before upgrade:
- introduction;
- several voice exchanges;
- a small device scan where supported;
- a few AI/tool requests.

Track:
- realtime audio input/output;
- model usage;
- tool calls;
- Multi-AI calls;
- agent tasks;
- session duration;
- per-user allowance;
- monthly limits;
- idle timeout;
- real cost.

Trial $0.99 may include a limited Voice allowance. Do not advertise unlimited voice unless economics support it.

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Исторические free/first-win voice exchanges и Trial allowance выше ОТМЕНЕНЫ. Точные Trial-кредиты, срок, renewal/refunds/anti-abuse — вопросы владельцу; без решения ни один Voice AI-call не разрешён.


## Owner mode + Product Watcher

Keep Product Watcher technically separate with its own permissions, but allow the owner to talk to it through the Deepsyq Voice Agent in protected owner/admin mode.

Examples:
- “Read my Daily Brief.”
- “What changed overnight?”
- “What problems did you find?”
- “How much did AI APIs cost yesterday?”
- “What requires my approval?”

Voice Agent is only an authorized interface; it does not receive unrestricted root permissions.

Important changes still follow Product Watcher approval rules.

## Privacy

- always show when microphone is active;
- no hidden recording;
- no hidden file access;
- minimize raw-audio retention;
- clearly show when a scan/tool/external action is happening;
- follow platform permissions on web, Android and iOS.

## Future-compatible architecture

Prepare, without forcing immediate implementation:
- wake word;
- hands-free mode;
- proactive notifications;
- connected email/calendar/apps;
- desktop actions;
- car/wearable/smart-glasses integrations;
- future physical-device/robotics integrations.

---

# BLOCK 7 — Pricing, Credits, Stripe & Unit Economics

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Единственный коммерческий канон для BASE §§13–18/43–44, Blocks 1/2/6: НЕТ Free AI plan или стартовых бесплатных кредитов. AI вход — планируемый Trial $0.99, но НЕ активировать без срока/кредитов/продления/возвратов/защиты от повторов. Оплаченный, подтверждённый Stripe Trial = ПОКУПКА по Issue #182, не бесплатный допуск. Everyday Tools бесплатны КАЖДЫЙ ДЕНЬ при локальном выполнении/нулевом платном cloud AI; иначе нужна локальная замена или ЖЁСТКИЙ дневной per-user лимит с гарантией отсутствия списаний/перерасхода. Цены не менять.


Extend the existing billing foundation. Do **not** create a second Stripe integration, second customer system, or duplicate ledger.

## Existing systems to preserve

- existing Stripe account, Products/Prices, Checkout and verified webhook;
- existing Basic / Pro / Business / Lifetime products until the owner explicitly changes them;
- existing PostgreSQL user/account mapping;
- existing tool entitlements and Video Uniquifier billing;
- existing AI wallet / reservation primitives where appropriate.

## Required Deepsyq AI credit model

Add a commercial AI credit layer that is tied to real provider economics.

Support:
- subscription credit grants;
- one-time credit top-ups;
- per-generation quotes;
- atomic credit reserve before expensive work;
- capture after confirmed success;
- release/refund after confirmed failure;
- idempotent Stripe webhook fulfillment;
- provider/model usage and actual/estimated cost recording;
- gross-margin reporting.

Never expose provider cost as the customer-facing price. Users see Deepsyq credits.

Do not invent final credit prices until current provider pricing is verified.

## Stripe integration

Reuse the existing Stripe integration.

Customer payment -> verified existing Stripe webhook -> Deepsyq entitlement/credit grant.

Do not grant credits because the browser success page was reached.

Do not make users pay BytePlus/Google/OpenAI directly.

## Lifetime

Existing Lifetime rights for Everyday Tools / Video Uniquifier must not silently become unlimited paid AI generation.

AI credits remain separately metered unless the owner approves a financially safe allowance.

## Pricing engine

Pricing must be server-side/config-driven and able to vary by:
- provider;
- model;
- generation type;
- resolution/quality;
- duration;
- quantity;
- premium capabilities.

Keep provider/model prices replaceable without frontend rewrites.

Target architecture must support switching to a cheaper/better provider later without changing the user-facing credit workflow.

## Credit packs and subscriptions

Support subscriptions plus one-time top-ups. Lumina pricing may be used only as a market benchmark, not copied blindly.

Final packs, monthly grants and margins must be calculated from verified real provider costs.

## Business analytics

Owner/admin should be able to see:
- revenue;
- provider/API cost;
- gross margin;
- average cost per user;
- average cost per generation;
- most expensive providers/models;
- credit sales;
- reserved vs captured/refunded credits.

No false profitability estimates.

---

# BLOCK 8 — Virtual Pet Companion / «Волшебный нюх» (Magic Nose)

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Зависимости БЕЗ дублирования: user-owned Workspace/History/My Creations = Block 4; Inspiration/шаблоны = Block 3; купленные кредиты/Trial = Block 7. В Block 8 не создавать второй кошелёк/БД/History/таблицу/PR и не запускать платный AI без решения владельца.


**New owner-approved Block 8 (2026-10-16):** full source and exact requirements: [`DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_8.txt`](DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_8.txt). Tracking: [Issue #187](https://github.com/mvryhan-web/video-variator-android/issues/187); documentation-only source [PR #188](https://github.com/mvryhan-web/video-variator-android/pull/188).

- Optional friendly, original animated 3D **dog or cat** selected explicitly by the user; name, Calm / Playful / Off, accessible and nonintrusive behavior on mobile and desktop. No forced pet or hidden profiling.
- **«Волшебный нюх» / «Волшебный щит»:** 16 enumerated S01–S16 help/quality scenarios (draft recovery, prevent duplicate generation and unintended credit usage, safe format/capability hints, owned READY results and History). The first no-cost prototype demonstrates five scenarios; it is NOT a functioning production AI agent.
- Detailed design bible D0–D9 for original Blender geometry, editable rigs, animations and transparent sprites; executor steps P0–P7 include eventual agent-managed publication **only after owner review and explicit paid/security/production authorizations**. Any external specialists or payments require owner's separate consent; do not shift manual 3D production to the owner.
- **Current factual state:** approved specification merged; 3D assets, software integration and live pet are **NOT IMPLEMENTED**, and no dedicated agent is currently assigned. Do not interfere with active four BASE development claims; no paid AI tests; preserve owner-approved Home. Release of first Image/Video/Music/AI Chat MVP has priority.

---

# Shared acceptance principles for blocks 1–8

For every block:
- use real APIs only when actually connected;
- never fake success;
- support partial failure and recovery;
- keep secrets server-side;
- preserve existing production functionality;
- track provider usage/costs for paid AI;
- test desktop/mobile where relevant;
- update `PROJECT_STATUS.md` after implementation;
- do not mark DONE until verified;
- do not create duplicate systems when an existing system can be extended.
