# WOW Montage — stage 3 local visual v1

Implementation lives only in the existing development branch / draft PR #23.
No merge, deployment, release, paid API or new service is authorized or performed.

## What actually works

- Opt-in boolean `wowMontage:true`; default off. Each of the existing modes uses
  its original recipe/ranges/filter/encoding functions. Their function hashes and
  the original twelve command snapshots are unchanged. The entire core file now
  has optional orchestration code, so the old whole-file hash is historical,
  superseded by exact algorithm hashes plus off-path command regression tests.
- Analyze once per source inside the existing job/FFmpeg instance. Decode only
  the first 12 seconds into up to 48 160×90 grayscale samples at 4 fps. This is
  about 691 KB of raw samples. FFmpeg's installed timeout API limits this analysis
  exec to 15 seconds without killing the worker/source on timeout. Sample files
  are deleted in finally; cancellation aborts the job and releases its session.
- Measured mean frame differences and histogram changes yield calm/moderate/
  moving profiles and conservative scene boundaries. Large exposure changes can
  be false boundaries. Short clips, rapid flashes, failed decoding or insufficient
  confidence get no extra effects. The rest of a long video is not analyzed.
- Select ONE smooth virtual-camera gesture inside the first safe scene interval,
  excluding margins near boundaries and the existing mode's trim/internal cut.
  Source times are mapped through trim, cut and speed into the output timeline.
  Motion intensity chooses a small zoom and drift; the existing mode's framing
  and motion reduce the additional strength. Excess framing disables WOW.
- Append a frame-evaluated perspective transform AFTER the standard video filters,
  in the same encode. A sine-squared envelope eases in/out; source coordinates stay
  inside the image. Timeline enable limits extra filtering to the selected window.
  No added setpts/fps/cut/audio filter. Output dimensions/SAR and H.264/AAC settings
  remain the selected mode's settings. Perspective is used rather than zoompan
  because zoompan generates its own output frame timeline.
- On visual-filter failure, retry the EXACT same standard command with audio
  before the existing standard audio retry can run. No new random recipe and no
  audio removal due solely to WOW failure. Uncertain analysis runs the exact old
  encode command. Per-output metadata reports applied/skipped/fallback.
- The scoped UI enables the switch only if its local runtime loads, starts off
  after reload, and reports actual applied/skipped/fallback counts. A missing
  runtime keeps the original disabled development control. Other tools and plans
  remain untouched. New scripts/CSS are included in the existing offline asset list.

## Explicit limits

There is NO semantic understanding, dance recognition, face tracking, speech/VAD,
pause detection, BPM or music analysis. Speech and rhythm are explicitly unknown.
This version never adds speed ramps, silence removal, cuts, fades, audio effects
or music. It preserves the already-processed standard audio/timeline, not the
unprocessed original (the existing modes can already alter both).

Selected resolution/aspect ratio is preserved relative to the standard result.
Virtual cropping/interpolation and lossy encoding are not mathematically lossless;
visual quality on real phones still needs stage 5 evaluation. A small safe gesture
is a first working renderer, not a promise of a full cinematic edit.

Sampling the first 12 seconds can miss later content. Fast cuts between samples,
camera shake, flashes and unusual decoders can confuse frame metrics. Conservative
skips are expected. Render receives no samples, video or audio; it still serves
assets and existing account APIs. No production-load benchmark is claimed.

## Validation

```sh
node --test tests/wow-montage-stage1-unit.mjs tests/wow-montage-legacy-media.mjs tests/wow-montage-engine-unit.mjs tests/wow-montage-media.mjs
npx playwright test tests/wow-montage-ui.spec.mjs tests/wow-montage-render.spec.mjs
```

Local final run: **37 passed, 0 failed, 0 skipped** (51.02 seconds with media files
running concurrently on the development host; not a phone speed benchmark).

New unit coverage: calm/motion/flashes/short samples; safe scene/trim/cut/speed
mapping; combined framing bounds; original audio/command preservation; one analysis
for five variants; exact old command on uncertainty; same-recipe audio-preserving
render fallback; cancellation and missing runtime.

New native pairs: Gentle MP4 portrait, Balanced MOV landscape, Dynamic WebM silent
landscape at 720p, six seconds each, WOW vs standard. Full output decode/probe;
identical dimensions/SAR, duration and frame counts; identical decoded audio when
present; actual pixel changes sampled INSIDE the chosen effect window. Silent
native testing applies the visual filter to the recorded legacy no-audio command;
it does not claim that legacy output metadata detects every silent source correctly.
The nine old native renders and twelve frozen command scenarios also still pass.

Browser UI tests cover enabled/default-off, keyboard switching, missing runtime,
locales/themes/narrow layout, actual status reporting and original off-path API
options across five browser profiles. The new real Chromium test runs the pinned
FFmpeg/WASM core for all three modes off/on, validates actual applied status,
geometry/timing, decoded audio byte equality, changed pixels and zero media uploads.
Other profiles skip this real encoder test; no physical Android/iPhone WOW result
is claimed. CI outcomes are recorded in the draft PR after execution.

## Files changed in stage 3

- `app/src/main/assets/wow-montage.js`: measured analysis, conservative planner,
  real perspective filter builder, safe fallback.
- `app/src/main/assets/wow-montage-ui.js`: runtime readiness/default-off/status UI.
- `app/src/main/assets/video-core.js`: gated orchestration, analysis progress guard,
  per-output status; existing algorithm functions unchanged.
- `app/src/main/assets/index.html`, `app-v4.js`, `wow-montage.css`, `sw.js`: only
  loading/using the option, analysis/status feedback and offline assets.
- `app/src/main/assets/wow-montage/contract.mjs`: enabled requests require analysis.
- `tests/fixtures/legacy-algorithm-hashes.json`, `tests/helpers/legacy-video-harness.mjs`,
  `tests/wow-montage-stage1-unit.mjs`: preserve original algorithms/off commands.
- `tests/wow-montage-engine-unit.mjs`, `tests/wow-montage-media.mjs`,
  `tests/wow-montage-render.spec.mjs`, `tests/wow-montage-ui.spec.mjs`: new coverage.
- `.github/workflows/web-ci.yml`: run new engine/media tests with existing CI.
- This document and historical links in the stage 1/2 documents.

Reference verified against official FFmpeg filter documentation:
https://ffmpeg.org/ffmpeg-filters.html#perspective
The installed FFmpeg wrapper's `exec(args, timeout)` contract was verified in its
local `classes.d.ts`, not assumed from a different library version.

Next authorized stage would be stage 4: local preview before final save, preserving
existing completed-result storage/download/share. Full real-device and 1080p/4K
performance/media acceptance remain stage 5. Production still requires permission.
