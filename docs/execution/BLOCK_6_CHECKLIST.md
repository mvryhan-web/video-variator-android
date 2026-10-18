# Block 6 — DEEPSYQ VOICE AGENT

**Источник:** исходный `DEEPSYQ_BLOCKS_1-7_CANONICAL.txt` (библиотека пользователя), скопирован дословно ниже. Это именно Block 6, не BASE.

**Учёт:** 24 последовательных этапов реализации и проверки; 120 маркированных строк и 5 строк стрелочной цепочки в оригинале. Строки оригинала включают примеры, ограничения и настройки — это НЕ 125 независимых задач.

**Приоритет:** выполнять этапы 01→24 по порядку в рамках данного блока; не перескакивать из-за скуки/желания сделать другой раздел. Сначала проверить уже существующий код/тесты, затем закрывать только реальный остаток. Зависимость от других блоков или owner approvals = `BLOCKED` с доказанным blocker; не подменять готовностью. Продолжать только явно независимые безопасные задачи, указывая исключение в отчёте.

**Статусы:** `[ ] TODO`, `🟡 PARTIAL`, `✅ VERIFIED`, `⛔ BLOCKED`, `⏳ MAIN/DEPLOY PENDING`. Галочку ✅ ставить только с PR/commit/тестами. Успешный CI не означает запущенный рабочий сайт. Каждый пункт должен получить ссылку на доказательство или причину блокировки; не копировать чужую работу.

**Существующее на 2026-10-15:** Полноценного voice агента не подтверждено; voice dictation в старых инструментах не заменяет блок 6.

## Исполнительный чек-лист — 24 этапов

- [ ] **B6-01. Проверить готовность Agent Orchestrator блока 2 и доступных Studio/Workspace/Compare функций.**
  - Критерий: Voice остаётся интерфейсом существующих инструментов, не новым root-агентом.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-02. Спроектировать оригинальный голосовой образ Deepsyq без JARVIS/Paul Bettany/Marvel.**
  - Критерий: Бренд/голос не имитируют известного персонажа или актёра.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-03. Сделать конфиг провайдера realtime/STT/TTS, voice ID, модель, язык, стоимость, enabled.**
  - Критерий: Модель и версия не зашиты; неподключённые голоса не рекламируются.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-04. Создать экран Meet your Deepsyq Assistant с кнопкой Start voice introduction.**
  - Критерий: Ни запись, ни речь не включаются самопроизвольно.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-05. Сделать краткое вступление и варианты Ask, Quick Task, Device Help, Not Now.**
  - Критерий: Смена экранов работает без запроса микрофона заранее.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-06. Встроить real-time/streaming voice и low-latency ответы там, где они поддерживаются.**
  - Критерий: Отображается честное ограничение выбранного провайдера.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-07. Реализовать barge-in/interruption, Stop, Mute, End, Voice/Text switch, transcript.**
  - Критерий: Прерывание действительно останавливает воспроизведение.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-08. Проводить голосовой запрос через Orchestrator → разрешённый API/tool → результат.**
  - Критерий: Не выдумывать исполнение/успех инструментов.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-09. Подключать только реально готовые Ask/Smart, Compare, Agent, Studio, Workspace, Skills, Tools, History.**
  - Критерий: Недоступные разделы не имитируют работающие.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-10. Привязать подтверждения к внешним/финансовым/удаляющим действиям и аудит.**
  - Критерий: Слова «да» не заменяют реальные системные разрешения.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-11. Подготовить Device Cleanup с отдельным понятным согласием пользователя.**
  - Критерий: Это навык Voice, не новый блок или отдельный продукт.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-12. В браузере сканировать только выбранные пользователем файлы/папки через поддерживаемые API.**
  - Критерий: Нет доступа ко всему устройству или скрытого сканирования.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-13. В нативных Android/iOS/Desktop сценариях использовать разрешения ОС.**
  - Критерий: Доступ невозможен без официального системного диалога.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-14. Искать точные/похожие фото и видео, большие файлы, снимки, старые загрузки, размытые и повторы.**
  - Критерий: Схожесть показана отдельно от точных совпадений; ограниченный доступ честно указан.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-15. Показать Review Files, Select Duplicates, Keep Everything, Delete Selected и размер/количество.**
  - Критерий: Пользователь видит конкретные файлы и оценку экономии.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-16. Никогда не удалять автоматически; перед удалением запросить окончательное подтверждение.**
  - Критерий: Где возможно используется корзина/Recently Deleted.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-17. Отслеживать audio input/output, модель, инструменты, Compare/Agent вызовы, сессии и кредиты.**
  - Критерий: Есть реальная стоимость и лимит per user/session/month/idle.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-18. Ограничить Trial $0.99 и первые бесплатные voice/scan действия; предложить Upgrade после лимита.**
  - Критерий: Нет Unlimited Voice без экономики.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-19. Проверить приватность: mic indicator, retention, отсутствует hidden recording; информировать о действиях.**
  - Критерий: Секреты и файлы недоступны без разрешения.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-20. Проверить Android, iPhone, mobile web, Bluetooth и background restrictions.**
  - Критерий: Ограничения устройств не маскируются.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-21. Разрешить Owner Mode читать Product Watcher только после admin auth, без root полномочий.**
  - Критерий: Доступ к costs, Daily Brief, provider status, approvals только владельцу.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-22. Оставить будущие wake word, hands-free, alerts, apps, desktop, car, wearables, robotics как расширения.**
  - Критерий: Не реализовывать преждевременно и не выдавать за готовые функции.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-23. Проверить тестами realtime/cancel/auth/OS-permissions/credits и end-to-end voice tasks.**
  - Критерий: Тесты подтверждают фактическое поведение, не только кнопки.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B6-24. Согласовать main integration и ограниченный rollout с реальным голосовым провайдером.**
  - Критерий: Публичный статус VERIFIED только после живого acceptance.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.

