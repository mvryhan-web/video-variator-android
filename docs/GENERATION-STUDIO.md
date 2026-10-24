# Creative Studio — isolated owner pilot

Production main baseline: 259653624375d6fe383d721a0022e7030fbb14be. No deployment approved.

Separate `generate-studio.html`: video, images and audio; clearly unavailable translation.
US English; Russian device locale translation; responsive mobile layout. Images: description,
PNG/JPEG reference files up to 3 × 1 MB, supported ratios. Video: text or one image,
8 seconds 720p, 16:9 / 9:16. Music: 30-second song with vocals or instrumental.
Adapters: Google Gemini image/video/music; BytePlus Seedream 3.0, 4.0, 4.5, 5.0 Lite and 5.0 Pro;
BytePlus Seedance 1.0 Pro/Pro Fast, 1.5 Pro, 2.0/2.0 Fast/2.0 Mini and 2.5; and OpenAI GPT Image.
Provider calls still require the server key, per-model allowlist, approved price and the existing
purchased-only dispatch boundary. BytePlus videos also require an approved download host and
durable storage before public activation. Suno Voice, Seed Audio, Seed Speech, Seedance 1.0 Dreamer,
Arcto, and the requested Seedream Art Edition are still disconnected because their official API
mapping or commercial access is not verified.
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
back to Google. The BytePlus REST adapter uses the official ModelArk model IDs and limits for
Seedream and Seedance variants. API contract tests use mocked responses; no live provider call
is implied. Provider keys, activated account products, approved prices and runtime allowlists
remain prerequisites to real generation. Seed Audio/Seed Speech remain disconnected.
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


## Durable reference ledger and expiry cleanup — BASE #5

This follow-on is **server-only and default OFF**. There are no new browser media pickers, upload routes, provider media links or paid AI requests.

- The existing `server/ai-migrations.js` manifest now includes the **new** `20261015-generation-reference-assets.sql` additive migration. Existing applied migration files/checksums were not rewritten. The ledger `vv_generation_reference_assets` tracks UUID, user ID, private object key, MIME/size/duration, state and explicit expiry; an index supports cleanup scans.
- `server/generation-reference-ledger.js` creates the database row in `uploading` **before** S3 PUT, using a deterministic precomputed UUID key from the existing storage adapter. When completed, it marks the row `ready` and returns only non-secret metadata. An ambiguous PUT is tracked as a failed/expiring row, not forgotten. Reads check authenticated owner ID, `ready` state and `expires_at>NOW()`.
- `cleanupExpired()` atomically claims expired or abandoned rows through `FOR UPDATE SKIP LOCKED` and deletes only that owner's staged object from private S3. Successful S3 deletion deletes the ledger row (no indefinite metadata retention). Failed deletion retains a retryable row. Abandoned in-progress deletions become eligible after 15 minutes. This **never** starts a new generation or retries a paid provider request.
- An optional 10-minute cleanup loop uses the **existing** `server/generation-worker.js`, rather than adding another worker. No worker was deployed or started here. `AI_STUDIO_REFERENCE_CLEANUP_ENABLED=true` allows cleanup even if `AI_STUDIO_REFERENCE_STAGING_ENABLED=false` (important during rollback); staging additionally requires both flags, private object storage, and an explicit `AI_STUDIO_REFERENCE_TTL_MINUTES` in the range 5–1440. No TTL is assumed. Both new flags remain unset/OFF.
- This ledger does not replace full media codec scanning, retention/legal review, upload authentication, rate limits, provider-reachable signed reference URLs or BytePlus acceptance. **Do not activate** staging until these gates pass and the new SQL migration is backed up, reviewed and applied through the existing runner.
- Added focused mocks for row-before-object persistence, user isolation, TTL expiration, retryable deletion, uncertain upload and cleanup continuing after disabling new uploads. **Test files authored but not run**, following the BASE-first deferred-testing instruction.


## BASE #5 — owner-only HTTP media reference intake (2026-10-15)

An additive, **disabled-by-default** `POST /api/studio/references` endpoint now accepts one raw `video/mp4` (up to 20 MiB) or `audio/wav` PCM (up to 8 MiB) body. These formats undergo the existing conservative structural/duration validation (MP4 maximum 30 seconds; WAV maximum 60 seconds). Authentication uses the existing bearer JWT and **the same Google-owner restriction as Studio Admin**. It deliberately accepts **no multipart, JSON/base64, arbitrary URL, or compressed request body**. The global raw-video rejection middleware remains in place for every other API route.

The endpoint uses the **existing** `vv_generation_reference_assets` PostgreSQL ledger, private S3 adapter and expiry cleaner. New per-owner uploads are admitted under a PostgreSQL transaction-scoped advisory lock, limited to at most two unexpired uploading/ready/failed references per owner. It records the ledger row before writing to S3. On success the response contains only owner-scoped asset metadata, `stagedOnly:true`, and `providerReady:false`—never bytes, public links, temporary provider URLs or paid job IDs. A failed/ambiguous upload remains eligible for cleanup once expired.

