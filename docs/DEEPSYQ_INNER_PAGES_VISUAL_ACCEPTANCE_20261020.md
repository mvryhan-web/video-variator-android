<!-- Owner 2026-10-20: former BASE §20 retired. Visual parity acceptance applies only to existing live pages; removed page is not a design target. Historical test data stays in Git history. -->

# DEEPSYQ — ИНТЕРЬЕРНЫЕ СТРАНИЦЫ В СТИЛЕ УТВЕРЖДЁННОЙ HOME
## Owner screenshot verified / visual acceptance proposal / 20 Oct 2026

**Статус: DESIGN PROPOSAL — NOT IMPLEMENTED.** Документ описывает минимальные адресные исправления по исходному коду. Это не разрешение менять HOME, не фиктивный pixel-perfect PASS и не команда запускать платные AI. Все фактические действия по коду только после согласования визуального предложения владельцем, проверки актуального DEV SHA и claims.

### 0. Проверенный эталон — без домыслов

- Ранее утверждённый файл: `Неоновая главная Deepsyq с портретом(4).png`.
- Повторно предоставлен владельцем в координационном чате как `Неоновая главная Deepsyq с портретом(7).png`.
- **Побайтово вычисленный SHA-256 второго файла: `be30d8ed55cd7b1c6c584cecfe13d3012f2d2150ae48546b8bd6b215db709388`. Это ТОЧНО ожидаемый SHA в [каноне](DEEPSYQ_OWNER_VISUAL_REFERENCE.md).** 1448 × 1086 px, RGBA PNG. Номер в имени файла — не изменение макета.
- Фактические пиксели проверены в пользовательском вложении. **PNG не размещён в этом GitHub-репозитории**; никакая сторона, читающая только GitHub, не может заявить реальный pixel-perfect screenshot comparison с недоступным PNG.
- Уже внедрённая общая тема `app/src/main/assets/deepsyq-global-theme.css` и navigation `deepsyq-site-shell.js` — **исходная база, не переписывать**, как и ранее объединённые PR276, PR281, PR301, PR304, PR302.
- Бинарный файл не подменять похожим из Gallery/Library и не генерировать новый «референс».

### 1. Изображение: визуальные неизменные признаки

**Что видно в эталоне:** фон очень тёмного navy/почти чёрного, ощущение глубины с мягкими синими световыми пятнами; слева фиксированный узкий список с группами **Creation / Tools / Library / Community** и выделенной синей/фиолетовой Home; сверху компактный header с логотипом, поиском, действиями Credits/Pricing/Promo Code; большие изображения и собственно видео в карточках; тонкие электрические синие/cyan/фиолетовые обводки; насыщенные **violet→magenta→cyan** свечения на промпт-поле и CTA; скруглённые контейнеры; чёткий белый текст и приглушённый серо-лавандовый пояснительный.

**Выборка пикселей оригинального PNG, а не объявленные design-token HEX** (координаты от левого верхнего угла, размер 1448×1086; локальная медиана RGB по 7×7 пикселей):

| Место оригинала | x,y | Измеренный цвет |
|---|---:|---|
| Пустая часть левой навигации | 110,335 | `#000b19` |
| Верхняя полоса между контролами | 300,30 | `#00091a` |
| Тёмная область контента | 195,695 | `#000a18` |
| Активная Home без текста | 101,91 | `#1b115e` |
| Глубокая синяя атмосфера под hero | 850,450 | `#011135` |
| Тёмная область поля создания | 1020,498 | `#021b39` |
| Тёмная область компактной AI-карточки | 310,620 | `#0e193e` |
| Тёмная область Upgrade-карточки | 110,888 | `#091a35` |

**Важно:** эти значения — лишь снятые цвета точек картинки с фотографиями, тенями и градиентами; это НЕ команда заменить всю палитру на один HEX, НЕ точная спецификация целого градиента и НЕ доказательство CSS-совпадения. Общий визуальный токен-контракт задаётся [каноном](DEEPSYQ_OWNER_VISUAL_REFERENCE.md), точность оценивается на реальных страницах.

### 2. Страница → конкретный имеющийся CSS / минимальный целевой результат

`SOURCE_GAP_CANDIDATE` = в исходниках есть прежняя палитра, видимый результат надо подтвердить снимком браузера. Не использовать `EXACT_MATCH` до сравнения скриншотов.

