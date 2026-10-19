# ГЛАВНАЯ ЦЕЛЬ

Перестрой существующий проект **Video Variator** в полноценную коммерческую AI Creative Platform по принципу BytePlus Lumina.

Это теперь основной продукт.

Текущий Video Uniquifier, бесплатные утилиты и остальные старые функции не удалять. Они должны сохраниться и продолжить работать, но перейти во **второстепенный раздел Tools / Utilities**.

Не создавать отдельный проект с нуля. Развивать существующий проект, используя уже подключенные:

- Render
- PostgreSQL
- Stripe
- текущую систему авторизации
- существующую пользовательскую базу
- существующие функции Video Variator

Ничего работающего не ломать.

Работать через отдельную feature-ветку. Перед изменениями проверить текущую архитектуру, существующие миграции, незавершенные изменения других веток и не перезаписывать чужую работу.

---

# 1. КАКИМ ДОЛЖЕН СТАТЬ ПРОДУКТ

По структуре, принципу навигации и пользовательскому сценарию ориентироваться на текущую BytePlus Lumina.

Главная логика платформы:

**Canvas → AI Agents → AI Apps → Inspiration**

Плюс отдельные AI-инструменты:

- Image Generation
- Image Editing
- Video Generation
- Image to Video
- Text to Video
- Product Video
- Avatar / Digital Human
- Voice / Audio
- Templates
- History
- Credits
- Pricing
- Account

Структуру и расположение крупных элементов можно делать максимально близкими по логике к Lumina.

Но:

- не копировать логотип Lumina;
- не копировать фирменные изображения и графику BytePlus;
- не использовать их исходный код;
- не копировать длинные маркетинговые тексты слово в слово;
- создать свой бренд, цвета, типографику, карточки, иконки и тексты.

Пользователь должен ощущать, что это самостоятельный продукт, но пользоваться им должно быть так же просто.

---

# 2. ПРИОРИТЕТ ГЛАВНОЙ СТРАНИЦЫ

Новая AI-платформа должна стать `/` — главной страницей проекта.

Video Uniquifier больше не должен быть главным экраном.

На главной сделать примерно такую структуру:

### Header

Слева:

- наш логотип;
- название платформы.

Основная навигация:

- Create / Canvas
- AI Apps
- AI Agents
- Inspiration
- Tools
- Pricing

Справа:

- количество кредитов;
- Upgrade / Buy Credits;
- аватар пользователя;
- меню аккаунта.

На мобильной версии — компактное меню.

---

# 3. HERO / CANVAS

Первое, что должен видеть пользователь, — большой AI creation workspace.

Цель: человек сразу понимает, что он может что-то создать.

Добавить:

- большое поле Prompt;
- Upload / Add reference;
- drag-and-drop;
- выбор Image / Video;
- выбор типа генерации;
- кнопку Generate;
- быстрые presets/templates.

Если выбран Image:

показывать настройки изображения.

Если выбран Video:

показывать настройки видео.

Не перегружать интерфейс.

Advanced settings можно скрывать под отдельной кнопкой.

---

# 4. IMAGE GENERATION

Создать полноценный Image Generator.

Первым основным провайдером использовать **BytePlus ModelArk / Seedream**.

Архитектуру НЕ привязывать напрямую к Seedream.

Использовать общий provider interface.

Функции первого этапа:

- Text → Image
- Image → Image
- несколько reference images, если выбранная модель поддерживает;
- image editing;
- aspect ratio;
- resolution;
- количество результатов;
- prompt;
- negative prompt только если модель это поддерживает;
- seed, если поддерживается;
- history;
- download;
- regenerate;
- reuse prompt.

Для параметров всегда проверять возможности конкретной модели.

Не отправлять модели неподдерживаемые параметры.

---

# 5. VIDEO GENERATION

Это одна из главных функций платформы.

Первый основной движок:

**BytePlus ModelArk → Dreamina Seedance**

Архитектуру делать через provider abstraction.

Поддержать:

- Text → Video
- Image → Video
- reference image;
- reference video;
- reference audio, если модель поддерживает;
- aspect ratio;
- duration;
- resolution;
- camera / motion options, если поддерживаются;
- prompt;
- Generate.

Статусы генерации:

`queued`

