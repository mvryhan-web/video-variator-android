# Block 5 — INTERNAL PRODUCT WATCHER AGENT

**Источник:** исходный `DEEPSYQ_BLOCKS_1-7_CANONICAL.txt` (библиотека пользователя), скопирован дословно ниже. Это именно Block 5, не BASE.

**Учёт:** 20 последовательных этапов реализации и проверки; 82 маркированных строк и 0 строк стрелочной цепочки в оригинале. Строки оригинала включают примеры, ограничения и настройки — это НЕ 82 независимых задач.

**Приоритет:** выполнять этапы 01→20 по порядку в рамках данного блока; не перескакивать из-за скуки/желания сделать другой раздел. Сначала проверить уже существующий код/тесты, затем закрывать только реальный остаток. Зависимость от других блоков или owner approvals = `BLOCKED` с доказанным blocker; не подменять готовностью. Продолжать только явно независимые безопасные задачи, указывая исключение в отчёте.

**Статусы:** `[ ] TODO`, `🟡 PARTIAL`, `✅ VERIFIED`, `⛔ BLOCKED`, `⏳ MAIN/DEPLOY PENDING`. Галочку ✅ ставить только с PR/commit/тестами. Успешный CI не означает запущенный рабочий сайт. Каждый пункт должен получить ссылку на доказательство или причину блокировки; не копировать чужую работу.

**Существующее на 2026-10-15:** PR #50 объединяет код watcher из #46–49, Node/PostgreSQL CI проходили; real Render worker/alerts не проверены.

## Исполнительный чек-лист — 20 этапов

