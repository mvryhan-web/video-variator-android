# WOW Montage — stage 1 preparation

Only stage 1 is implemented. No effect renderer, analyzer, UI switch, runtime import,
deployment, paid dependency, or new Render resource is included.

## Baseline and architecture inspected

Baseline: GitHub main `beff7baee94fea65a2302d2c7e49b2e1911c1040` (2026-10-10).
All tracked local file blobs were compared with the GitHub recursive tree; no
differences. Work is isolated on `wow-montage-stage-1`.
Render service `video-variator-android` is configured to auto-deploy **main**,
not this branch. Its preview service generation is off. No deploy was requested.

| Component | Existing responsibility | Integration boundary for later stages |
| --- | --- | --- |
| `video-core.js` | Public process API; private ranges, recipe, filters, args; FFmpeg filesystem and encoding | Keep current disabled path and randomness unchanged; add an explicitly gated optional visual filter suffix later |
| `app-v4.js` | Mode/resolution/variation selection, credits, onResult, history, automatic download | Pass a boolean later; leave billing/credits/save policy unchanged |
| `processing-session.js` | Job lifecycle, Android foreground service and navigation protection | Analysis belongs inside the same cancelable job, released in finally |
| `MainActivity.java` | Android WebView, file bridge and foreground processing service | Reuse existing local bridge; no native engine replacement or package change |
| `persistent-media.js`, `file-share.js`, history | Output storage/download/share | Reuse for final results; preview must not create an extra billable output |
| `server/server.js` | Static app and pinned FFmpeg runtime delivery | No frame/audio upload or server-side analysis/encoding endpoint |
| `sw.js` | Cached application assets | Stage 1 module is deliberately absent from runtime/cache lists |

Runtime dependencies already pinned: `@ffmpeg/ffmpeg` 0.12.15 and
`@ffmpeg/core` 0.12.10. Encoding is WASM on the user's device, including Android;
the Android foreground service does not turn it into a hardware encoder.
No OpenCV or MediaPipe dependency is installed. Existing Transformers functionality
belongs to other tools and is not changed or imported here.

The source is written once per file and reused for all variations. Each variation
gets its own random recipe. Current modes use speed/pitch/volume adjustments;
Balanced and Dynamic can remove a short internal interval; Dynamic adds grain,
periodic color adjustment and compression. Current processing attempts an audio
encode, then retries without audio on ANY encode error. WOW errors must NOT be
allowed to trigger this fallback and silently remove sound.

Existing 11 / 15 / 20 mode descriptions remain untouched. These are feature-group
counts, not a guarantee that every conditional filter fires on every clip. Tests
freeze the actual commands and engine bytes, rather than inventing filter counts.

Existing output uses a user-selected portrait/landscape frame, fps=30, yuv420p,
square pixels, H.264 and AAC 160k/48kHz when audio exists. It can crop the source.
WOW must preserve the **standard mode's selected geometry and timeline/audio**;
it cannot claim the old processing leaves the original file unchanged.

## Prepared isolated module

`app/src/main/assets/wow-montage/contract.mjs` defines a versioned immutable request:
enabled defaults to false, mode stays one of the existing three, output dimensions
are explicit, and geometry/audio/timeline preservation is required. Disabled
preparation yields no effects. Enabled preparation throws `WOW_MONTAGE_NOT_READY`.
This is a contract, not a usable feature or a pretend analyzer. No page imports it.

## Concrete integration sequence (future work, not implemented)

1. Stage 2: prepare a compact switch in the existing mode area on this development
   branch, default off for every mode. Keep it disabled with an honest unavailable
   explanation until the renderer passes tests; do not publish an active switch.
   Selection must not persist as enabled across sessions until that policy is tested.
2. Stage 3: separate local `analyzer`, `planner`, `filter-builder` modules. Start with
   downscaled Canvas frame samples, bounded buffers and a Worker where supported.
   Proposed initial budget: at most 120 160px-wide samples per source and a bounded
   audio analysis window. Measure runtime/memory before settling budgets. No full
   uncompressed-video retention and no second FFmpeg instance.
3. Analyze once per source; record timestamped observations and confidence. Map
   observations through each existing recipe's trim, internal cut and speed before
   placing effects on the output timeline. Do not consume `Math.random` used by the
   existing recipe: deterministic WOW planning must use its own state.
4. First functional version: small, smoothly eased virtual-camera movement and an
   understated intro zoom, ending at the selected output frame size. Apply only
   sparse effects, avoid detected shot boundaries and cap combined zoom/motion
   including what the selected mode already applies. Dynamic mode is not evidence
   that the content contains dancing or high motion.
5. Compose visual effects AFTER existing video changes in the same filter pipeline
   and encode once. Keep the existing audio arguments, fps, geometry, preset and CRF.
   This avoids an additional lossy encode, but extra filtering can still affect
   sharpness/performance: compare before/after on phones, do not promise losslessness.
