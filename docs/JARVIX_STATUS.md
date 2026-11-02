# JARVIX implementation status

Updated 2026-11-02. These changes target the isolated DEV preview only.

## Working in this change

- Jarvix chat and reset endpoints are available in the DEV preview. They use the deterministic local mock, keep short-lived per-process session context for the current browser tab, cap request size and rate, and make no provider or generation calls.
- The knowledge endpoint indexes all 29 user-facing HTML pages (excluding the two admin panels), including visible headings, form fields, labels, select choices, buttons, and local navigation links. The zero-spend brain uses those routes to answer common tool-finding questions in Russian, English, Spanish, and French. Jarvix's model registry and studio panel use the current shared model catalog and show whether each entry is enabled, adapter-backed, or catalog-only. If the OpenAI adapter is explicitly enabled later, it receives this index with the prompt.
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
