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

## Telegram Stars checkout and customer care (implemented in draft branch, not live)

**Production feature flag remains off** by default: `TELEGRAM_MINI_ENABLED=false`. These files are only in pull request #38, not on the production main branch. No live customer can currently buy Telegram Stars subscriptions from this code.

Existing website tariffs (copied unchanged): **Basic $9/month (750 credits), Pro $24/month (2,250 credits), Business $99/month (15,000 credits), Lifetime €2,999 once (unlimited)**.

The Telegram Mini App proposes Stars amounts based on a *rough buyer-side price of $0.02 per Star*: **Basic 450 ★, Pro 1,200 ★, Business 4,950 ★** for recurring 30-day subscriptions. Prices in Stars are not equivalent to a guaranteed USD price: they vary with the user's location, tax and purchasing channel, and developer net payout is lower than the website's direct price. The final checkout shows the exact Stars amount.

**Lifetime €2,999 is visible as the fourth plan, website-only.** One 10,000-Star charge is nowhere near the lifetime website price; the code explicitly forbids Stars invoice creation for Lifetime, even if `TG_STARS_LIFETIME` is set. No customer should think Lifetime costs just 10,000 Stars.

Owner-controlled optional overrides:
```
TELEGRAM_MINI_ENABLED=true
TG_STARS_BASIC=450
TG_STARS_PRO=1200
TG_STARS_BUSINESS=4950
# Lifetime never enabled inside Telegram at this time.
```
The three price defaults are already included as reviewed draft values in `server/telegram-stars.js`. There is no separate hosting/server expense. **Do not enable this feature flag until required seller identity details and live tests below are completed.**

### Merchant support and legal notices

The draft includes standalone HTML pages `/telegram-terms.html`, `/telegram-privacy.html`, and required express opt-in before initiating a Stars invoice. The server stores a terms-version and consent timestamp on every order.

Private-chat commands `/paysupport` and `/support` let customers submit a written support ticket in Telegram. Tickets are stored durably in PostgreSQL. The operator can view and answer tickets at `/telegram-support-admin.html`; the corresponding API routes only accept an existing, signed-in Google account with the configured `ADMIN_EMAIL`. To receive immediate ticket notification, the operator can optionally set `TELEGRAM_SUPPORT_ADMIN_CHAT_ID` to their Telegram user ID; otherwise the admin panel must be checked regularly.

`/terms` and `/privacy` return the relevant notices. Return messages do not falsely claim Telegram will resolve merchant disputes. Refund requests are assessed by the operator and a legitimate Stars payment can be refunded through Telegram's `refundStarPayment` API (operator decision, no automatic customer-initiated refunds).

**Mandatory prelaunch business review:** Enter the seller's real legal/business name and required legal address/contact details in both notices; review EU/France digital-service withdrawal, VAT and consumer-law obligations; configure `ADMIN_EMAIL` and a monitored support inbox; run real device checkout tests and payment/refund/renewal verification. These identity details are not present in the project and have *not* been invented.

### Shared account and protection

Existing website/Android users can open Profile & Settings → Connect Telegram to generate a one-time, ten-minute private-chat link. The server binds the Telegram identity to one website identity, prevents double-paid links, and shares a paid credit balance across site, APK and Mini App. Stripe website subscriptions remain unchanged. The five free Telegram tests are distinct from the website's own trial.

Stars invoices require explicit acceptance of Terms, a request for immediate digital access and acknowledgment of automatic 30-day renewals; the backend rejects requests without these booleans. Only a verified payment event creates entitlement. The API uses XTR and one labeled price, with an empty `provider_token` as documented by Telegram.

### Verification

Static syntax checks and unit tests: `node --test server/tests/telegram-mini.test.mjs server/tests/telegram-stars.test.mjs server/tests/telegram-account.test.mjs`. GitHub PR #38 includes an isolated checks workflow. End-to-end payment, support replies, Apple/Android FFmpeg video export, subscription renewal and refund tests **are still required** before any launch.

## Security and limits

- Telegram initData signature verified using HMAC SHA-256, strict 1-hour age.
- Per-user PostgreSQL row lock prevents concurrent trial reservations, trial count persists through app reinstalls.
- Active job blocks another trial for 20 minutes; reservations are charged at start and a failed session can be refunded three times (to limit trivial abuse).
- Source video and completed result stay in device memory; they are not copied into PostgreSQL/Render.
- No main-page changes or Android APK builds are required.

## Tests

`node --test server/tests/telegram-mini.test.mjs` after `npm install`.
