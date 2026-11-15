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