- [x] **B5-01. Сверить уже собранный PR #50 и цепочку #46–49; не дублировать Product Watcher.**
  - Критерий: Продолжение с последнего протестированного коммита.
  - Статус: ✅ VERIFIED — **инвентаризация кода, не production**. [PR #50](https://github.com/mvryhan-web/video-variator-android/pull/50) на коммите [d52890e](https://github.com/mvryhan-web/video-variator-android/commit/d52890eaf7ac084596d631cb6d91e12be75826cf) объединяет работу #46–49. [Push CI](https://github.com/mvryhan-web/video-variator-android/actions/runs/38800150157) и [PR CI](https://github.com/mvryhan-web/video-variator-android/actions/runs/38800157436) — SUCCESS. Код не слит в main, на Render не проверен.
- [ ] **B5-02. Обеспечить полностью отдельные от User Agent полномочия, бюджеты, очереди и audit.**
  - Критерий: Только owner/admin видит приватные данные.
  - Статус: 🟡 PARTIAL. Owner auth, отдельные worker/таблицы/audit и изолированные тесты присутствуют в PR #50, но полный независимый бюджет, очередь и все права от User Agent ещё требуют приёмки. Не ставить ✅ до проверки.
- [ ] **B5-03. Проверять официальные источники новостей AI API, новых/устаревающих моделей, цен и лимитов.**
  - Критерий: Каждое предупреждение имеет ссылку/источник; непроверенное — без статуса факта.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-04. Мониторить uptime, backend/db errors, job failures, provider availability и latency.**
  - Критерий: Проверки читают реальные показатели, а не имитации.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-05. Проверять шаблоны, skills, workflows, ссылки и состояние медиа доступными безопасными методами.**
  - Критерий: Ложные статусы не скрывают непроверенные области.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-06. Наблюдать использование/расходы и аномалии, разделяя валюты.**
  - Критерий: Нет выдуманной себестоимости и суммирования разных валют.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-07. Диагностировать Stripe и webhooks read-only, без создания второго Stripe обработчика.**
  - Критерий: Настроенность не называется подтверждённой доставкой вебхука.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-08. Проверить приватный Owner UI: ON/OFF, Pause/Resume, Run Now, status, last/next.**
  - Критерий: Только авторизованный владелец может запускать/останавливать.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-09. Добавить рекомендации, approvals, changes, alerts, history и costs.**
  - Критерий: Есть проверяемый журнал и дедупликация уведомлений.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-10. Настроить owner approval для новых провайдеров, моделей, workflows, UI, pricing, routing.**
  - Критерий: Никакого применения значимых изменений без разрешения.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-11. Допускать автоизменения только обратимых metadata/content при отдельной owner-политике.**
  - Критерий: Секреты, Stripe, auth, DB, domains и пользовательские данные никогда не меняются автономно.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-12. Соблюдать состояния active/disabled/archived вместо удаления важных конфигураций.**
  - Критерий: Проверены пути отключения и восстановления.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-13. Подготовить расписание Europe/Paris: 15 мин, 1 ч, 6 ч, ежедневно 06:00/07:00/08:00, понедельник 09:00.**
  - Критерий: Проверяется переход летнее/зимнее время и сохранность задач.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-14. Сделать Daily Brief (New/Changed/Problems/Costs/Recommendations/Pending approvals).**
  - Критерий: Отчёт содержит фактические наблюдения.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-15. Сделать Weekly Product Audit High/Medium/Low.**
  - Критерий: Еженедельный аудит выдаёт ранжированные находки.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-16. Подготовить restart-safe worker/cron на Render с устойчивым storage и heartbeat.**
  - Критерий: Код не считается работающим расписанием без реального сервиса.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-17. Проверить подключение уведомлений, доставку/неоднозначные ошибки и права владельца.**
  - Критерий: Нельзя утверждать live Telegram/SMTP без подтверждения.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-18. Запустить Node + изолированную PostgreSQL регрессию и owner-only/browser acceptance.**
  - Критерий: Есть контроль конфигурации, отказов и повторных запусков.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-19. Проверить backup/restore, миграции, базу Render и выполнить согласованный rollout.**
  - Критерий: Без подтверждённого бэкапа не трогать production.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.
- [ ] **B5-20. После развёртывания подтвердить живые тики, алерты и отчёты, обновить точный статус.**
  - Критерий: Только тогда обозначить DEPLOYED & VERIFIED.
  - Статус / PR / коммит / тест / blocker: _заполнить при выполнении; уже существующий код сначала подтвердить_.

## Полный исходный текст Block 5 — без сокращений и перестановок

Секции, параметры, ограничения и примеры ниже сохранены дословно. При сомнении именно оригинальная формулировка имеет приоритет над краткими этапами выше.

```text
BLOCK 5 — INTERNAL PRODUCT WATCHER AGENT
============================================================

GOAL
Owner/admin-only autonomous internal agent for monitoring and maintaining Deepsyq.

Important:
This is NOT the User Agent.

Separate:
- permissions
- queues
- budgets
- retries
- audit
- admin access

Monitor:

AI providers:
- official updates
- models
- new models
- deprecations
- pricing
- limits
- availability
- API changes

Deepsyq production:
- uptime
- errors
- failed jobs
- database health
- Stripe errors
- broken links
- templates
- skills
- workflows
- usage anomalies
- cost anomalies
- provider latency
- provider failure rate

Admin page:
- ON / OFF
- Pause / Resume
- Run now
- current status
- Last run
- Next run
- recommendations
- approvals
- applied changes
- alerts
- history
- costs

Auto-apply:
Only safe, reversible metadata/content updates, and only if owner policy explicitly allows them.

Require approval:
- new provider
- new model
- new workflow
- UI changes
- pricing
- routing policy
- major content changes

Never auto-change:
- critical Stripe configuration
- secrets
- auth
- destructive DB operations
- domains
- user data
- destructive production code
- irreversible actions

Lifecycle:
- active
- disabled
- archived
- no hard delete of critical configuration records

Schedule — Europe/Paris:
- every 15 min: critical production health
- hourly: provider errors / usage / cost
- every 6 h: official provider/model/pricing/news checks
- daily 06:00: content/template audit
- daily 07:00: discovery scan
- daily 08:00: Deepsyq Daily Brief
- Monday 09:00: Weekly Product Audit

Daily Brief:
- New
- Changed
- Problems
- Costs
- Recommendations
- Pending approvals

Weekly Audit:
- High
- Medium
- Low findings

Infrastructure:
- Render cron / scheduled worker / equivalent
- restart-resilient
- independent of owner computer/session

Important:
Code existing does not prove it is live.
Must verify:
- deployed service
- scheduler
- API credentials
- alerts/SMTP
- live execution
```

## Передача следующему агенту

- Последний подтверждённый этап: _B5-__ / статус_;
- Проверка/доказательство: _ссылка на коммит/CI/скрин/тест_;
- Что готово, но не опубликовано: _..._;
- Точный блокер следующего этапа: _..._;
- Следующее одно действие: _..._;
- Совместимость: _BASE, другие активные агенты, main, Render и DB_;
