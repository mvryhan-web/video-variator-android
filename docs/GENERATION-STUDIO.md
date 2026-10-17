# Creative Studio — isolated owner pilot

Production main baseline: 259653624375d6fe383d721a0022e7030fbb14be. No deployment approved.

Separate `generate-studio.html`: video, images and audio; clearly unavailable translation.
US English; Russian device locale translation; responsive mobile layout. Images: description,
PNG/JPEG reference files up to 3 × 1 MB, supported ratios. Video: text or one image,
8 seconds 720p, 16:9 / 9:16. Music: 30-second song with vocals or instrumental.
Adapters: Nano Banana 2 (`gemini-3.1-flash-image`), Veo 3.1 Lite, Lyria 3 Clip.
Veo 3.1 Fast uses the same validated Google adapter but additionally requires an explicit
`AI_STUDIO_ALLOWED_MODELS=veo-3.1-fast-generate-preview` entry before activation.
No Suno/Seedance/Kling/OpenAI connectors or file dubbing implemented yet.
No consumer account scraping, subscription credit reuse, paid fallbacks or retries.

## Three-studio interface, inspected 2026-10-11

Opened and interacted with all three public Lumina pages in Cloud Browser:
https://ai.byteplus.com/lumina/en/model/image?mode=image
https://ai.byteplus.com/lumina/en/model/video?mode=video
https://ai.byteplus.com/lumina/en/model/audio?mode=audio

Observed shared layout: desktop navigation on the left, large central result area,
bottom prompt/material composer, model popover with short descriptions, separate settings
popover and Explore/History controls. Image settings show ratio drawings; video exposes
ratio/resolution/duration; audio exposes models and pitch/volume. Our own implementation
uses this layout pattern and Video Uniquifier branding, not their assets or text.
Payments were explicitly deferred by the owner; the existing sandbox-only draft remains off.

Direct links: `generate-studio.html?studio=video`, `?studio=image`, `?studio=audio`.
Responsive top navigation on phones; keyboard-accessible model and settings dialogs;
ratio drawings; local photo previews, drag/drop, clear and per-studio draft retention.
My results displays/resumes the latest pilot result only, not a fabricated full gallery.
The Audio studio prepares song/instrumental and voiceover controls. New voiceover/Seed
model slots remain disconnected; a link opens the existing voiceover tool.

`generate-models.js` shares safe capabilities with the server. Model choices are included
in requests and validated against their type: an unconnected choice cannot silently fall
back to Google. BytePlus Seedream 4.5/5.0 Lite and Seedance 2.0 REST adapters are
prepared and mock-tested; keys, activation and real provider calls are still pending.
Seed Audio/Seed Speech remain disconnected.
Photos are never uploaded by preview/settings/model/history actions. Generate remains
disabled without adapter + server activation + consent + prompt. Extra Google models
cannot be enabled solely by enabling the video category.

Screenshots in `docs/studio-preview/` are actual local browser renders, not provider outputs.

## Prepaid customer billing preparation (not live)

`generation-wallet.js` implements a separate PostgreSQL AI-credit ledger: paid purchase,
atomic reservation, successful capture, confirmed failure release, unknown status hold,
and cumulative payment-refund/debt accounting. Deleting media has no wallet operation.
Concurrent transactions lock the user's wallet; purchase session/payment intent and job
identifiers prevent replay. Purchases repay refund debt before credit becomes spendable.
Existing subscription credits and Lifetime entitlements are not used for provider spending.

`generation-billing.js` prepares a **sandbox-only** Stripe Checkout adapter. A live key
cannot activate it. Defaults create no tables, payments or price objects. Server-side
approved packs/rates are loaded from `AI_CREDIT_PACKS_JSON` / `AI_CREDIT_RATES_JSON`;
there are no invented default customer prices. Prices are checked against Stripe before
Checkout; signed five-minute quotes bind the user, content, model, format and rate revision.
Order snapshots persist across catalog changes. The existing signed webhook delegates
AI order fulfillment only after Stripe reports paid, with amount/currency/line-item checks.
Duplicate completed/async succeeded events cannot grant twice. The success redirect
grants nothing. Access uses existing auth. Checkout requests require a stable UUID.

Endpoints: `/api/ai-billing/config`, authenticated `/balance`, `/history`, `/quote`,
`/checkout`. All except configuration return 503 unless the sandbox feature is enabled.
`AI_BILLING_ENABLED=true`, existing database/signing settings and a **test-mode** Stripe
key are required. No environment settings were changed. A quote explicitly reports
`generationEnabled:false`: this customer wallet is not connected to the owner generation
pilot yet. No paid customer launch, cash refund/dispute webhook orchestration, tax rules,
credit expiry policy or provider spend settlement is claimed implemented. Wallet refund
accounting is currently an internal primitive, not an automatic Stripe cash refund.

