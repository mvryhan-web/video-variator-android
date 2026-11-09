# DEEPSYQ — verified live MAIN route map (9 Nov 2026)

Source of truth for developers and Antigravity when editing navigation: one user-visible JARVIX Chat, three modes Image/Video/Audio, and one DEEPSYQ Home. **Do not build duplicate chats or new alternative pages.**

- MAIN: `https://deepsyq.app`. Read-only audit: [GitHub Actions 42673106358](https://github.com/mvryhan-web/video-variator-android/actions/runs/42673106358), 39 HTTP requests to live MAIN (33 HTML routes + 6 extra aliases). Site was **not** modified in this audit.
- TEST: `https://test.deepsyq.pages.dev` only. The TEST canonical routing audit passed previously, but subsequent TEST has `uses_functions:true`, so do **not** replace it with a static Pages deployment. The current Worker source is unavailable via Cloudflare content API (403).
- MAIN root `/` currently returns actual DEEPSYQ Home (200). This is the correct Home and must remain so.
- All rows below reflect observed HTTP result and final URL. `200` is **not** proof of correct application behavior, and older aliases may intentionally redirect to the unified JARVIX Chat.

## All 33 HTML routes observed on MAIN

| Requested URL | Observed title/identity | Final URL path | HTTP | Notes |
|---|---|---|---|---|
| `/ai-agents.html` | JARVIX Chat | `/jarvix-chat.html` | 200 | alias |
| `/ai-apps.html` | AI Apps | `/ai-apps.html` | 200 | canonical |
| `/ai-pricing.html` | Pricing moved | `/ai-pricing.html` | 200 | legacy landing |
| `/ai-privacy.html` | AI Media Privacy | `/ai-privacy.html` | 200 | canonical |
| `/audio-studio.html` | JARVIX Audio | `/jarvix-chat.html?mode=audio` | 200 | alias |
| `/avatar-studio.html` | JARVIX Video | `/jarvix-chat.html?mode=video` | 200 | alias |
| `/canvas.html` | Canvas | `/canvas.html` | 200 | canonical |
| `/compare-ai.html` | Compare AI | `/compare-ai.html` | 200 | canonical |
| `/contact.html` | Contact | `/contact.html` | 200 | canonical |
| `/cookie.html` | Cookies | `/cookie.html` | 200 | canonical |
| `/deepsyq-admin.html` | Owner Admin | `/deepsyq-admin.html` | 200 | protected admin |
| `/deepsyq-vs-deepseek.html` | About / comparison | `/deepsyq-vs-deepseek.html` | 200 | canonical |
| `/deepsyq.html` | DEEPSYQ Home | `/deepsyq.html` | 200 | canonical |
| `/design-gallery.html` | 31 approved designs | `/design-gallery.html` | 200 | canonical |
| `/free-tools.html` | Everyday Tools | `/free-tools.html` | 200 | canonical |
| `/generate-studio.html` | JARVIX Chat | `/jarvix-chat.html` | 200 | alias |
| `/index.html` | Video Uniquifier | `/index.html` | 200 | WRONG: owner requires Home |
| `/jarvix-chat.html` | JARVIX Chat | `/jarvix-chat.html` | 200 | canonical |
| `/jarvix-studio.html` | JARVIX Chat | `/jarvix-chat.html` | 200 | alias |
| `/mobile-utility.html` | Mobile Utility | `/mobile-utility.html` | 200 | canonical |
| `/my-creations.html` | My Creations | `/my-creations.html` | 200 | canonical |
| `/photo-collage.html` | Photo Collage | `/photo-collage.html` | 200 | canonical |
| `/pricing.html` | Pricing | `/pricing.html` | 200 | LOCKED, no changes |
| `/product-watcher-admin.html` | Product Watcher Admin | `/product-watcher-admin.html` | 200 | protected admin |
| `/refund.html` | Refunds | `/refund.html` | 200 | canonical |
| `/simple-background-remover.html` | Background Remover | `/simple-background-remover.html` | 200 | canonical |
| `/smart-reminders.html` | Smart Reminders | `/smart-reminders.html` | 200 | canonical |
| `/telegram-free-mini.html` | Telegram Mini | `/telegram-free-mini.html` | 200 | canonical |
| `/teleprompter.html` | Teleprompter | `/teleprompter.html` | 200 | canonical |
| `/terms.html` | Terms | `/terms.html` | 200 | canonical |
| `/video-uniquifier.html` | Video Uniquifier | `/video-uniquifier.html` | 200 | canonical |
| `/virtual-pet.html` | Virtual Pet | `/virtual-pet.html` | 404 | BROKEN: 404 on MAIN |
| `/voice-agent-preview.html` | Voice Agent Preview | `/voice-agent-preview.html` | 200 | canonical |

## Other live aliases (read-only probes)

| Requested URL | Observed result |
|---|---|
| `/` | 200, DEEPSYQ Home — correct |
| `/jarvix-chat` | 200, JARVIX Chat — correct |
| `/jarvix-chat.` | **200, Video Uniquifier — WRONG**; unknown path must be 404, never catch-all to video tool |
| `/video-uniquifier` | 200, Video Uniquifier — correct |
| `/dashboard` | 200, DEEPSYQ Home — correct |
| `/inspiration` | 200, DEEPSYQ Home; final `/deepsyq.html` — check Inspiration anchor behavior separately |

## Canonical user-facing destinations

- Home: `/deepsyq.html` and `/` (both must display DEEPSYQ Home).
- Single chat: `/jarvix-chat.html`; Image `/jarvix-chat.html?mode=image`, Video `/jarvix-chat.html?mode=video`, Audio `/jarvix-chat.html?mode=audio`.
- Canvas `/canvas.html`; AI Apps `/ai-apps.html`; Everyday Tools `/free-tools.html`; My Creations `/my-creations.html`.
- Video Uniquifier: `/video-uniquifier.html`. Do not use `/index.html` as the video-tool canonical link; user-approved Home on TEST uses `index.html` for Home.
- Pricing and credit files are permanently protected by D31; no edits to `pricing.html`, `pricing-page.*`, wallet scripts or credits without express owner consent.

## Confirmed outstanding MAIN issues (do not claim resolved)

1. `/index.html` still serves Video Uniquifier instead of Home on MAIN. Home `/` works correctly. Fixing physical index requires preserving approved Video Uniquifier at its dedicated route and retaining the existing production Worker/Functions.
2. `/jarvix-chat.` currently serves Video Uniquifier due to fallback instead of a genuine 404; needs production routing/fallback correction.
3. `/virtual-pet.html` currently responds 404 although the file exists in GitHub; determine whether F8 is disabled intentionally or the live asset is missing. Do not replace with another unrelated page.
4. The legacy `/ai-pricing.html` returned 200 'Pricing moved', not a network redirect; browser-side redirect may still work. Verify behavior before changing this protected pricing area.

## Changes committed only to TEST GitHub (not yet deployed)

PR [#675](https://github.com/mvryhan-web/video-variator-android/pull/675) merged into branch `test`: corrected stale links from design gallery, My Creations, AI Privacy and comparison content to canonical JARVIX modes, Canvas and the standalone My Creations page. Added a fail-closed Cloudflare TEST Worker guard. [TEST workflow 42675024891](https://github.com/mvryhan-web/video-variator-android/actions/runs/42675024891) passed 3 local checks but **blocked publication** because the existing deployed TEST uses Functions and its source could not be verified.

**Publishing restriction:** do not deploy `app/src/main/assets` statically over existing Cloudflare Functions on TEST or MAIN. Never touch MAIN without an owner-approved verified revision, verified Worker equivalence, existing Neon/Stripe/auth/credits and rollback.

This table is an audit record to prevent navigation confusion. It is not evidence that the 33 live pages have been modified.
