# Deepsyq Create Music — Agent B no-spend provider audit (2026-10-16)

Scope: original BASE #7 provider adapter (music extension), owner issue #177. No user-visible Music UI changes; Agent A #169 owns design, genres and licensed audio demo assets. D owns credit/Stripe review. No provider key, paid generation, account authorization or production release performed.

## Confirmed public official provider documents

- Google Lyria 3 Clip: `lyria-3-clip-preview`, **fixed 30-second MP3**, text-to-audio `POST /v1beta/models/lyria-3-clip-preview:generateContent`. The current legacy `generateContent` API is documented and need NOT be replaced solely because another official guide prefers Interactions: https://ai.google.dev/gemini-api/docs/generate-content/music-generation
- Google Lyria 3.5: `lyria-3.5`, full-length music with approximate prompt-controllable duration (not exact-second UI), MP3. Its activation and model-specific quote are NOT approved: https://ai.google.dev/gemini-api/docs/models/lyria-3.5
- Google public USD prices observed 2026-10-16: Clip $0.04/request; Lyria 3.5 $0.08/request, no free tier. **Advisory only**: official pricing may change, and these values do not automatically authorize public credits, model flags or external calls. https://ai.google.dev/gemini-api/docs/pricing
- Official Suno Platform portal is https://platform.suno.com/ and redirects to account login; API docs, credentials, usage pricing, plan eligibility and explicit authorization for a consumer-facing, third-party music generator are NOT verified. Consumer Suno subscriptions are not API distribution licenses; never use unofficial cookie wrappers or reseller proxies without a verified authorized contract. Treat Suno integration as **BLOCKED pending official agreement and owner account review**. See Issue #177.
- Google model provider authorization, approved commercial pricing/credits, private S3 bucket, lyrics/content rights, SynthID notice, and signed authenticated owner access remain external gates, not resolved by these fixtures.

## Existing implementation and scoped changes

- Existing Studio `kind=music` (Audio entry) selects `lyria-3-clip-preview`; `song` or `instrumental`, authenticated server-side generation, status/history, wallet/storage framework already exist. No working public music user flow verified.
- Added separate server-only Lyria Clip prompt/output parser. Handles lyrics in any response part order; verifies MP3 signatures and bounded base64 payload; rejects mislabeled WAV, HTML/error bytes and unsupported fabricated native settings. Does not invent Suno, Google Lyria 3.5, exact duration, genre structured API, custom-lyrics API parameter, or licensing.
- No public flags enabled. Adapter inputs still require existing `consent` and model selection. No new provider account, router, DB, wallet, storage or Stripe.
- Any provider output MP3 trust check is a minimum file signature guard, not codec malware/full duration assurance. One explicitly priced live test requires owner permission, confirmed provider terms, private storage and approved currency-specific cost/credit quote first.
- Real MP3 playback/genre samples/expanded custom lyrics controls remain **NOT IMPLEMENTED** in this scoped PR; Agent A designs UI and licensed preview assets under #177. Existing tools TTS/audio trimming/video-to-audio unaffected.

## Release outcome

CODE PREPARED / OFFLINE TESTS and GitHub final-head CI to be recorded separately. Not merged/main/deployed/live or eligible for public music billing. ORIGINAL BASE #7 overall remains PARTIAL.

## Subsequent no-spend server-side Music composition contract

For later Agent A UI wiring, backend-only optional properties: `musicGenre` (lofi, pop, hiphop, edm, rock, cinematic, jazz, ambient), `musicMood` (warm/calm/energetic/melancholic/dreamy/dark), `musicInstruments` (up to 4 from a validated initial set), `musicTitle`, `musicLanguage` (initial 7 locale tags) and `musicLyrics` (up to 1500 characters; song-only). These are validated server-side and converted to **ordinary text instructions**, not advertised as distinct Lyria native API parameters. Duration remains fixed 30s. Music estimate validates exactly the same controls before credit quote; job request includes settings for subsequent History. UI, lyrics rights and real provider fidelity still require independent validation. Google documents custom lyrics as text included in prompt: https://ai.google.dev/gemini-api/docs/generate-content/music-generation#provide-custom-lyrics .