6. First version performs NO new cuts, audio mixing, time stretching or speed ramps.
   Only add rhythm/speed effects later if actual validated speech detection and
   timestamp synchronization make them safe. Speech unknown is protected speech.
7. On analysis timeout, unsupported decoder or low confidence: retain the standard
   result with a clear status, or use a verified minimal visual plan. On WOW filter
   failure, retry the SAME standard recipe WITH its audio, not a new random recipe
   and not the old no-audio fallback. Cancel must terminate analysis and free buffers.
8. Stage 4: show a local Blob-backed preview with revoke-on-close/replacement and
   reuse existing final save/share/history. A preview must not auto-download, charge
   credits twice or overwrite an earlier completed result. Preserve current automatic
   final saving; introduce no silent change to when finished outputs are saved.
9. Stage 5: execute the real device/media matrix below. Merge/deploy only after
   passing tests AND explicit user permission.

## Measurements and limits

| Measurement | Free/local candidate | What it does not establish |
| --- | --- | --- |
| Motion | Downsampled frame difference; later validated optical flow if necessary | Cannot distinguish camera shake, lighting, speech or dance by itself |
| Shot boundaries | Histogram/scene difference with minimum spacing | A flash or fade can produce false positives |
| Silence/energy | Local decoded audio RMS windows | Silence detector is not a speech detector |
| Speech presence | Separate validated local VAD if feasible; otherwise unknown | No current recognition of spoken content |
| Musical onsets | Local energy/spectral change, only after confidence tests | A loud syllable is not a confirmed music beat or BPM |

No claims of semantic video recognition, face tracking, reliable VAD or musical
beat detection are made for stage 1. WebKit decoding, browser suspension, variable
frame rate, rotation metadata, HDR and 4K memory need explicit device testing.
Do not introduce a model download merely because an installed package permits it.

## Regression evidence and commands

Run from the repository root (Node and native FFmpeg/ffprobe required):

```sh
node --test tests/wow-montage-stage1-unit.mjs tests/wow-montage-legacy-media.mjs
```

The harness executes the UNMODIFIED public `VideoVariatorCore.process` in a VM
with a deterministic random value of .25 and a mocked FFmpeg command collector.
It does not expose or edit private production functions, contact a server, or
pretend that mocked output bytes are valid video.

- Core SHA-256 locks current engine bytes.
- Twelve checked-in exact command baselines: three modes × short/13s × with/without
  audio; long Balanced/Dynamic cases exercise internal cuts. Do not automatically
  regenerate these snapshots to make a failing change pass.
- Additional command matrix: three modes × six selected resolutions × two presets.
- Five-variation batches: one source write, output callbacks, credits and cleanup;
  session begin/end and running-state reset.
- Default-off/unavailable contract, invalid flags/modes/dimensions and no runtime
  import checks.
- Nine actual native FFmpeg renders: three modes × short with audio / short portrait
  without audio / 13s landscape with audio. Probe dimensions, square pixels, pixel
  format, audio presence/sample rate, recipe-derived duration; decode the entire
  file with error checking and check finite non-silent PCM samples.

Environment used: Node 24.19.0, native FFmpeg 6.1.1. Native smoke tests validate the
generated commands but do not prove the pinned WASM build or hardware behavior.
Synthetic tone/moving test patterns do not prove speech/music analysis or visual
quality. No new feature can be tested on/off until a renderer exists.

Final stage 1 run: **27 passed, 0 failed, 0 skipped**, including all nine native
renders (29.65 seconds total on the development host, not a phone benchmark).
Syntax checks passed for the new contract and harness. All tracked pre-existing
files remain unchanged; no deployment or release was triggered.

The existing browser suites were inspected, including real WASM five-variation
processing and result persistence. They were NOT rerun in stage 1; local browser
binaries are unavailable and no app runtime file changed. Stage 1 uses standalone
Node tests; workflows, package scripts and release settings are unchanged.

Future acceptance matrix: each mode with WOW off/on, MP4/MOV/WebM (including no
audio), portrait/landscape and rotation, short/long, speech/silence/music/motion,
720p/1080p/4K, Chromium/Firefox/WebKit and physical Android/iPhone. Verify decoded
audio/timestamps, no new cuts, selected dimensions, preview/save/share/cancel,
batch retention, peak memory, processing time and zero media uploads. Observe
Render request logs to confirm only normal app/engine assets and existing API
traffic; no server media workload. Do not infer Render load from local timing.

## Stage 1 changed files

- `app/src/main/assets/wow-montage/contract.mjs`
- `tests/helpers/legacy-video-harness.mjs`
- `tests/fixtures/legacy-video-baseline.json`
- `tests/wow-montage-stage1-unit.mjs`
- `tests/wow-montage-legacy-media.mjs`
- `docs/WOW-MONTAGE-STAGE-1.md`

All existing engine, UI, Android, auth, Stripe, pricing and other tool files are
unchanged. Next step is stage 2 on this isolated branch; no production publication.
