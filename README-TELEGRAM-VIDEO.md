# Video Uniquifier — optional Telegram Windows video processor

Existing Telegram bot, website, payment flow and reminders stay intact. Video handling is **off by default**. No files are stored or transcoded on Render.

## What it does

1. User sends an MP4/video to the existing `@VideoUniqAppBot` in a **private chat**.
2. Telegram bot offers **Gentle / Balanced / Dynamic** and **Start processing**.
3. A Windows worker, while running, downloads the original from Telegram, uses local FFmpeg and uploads a finished MP4 directly to the chat.
4. The website button, regular commands, account links and reminders remain unchanged.

## Windows setup

Install **Node.js 20+**, **FFmpeg** (including ffprobe) on the Windows PC. Add them to PATH. Clone/download this repository. Double-click `scripts/RUN_TELEGRAM_VIDEO_WORKER_WINDOWS.bat`.

On first run it creates `scripts/telegram-video-worker.env` from the example and opens Notepad. Paste the **existing bot token** obtained securely from BotFather or the existing Render configuration into `TELEGRAM_BOT_TOKEN`; do not send it in a chat or commit it. Leave `TELEGRAM_APP_URL` set to the existing Render app. Save and run the BAT again.

On Render, set `TELEGRAM_VIDEO_ENABLED=true` **only once the Windows worker is ready to run**. The existing `TELEGRAM_BOT_TOKEN` stays unchanged. Optionally set `TELEGRAM_DAILY_FREE_LIMIT=3` (max 20). On enabling, the existing webhook registers `callback_query` events as well as messages, while preserving `/start` and all existing behavior.

### Limits and operational notes

- Local worker must stay online for bot processing; if offline, bot falls back to website link.
- Default test limit: **3 completed/queued/processing Telegram jobs per user per rolling 24h**. This is a basic safety cap, not yet connected to paid web entitlements.
- Standard Telegram Bot API: incoming videos **≤20 MiB**, **≤60 seconds**; output must be **≤50 MiB**. Larger videos should use the website.
- **720p-class output**, portrait/landscape preserved without upscaling; serial FFmpeg processing, 4-minute timeout, and scratch files auto-deleted after completion.
- Old jobs in `processing` state need manual operator recovery if PC shuts down mid-job. This is an initial controlled pilot, not unlimited production service.
- The local PC uses its own electricity, CPU and internet. No separate paid rendering service is created, but existing Render and bandwidth charges still apply.
- Test the complete Telegram flow with a short 5–10 second video before advertising the bot. Avoid leaving token files in public folders.

## Tests

Run `node --test server/tests/telegram-video.test.mjs` (Node 20+; the actual-transcoding test requires FFmpeg).

## Rollback

Set `TELEGRAM_VIDEO_ENABLED=false` in Render to return the bot to its previous behavior. Existing user accounts, payments, reminders and website are untouched.
