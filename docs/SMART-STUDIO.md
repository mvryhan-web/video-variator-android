# Smart Studio prototype

Separate local tool on `smart-montage-preview`, never deployed automatically to Render.

- Visible-face tracking: BlazeFace short-range detector in a classic worker, 2 samples/sec, nearest-face association, smoothed horizontal crop. It does not identify people or track a hidden body. Low coverage blocks tracking export instead of pretending it worked. Multiple people can cause switching.
- Captions: existing local Whisper-base/q8 worker, optional word timestamps. Editable text/start/end. A transparent PNG sequence renders word emphasis and brand text into the MP4 with the existing FFmpeg WASM runtime. No raw file POSTs.
- Style: caption color, size and brand name saved locally. No cloud voice, paid API, logo upload or account/billing changes.
- Limits: 60 seconds / 150 MB, up to 250 caption entries, vertical video height at most 1280 / original-format longest side at most 1280, same audio packets and original duration, optional explicit 9:16 crop. Keep this page visible while frame analysis is running. Real phones must be tested for model memory, decoding and speed.
- Results: preview, Download, Share, Delete preview. Android auto-save uses existing Movies/VideoUniquifier bridge. Delete preview does not remove files already saved outside the app.

## Model packaging

Run `npm install` then `npm run prepare:smart` before starting/building. It copies pinned `@mediapipe/tasks-vision` 1.0.1 Apache-2.0 runtime from npm and downloads official model version 1 with SHA-256 validation. Generated files are ignored by git; CI packages them in the test APK.

## Tests

`node --test tests/smart-plan-unit.mjs` validates bounded inputs, face association, caption timestamps, actual FFmpeg crop/overlay, audio packet equality and duration. `tests/smart-studio.spec.mjs` exercises real WASM MP4 output, real face model, local word ASR, cancellation, download/share/delete and persistent style. Heavy model tests run in Chromium; layout tests run in all existing browser projects. Existing legacy algorithm hashes and mode/media tests remain unchanged.

Test portrait: official White House portrait of Barack Obama (Pete Souza, U.S. government public-domain work), fetched from the public MediaPipe test asset `https://storage.googleapis.com/mediapipe-assets/portrait.jpg`. Stored as a text base64 fixture for reproducible model testing; no inference about identity is made.

## Next iteration

Human selection when multiple faces appear, smarter reacquisition, target crop preview on timeline, more saved style presets, and phone memory/performance measurements. The accepted three-strip/detail-pane/mirror compositions remain separate follow-up work. Do not promise guaranteed subscription demand, copyright/fingerprint avoidance, semantic video understanding, full-body tracking or instant encoding.