`running`

`succeeded`

`failed`

`cancelled`

Пользователь не должен ждать с открытой страницей.

Он может уйти с генератора, а задача должна продолжаться на сервере.

После возвращения результат должен находиться в History.

---

# 6. BYTEPLUS — ПЕРВЫЙ PROVIDER

Создать отдельный адаптер примерно такого уровня:

`BytePlusProvider`

Он не должен быть смешан с UI или бизнес-логикой.

Его ответственность:

- создать image generation request;
- создать video generation task;
- сохранить внешний task ID;
- проверять статус;
- принимать callback/webhook, если доступно;
- получать результат;
- обрабатывать provider errors;
- возвращать данные в общем внутреннем формате.

API key никогда не отправлять в frontend.

Хранить только в environment variables / secrets.

---

# 7. ОБЯЗАТЕЛЬНЫЙ AI PROVIDER ROUTER

Это критически важно.

Не делай:

`frontend → BytePlus`

и не делай бизнес-логику жестко привязанной к BytePlus.

Нужно:

`frontend → our backend → AI Provider Router → provider adapter`

Создать общий интерфейс примерно такой логики:

`generateImage()`

`generateVideo()`

`getJobStatus()`

`cancelJob()`

`estimateCost()`

`normalizeResult()`

Дальше отдельные реализации:

`BytePlusProvider`

позже:

`FalProvider`

`ReplicateProvider`

`GoogleProvider`

`AlibabaProvider`

и любые другие.

---

# 8. FALLBACK

BytePlus должен быть первым provider.

Но в архитектуре сразу предусмотреть fallback.

Пример:

Primary:

`BytePlus`

Fallback:

`Provider B`

Если основной provider:

- недоступен;
- timeout;
- перегружен;
- возвращает временную ошибку;
- конкретная модель отключена;

система может отправить задачу резервному provider.

Но только если резервная модель действительно выполняет сопоставимую функцию.

Не переключать автоматически модели с сильно отличающимся качеством или ценой без контроля.

---

# 9. PROVIDER CONFIG В АДМИНКЕ

Сделать админ-настройки, чтобы в будущем мы могли менять движок без изменения frontend.

Например:

Video primary provider:
`BytePlus`

Image primary provider:
`BytePlus`

Video fallback:
`None / provider`

Image fallback:
`None / provider`

Также:

- enable / disable provider;
- enable / disable model;
- priority;
- markup;
- internal cost;
- maintenance mode.

Цель:

если через полгода другой сервис станет дешевле или лучше, мы должны иметь возможность поменять provider практически одной настройкой.

---

# 10. DATABASE: GENERATION JOBS

Создать отдельную нормальную сущность для AI generation job.

Хранить минимум:

- id
- user_id
- type
- provider
- model
- provider_task_id
- status
- prompt
- settings
- created_at
- started_at
- completed_at
- failed_at
- error_code
- error_message
- input_assets
- output_assets
- estimated_cost
- actual_cost
- credits_reserved
- credits_charged
- duration
- metadata

Не хранить все хаотично в одном JSON, если поле нужно будет использовать для аналитики.

JSON использовать только для гибких provider-specific metadata.

---

# 11. STORAGE

Нельзя полагаться только на временную файловую систему Render.

Нужно подготовить нормальное object storage для:

- пользовательских uploads;
- generated images;
- generated videos;
- thumbnails;
- reference media.

Подойдет S3-compatible storage.

Важно:

если AI-provider возвращает временную ссылку на результат, после успешной генерации файл нужно автоматически забрать и сохранить в нашем storage.

Не оставлять пользовательский результат зависимым от временной provider URL.

---

# 12. BACKGROUND JOBS

AI generation нельзя держать внутри одного долгого HTTP request.

Нужно сделать background processing.

Схема:

пользователь нажимает Generate.

Backend:

1. проверяет пользователя;
2. проверяет кредиты;
3. создает job;
4. резервирует кредиты;
5. отправляет generation request;
6. сохраняет external task ID;
7. возвращает пользователю внутренний job ID.

После этого worker / callback:

- обновляет статус;
- получает готовый файл;
- сохраняет файл;
- считает фактическую стоимость;
- списывает кредиты;
- возвращает лишний резерв, если нужно;
- обновляет History.

