# WOW Montage acceptance — automated coverage, physical devices pending

The original Gentle, Balanced and Dynamic function hashes/12 golden commands remain unchanged when WOW is off. New coverage renders each mode at 1080p and 4K with WOW both off and on, in addition to the existing MP4/MOV/silent WebM 720p/portrait cases. All nine real native FFmpeg pairs passed locally. Width/height, sample aspect ratio, frame count and duration match standard results. Decoded PCM audio is identical where present, and decoded pixels change inside the planned gesture. Both runs use the same original codec/preset/CRF/audio settings.

Higher-resolution fixtures contain 3.5 seconds of synthetic moving video and a tone. They verify encoding/output geometry, not real-camera 4K fidelity, long-video memory use or phone performance. Measured native encode times are printed as WOW_MEDIA offMs/onMs; they are diagnostic host timings, not a promise of mobile speed. WOW can cost substantial extra render time, especially in 4K; no five-output/45-second claim is made.

Analysis is bounded to the first 12 seconds, 48 grayscale 160x90 samples (691,200 bytes), and the installed FFmpeg 15-second analysis timeout. Tests cover cancellation during analysis and visual rendering, conservative skips, visual failure standard fallback, single analysis per source and cleanup/session release. Speech, rhythm and semantic content remain unknown. No speed ramps or extra audio processing are added by WOW.

Browser acceptance at stage 4: all 20 preview checks passed in Chromium, Firefox, WebKit, mobile WebKit and mobile Chromium; complete suite 299 passed, one existing Firefox tools test passed on retry, 75 conditional skips. Actual pinned WASM on/off renders decoded successfully in Chromium for all three modes, matching standard audio/timeline. Android build and existing instrumentation passed.

All processing is client-side. No Render processing worker, database or other paid resource was created. New source-media uploads are absent in the actual browser render test; production load measurements for WOW cannot be claimed because it is not deployed.

Release blockers: physical Android/iPhone playback/render/cancellation and long real-camera 1080p/4K memory/performance verification; PWA cache-version rollout check; owner production approval. Automated browser profiles and native FFmpeg are not substitutes for phone validation. Main must not be merged or publicly released on the strength of these tests alone.
