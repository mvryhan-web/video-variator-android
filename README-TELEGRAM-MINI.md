# Telegram Mini App · Five free videos (mobile pilot)

This is an **opt-in**, phone-first Telegram Mini App, completely separate from the existing website, Android APK, Telegram reminder bot, and optional Windows worker.

## User experience

1. Send `/start` or `/create` to `@VideoUniqAppBot` in a private chat.
2. Tap **🎬 Process in Telegram** to open `/telegram-mini.html` inside Telegram (when enabled).
3. Select a local video (at most **20 MiB** and **45 seconds**).
4. Choose Gentle, Balanced or Dynamic, and Start.
5. Local FFmpeg WASM processes one **720p** result on the user's phone. Users can preview, share, and attempt to download the result from Telegram's in-app webview.
6. Each authenticated Telegram account receives **five** processing reservations. A failed attempt may be refunded up to three times. User identity is verified server-side by Telegram `initData` HMAC, not browser localStorage.

## Enable / disable

Render environment variable: `TELEGRAM_MINI_ENABLED=true`. **Default is false**. No bot token changes needed: it uses the already configured `TELEGRAM_BOT_TOKEN`.

The existing Telegram site window/menu button, `/start` text, website navigation, Stripe billing and reminders are untouched. When the Mini App is on, the bot adds an **additional** button for mobile processing under `/start` and `/create`, only in private chats.

**No extra hosting service**, server-side FFmpeg, Windows PC, or file uploads to Render. PostgreSQL stores only usage metadata.

## Payment / release blocker

At five free trials, the Mini App displays the same four website plan names and list prices. Actual Telegram checkout is **intentionally disabled** until the owner selects Telegram Stars prices and entitlement synchronization with paid website accounts is built and verified. Do not show a working `Buy` checkout or redirect Mini App digital-goods purchases to Stripe; Telegram requires Stars (XTR). Existing website plans and billing remain unchanged.

This mobile pilot must be tested **inside both Android and iPhone Telegram WebViews**. FFmpeg WASM memory limits and downloads from blob: URLs vary by device; Web Share is attempted first. Only advertise after verifying a real 5–10 second video on a phone. Keep the webview open during processing.

## Security and limits

- Telegram initData signature verified using HMAC SHA-256, strict 1-hour age.
- Per-user PostgreSQL row lock prevents concurrent trial reservations, trial count persists through app reinstalls.
- Active job blocks another trial for 20 minutes; reservations are charged at start and a failed session can be refunded three times (to limit trivial abuse).
- Source video and completed result stay in device memory; they are not copied into PostgreSQL/Render.
- No main-page changes or Android APK builds are required.

## Tests

`node --test server/tests/telegram-mini.test.mjs` after `npm install`.