---

# 13. CREDIT SYSTEM

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Коммерческий канон — Block 7 (см. DEEPSYQ_ROADMAP.md); Issue #182: AI-вызовы только на КУПЛЕННЫЕ кредиты, никаких стартовых бесплатных AI-кредитов/Free plan. Далее — исторические примеры.


Создать собственную систему внутренних кредитов.

Пользователь НЕ должен видеть себестоимость BytePlus.

Он видит только:

`1,000 Credits`

`Generate — 80 Credits`

и т.д.

Не задавать окончательные цифры пока мы не посчитаем себестоимость моделей.

Но архитектуру сделать сейчас.

---

# 14. CREDIT LEDGER

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Канон ledger только Block 7; строка «promotional credits» ниже ИСТОРИЧЕСКАЯ, не разрешает бесплатные AI grants и не создаёт второй wallet.


Не хранить баланс только одним числом.

Сделать ledger.

Типы операций:

- purchase;
- subscription grant;
- generation reserve;
- generation charge;
- refund;
- admin adjustment;
- promotional credits;
- expiry, если когда-нибудь понадобится.

Каждая операция должна иметь:

- transaction ID;
- user;
- amount;
- reason;
- job ID;
- Stripe reference, если есть;
- timestamp.

Так мы всегда сможем понять, куда пропали кредиты.

---

# 15. РЕЗЕРВ КРЕДИТОВ

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** См. единый Block 7 и purchased-only Issue #182, НЕ создавать дополнительный reserve/credit service или таблицу.


Перед генерацией:

если ориентировочная цена 100 credits:

зарезервировать 100.

Если generation failed до выполнения:

вернуть credits.

Если реальная стоимость требует меньше:

списать фактическое и освободить остаток.

Не допускать двойного списания при повторном webhook или retry.

Все операции должны быть idempotent.

---

# 16. STRIPE

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** См. только Block 7: один Stripe; будущий Trial $0.99 НЕ активировать до решения владельца (срок, кредиты, renewal, refunds, повторные регистрации).


Использовать уже подключенный Stripe.

Пользователь платит НАМ.

Не отправлять пользователя оплачивать BytePlus напрямую.

Подготовить два вида покупки:

### Subscription

Например:

Basic

Pro

Business

### Credit Packs

Например:

Small

Medium

Large

Точные цены и количество кредитов определить позже после расчета unit economics.

После Stripe payment success через webhook начисляются credits.

Не начислять кредиты только потому, что frontend показал `payment completed`.

Источник истины — подтвержденный Stripe webhook.

---

# 17. UNIT ECONOMICS

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Канон экономики/наценок/кредитов только Block 7; исходные числовые примеры ниже сохранены как история.


Для каждой generation сохранять внутреннюю себестоимость.

Нам нужно потом видеть:

- сколько пользователь заплатил;
- сколько credits потратил;
- сколько AI provider взял с нас;
- инфраструктурную стоимость;
- gross margin.

Добавить возможность задавать markup.

Например:

`customer_price = provider_cost × markup`

Но frontend должен работать только с credits.

---

# 18. PRICING ENGINE

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Единый pricing engine в Block 7, не создавать второй каталог/таблицу цен или PR.


Не hardcode стоимость generation непосредственно в React-компонентах.

Создать pricing service.

Стоимость должна зависеть от:

- provider;
- model;
- resolution;
- duration;
- quantity;
- generation type;
- premium features.

Например:

5-second video может стоить одно количество credits.

10-second — другое.

1080p — другое.

---

# 19. AI APPS

Сделать отдельную страницу AI Apps.

Это готовые сценарии, где человеку не нужно самому писать сложный prompt.

Карточки, например:

- Product Video
- Product Photo
- Fashion Ad
- Social Ad
- Talking Avatar
- Photo Animation
- Image Enhancer
- Background Replace
- Short Video
- UGC Ad
- Ecommerce Creative

При нажатии открывается готовый workflow.

---

# 20. PRODUCT VIDEO

Это важно для нашей коммерческой аудитории.

Workflow:

пользователь загружает:

- фото товара;
- при необходимости несколько фотографий;
- optional logo;
- optional product name.

Выбирает:

- рекламный стиль;
- формат;
- продолжительность.