## Полный исходный текст Block 6 — без сокращений и перестановок

Секции, параметры, ограничения и примеры ниже сохранены дословно. При сомнении именно оригинальная формулировка имеет приоритет над краткими этапами выше.

```text
BLOCK 6 — DEEPSYQ VOICE AGENT
============================================================

Working name:
Deepsyq Voice Agent

Final unique name may be chosen later.

Do NOT:
- use JARVIS commercially
- imitate Paul Bettany/JARVIS voice
- imply Marvel affiliation

Voice personality:
- original
- intelligent
- calm
- confident
- premium
- friendly male
- moderately low timbre
- light international / British-ish flavor
- natural diction
- light humor
- not an imitation of a real actor/character

Voice is an interface to all of Deepsyq:
- Ask / Smart
- Multi-AI Compare
- User Agent
- Studio
- My Workspace
- Agent Skills
- Everyday Tools
- Video Tools
- Image Tools
- History
- current-info/web tools
- approved owner Product Watcher access

Pipeline:
voice input
→ realtime voice/model
→ Agent Orchestrator
→ tool/API
→ result
→ voice response

Requirements:
- realtime/streaming where supported
- barge-in/interruption
- Voice/Text switch
- transcript
- Stop
- Mute
- End
- truthful tool status
- never claim unavailable tools worked

VOICE ONBOARDING
No surprise autoplay of microphone/audio.

First screen:
“Meet your Deepsyq Assistant”

Button:
“Start voice introduction”

Then a short 20–30 sec introduction.

Options:
- Ask me something
- Try a quick task
- Help me organize my device
- Not now

DEVICE CLEANUP / STORAGE ASSISTANT
This is part of Block 6, NOT Block 7.

Browser:
- cannot access the whole device
- only explicitly selected files/folders
- use File System Access API only where supported

Native:
- Android/iOS/Desktop only through official OS permissions

Spoken “yes” does not replace OS/browser permission dialogs.

No:
- hidden access
- hidden scanning
- hidden recording
- background deletion without permission

Scan categories:
- exact duplicate photos
- exact duplicate videos
- visually similar
- large files/videos
- screenshots
- old downloads
- blurry media
- repeated/bursty media
- temp/export only if accessible

Show:
- counts
- estimated storage
- categories
- exact duplicates separately from similar media

Actions:
- Review Files
- Select duplicates
- Keep everything
- Delete selected

Delete:
- never auto-delete
- final confirmation
- prefer Trash / Recently Deleted when supported

VOICE COST / PLANS
Track:
- realtime audio input
- audio output
- model usage
- tool calls
- Multi-AI
- Agent calls

Limits:
- per user
- per session
- per month
- idle timeout
- credits

Trial $0.99:
- small voice allowance
- no unlimited voice

Free/first-win may include:
- small voice allowance
- small device scan/duplicate preview
- some AI requests
- then upgrade

VOICE PRIVACY
- visible mic indicator
- no hidden recording
- minimize raw audio retention
- confirmation for destructive/external/purchase/account actions

Mobile-first:
- Android
- iPhone
- mobile web

Account for:
- mic permissions
- Bluetooth
- speaker routing
- background restrictions
- browser limits

Provider abstraction, config-based:
- realtime provider
- STT
- TTS
- voice ID
- model
- language
- cost
- enabled flag

Do not hardcode current model IDs.

Future-ready:
- wake word
- hands-free
- proactive notifications
- email/calendar/apps
- navigation
- desktop local actions
- glasses
- car
- wearables
- robotics

OWNER MODE / PRODUCT WATCHER
The same voice persona may read Product Watcher only in authenticated owner/admin mode.

Owner examples:
- “What changed overnight?”
- read Daily Brief
- problems
- costs
- provider status
- pending approvals

Do not merge Voice/User Agent/Product Watcher into one root service.
Voice is an interface.
Product Watcher keeps separate permissions/audit.
Critical changes still require owner approval.
```

## Передача следующему агенту

- Последний подтверждённый этап: _B6-__ / статус_;
- Проверка/доказательство: _ссылка на коммит/CI/скрин/тест_;
- Что готово, но не опубликовано: _..._;
- Точный блокер следующего этапа: _..._;
- Следующее одно действие: _..._;
- Совместимость: _BASE, другие активные агенты, main, Render и DB_;