**Not a public production feature:** `AI_STUDIO_REFERENCE_UPLOAD_ENABLED=false` by default. Pilot staging also requires `AI_STUDIO_ENABLED=true`, private object-storage configuration, `AI_STUDIO_REFERENCE_STAGING_ENABLED=true`, `AI_STUDIO_REFERENCE_CLEANUP_ENABLED=true`, an explicit validated 5–1440-minute TTL and the additive ledger migration in a controlled environment. The owner must confirm an operational cleanup worker, bucket retention/permissions and backup/rollback before any pilot. Do not activate these variables merely because a route now exists.

**Remaining external gates:** real media probing (supported codecs, malware/security analysis, sanitization), durable rate policy and abuse limits for public users, end-to-end storage and cleanup tests with the real worker, encrypted/private short-lived provider-access transport, BytePlus acceptance and model compatibility, approved per-input usage pricing, and explicit wallet consent before any provider call. In particular, **this API does NOT send staged media to BytePlus, invoke generation, debit Stripe or reserve AI credits**. `tests/generation-reference-upload-unit.mjs` contains owner/auth/body/quota regression cases but they have not yet been executed on a fully equipped runner.


### BASE #5 — fail-closed codec probe (2026-10-15)

Before inserting a ledger record or writing any bytes to private S3, the owner-only `POST /api/studio/references` pipeline now runs:

1. Existing bounded MP4 / PCM-WAV container and metadata checks.
2. A **real ffprobe executable** on a randomly named local private temporary file, using a restricted file-only protocol, a 10-second subprocess timeout, a 128 KiB stdout cap, and unconditional temporary-file cleanup.
3. A conservative codec allowlist: MP4 must contain **one H.264/yuv420p video track** (16–3840px wide, 16–2160px high, <=8,294,400 pixels, 1–60 fps) with optional single AAC audio track; WAV must contain one PCM s16le/s24le audio track with one or two channels at 8–96 kHz. Existing MP4 30s and WAV 60s duration/byte caps continue to apply.

Unsupported codec metadata returns HTTP 415. Missing, inaccessible or timed-out FFprobe blocks upload with HTTP 503; **there is no fallback to unsafe unprobed staging**. Neither structural parsing nor FFprobe is a malware scan, decoding/sanitization guarantee, provider-compatibility confirmation or proof that the file is safe to publish. Keep external provider-media transfer disabled until dedicated security review, real private S3/worker acceptance, signed short-lived transfer, and approved pricing/credits flow.

Regression tests include fake/invalid codec metadata, temporary file cleanup, missing FFprobe, a real PCM WAV and (only where local FFmpeg/libx264 is available) a locally encoded H.264 MP4. `.github/workflows/deepsyq-reference-intake.yml` independently runs targeted parse/codec/API/ledger/S3 unit checks on GitHub Actions, without live paid provider calls.


### BASE #5 — cleanup-only worker recovery (2026-10-15)

The same `npm run worker:generation` process can now perform **reference-expiry cleanup without an active AI provider**, as part of the existing worker (no second service, no wallet or router). `generationWorkerPlan()` enables provider recovery and reference cleanup independently. A cleanup-only process does not create/submit/restore AI jobs or initialize a generation wallet.

**Opt-in and fail-closed:** cleanup-only requires the **existing configured PostgreSQL connection**, `AI_STUDIO_REFERENCE_CLEANUP_ENABLED=true`, an already configured private S3-compatible object store, and a previously applied **matching-checksum** `20261015-generation-reference-assets.sql` migration (checked read-only by `aiMigrationStatus`). Do not auto-run migrations on startup. `AI_STUDIO_ENABLED=false`, `AI_STUDIO_BACKGROUND_POLLING=false` and absent BytePlus/Gemini keys do **not** prevent deletion of old references. If cleanup is requested but credentials or schema are missing, worker refuses to start instead of displaying a fake healthy state. Turning off `AI_STUDIO_REFERENCE_STAGING_ENABLED` still prevents new uploads while allowing deletion of existing references.

The existing 10-minute cleanup tick, private owner keys, atomic expired-asset claims, 15-minute stale claim recovery, and retry on failed S3 DELETE are unchanged. If a worker is interrupted mid-deletion, its claim is reclaimed in the next cycle after the stale-claim timeout. This does **not** prove a Render background worker, S3 retention rules or PostgreSQL migration are deployed; production still requires owner approval and staged acceptance. The reference intake remains switched OFF.