Мы автоматически создаем хороший internal prompt.

Пользователь не обязан уметь писать prompt.

---

# 21. AI AGENTS

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** ЭТАП 1 — workflow-сценарии; полный автономный Agent Orchestrator только после LIVE_VERIFIED BASE §51. Канон стадий Block 2; credits/Trial — Block 7 и Issue #182.


Создать страницу Agents.

На первом этапе Agents могут быть workflow-based, не обязательно полноценные автономные агенты.

Например:

`Product Ad Agent`

Пользователь дает фотографии товара.

Agent:

- анализирует;
- предлагает рекламную концепцию;
- готовит prompt;
- создает изображения;
- создает видео.

Другие будущие агенты:

- Etsy Product Agent
- Shopify Ad Agent
- Social Content Agent
- UGC Agent

Архитектуру сделать расширяемой.

---

# 22. INSPIRATION

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Единый канон Inspiration И шаблонов — Block 3 (одна существующая таблица/каталог). Ниже история UX, НЕ разрешение на дублирование. Примеры только собственные/доказанно бесплатно созданные или явно маркированные placeholders, никакой платной генерации без разрешения.


Сделать Inspiration / Discover.

Это визуальная лента примеров.

Карточка содержит:

- preview;
- тип;
- стиль;
- кнопку `Try this`;
- при возможности prompt/template reference.

Нажатие `Try this` открывает Canvas с уже заполненными параметрами.

---

# 23. TEMPLATES

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Канон шаблонов — исключительно Block 3. Сохранённые ниже поля — историческая схема; Studio (Block 4) только показывает/использует её, не заводит второй набор.


Создать нормальную template system.

Не hardcode каждую карточку отдельным компонентом.

Template должен иметь:

- id;
- title;
- slug;
- category;
- description;
- thumbnail;
- generation type;
- prompt template;
- default model;
- required input types;
- default settings;
- active;
- featured;
- sort order.

---

# 24. HISTORY

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Канон History и My Creations — Block 4, поверх текущих job-таблиц, с user_id isolation. Оригинальная история UX ниже не создаёт отдельного History storage или PR.


Создать красивую History page.

Фильтры:

- All
- Images
- Videos
- Failed
- Processing

Карточка generation:

- preview;
- prompt;
- дата;
- модель;
- status;
- credits;
- Download;
- Reuse;
- Regenerate;
- Delete.

---

# 25. MY CREATIONS

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** См. только Block 4: одна общая user-owned Workspace/History/My Creations библиотека; второй проектной БД нет.


Пользователь должен иметь свою библиотеку результатов.

Не показывать чужие результаты.

Все database queries должны быть scoped по user_id.

---

# 26. CANVAS

Canvas должен стать центральным творческим рабочим пространством.

На первом этапе не нужно делать Photoshop.

Нужно сделать удобный генерационный workspace:

- references;
- prompt;
- settings;
- preview;
- generated results;
- regenerate;
- continue from result.

В дальнейшем можно добавить:

- variations;
- extend;
- edit region;
- replace background;
- object edit.

---

# 27. СТАРЫЙ VIDEO UNIQUIFIER

Ничего не удалять.

Перенести его в:

`Tools`

например:

`Tools → Video Uniquifier`

Он должен продолжать поддерживать существующие режимы.

Текущие пользовательские данные и история не должны исчезнуть.

---

# 28. БЕСПЛАТНЫЕ ИНСТРУМЕНТЫ

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Дополнительно: даже разрешённый дневной cap на облачный Everyday Tool **НЕ обходит Issue #182**: платный cloud AI-provider запрещён до приобретения пользователем AI-кредитов; иначе только локально или действительно бесплатный облачный инструмент без расходов.


**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Everyday Tools доступны БЕСПЛАТНО ЕЖЕДНЕВНО, пока локальны и не тратят облачный платный AI. Если платный облачный вызов необходим — локальная альтернатива ИЛИ жёсткий лимит на день/пользователя с отказом без любых списаний; иначе BLOCKED. Это НЕ бесплатный AI-план.


Существующие и запланированные utilities также собрать в Tools.

Например:

