# Owner request and acceptance — 7 November 2026

Scope: latest corrections in owner chat: animated reference orb, simplified header without credit badge, language below Pricing, studio settings without duplicate media-type entry, deduplicated dictation, arrow-only send, visible mobile JARVIX name, four icon-only share controls. Preserve current DEV/TEST Studio Settings persistence fix. Production, paid AI and Stripe Live stay untouched.

Acceptance:
1. Desktop and narrow mobile show rotating blue core with cyan/magenta orbits; no overlapping header controls.
2. RU/EN switching translates shared navigation/composer labels without editing user prompts or results.
3. Evolving/repeated STT snapshots do not duplicate text; old recognition instance cannot write into a newer session.
4. Studio settings retains parent hub, only model and format entries; send arrow has no round background.
5. TEST exact revision is Live and real UI inspected. Physical APK/microphone verification must remain explicitly unverified.

Historical requirements audit: fixed shared header and mobile drawer, removed global search/promo/helper banner, lower fixed composer and unified local chat exist. Cross-document navigation still reloads: completely persistent chrome without flashing is unfinished. Real paid media and remote LLM Function Calling are not enabled on TEST; demo media must not be described as real generated output. Local owner brain/voice runtime is outside this execution environment. Tour exists separately with pause/continue/stop, but full end-to-end speech remains dependent on voice service availability. Physical Android keyboard, acoustic beeps, installed APK and continuous listening across navigation are not verified. Site-wide translation and every utility page need broader audit; shared UI translation alone is not full site localization. Account-local conversation storage exists, cross-device sync is unfinished. Pricing/VU content and artwork remain locked.

## Полный реестр требований этого чата

Статусы относятся к известному коду и указанным проверкам, а не означают принятие владельцем.

