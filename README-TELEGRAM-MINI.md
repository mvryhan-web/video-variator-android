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

## Telegram Stars checkout (prepared but OFF until owner sets prices)

Digital services sold inside a Telegram bot/Mini App must use Telegram Stars (currency XTR), not embedded Stripe or an external Stripe checkout link. The normal website keeps Stripe as before.

The added backend supports:
- Verified `createInvoiceLink` XTR invoices shown in Telegram via `WebApp.openInvoice`.
- 30-day recurring Stars subscriptions for Basic/Pro/Business, plus one-time Lifetime.
- `pre_checkout_query` validation and idempotent fulfillment **only** after Telegram's signed webhook returns `successful_payment`.
- Refund handling, server-side monthly credit accounting, and trial access lock.
- Five free per Telegram identity; paid credits are counted by video seconds (consistent with the existing web tariffs).

Configure exact approved Stars amounts (whole stars, 1-10000, no automatic USD conversion) in existing Render web service environment:
```
TELEGRAM_MINI_ENABLED=true
TG_STARS_BASIC=<approved Stars price>
TG_STARS_PRO=<approved Stars price>
TG_STARS_BUSINESS=<approved Stars price>
TG_STARS_LIFETIME=<approved Stars price>
```
**Do not enable until Stars prices are approved and a real purchase/refund smoke test is completed.** All price vars are unset by default. The Mini App plan buttons remain disabled until individually priced; no customer can be charged without explicit configuration.

Website Stripe accounts are currently **not linked** to Telegram identities. Telegram Mini App purchases currently unlock processing in the Telegram Mini App, NOT the independent website login. Do not advertise a cross-platform entitlement until account linking/synchronization has been designed and tested. Existing website subscriptions are unchanged.

Telegram subscriptions are subject to Telegram's recurring-payment rules; users should manage them in Telegram's Stars subscription settings. Unpaid Mini App trials remain available.

### Release tests

`node --test server/tests/telegram-mini.test.mjs server/tests/telegram-stars.test.mjs` plus a real on-device checkout (Telegram testing bot) and a refund test. Do not use a real charged customer as an initial integration test.

## Security and limits

- Telegram initData signature verified using HMAC SHA-256, strict 1-hour age.
- Per-user PostgreSQL row lock prevents concurrent trial reservations, trial count persists through app reinstalls.
- Active job blocks another trial for 20 minutes; reservations are charged at start and a failed session can be refunded three times (to limit trivial abuse).
- Source video and completed result stay in device memory; they are not copied into PostgreSQL/Render.
- No main-page changes or Android APK builds are required.

## Tests

`node --test server/tests/telegram-mini.test.mjs` after `npm install`.
