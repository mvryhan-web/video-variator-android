# JARVIX implementation status

Updated 2026-11-02. These changes target the isolated DEV preview only.

## Working in this change

- Jarvix chat and reset endpoints are available in the DEV preview. They use the deterministic local mock, keep short-lived per-process session context for the current browser tab, cap request size and rate, and make no provider or generation calls.
- The knowledge endpoint indexes all 29 user-facing HTML pages (excluding the two admin panels), including visible headings, form fields, labels, select choices, buttons, and local navigation links (416 visible controls on the live preview). The zero-spend brain answers common tool-finding questions in Russian, English, Spanish, and French. Generic links such as the teleprompter route are given a clear tool name instead of their placeholder link text. Jarvix's model registry and studio panel use the current shared model catalog and show whether each entry is enabled, adapter-backed, or catalog-only. If the OpenAI adapter is explicitly enabled later, it receives this index with the prompt.
- F8's Luna, Mira, and Nova sprites now preload their eight animation frames before playback. The live DEV preview was checked for all three pets: each image loaded at 168 × 168 pixels and changed frames. Published in PR #511.
- The four-language teleprompter route-label fix was reproduced before release, covered by regression tests, and verified live after PR #512.
- Site language selection routes speech to RU, EN, ES, or FR browser voices. The browser chooses a voice per language and operating system, so the timbre can vary.
- Billing, AI generation, login, and payments remain disabled in the preview.
- Fake tone WAVs and the misleading sample generator were removed. The TTS and STT server routes now report `VOICE_MODEL_NOT_INSTALLED` instead of returning tones or empty transcripts.
- OpenAI integration uses the Responses API but requires both a server secret and `JARVIX_AI_ENABLED=true`. A stored key alone does not trigger a paid call. No key was created or installed as part of this change.

## Still needed for the requested dedicated voice and full brain

- Select and license one original male voice/model that supports Russian, English, Spanish, and French; install and host its inference runtime; then test naturalness and language switching on target devices. Browser synthesis cannot guarantee the same voice or a male voice on every device.
- Add a real speech-to-text model if the browser recognition API is insufficient.
- Add a durable, user-owned conversation store with explicit retention and deletion behavior. Current preview memory lives in process memory and expires after 30 minutes or a service restart.
- Provide an OpenAI API key through the Render secret manager and explicitly enable paid inference if the owner chooses that provider. The API adapter is disabled by default.
- Verify provider-backed responses, cost controls, and persistence in a controlled environment before production. Production was not changed.

## Verification

Run the Jarvix and isolated preview checks with:

```sh
node --test tests/deepsyq-preview.mjs tests/jarvix-brain.test.mjs tests/jarvix-voice-bargein-pets.test.mjs tests/jarvix-site-knowledge.test.mjs tests/virtual-pet-assets-unit.mjs
```

Latest local run: 29/29 tests passed. The local Playwright browser suite could not run because its Chromium binary is not installed; the relevant pet and Jarvix behavior was verified in the live DEV preview.

## P correction — 3 November 2026

- Selected site language now overrides the browser language for chat requests and spoken replies. A Russian OS no longer forces Russian after selecting EN/FR/ES.
- Browser output requires an explicitly recognized male voice for the selected language. If unavailable, no female/unknown speaker is substituted; Studio keeps the text reply and explains why audio is unavailable. This is a restricted browser fallback, NOT the requested single self-hosted speaker.
- The F8 settings dialog is constrained to the viewport, including 320px screens; shrinking grid tracks and long labels no longer force horizontal overflow. All 16 preferences remain.
- Physical GLB/rig/animation/sprite checks pass for all three pets. Visual inspection of current turnaround PNGs still shows primitive geometry, flat eyes and visible silhouette defects; owner-approved concepts have not been faithfully reproduced. F8 artwork is NOT final or owner accepted.
- No original licensed speaker profile, loaded speech weights or inference service exists in this checkout. TTS/STT remain BLOCKED_SPEECH_HOSTING. No OpenAI key was created/installed and no billable inference was run. Secure API access, authenticated memory and cost gates still require completion before live use.
- Local no-spend checks: 52 passed. Browser download in this host returned a corrupt ZIP; browser acceptance is delegated to the focused GitHub CI run and must be reported separately.