| Страница / существующий вход | Где именно остался legacy-стиль | Предлагаемое исправление, без переделки |
|---|---|---|
| **Image Studio** `generate-studio.html?studio=image` | `generate-studio.css`: `:root --bg:#090b10`, `.composer` #181b25/#12151d, референс-crop actions #243126, `.image-draft-bar` #17221d, `.history-filters button[aria-pressed=true]` #283020 | Сохранить страницу и редактор/историю; минимально перевести видимые панели, upload/draft/выбор модели и active/focus на существующую shared navy/neon систему. Убрать инородный мохово-зелёный, если он действительно побеждает в computed CSS |
| **Video Studio** `generate-studio.html?studio=video` | тот же CSS; `.video-background-controls` #18251f/#294132, фоны поповеров/диалогов и кнопок отличаются | Те же visual tokens для status/progress, video control panel, modal. **Не** менять работу server job, стоимость, consent, retry, Download или фоновые задачи |
| **AI Audio Studio** `generate-studio.html?studio=audio` | тот же CSS; `.primary` partly overridden общим CSS, но `.pill`, `.stage-tabs`, `.examples`, dialog/history — собственные цвета | Единые заголовки, карточки, активные tabs и обводки. Это **не** legacy Audio & Text tools, функциональность не смешивать |
| **Audio & Text Tools** `audio-studio.html` | `free-tools.css`, `theme.css`, `creator-pages.css` и общая тема наслаиваются; контролы/карточки частично живут в отдельных стилях | Проверить реальные результирующие цвета, оформить только отклонения. Рабочие MP3, TTS/STT, trim, copy/download, согласие и disabled states сохранить |
| **AI Apps** `ai-apps.html` | `ai-apps.css`: `--background:#100e1c`, `--panel:#1a1629`, `--panel-raised:#211a34`; собственные `.app-card`/filter/hover оттенки | Неподходящие фон/границы карточек и фильтров привести к общим navy/blue/violet/cyan; сохранить статус карточек и data-driven catalog |
| **Inspiration** `inspiration.html` | `inspiration.css`: body #111318, старые зелёные accent #d2f7ae и #172113 на части компонентов | Равномерные тёмно-синие карточки и яркие границы/CTA. **Не** менять лицензии, media, настоящие routes, prompt handoff |
| **Everyday Tools** `free-tools.html` | `free-tools.css`: `:root --bg:#080b12`, `--panel:#101624`, старый `system-ui`; плюс другие стили | Проверить computed cascade; выровнять визуально, но без изменения локальных файловых инструментов и пользовательской темы без разрешения |
| **History / My Creations** `generate-studio.html?view=history` | тот же `generate-studio.css`: `.history-card` #11141c, `.history-preview` #191e27, зелёный фильтр, `.credit-estimate` зелёный | Карточки, бейджи и tabs по общему Home, но оставить распознаваемые success/failure статусы и privacy/history ownership |
| **Pricing / Avatar / Account / остальные** | Глобальная тема может присутствовать, но готовый скриншот и computed styles в текущем аудите не проверены | **UNVERIFIED**, сначала снимок и список точных gaps; ничего слепо не перекрашивать и не менять payment/login |

### 3. Предлагаемая одинаковая система оформления

**Единое по всем страницам:** логотип и визуальный язык боковой навигации, сине-чёрные фоны, иерархия шрифтов, крупные тёмные медиа-карточки с мягким neon stroke и glow, активные blue/violet pills, видимые gradient CTA, тёмные input/select/dropzone, hover/focus и disabled states. Страница **может иметь другое содержимое и расположение инструментов**, но визуально должна быть частью того же продукта. Не добавлять на каждую страницу копию главной карусели, девушки или 12 сцен.

**Не обещать** фейковые синтезы, кредиты, отсутствующие модальные формы, кнопки/данные и не красить все кнопки одинаково независимо от их действия: destructive/disabled/success/error получают различимые безопасные состояния.

### 4. До/после — критерии реальной приёмки

1. Зафиксировать `CURRENT_DEV_HEAD`, Render preview `DEPLOYED_SHA` и актуального file owner; при несовпадении SHA preview с DEV — не выдавать результаты preview за текущий код.
2. Из текущего существующего UI снять **before** скриншоты desktop 1448/1280 и mobile 320/375/390/768 (Image, Video, AI Audio, Tools Audio в первую очередь), в тех же состояниях/при отключённом JS по необходимости.
3. Рядом с проверенным screenshot-портретом выделить **только доказанные** несовпадения: палитра, typography, CTA, media card/panel, navigation shell, active/hover/disabled, modal, мобильные отступы/наслоения.
4. **Показать владельцу визуальное предложение и получить согласие** до больших изменений. Оставить готовые header/sidebar/media/CTA без правок.
5. После согласия — A/C (или реальный current file owner) регистрируют точные claims/leases, исправляют только затронутые CSS-правила; без JS/backend/provider/Stripe/Home-правок. Никакого перекрывающего глобального CSS rewrite.
6. Сравнить **after** в тех же условиях; проверить keyboard/Escape/focus/contrast, Image/Video/Audio mode navigation, model picker, modal, Back, desktop/mobile, History/download, private account, free tool regression. Бесплатные Playwright/CI и точный SHA; D16 безопасный самостоятельный DEV merge после нужных peer gates.
7. Только **постфактум** ставить каждой странице `MATCHED_OWNER_VISUAL / VISUAL_GAP / UNVERIFIED` с before/after ссылками. `DONE` для дизайна только когда все живые маршруты реально подтверждены. Production/main отдельно не разрешены.

### 5. Состояние после принятия владельцем

Сейчас: **оригинальный PNG НАЙДЕН И SHA-256 ПОДТВЕРЖДЁН; визуальные несоответствия в исходных CSS идентифицированы; browser before/after НЕ ПРОВЕРЕНЫ, изменения CSS НЕ ВНЕСЕНЫ.** Следующий шаг: owner approves this scoped skin-matching proposal; C/A according to current claims perform smallest evidenced diffs with no-spend tests, then independent DEV preview screenshots. Просьба не объявлять «всё готово» на основании этого документа.

**Связанные ресурсы:** [owner visual source of truth](DEEPSYQ_OWNER_VISUAL_REFERENCE.md) · [Issue #298](https://github.com/mvryhan-web/video-variator-android/issues/298) · [BASE55 + F1–F8 plan](DEEPSYQ_BASE55_F1_F8_EXECUTION_PLAN_20261020.md) · [AGENTS.md](../AGENTS.md) · [DECISIONS.md D16/D17](../DECISIONS.md).
