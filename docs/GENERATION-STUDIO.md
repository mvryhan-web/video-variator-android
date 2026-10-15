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


## Image batch quantity — opt-in BASE implementation

The existing Image Studio has a prepared **Images per batch** control for 1–4 images. It is **off by default**. Before owner approval, `AI_STUDIO_IMAGE_BATCH_ENABLED` must remain unset/false. Enabling it additionally requires the existing AI wallet and an approved `AI_MODEL_PRICING_JSON`; actual provider access and full end-to-end billing acceptance are separate gates. This change does not enable production payments or AI generation.

The selected number is not sent as a fictitious single provider `n` or `sampleCount`: each output is a separate existing generation job with its own unique `requestId`, wallet reservation and result in user History. The frontend first calls `POST /api/studio/estimate` with `quantity` (1–4), displays the calculated total, and requires **one affirmative confirmation**. It submits jobs sequentially, waits for each result, and stops at the first error. There is **no automatic retry**. In case of a lost response, the owner/user should inspect History; the frontend must never silently send a duplicate job.

Each single job also sends `expectedCredits` from its approved per-image quote. The server compares that value with its fresh price before any database insertion/reservation and returns `AI_ESTIMATE_CHANGED` if it differs; earlier completed images remain in History. The job route explicitly refuses `quantity>1` because a job always represents exactly one result. The aggregate estimate validates count, model, per-image price, and maximum 10,000,000 credit total.

**Status:** repository implementation only, not confirmed paid operation. Owner-requested end-to-end browser, wallet and provider verification remains deferred until original BASE integration is complete. Do not enable the flag as a substitute for those checks.


## Model-supported Video duration and resolution — BASE #5

Video Studio now exposes the selected provider model's explicit `videoResolution` and `videoDuration` controls in **Settings**. The same fields are checked on the server in `validateGeneration` and `resolveEstimateRequest`, saved in each existing generation job's settings and applied directly by the already-configured Google/BytePlus adapters. They are **not** merely prompt text.

- **Veo 3.1 Lite / Fast (Gemini API):** `720p` with 4, 6 or 8 seconds; `1080p` with 8 seconds. The Studio conservatively fixes image-guided generation to 8 seconds. Both models remain one video per provider job.
- **Seedance 2.0 (ModelArk):** our initial allowlisted safe subset is `720p` and `1080p` at 4, 5, 8, 10 or 15 seconds. The official API documents wider duration/resolution capabilities, but 4K / external video/audio references and camera controls are not enabled without safe media storage, pricing and provider validation.
- **Credit protection:** every nondefault duration and/or resolution requires a separately approved matching `AI_MODEL_PRICING_JSON` row; old default-price wildcards cannot quote the higher-cost setting. The single-job creation endpoint refuses premium Video options without approved economics **even in owner preview**. Existing feature flags, owner access, wallet and provider budget gates still apply.
- **History:** `videoResolution` / `videoDuration` are in stored settings and can populate a new unsubmitted prompt/settings draft. History does not trigger a second provider job.
- **Status:** CODE IMPLEMENTED, TESTS AUTHORED BUT NOT RUN, LIVE PROVIDER UNVERIFIED. No production activation, provider credentials, commercial Stripe settings or future roadmap blocks were modified.

Official API references: https://ai.google.dev/gemini-api/docs/veo and https://api.byteplus.com/api-explorer/?action=CreateContentsGenerationsTasks&groupName=Chat+API&serviceCode=ark&version=2024-01-01 .


## Seedance 2.0 image-reference roles — BASE #5

Official ModelArk video generation supports distinct **mutually exclusive** workflows. The existing Deepsyq Video Studio now offers only the following small, supported image-reference subset for `byteplus-seedance-2`:

| Studio mode | Reference photos | ModelArk `content[].role` |
|---|---:|---|
| Text to video | 0 | Text only |
| First frame | 1 | `first_frame` |
| First and last frames | Exactly 2 | `first_frame`, `last_frame` in the user's thumbnail order |
| Scene reference images | 1–3 | `reference_image` for each image |

No mixing of these modes is allowed in one job. Images are locally prepared as PNG/JPG under the existing 1 MB **per-file** API limit; the server still checks MIME signatures, Base64 lengths, max references and model capabilities. The ModelArk adapter separately rejects contradictory modes or counts before any provider call. Google Veo remains limited to text or one first-frame image: it cannot accept Seedance's extra role names through our adapter.

Selected `videoInputMode` enters estimate/create, request fingerprint, signed-in History job settings and same-session editor drafts. A History prompt reuse cannot recover old reference image bytes, so users must add photos again before using a photo-guided mode. Mode changes reset provider consent.