| Требование | Статус / граница |
|---|---|
| Публикация только TEST, основной сервис не трогать | Соблюдается |
| Сохранять работающий код и решения | Этот реестр и тесты; непрерывный регрессионный контроль частичный |
| Общие неизменные иконки навигации и одна шапка на разделах | Есть общий shell; не все 35 HTML страниц проверены |
| Шапка закреплена при прокрутке | Реализовано, проверка Home/Studio |
| Полностью убрать мерцание шапки/меню между любыми страницами | Не завершено: переходы между HTML перезагружают документ |
| Убрать глобальный поиск и промокод | Реализовано |
| Пригласить друга убрать из шапки | Перенесён вниз меню; позднее пожелание удалить вообще пока не применено |
| Спрятать язык ниже тарифов | Реализовано |
| Убрать AI-кредиты из верхней шапки | Реализовано |
| Экскурсия, Тарифы, Войти; аккаунт после входа | Реализовано, auth-specific live session не проверялась |
| Четыре иконки общего Share/Discord/X/Instagram ниже тарифов | Реализовано; Discord/Instagram копируют ссылку и открывают сервис, не публикуют автоматически |
| Половина экрана для мобильного меню, свайпы | Реализовано; browser narrow-frame QA |
| Подпись Джарвис видна при открытом меню | Исправлено и визуально проверено |
| Основная сфера скрыта за открытым меню | Реализовано |
| Новая сфера со звёздным ядром и орбитами, вращение и речевой пульс | SVG/CSS реализованы; точное визуальное совпадение не заявляется |
| Неоновый Home и карусель | Реализованы ранее; исходные изображения не менялись |
| Убрать Design preview/Work in progress | Реализовано ранее |
| Убрать Создать/Мои результаты над тремя студиями | Реализовано ранее; кнопку запуска генерации сохранить |
| Убрать мелкие ссылки цен/кредитов в композере | Реализовано ранее |
| Фото/Видео/Аудио помещаются вместе с кнопкой отправки | Фиксированный dock; физическая клавиатура и малые Android экраны требуют проверки |
| Один дизайн модели/настроек всех трёх студий | Общий адаптер; широкая функциональная приёмка ещё не полная |
| Настройки ясно названы Настройки студии | Реализовано |
| Лишняя верхняя Audio/type кнопка в настройках удалена | Исправлено, остальные самостоятельные разделы сохранены |
| Настройки не закрываются при выборе модели/формата | Сохранён concurrent fix #562; модель проверена |
| Стрелка отправки без круга, по центру, светится | Исправлено, фон прозрачный/граница 0/SVG в браузере проверены |
| RU/EN единообразны повсюду | Общая навигация/композер переведены; полный сайт частично, каталоги и вспомогательные тексты требуют работы |
| FR/ES интерфейс и голос | Старые словари сохранены; новый общий перевод пока только RU/EN |
| Микрофон не дублирует слова | Snapshot reducer + stale guard; unit и реальная форма с mock STT прошли; физический Android не проверен |
| Микрофон не издаёт системные бипы | Не подтверждено: зависит от Android/Web Speech |
| Нижняя панель закреплена; плюс, ввод, файл, голос, отправка | Реализовано |
| Первый запрос Home переносится в единый чат без повтора ввода | Реализовано ранее, scoped HTTP/chat tests |
| Нажатие в поле не переносит в чат | Реализовано |
| История, вложения и media player в одном разговоре | Реализовано локально; cross-device sync не сделан |
| Изоляция истории/файлов по аккаунтам | Локальный scope и HTTP проверки; полноценный аудит безопасности ещё нужен |
| Созданный файл можно использовать как вложение | Реализовано; настоящая межмодальная обработка недоступна на demo TEST |
| Реальные Text/Image/Video/Audio генерации | TEST даёт demo, не полноценные живые AI результаты |
| Один мозг/память для сферы/чата/голоса | Общая инфраструктура сохранена; полный долговременный контекст не реализован |
| Подключить гибридный мозг и мгновенные содержательные ответы | Не подтверждено; TEST детерминированный router, не живой LLM |
| Function Calling + improved prompt | Не реализовано; локальный intent/parameter extractor есть |
| Action-first: открыть, параметры, отправить, краткое подтверждение | Частично: локальный router и guard; только доступный zero-cost demo запуск |
| Знать все кнопки/инструменты/модели/актуальные тарифы | Manifest есть; полнота и все голоса/действия ещё не приняты |
| Уверенный чистый мужской голос на четырёх языках | Существующий VoxCPM2 сохранён, качество владельцем не принято; новые записи поручены Antigravity |
| Не генерировать недостающий voice corpus самому | Соблюдается; 360 MP3 путей в дереве не доказывают качество и доступность |
| Сфера слушает, а не запускает тур повторно | Разделено ранее; физический end-to-end не подтверждён |
| Тур начинается с 3 секунд живой сферы | Реализовано в плане тура |
| Тур через видимое боковое меню: фото, видео, аудио, apps, canvas, tools | Реализовано в сценарии, полный spoken live прогон не подтверждён |
| В туре основные утилиты, VU, Inspiration | Есть в плане тура |
| В туре все настоящие тарифы с ценами/возможностями и прокруткой | Читает DOM, не выдумывает цифры; полный runtime прогон не принят |
| Pause/Continue/Stop компактно сверху | Реализовано ранее |
| В конце тура Home и предложение создать | Есть в сценарии |
| Реальные смены light/dark/neon/New Year синхронно речи и возврат | Новый сценарий не имеет полной доказанной приёмки; требует доработки |
| Непрерывно слушать во всех разделах до ручного выключения | Не завершено между перезагрузками страниц |
| Автообновление установленного приложения без переустановки | Только remote web content; bundled APK/иконки требуют отдельной сборки/доставки |
| Все страницы, красивые Назад, без дублей/перекрытий | Частичная проверка; 35 HTML entry files, не 33 тысячи проверенных страниц |
| Домен и HTTPS | Подключены ранее; текущая привязка не меняется |
| Pricing/VU финальные изображения, цены и суммы не менять | Содержание/арт сохранены, меняется только запрошенная общая навигация |

## Проверки этой итерации

22 scoped Node tests PASS. Browser: Home RU→EN, shared sidebar labels/rail; 390px frame, half-width drawer and visible Джарвис; Home settings dialog; Audio model chooser closes child and preserves Settings hub; no duplicate type button; arrow SVG has transparent background/no border/no pseudo-arrow. Actual Home composer with mocked browser STT replay received eight duplicate slots/events and retained one `привет`. Physical audio quality/installed APK/Android keyboard remain unverified. Preview media binaries are LFS pointers in this local checkout, so local playback is not a release test.
