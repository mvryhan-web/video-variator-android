# JARVIX NEW — VOICE-ONLY CONTRACT FOR TEST (2026-11-11)

## Exact approved experience

On **https://jarvis-new.deepsyq.pages.dev/** the owner clicks the
**existing original JARVIX sphere** in the DEEPSYQ header. It visually
pulses, says a short greeting, requests browser microphone consent
when necessary, listens, sends recognized text to a real local model,
speaks that model's response, and listens again. Clicking the sphere
again stops listening and speech.

**Do not** add: Open JARVIX link, new chat page, text composer, pairing
code form, separate "Connect" step, canned/template AI answers or fake
"task completed" messages. Do not change the owner's original sphere.
The existing Tour and Download JARVIX header controls remain separate.

## Implementation already committed

- `app/src/main/assets/jarvix-new-voice.js`: browser voice state
  machine using system SpeechSynthesis, SpeechRecognition and ordinary
  OS/browser microphone permission.
- `app/src/main/assets/jarvix-new-preview-entry.js`: initializes
  voice from existing `#topJarvisBtn`; removes previous temporary
  banner and old inline chat composer from TEST home.
- `scripts/prepare_jarvix_new_test_preview.py`: removes obsolete
  `jarvix-new.html` from staged preview only; source remains in repo
  as historical work, but is NOT a user-facing TEST page.
- `scripts/jarvix_new_preview_worker.js`: redirects old TEST Jarvix
  routes back to home. **All `/api` routes are disabled** on the
  isolated Cloudflare preview; NO Gemini/Alibaba calls and NO canned
  replies. Uses no-store headers on voice entry scripts.
- `jarvis_new/local_bridge.py`: localhost-only
  `POST /v1/voice/chat` (strict TEST origin, private-network browser
  consent, length/rate limits, no code input) backed by local Ollama.
  Existing privileged task APIs keep random bearer token.
- `jarvis_new/desktop.py`: voice bridge automatically starts on
  user-launched desktop app; user may disable it. No automatic OS
  computer-control grants.
- `jarvis_new/coordinator.py`: speaker-recognized text and verified
  Ollama replies in per-owner local SQLite for same-PC history reuse.
  Raw microphone recordings are NOT saved.
- Original legacy JARVIX and canonical production deepsyq.app MUST
  remain unchanged.

## Verified results

- Windows and Linux no-cost voice API unit tests:
  https://github.com/mvryhan-web/video-variator-android/actions/runs/43042863697
- Deployed test-site Chrome UI checks (actual page/sphere, mocked
  browser mic and mocked local AI response, desktop + mobile):
  https://github.com/mvryhan-web/video-variator-android/actions/runs/43043323616
- Cloudflare test-only deployment that introduced voice-only UI:
  https://github.com/mvryhan-web/video-variator-android/actions/runs/43041900854
- Further no-store preview redeployment:
  https://github.com/mvryhan-web/video-variator-android/actions/runs/43043720464

**Do not overclaim**: browser UI mock tests do NOT prove physical
microphone, installed Ollama or spoken model response on user's PC.
Real voice answers require the current desktop app **running** and at
least one **locally installed Ollama model** on that SAME PC. OS/browser
local-network and mic permissions cannot be silently bypassed. This is
local desktop ↔ local browser synchronization, not cloud cross-device
synchronization. A test MSI/EXE without trusted signature may still
trigger Windows SmartScreen. No paid API usage is authorized.

## Follow-up acceptance on a real PC

1. Install the updated and trusted desktop application (current stale
   GitHub prereleases may NOT contain this change). Start it once.
2. Verify Ollama is already running and lists a local model, or ask
   the owner for permission before installing/downloading models.
3. Visit the TEST site in Chrome or Edge, click the existing original
   sphere. Grant microphone/local-network permissions normally.
4. Listen for JARVIX greeting and see pulsing original sphere.
5. Ask a novel question and verify an ACTUAL local model response
   spoken aloud, followed by listening again. Reload and verify the
   same-PC local conversation journal restores context.
6. Click sphere again to stop mic; verify no recording or local calls
   continue. Check wrong Origin cannot call local bridge.
7. Only after this verified, discuss trusted MSIX/Store distribution.
   Never recommend bypassing Windows SmartScreen.
