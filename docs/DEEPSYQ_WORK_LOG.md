# DEEPSYQ TEST — журнал работы над рождественской темой

## 2026-11-14 — Подготовка TEST
- Проверена ветка `test`, оригинальный `#homeHeroCarousel`, стрелки видео и поле `#homeQuickBar`. Исходные элементы остаются без структурных изменений.
- Подготовлены изолированные `deepsyq-christmas.css` и `deepsyq-christmas.js`; Christmas включается лишь на `test.deepsyq.pages.dev` и localhost.
- Выбранный пользователем PNG загружен в хранилище изображений; TEST workflow скачивает и пересобирает responsive WebP (2560×1440 и 1080×1920).
- Встроены три темы через отдельный тестовый переключатель, без замены рабочей панели аккаунта.
- Добавлен защищённый workflow: до деплоя проверяет неизменность TEST HTML, исходного Worker и production Deployment ID; публикует только TEST, проверяет все файлы и API.
- Статус на момент коммита: **подготовлено, НЕ считать опубликованным до отдельного подтверждения GitHub Actions и Cloudflare TEST**.

## 2026-11-14 — Публикация Christmas в изолированном Cloudflare Preview (ПРОВЕРЕНО)

- **LIVE PREVIEW:** https://christmas-preview-20261114.deepsyq.pages.dev/?christmas=1 — отдельная preview-ветка Cloudflare `christmas-preview-20261114`, не стабильный `test.deepsyq.pages.dev`.
- Опубликован расширенный 3D-зимний фон, два проверенных WebP (desktop 2560×1440, mobile 1080×1920), динамический снег, снежные кромки, мини-персонажи, дым/фонарь, отдельный переключатель «Обычная / Soft Dark / Christmas».
- Безопасная публикация: [GitHub Actions #43648798637](https://github.com/mvryhan-web/video-variator-android/actions/runs/43648798637) завершилась успешно; Worker API `/api/config` и все сезонные assets были HTTP 200; неизменность production и канонического TEST проверена pipeline.
- Обнаружена и исправлена регрессия: при выборе Soft Dark удалялся сам переключатель. Точечная правка `deepsyq-christmas.js` — элемент переключателя сохраняется вне массива временных снежных объектов; коммит [4e695d3](https://github.com/mvryhan-web/video-variator-android/commit/4e695d3e05d1cdc7e8f2ecf9384fa5bbbb4c0daa).
- **REAL BROWSER QA PASS:** [GitHub Actions #43648877133](https://github.com/mvryhan-web/video-variator-android/actions/runs/43648877133). Chromium desktop 1440×900 и mobile 390×844: Christmas → Soft Dark → Christmas **PASS**; canvas снегопада есть; 14 снежных кромок, 5 `.xmas-person`, адаптивные WebP; оригинальные `#homeHeroCarousel`, `#homeHeroPrevious`, `#homeHeroNext`, `#homeQuickBar`, `#homeQuickPrompt` присутствуют. Ошибок JavaScript в контрольном прогоне не выявлено. Снимки экрана сохранены в artifact этого прогона на 7 дней.
- **CANONICAL TEST НЕ МЕНЯЛСЯ**: его Worker/HTML оказались новее или «dirty» относительно GitHub TEST ветки. Защитная проверка отказалась перезаписывать этот Worker. **MAIN/production НЕ МЕНЯЛСЯ.**
- Для слияния в постоянный TEST требуется отдельно восстановить точную текущую активную версию Worker + HTML из живой публикации и выполнить точечный перенос. До этого использовать рабочий изолированный Christmas Preview без затрагивания остальных сервисов.

## 2026-11-15 — Christmas V2: реальные попадания и снег на всех страницах (опубликовано)

- В `app/src/main/assets/deepsyq-christmas-v2.js` добавлен отдельный механизм снежной игры: исходные 5 мини-персонажей на панели JARVIX сохранены; снежок летит от одного персонажа к конкретному другому, при достижении цели увеличивается `data-xmas-hit-count`, фиксируется `data-xmas-last-hit`, цель падает, затем поднимается и возвращает бросок. На дополнительных панелях максимум две небольшие сценки по 3 фигурки.
- Добавлен `deepsyq-christmas-v2.css`: снежки заметнее, снежные шапки на краях объёмнее и неровные, отдельные анимации броска, падения, подъёма и снежного всплеска.
- Новый слой снега рисует не маленькие круглые точки, а полупрозрачные шестилучевые снежинки; плотность снижена до 52 частиц на ПК / 28 на мобильном, исходный круглый слой скрыт.
- Только при сборке изолированного Christmas Preview система GitHub Actions подключает базовую рождественскую тему и V2 **ко всем существующим HTML-страницам**. Основной `deepsyq.app` и канонический `test.deepsyq.pages.dev` не затрагиваются.
- Публикация Cloudflare: **PASS**, [GitHub Actions #43712357501](https://github.com/mvryhan-web/video-variator-android/actions/runs/43712357501).
- Реальный Chromium desktop и mobile: **PASS**, [GitHub Actions #43712439801](https://github.com/mvryhan-web/video-variator-android/actions/runs/43712439801). Подтверждено `hits=1, shots=1, last="0-1", actors=5` на главной для каждого размера экрана; `xmas-real-snow` существует; `free-tools.html` (2 мини-сцены), `pricing.html` (2), `jarvix-chat.html` (1) содержат снег и снежные кромки; переключение Christmas → Soft Dark → Christmas проходит, ошибок JavaScript нет.
- Просмотр: https://christmas-preview-20261114.deepsyq.pages.dev/?christmas=1. **Изолированный TEST Preview проверен, перенос на постоянный TEST не выполнялся** (Worker несовместим с исходной веткой).

## 2026-11-15 — Christmas V3.1 — owner long background and natural snow, VERIFIED PREVIEW

- Source asset: owner uploaded 941×1672 portrait winter image; uploaded image URL used by isolated TEST workflow: `https://d2ol7oe51mr4n9.cloudfront.net/user_3DohHzQ92OwE6TBQr5M2fYm2CwS/289082f4-4413-4d7b-ae8e-e037b497a2bf.png`. Responsive WebP outputs generated at 2560×1440 / 1080×1920 for Cloudflare preview only.
- Updated `app/src/main/assets/deepsyq-christmas-v2.js`: near/mid/far depth snow rendered as soft translucent irregular aggregates using radial-gradient on canvas. No stylized six-point star flakes. Character throw/hit/fall/recover/rethrow logic unchanged.
- Updated `app/src/main/assets/deepsyq-christmas-v3.css`: persistent scrolling background revealed on Home and JARVIX shells, clear opaque full-page backgrounds while retaining card/input contrast.
- Updated `.github/workflows/deepsyq-christmas-isolated-preview.yml` to download owner-provided long winter image and deploy ONLY to isolated `christmas-preview-20261114` branch. **Success**: [workflow #43714737627](https://github.com/mvryhan-web/video-variator-android/actions/runs/43714737627). Existing canonical TEST and production deployment IDs checked unchanged.
- **LIVE Chromium desktop + mobile QA PASS**: [#43714789537](https://github.com/mvryhan-web/video-variator-android/actions/runs/43714789537). `html` fixed background image; body/main transparent with tall scrolling pages; actual home hit `0-1` with 5 actors; Free Tools, Pricing, JARVIX Chat, Generate Studio and Audio Studio retain holiday effects. JARVIX `?mode=image`, `?mode=video`, `?mode=audio` all have one composer, one mini-stage and five actors. Browser page errors: `[]`.
- Public staging URL: `https://christmas-preview-20261114.deepsyq.pages.dev/?christmas=1`. Production `https://deepsyq.app` and canonical TEST `https://test.deepsyq.pages.dev` NOT modified.


## 2026-11-15 — Christmas V3.2 — exact uploaded portrait, scene scroll and no snow overlap (verified)

- Uploaded the owner's **current** attached 941×1672 PNG and verified byte-exact SHA-256 `ff491e142b96f056afc3e2ff3d56016b70a1928ea96035743dedaefb9672bc7a` in the Cloudflare TEST Preview release workflow.
- Converted full image **without cropping** to `/media/christmas/christmas-portrait.webp` (1412×2508; 795924 bytes). Existing desktop/mobile crops remain only as legacy optional assets. The winter background now uses the exact full portrait on all viewports.
- Updated `deepsyq-christmas-v3.css`: full-portrait CSS root background everywhere, adjusted responsive background crop, snowy piles above input/header/card borders with no overlapping content. Updated `deepsyq-christmas-v2.js`: viewport and nested-scroll handlers shift background photo Y while scrolling; original snowball fight and single JARVIX composer preserved.
- Christmas staging deploy [GitHub Actions #43716078258](https://github.com/mvryhan-web/video-variator-android/actions/runs/43716078258) PASS (original full-image deployment #43715859115 PASS), all preview assets served 200 and MAIN/primary TEST deployment IDs unchanged.
- **Real Chromium desktop/mobile PASS**: [GitHub Actions #43716159814](https://github.com/mvryhan-web/video-variator-android/actions/runs/43716159814). Full Home photo visibly pans (77.78% desktop, 82.94% mobile after scrolling); Free Tools also pans (48.28% desktop, 53.32% mobile). Snow pile above composer border: desktop pile bottom 789 vs input top 790; mobile bottom 743 vs input top 744 (**1 px above**). Image/Video/Audio modes retain one JARVIX composer and five actors. No JS page errors.
- **Public isolated TEST Preview:** https://christmas-preview-20261114.deepsyq.pages.dev/?christmas=1. **Production and canonical TEST unchanged**.

- **Final cache-refresh release:** [Cloudflare TEST Preview #43716357047](https://github.com/mvryhan-web/video-variator-android/actions/runs/43716357047) PASS. V2 JS/CSS and V3 CSS now use refreshed asset URLs `?v=20261115-scroll-final` so existing browsers do not retain the earlier stationary background. Exact source SHA-256 reconfirmed; 13 live preview endpoints HTTP 200; production and canonical TEST baseline unchanged.


## 2026-11-15 — Christmas V4: fluffy pointer-responsive snow and raised chimney — PASS

- Owner feedback: old snow caps on input/cards were flat repeated CSS stripes and sometimes visually intruded; long winter background appeared too low on universal JARVIX Chat (Image/Video/Audio).
- Added independent preview-only `app/src/main/assets/deepsyq-christmas-v4.js`: transparent fixed canvas draws irregular white snow accumulation ABOVE visible card/header/composer edges; micro-clumps, tonal shading and fine frost. On pointer movement/touch, local drift gently deforms and sheds a few tiny snow particles. Non-interactive layer `pointer-events:none`; no modifications to existing carousel/forms/actions.
- Added `deepsyq-christmas-v4.css`: legacy flat-gradient snowcaps fully hidden despite high-specificity earlier selectors; new snow rendered on overlay. One shared JARVIX Chat portrait's chimney shifts upward by 180 px at 1440px desktop and 68px mobile, while Home and full portrait scrolling remain unchanged.
- Expanded V4 card selectors for compact mobile Tools / launch tile panels; no card layout rebuild. Updated isolated Cloudflare Preview workflow with V4 CSS/JS and cache versions `fluffy-v2`, validating assets, original carousel, Worker, preserved stable TEST/production deployments.
- **Published Cloudflare Christmas Preview PASS**: [#43718790272](https://github.com/mvryhan-web/video-variator-android/actions/runs/43718790272), URL `https://christmas-preview-20261114.deepsyq.pages.dev/?christmas=1`. Production and canonical TEST unchanged.
- **Full real Chromium desktop/mobile PASS**: [#43718835307](https://github.com/mvryhan-web/video-variator-android/actions/runs/43718835307). Home painted snow: 12026 non-transparent overlay pixels desktop / 4237 mobile; old stripes computed opacity 0. Mouse brush produced 6 interaction events desktop and 2 simulated touch events mobile. Visible pile counts on Free Tools: desktop 5 / mobile 3; Pricing 3/3; JARVIX Chat 2/2; Generate Studio 2/2; Audio Studio 2/2. JARVIX chimney offset confirmed desktop 180px, mobile 68px. Image/Video/Audio continue on one composer with five miniature actors. Browser errors: [].
- Theme remains on isolated TEST preview only; do not replace `deepsyq.app` or canonical `test.deepsyq.pages.dev` Worker.


## 2026-11-15 — Christmas V4.2: realistic round photo-snow piles, final test

- Follow-up after user feedback: original V4 canvas snow looked like jagged triangles and long flat strips. Compared browser QA desktop/mobile screenshots (GitHub Actions #43720228902). Preserved original site components and 5-person snowball scene.
- Replaced peaked geometry with shallow rounded cushions and applied actual snow texture taken directly from the bottom snowy bank of the user's exact long Christmas image. Verified extracted `snowbank-texture.webp` at 1536×220 is published and approximately 36,978 bytes; source photo checksum remains verified in release workflow.
- Retained pointer/finger brushed snow reaction with small loose crystals. New visual geometry uses sparser rounded deposits instead of continuous ribbons; adjacent cards cannot overlay the active #homeQuickBar/#jChatForm input interior.
- Previous live deploy [#43720124462](https://github.com/mvryhan-web/video-variator-android/actions/runs/43720124462) **PASS**, previous Chromium desktop/mobile QA [#43720228902](https://github.com/mvryhan-web/video-variator-android/actions/runs/43720228902) **PASS**: photographic snow texture loaded; snow-brush 6 desktop/2 mobile events; JARVIX chimney shifted upward 180 px desktop / 68 px mobile; no JavaScript errors.
- Final additional geometry adjustment committed to TEST branch and deployed to the isolated preview through workflow in progress; status of latest run should be checked before treating final revision as fully verified. Canonical TEST and production code not edited by Christmas commits.

- **FINAL V4.2 RELEASE AND BROWSER PASS:** isolated Christmas Preview release [#43720690774](https://github.com/mvryhan-web/video-variator-android/actions/runs/43720690774) **SUCCESS**. Chromium desktop+mobile [#43720808976](https://github.com/mvryhan-web/video-variator-android/actions/runs/43720808976) **SUCCESS**. Snow texture HTTP 200, real photographed snow texture size 36,978 bytes, cursor/finger responsive (6 desktop/2 mobile), more sparse snowbanks with profile 0.406 desktop and 0.424 mobile, old snowcaps invisible, chimney raised in JARVIX, zero browser JS errors. This run verifies the FINAL narrower snow cushions and no-adjacent-input-overlap logic; production and canonical TEST deployment not modified by this release.