**Credit safeguards:** legacy quote rows cover only the existing text or single-first-frame mode, never the newly introduced first+last or reference-image guidance. The newer modes require explicit per-model `videoInputMode` **and exact** `referenceCount` in `AI_MODEL_PRICING_JSON` (e.g. `videoInputMode: "first_last", referenceCount: 2`). These are validated before owner-preview or wallet-enabled paid provider dispatch. Values/credit amounts are **not** prepopulated or guessed. No new premium mode is enabled in production.

**Out of scope for this pass:** BytePlus accepts reference video as an accessible `video_url.url` (rather than a raw local file). Audio reference also needs provider-acceptable media transport. Until authenticated uploads, private durable storage, provider-reachable references with safe expiry, size/duration/MIME validation and approved unit economics are complete, **video/audio reference upload and edits remain unavailable**. No external URL from a user is forwarded, no new paid submission is performed, and no background media-hosting feature is claimed.

**Status:** implemented in repository, no live provider request or complete browser/provider billing acceptance run (deferred at owner's request). Official: https://ai.byteplus.com/ark/region:ap-southeast-1/docs/create-video-generation-task-api .


## Video draft recovery — private, tab-scoped BASE flow

Video Studio now follows the privacy pattern already used by Image Studio. In a single browser tab, it autosaves only the active video **prompt, model, aspect ratio, resolution, duration, input mode and intended reference count**, for at most **24 hours**, under a key scoped by a hash of the active auth session. Source photos and their Base64 data are **never** persisted. All cached settings are validated against the known Video model catalog before being applied after a refresh.

If the saved draft used reference photos, the restored form deliberately has **zero photos and unchecked provider consent**. The Generate button is blocked until the user explicitly reattaches the correct count and the saved first-frame/first-last/reference-image role is restored, or clicks **Continue without old photos** to clear their dependency and use text-only generation. Partly reattaching references does not bypass this guard. **Clear video draft** removes saved description, model settings and local attachments without touching previously generated jobs or server History.

Reusing a photo-guided item from History similarly does not silently reuse the user's unrelated current photos. Draft recovery is a separate client-side feature: it does **not** start another provider request, revive a cancelled job, access media storage, mutate the AI wallet, or replace the existing server-side background job and History flow. New explicit Studio workflow/template handoffs take precedence over an older saved video draft.

**Implementation only / unverified.** Browser cases were added for session refresh, user clearing, two-frame reattachment and zero paid POSTs. The broader BASE testing and provider acceptance phase remains deferred. No storage policy, production or Stripe changes made.


## Unreleased video/audio input staging — BASE #5

A **backend-only safety foundation** has been added. This section is deliberately NOT a user-visible media upload or a connected Seedance multimodal workflow.

- `server/generation-reference-media.js` performs fail-closed inspection of local `Buffer` media intended for later staging. It currently accepts only `video/mp4` (max 20 MiB, a parseable MP4 `ftyp` + `moov/mvhd` + video `trak` + `mdat`, duration up to 30s) and `audio/wav` (max 8 MiB, RIFF/WAVE with coherent PCM 16-/24-bit mono/stereo framing, duration up to 60s). It rejects MIME spoofing, malformed/truncated sizes, incomplete metadata and unspecified formats such as MP3. These are **conservative admission bounds**, not assertions that ModelArk accepts those duration/codec combinations. Full media-probe/codec, malware and provider-specific checks are mandatory before commercial use.
- The existing `createObjectStorage()` adapter has **private** `putStagedReference({userId,mime,bytes})`, `getStagedReference({userId,key,mime})` and `deleteStagedReference({userId,key})`. Keys use the existing owner hash plus a random UUID under `references/users/`, isolated from generated output. All operations require the existing private S3-compatible configuration and the independent gate `AI_STUDIO_REFERENCE_STAGING_ENABLED=true`, which MUST REMAIN UNSET/FALSE while there is no upload lifecycle. Owner-scoped reads/deletes reject a different user. The API returns no public URL and cannot create a paid provider job.
- There is **no HTTP upload endpoint**, no client media input, no automatic deletion or TTL enforcement, no provider-accessible time-limited URL, and no connection to `content.video_url` or `content.audio_url`. Do not enable this gate until a durable per-user upload ledger, expiration worker/bucket lifecycle, secure signed provider transfer, validated real provider input rules, privacy/legal retention decision, and owner-approved credits economics are in place. The current modules do not by themselves make reference video/audio available.
- Mocked unit cases cover MP4/WAV happy paths, spoofed/truncated/too-long media, default-off flag, owner-scoped read/delete, signed operations and lack of provider URL. **Tests not run** under owner's BASE-first testing policy. No production environment changes.

This deliberately keeps existing Photo → Video and the server-owned video-job/history flow unchanged, preserving all prior safeguards.