- Photo → PDF
- Collage
- Hide / Blur Sensitive Data
- Video → Audio
- Audio Trimmer
- Photo Compression
- Video Compression
- Background Remover
- Teleprompter
- OCR
- Text → Audio

Они не должны занимать главный hero.

Они повышают SEO, retention и приводят бесплатный трафик, но основной заработок — AI generation.

---

# 29. НАВИГАЦИЯ

Предлагаемая итоговая структура:

`Home`

`Canvas`

`AI Apps`

`AI Agents`

`Inspiration`

`Tools`

`Pricing`

Пользовательское меню:

`My Creations`

`History`

`Credits`

`Billing`

`Settings`

`Logout`

---

# 30. MOBILE / ANDROID / IPHONE

Все новые страницы делать responsive.

Платформа должна нормально работать:

- desktop;
- Android browser;
- iPhone Safari;
- PWA / приложение, если текущая архитектура это поддерживает.

Не делать desktop-first компоненты, которые ломаются на телефоне.

---

# 31. UX ГЕНЕРАЦИИ

После Generate пользователь должен сразу понимать:

- задача принята;
- сколько credits зарезервировано;
- статус;
- можно ли закрыть страницу.

Не блокировать интерфейс длинным spinner.

Показывать понятные состояния.

Например:

`Queued`

`Generating`

`Finalizing`

`Ready`

`Failed`

---

# 32. ERROR HANDLING

Не показывать пользователю сырые API ошибки вроде:

`HTTP 429`

или:

`ModelArk.InvalidParameter`

Преобразовывать их в нормальные сообщения.

Например:

`The AI service is temporarily busy. Your credits were not charged.`

В технических логах сохранять оригинальную ошибку.

---

# 33. RETRY

Retry делать осторожно.

Не запускать второй платный generation request автоматически, если неизвестно, был ли первый принят provider.

Перед retry проверять external task status.

Использовать idempotency, где возможно.

---

# 34. RATE LIMITING

Обязательно добавить server-side limits.

Нельзя позволять пользователю одновременно создать сотни дорогостоящих задач.

Лимиты можно делать по:

- account;
- plan;
- generation type;
- concurrency.

---

# 35. SECURITY

Проверить:

- authorization;
- IDOR;
- upload validation;
- file type;
- file size;
- MIME type;
- signed URLs;
- API keys;
- admin permissions;
- Stripe webhook signature;
- callback security;
- database permissions.

Никогда не отдавать provider keys клиенту.

---

# 36. PRIVACY

Пользовательские изображения и видео могут содержать личные данные.

Не логировать сами media-файлы без необходимости.

Не передавать AI-provider лишние персональные данные.

В Terms / Privacy позже явно описать использование внешних AI providers.

---

# 37. ANALYTICS ДЛЯ БИЗНЕСА

Нам нужна не только техническая статистика.

Собирать:

- registrations;
- first generation;
- paid conversion;
- trial → paid;
- generations/user;
- cost/generation;
- revenue/user;
- gross margin;
- failure rate;
- provider failure rate;
- average generation time;
- most used tool;
- most used model;
- credit purchases;
- churn.

---

# 38. ADMIN DASHBOARD

Добавить внутреннюю админку.

Минимально:

### Users

- search user;
- plan;
- credits;
- generation count;
- payments.

### Jobs

- status;
- provider;
- model;
- cost;
- duration;
- errors.

### Providers

- primary;
- fallback;
- enabled;
- disabled.

### Models

- active;
- inactive;
- internal price;
- markup.

### Credits

- manual add;
- subtract;
- reason.

### Templates

- create;
- edit;
- activate;
- feature;
- reorder.

---

# 39. PROVIDER PERFORMANCE

Для каждой модели собирать:

- average response time;
- failure rate;
- cost;
- jobs;
- retries.

Потом мы сможем автоматически выбирать лучший движок не «на глаз».

---

# 40. MODEL ROUTING

Создать внутренний model registry.

Frontend не должен отправлять физическое название provider model как единственный источник истины.

Например frontend отправляет:

`video_premium`

Backend решает:

сегодня:

`BytePlus Seedance X`

завтра:

другая модель.

Это позволит нам менять движок без обновления интерфейса.

---

# 41. INTERNAL CAPABILITIES

Для каждой модели сохранить capabilities:

