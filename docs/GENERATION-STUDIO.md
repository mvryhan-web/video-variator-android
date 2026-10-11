# Creative Studio — isolated owner pilot

Production main baseline: 259653624375d6fe383d721a0022e7030fbb14be. No deployment approved.

Separate `generate-studio.html`: video, images, music and clearly unavailable translation.
US English; Russian device locale translation; responsive mobile layout. Images: description,
PNG/JPEG reference files up to 3 × 1 MB, supported ratios. Video: text or one image,
8 seconds 720p, 16:9 / 9:16. Music: 30-second song with vocals or instrumental.
Adapters: Nano Banana 2 (`gemini-3.1-flash-image`), Veo 3.1 Lite, Lyria 3 Clip.
No Suno/Seedance/Kling/OpenAI connectors or file dubbing implemented yet.
No consumer account scraping, subscription credit reuse, paid fallbacks or retries.

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