Official ModelArk video documentation indicates Seedance 2.0 supports a `reference_video` input using a reachable video URL and `reference_audio` input via URL **or bounded WAV Base64**; audio length and total payload have provider-specific caps (for Seedance 2.0, individual audio 2–15 seconds), so our broader 60-second storage admission must not be confused with permission to submit a paid provider request. See: https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api . **No provider transfer, Base64 submission, presigned public URL or credit reservation is enabled by this step.**


### BASE #5 — Seedance 2.0 pre-dispatch media policy (2026-10-15)

`server/generation-reference-compatibility.js` is a **pure, server-only, read-only** compatibility check for future Seedance 2.0 reference requests. It neither accesses S3 nor starts a provider request, and never returns a public URL. It is separate from the broader private staging rule: a file being accepted into private storage is **not** a promise that the model can process it.

The policy uses current official ModelArk constraints for reference videos: MP4/H.264, 2–15 seconds each, at most three videos, up to 15 seconds combined, 24–60 fps, aspect 0.4–2.5, pixel count 407696–8295044, provider-supported dimensions. Audio is PCM WAV, 2–15 seconds each, at most three clips, up to 15 seconds combined, with at least one image/video accompanying audio. Conservative Deepsyq storage caps of 20 MiB/video and 8 MiB/audio still apply. It rejects other models by default.

The validator currently has **no generation hook**: before shipping, run it again on trusted server-generated FFprobe metadata for each owner-scoped, unexpired ledger asset during a consented and priced quote/create request, not on client-supplied metadata. For Seedance 2.0 video, ModelArk documents a provider-fetchable video URL or approved asset ID; for supported audio, ModelArk permits URL or bounded Base64. Neither provider transfer method is implemented here, and no AI credits or Stripe operation are performed. Security, provider acceptance, provider body-size budgeting, pricing and safe signed transfer remain release blockers. Source: https://docs.byteplus.com/pt/docs/modelark/create-video-generation-task-api


### BASE #5 — private stored-asset reinspection before future BytePlus consent

`server/generation-reference-inspector.js` adds a **server-only, read-only** bridge between the existing private reference ledger, FFprobe and `seedance20ReferenceCompatibility`. Given an authenticated owner ID and UUIDv4 asset IDs, it retrieves each asset through the owner-scoped ledger (which enforces the `ready` state and expiry), re-inspects the **actual S3 bytes** with the local FFprobe allowlist, and only then applies Seedance 2.0's narrower model-level video/audio limits. It rejects malformed/duplicate IDs before S3 GET, serializes reads to bound memory, and never trusts client-supplied codecs, URLs, resolutions or durations.

The returned object is **metadata only**: compatibility verdict, reason and aggregate counts/durations. No provider payload, public media URL, signed S3 link, raw bytes, payment authorization or generation job is created. This bridge is deliberately not wired to public Studio quote/create, because provider fetch transport, approval of model-specific credits, audio/video security/sanitization and owner consent are still outstanding. Its owner-scoped behavior is tested both with mocks and in isolated PostgreSQL against real PCM WAV and a fake signed S3. A stored WAV shorter than the provider's 2-second minimum is correctly refused despite having passed the more permissive staging validator.

Tests use a disposable schema inside **localhost-only** `vv_ai_test` on PostgreSQL 16 and a local in-memory fake S3 fetcher; they do not touch the live Render database, real cloud storage, BytePlus or Stripe. The dedicated GitHub Actions `deepsyq-reference-intake.yml` workflow provisions its own service container and discards the fixture after each run. The worker's migration/backup production rules remain unchanged.


### BASE #5 — private WAV-only ModelArk payload preparation (2026-10-15)

**Official ModelArk source:** https://ai.byteplus.com/ark/region:ap-southeast-1/docs/create-video-generation-task-api . Seedance 2.0 reference audio accepts `audio_url.url` with a `data:audio/wav;base64,...` value and requires the `reference_audio` role. A normal Seedance 2.0 request with audio must also contain image or video material. Reference **video** must instead be supplied by provider-fetchable URL or provider-trusted asset ID; do **not** expose Deepsyq's private bucket or invent an unauthenticated proxy.

New `server/generation-reference-audio-payload.js` is **inert, unconnected server-only payload preparation**; it does not call ModelArk, debit credits, create jobs, write S3, publish URLs, or add an HTTP endpoint. Two flags, `AI_STUDIO_REFERENCE_AUDIO_PAYLOAD_ENABLED=false` and `AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED=false`, both default OFF. An injection-only server callback `verifyVisualContext({userId,model})` must establish a trusted visual input count before the preparer proceeds: the browser cannot simply claim it included an image. It supports only the existing Seedance 2.0 model ID, at most three UUIDv4 PCM WAV reference IDs belonging to the same owner, server-side ready/unexpired ledger retrieval, mandatory real FFprobe, compatibility constraints (each 2–15s, sum ≤15s), and strict 1 MiB per-WAV / 5 MiB serialized payload ceilings. It encodes `{type:'audio_url',audio_url:{url:'data:audio/wav;base64,...'},role:'reference_audio'}`, keeping this sensitive output **strictly server-private**.