- text_to_video;
- image_to_video;
- video_reference;
- audio_reference;
- max_duration;
- resolutions;
- aspect_ratios;
- image_refs_max;
- watermark options.

UI должен показывать только реально поддерживаемые настройки.

---

# 42. BYTEPLUS OUTPUT

У BytePlus generation jobs асинхронные.

Обязательно корректно сохранять provider task ID.

После `succeeded` скачать итоговый файл в наш storage.

Не полагаться на внешний URL как на постоянное хранилище.

---

# 43. PRICING PAGE

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Текущие коммерческие условия исключительно в Block 7; NO Free AI plan. Trial $0.99 — концепция платного входа, НЕ активирован, кредиты/срок/другие условия ещё не утверждены.


Сделать свою страницу Pricing.

Не копировать цены Lumina.

Сделать нашу экономику.

Структурно можно использовать понятную SaaS-модель:

Basic

Pro

Business

и Buy Credits.

Карточки должны показывать:

- monthly credits;
- приблизительное количество generations;
- доступные функции;
- priority;
- quality;
- watermark policy;
- commercial use, только если юридически это действительно разрешено.

Не писать неподтвержденные обещания.

---

# 44. FREE PLAN

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** **Free AI plan ОТМЕНЁН.** Сохранённый ниже исторический текст ~~Free режим / стартовый credit balance / free limit~~ НЕ ДЕЙСТВУЕТ и НЕ разрешает включить welcome grants. Вместо этого: Everyday Tools бесплатно каждый день по ограничению локально/нулевой cloud cost; вход в платный AI = планируемый Trial $0.99, строго ПОСЛЕ отдельного утверждения условий и подтверждённой покупки по Issue #182. Канон — Block 7.


Предусмотреть ограниченный Free режим для acquisition.

Например:

- небольшой стартовый credit balance;
- ограничения качества;
- ограниченная очередь.

Точные числа позже.

Нельзя дать такой free limit, чтобы bot abuse мог создавать нам большие расходы.

---

# 45. ONBOARDING

После регистрации показать простой onboarding.

Например:

`What do you want to create?`

Image

Video

Product Ads

Avatar

После выбора вести человека сразу в подходящий workflow.

Не заставлять изучать весь интерфейс.

---

# 46. HOMEPAGE CONVERSION

Главная должна продавать создание контента, а не объяснять технологию.

Основной CTA:

`Create`

Дополнительный:

`Explore templates`

Нужно быстро показать:

- что можно сделать;
- примеры;
- скорость начала работы;
- разные use cases.

---

# 47. НЕ ПОКАЗЫВАТЬ BYTEPLUS КАК НАШ ПРОДУКТ

В обычном пользовательском UI не делать BytePlus главным брендом.

Пользователь покупает сервис у нас.

Provider — внутренняя техническая реализация.

Если лицензия или Terms provider требуют attribution, выполнить эти требования.

---

# 48. НЕ ЛОМАТЬ PRODUCTION

Перед merge:

- migrations проверить на staging;
- backup database;
- проверить Stripe webhooks;
- проверить existing login;
- проверить current subscriptions;
- проверить Video Uniquifier;
- проверить mobile;
- проверить rollback.

---

# 49. МИГРАЦИИ

Любые изменения PostgreSQL делать через migrations.

Не редактировать production schema вручную, если это можно сделать migration.

Migration должна быть backward-safe насколько возможно.

---

# 50. FEATURE FLAGS

Новые AI-инструменты желательно включать feature flags.

Например:

`AI_IMAGE_ENABLED`

`AI_VIDEO_ENABLED`

`AI_AGENTS_ENABLED`

`AI_APPS_ENABLED`

`BYTEPLUS_ENABLED`

Так мы сможем запускать постепенно.

---

# 51. ПЕРВАЯ ВЕРСИЯ, КОТОРУЮ НАДО ДОВЕСТИ ДО РАБОТЫ

Не пытайся одновременно закончить 40 AI-инструментов.

Первый реально рабочий коммерческий vertical slice должен быть:

**Новая Lumina-like главная**

→ Login

→ Credits

→ Canvas

→ Text/Image to Image

→ Text/Image to Video

→ BytePlus Provider

→ Generation Job

→ History

→ Download

→ Stripe credits

→ Admin provider switch

