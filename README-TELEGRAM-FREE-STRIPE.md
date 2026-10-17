# Video Uniquifier – Free Telegram Preview (Stripe remains on the independent website)

## Product decision

- Keep `@VideoUniqAppBot` and every existing command, reminder, website entry button and the main Stripe billing integration unchanged.
- Add optional `/telegram-free-mini.html` for up to **five** free short, on-device video variations per verified Telegram ID.
- Gentle / Balanced / Dynamic, one 720p MP4, 20 MiB maximum source, 45 seconds maximum.
- No Windows worker, additional hosting tier, new payment provider, Telegram Stars invoice, new subscription entitlement, or card collection.
- **No subscription sales inside the Telegram Mini App.** Telegram requires Stars for digital goods and services sold in bots/Mini Apps. Do not replace Stars with an external Stripe checkout redirect from Telegram, as that can violate the Telegram Bot Platform Terms.
- Standalone website and Android app keep existing Basic ($9), Pro ($24), Business ($99), and Lifetime (€2,999) plans, paid with existing Stripe outside the Telegram purchasing experience. The Mini App does not itself sell those subscriptions or unlock unlimited paid processing.

## Activation

Environment switch on the existing Render web service: `TELEGRAM_FREE_MINI_ENABLED=true`. **Default false.** Requires the existing `TELEGRAM_BOT_TOKEN` and `DATABASE_URL`/PostgreSQL; no video files are stored or sent to Render. Until activated the original bot behaves exactly as before.

When active, bot `/start` and `/create` add a button `🎬 Five free videos in Telegram`, alongside `🌐 Open existing website`. All existing commands and the bot website entry button remain. No browser-to-Stripe payment redirect is implemented inside Telegram.

## Privacy and practical limits

The video source and output stay on the user's phone and are processed via the existing FFmpeg WebAssembly engine. Only Telegram's validated session ID, mode/duration, job identifier and remaining free preview count reach the server. PostgreSQL maintains the five-trial limit per Telegram identity. Trial reservation occurs before processing and success commits that reservation. Up to three genuine processing errors can refund a preview; closing Telegram without completing an in-progress job may lose the reserved preview.

Users must keep Telegram open while FFmpeg processes. A browser WebView may run out of memory or have download restrictions; check actual Android and iPhone before publicity. Simulated mobile Chromium and WebKit tests and real mobile-Chromium FFmpeg MP4 export are automated in the dedicated CI workflow. No payment integration tests are required here because no Telegram purchases exist.

## Release notes

Changes only in this branch. Existing live Render deployments are not changed until merge and activation. Stripe endpoints, products, prices, web checkout and website's subscription UI are not touched. Original draft PR #38 (Telegram Stars) is superseded by the free-preview-only implementation.