Before customer launch: approve package prices and provider access, wire wallet reservations
to generation jobs with crash recovery, connect refunds/disputes, define customer terms,
test actual signed Stripe sandbox webhooks and real provider calls, then request live release
approval. Stripe payment collection does not itself fund the Google API account: provider
billing must be configured and may charge before Stripe payouts reach the bank.

CI uses a disposable PostgreSQL 16 service with fixture credentials and an isolated
`vv_ai_test` database, not Render. It tests real concurrent transactions, persistence through
a fresh wallet instance, replay, refunds/debt, and sandbox route/provider mocks. No real
payment or production database mutation is made by those tests.

## Activation is NOT performed

Render server secrets only: GEMINI_API_KEY. Never put keys in HTML, APK, localStorage or git.
AI_STUDIO_ENABLED=true, AI_STUDIO_ALLOWED_KINDS=image,video,music,
AI_STUDIO_MAX_CALLS=3, existing DATABASE_URL and ADMIN_EMAIL are required for the pilot.
Owner must be authenticated through Google and match ADMIN_EMAIL. Other users cannot generate,
poll, read media, or delete. Existing user plans/credits and local video engine untouched.

Explicit owner approval of API spending must precede activation. MAX_CALLS is a persistent
attempt cap, NOT a dollar cap. Check current model prices and provider account access first.
No reserve is released after an error/timeout or deletion, preventing accidental extra paid retries.
Concurrent submissions serialize via PostgreSQL transaction advisory lock.
A new ledger table is lazily created only after enabled authenticated requests.
No budget/secret values are exposed by /api/studio/config.

## Jobs and results

POST authenticated JSON /api/studio/jobs creates a durable reservation and starts generation.
GET job status polls video operations stored in DB. Completed media held in existing PostgreSQL,
maximum 30 MB per job, maximum 20 lifetime pilot attempts. DELETE clears media but keeps the
attempt ledger. Inputs are sent to Google but not persisted by our server.
Deleting while processing is blocked; does not cancel a provider charge. Unknown interrupted
image/music jobs never automatically retry. Video operation resumes polling if stored.
Results may remain until manually deleted; no automated expiry or public customer retention policy.
This is an owner pilot, not production storage architecture. Uses the existing Android save/share bridge; physical-device output tests remain pending.
Browser file sharing works only when supported; otherwise truthful download instruction.
Translated-file input is deliberately unavailable; existing raw video upload prohibition remains.

## Verification

Unit tests use provider response fixtures: payload limits, supported model ratios, consent,
server-only key routing, one video per request, output parsing, error handling.
Browser tests check mobile overflow, RU locale, draft switching, disabled default and simulated
preview/download/delete contract. Simulated outputs are NOT real AI quality tests.
Actual image/video/song generation, licensing/usage terms, physical Android/iPhone and dubbing
remain unverified until owner approves API test spending. Do not advertise these as live features.

Official references reviewed 2026-10-11:
https://ai.google.dev/gemini-api/docs/image-generation
https://ai.google.dev/gemini-api/docs/veo
https://ai.google.dev/gemini-api/docs/generate-content/music-generation
https://platform.suno.com/

## BytePlus adapter preparation (2026-10-13)

`server/generation-byteplus.js` uses only the official ModelArk REST endpoint, not
Lumina account cookies. `BYTEPLUS_API_KEY` stays server-side; no keys have been
installed or requested in chat. BytePlus models require both allowed kinds and an
explicit `AI_STUDIO_ALLOWED_MODELS` entry; a Google key cannot enable them.

- Seedream 4.5 / 5.0 Lite: one image per call, up to three local reference photos,
  fixed 2K pixel dimensions mapped to the chosen ratio, base64 result. Version 4.5
  retains its JPEG output; 5.0 Lite requests PNG. No URL image download is required.
- Seedance 2.0: one 5-second 720p task, optional first-frame photo, generated audio,
  watermark retained. `byteplus:<task-id>` is stored in the existing operation field
  and resumes through the same job endpoint after reload. Failed/expired tasks become
  terminal failures, not automatic new paid requests.
- Video cannot be enabled until `BYTEPLUS_MEDIA_HOSTS` contains exact approved
  provider CDN hostnames. Hosts must be HTTPS BytePlus/Volcengine domains. No wildcard,
  arbitrary host, nonstandard port, credential URL or redirect is allowed. Download
  requests carry no API key. Response bytes are capped at 30 MB and checked as MP4.
- The consent label follows the selected provider and resets when the model/studio
  changes. Existing engine, payments, authentication and production remain untouched.

Official references consulted:
https://docs.byteplus.com/fr/docs/modelark/seedream-4-0-5-0
https://docs.byteplus.com/fr/docs/modelark/video-generation-tutorial
https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api

No paid API call, model activation, balance top-up, resource purchase or production
deployment was performed. Exact account access and live CDN output still need a
separate authorized provider smoke test. BytePlus account prerequisites can require
funding; do not activate or purchase anything without the owner's confirmation.