→ существующие Tools продолжают работать.

Когда это стабильно, расширять AI Apps и Agents.

---

# 52. ПОСЛЕДОВАТЕЛЬНОСТЬ РАБОТЫ

Работай в таком порядке:

1. Провести аудит существующего проекта и написать краткую карту текущей архитектуры.

2. Создать feature branch.

3. Создать новый layout и navigation для AI-platform.

4. Перенести Video Uniquifier и utilities в Tools, пока без удаления старой логики.

5. Сделать таблицы generation jobs, provider models, credit ledger и templates.

6. Сделать AI Provider Router.

7. Реализовать BytePlus provider.

8. Сделать image generation end-to-end.

9. Сделать video generation end-to-end.

10. Сделать object storage и permanent result storage.

11. Сделать background jobs / callback processing.

12. Сделать History / My Creations.

13. Сделать credit reservation / charge / refund.

14. Интегрировать Stripe credits.

15. Сделать новую Home / Canvas / Apps / Agents / Inspiration структуру.

16. Сделать admin provider/model management.

17. Добавить analytics/cost tracking.

18. Сделать mobile testing.

19. Сделать staging deployment.

20. Провести полный regression test старых функций.

21. Только после проверки готовить production deployment.

---

# 53. ЧТО НЕ НУЖНО СЕЙЧАС ДЕЛАТЬ

**ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. [DECISIONS.md](../DECISIONS.md).** Сохранённый ниже запрет автономного фреймворка выполняется поэтапно: Block 2 = готовые workflows (BASE §21), Block 5 = LITE uptime/Stripe/cost anomaly/email; полный оркестратор/автоинструменты только после LIVE_VERIFIED §51 и отдельного допуска.


Не тратить время сейчас на:

- десятки providers;
- сложный Photoshop editor;
- полноценный autonomous agent framework;
- marketplace;
- социальную сеть;
- слишком сложную multi-user enterprise систему.

Сначала должна заработать коммерческая цепочка:

**user → credits → AI generation → result → our margin**

---

# 54. КРИТЕРИИ ГОТОВНОСТИ ПЕРВОГО ЭТАПА

Первый этап считается готовым только если новый пользователь может:

1. зарегистрироваться;

2. увидеть новую AI-oriented homepage;

3. получить или купить credits;

4. открыть Canvas;

5. загрузить изображение;

6. написать prompt;

7. создать изображение;

8. создать видео;

9. закрыть страницу во время обработки;

10. позже открыть History;

11. получить готовый результат;

12. скачать его;

13. увидеть корректное списание credits;

14. при failed generation получить credits обратно;

15. продолжить пользоваться старым Video Uniquifier через Tools.

Администратор при этом должен видеть:

- какой provider был использован;
- какую модель;
- provider task ID;
- статус;
- себестоимость;
- списанные credits;
- ошибку, если она была.

---

# 55. ЧТО НУЖНО ВЕРНУТЬ МНЕ ПОСЛЕ ПЕРВОГО ПРОХОДА

Не ограничивайся сообщением «готово».

Верни отчет:

### Current architecture

Что сейчас есть.

### Changes made

Какие файлы и модули изменены.

### Database

Какие migrations добавлены.

### New environment variables

Что нужно добавить в Render.

Не показывай значения секретов.

### BytePlus

Что уже подключено и протестировано.

### Stripe

Что изменено.

### Remaining blockers

Что мешает закончить end-to-end flow.

### Tests

Что реально протестировано.

### Deployment

Что уже можно безопасно публиковать, а что еще нельзя.

### URLs / Screens

Дай ссылки на staging/demo, если они существуют.

---

# ФИНАЛЬНОЕ ПРАВИЛО АРХИТЕКТУРЫ

Не строить «сайт вокруг BytePlus».

Строить **нашу AI-платформу**, где BytePlus сейчас является первым поставщиком вычислений.

Если завтра BytePlus станет дороже, хуже или недоступен, мы должны заменить его другим provider без переделки сайта и без изменения пользовательского сценария.

Основная бизнес-цель:

**пользователь покупает AI creation у нас, а мы внутри автоматически выбираем движок с оптимальным соотношением качества, цены, скорости и надежности.**

Именно под эту цель строить всю систему.