The helper is not wired to the existing BytePlus adapter or Studio quote/job route: model cost/credits, portrait/privacy rights restrictions (ModelArk notes special handling for real human faces), explicit consent, anti-malware screening, complete request-body budget including prompt and images, and real provider acceptance remain missing. Flags are not approval to turn on paid calls or production transport. Reference-video URL delivery is **not implemented** and must wait for a short-lived owner-scoped and abuse-resistant design. Run `deepsyq-reference-intake.yml` for both mock and real local PostgreSQL/fake S3 test acceptance; no paid credentials are used.


### BASE #5 — offline private video reference signing, not a live transport (2026-10-15)

ModelArk documents `{type:'video_url',video_url:{url:'https://...'},role:'reference_video'}` for Seedance 2.0. Unlike WAV Base64, video requires a provider-reachable URL (or a model-owned digital-character asset ID), and provider-side fetch latency, S3 compatibility and face/privacy policy must be verified before paid use. Source: https://ai.byteplus.com/ark/region:ap-southeast-1/docs/create-video-generation-task-api . The linked AWS S3 SigV4 query specification is https://docs.aws.amazon.com/AmazonS3/latest/developerguide/sigv4-query-string-auth.html .

This branch adds a **server-only, not wired into the API/provider** S3 SigV4 GET signer in the existing `createObjectStorage`, a narrow `getForVideoTransfer` ledger query, and `server/generation-reference-video-transfer.js`. The planner requires an existing owner-scoped ready/unexpired MP4, actual S3 bytes reread and re-validated with FFprobe/Seedance metadata checks, then a second SQL read confirming more than 90 seconds remain in the ledger. The S3 signer only signs the exact hashed-owner path returned by storage and rejects wrong owners, arbitrary keys, internal/IP hostnames, non-allowlisted hosts, non-HTTPS endpoints and requested URL lifetimes outside **15–60 seconds**. The planner currently uses **30-second** signed GETs. These are bearer secrets to a single private S3 object, **not public-bucket permissions**; they must never be emitted in browser/API responses, history, logs or persisted tasks. Deleting the object prevents further successful fetches; a URL may remain valid until its cryptographic expiry even after the database row expires.

Default flags: `AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED=false` and `AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED=false`, plus empty `AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS`; all three constraints must be explicitly set only in an isolated approval context. `AI_STUDIO_REFERENCE_STAGING_ENABLED` and `AI_STUDIO_REFERENCE_CLEANUP_ENABLED` are also required. This is **not sufficient** for commercial live video reference generation: verify real provider fetch from a private bucket/CDN without leaking credentials, safe malware/content handling, human-face input rights, signed-URL expiry vs asynchronous provider fetch latency (30 seconds may be too short), owner consent, wallet cost reservation and retry/idempotency behavior. No AI provider request, new public upload endpoint, Render migration/deployment, Stripe change, provider key or roadmap block is made by this step.

The signer is covered by targeted mock tests of SigV4 canonical query/signature generation, exact host allowlist, owner scope, fail-closed defaults, TTL and wrong-key denial. An isolated disposable Postgres 16 + fake private S3 acceptance test can also create an actual local FFmpeg H.264 clip, stage it under the existing ledger, re-probe the file and prepare the `reference_video` URL in memory, before expiring and deleting the object. These tests are **fixtures only**, not evidence that the real provider can fetch or accept presigned URLs.


### BASE #5 — local SigV4 HTTP verification versus real S3 acceptance (2026-10-15)

A new isolated GitHub Actions workflow `.github/workflows/deepsyq-reference-s3-protocol.yml` tests S3 SigV4 signing using a **real loopback HTTP request and an independent S3-like signature verifier**, with a fixture object and fake credentials. Run **38792787579** passed **1/1**: GET with valid presigned URL succeeds; altered or missing signatures, expired timestamps, and GET after signed DELETE fail. This does **not** prove compatibility with a real S3 provider or that ModelArk can fetch the URL. The official archived MinIO images could not be pulled from Quay or Docker Hub (runs **38791985947** and **38792200637**), so the optional real MinIO acceptance remains blocked, not skipped as a success. No unaudited third-party mirrors were substituted.

The complete staging and launch gate is documented separately in `docs/GENERATION_REFERENCE_S3_STAGING_ACCEPTANCE.md`. User-facing reference upload, secret signed URLs, AI provider submission, wallet credits, Stripe and Render migration/deployment remain unchanged and OFF. Never expose the bearer URL in a client response, a log or a durable job record; never enable the provider input path until owner-controlled real S3 and real ModelArk fetch acceptance plus approved consent/pricing.
