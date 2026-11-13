# JARVIX NEW — import of owner's original voice MP3

Date: 2026-11-13 UTC
Branch: `jarvis-new` (test only)

## Source and integrity
- Owner-provided original ZIP: `jarvix_en_05.zip`, 310,923,328 bytes.
- Uploaded by owner to GitHub draft Release ID `444087010`, asset ID `743206293`.
- GitHub Actions downloaded the ZIP directly from the authenticated draft Release.
- Import script: `scripts/import_jarvix_release_asset_1900.py`.
- The import compared ZIP filenames, file sizes and SHA-256 against the physical existing copies. Files were never renamed, regenerated, or overwritten.
- 1900 original MP3 in `app/src/main/assets/media/jarvix/clips/`: **471 each for ru, en, fr, es; 16 tour clips**.
- 360 original MP3 existed before this work; 10 original `jarvix_en_s001-s010.mp3` were previously added; 1530 more were uploaded in eight batches.
- GitHub upload workflow **completed successfully**: https://github.com/mvryhan-web/video-variator-android/actions/runs/43410046168
- Last original-MP3 batch commit: `ae4213c8439de3c545eb26762c3bc6e57bc32b1f`.

## TEST deployment
- The physical audio index in `app/src/main/assets/jarvix-new-physical-audio-index.json` was updated from 552 to **2092** paths: 1900 clips and 192 existing tour-v3 files. Existing paths were preserved.
- The `jarvis-new-preview.yml` pre-deploy check now verifies its index against actual MP3 files on disk instead of assuming exactly 552.
- Index and CI were updated **together in a single commit** `602320c1b23417d308aaf27c060a6d0475d0812d`.
- Test-only Cloudflare Pages workflow **completed successfully**, including syntax, isolated static test deployment, and public HTTPS smoke tests: https://github.com/mvryhan-web/video-variator-android/actions/runs/43410572109
- Test website: https://jarvis-new.deepsyq.pages.dev/
- Production `https://deepsyq.app/` and old JARVIX were not modified.

## Important distinction
The verified 1900 MP3 are physically stored and indexed; this does **not** mean that every recording's spoken text/question was independently reviewed and approved as an AI answer. The mapping and review statuses remain in `docs/jarvis-new/import-map.csv`. No automatic approval of unverified speech occurred.

## Status
- Original MP3 committed to `jarvis-new`: **DONE**
- Physical index updated: **DONE**
- JARVIX NEW TEST deployment: **DONE**
- Every scenario transcript independently confirmed: **NOT CLAIMED**

## Scenario playback review gate
The 1,540 imported scenario clips are indexed, with no individual listening approval recorded yet. JARVIX uses a scenario clip only when its filename and scenario ID match an approved entry in the TEST runtime manifest `app/src/main/assets/media/jarvix/clips/reviewed-scenarios.json`. Each entry requires `filename`, `scenarioId`, `spokenText` transcribed from the audio, and `approved: true`. The expected master answer is never used as the transcript for a scenario MP3. Existing numbered and tour paths are unchanged.

Local resolver checks passed for approved and pending scenario fixtures, two- and three-part replies, and a follow-up. Listening approval is still pending for the imported scenario batch.

## Greeting and wellbeing

TEST commit `992e3cb`: greeting-only turns rearm listening without playing the introduction again. The casual catalog contains the prepared wellbeing text, and the voice path can use the existing numbered recording with the transcript «Я на связи. Чем могу помочь прямо сейчас?» when no dedicated wellbeing clip is available. The exact prepared reply is visible when audio is unavailable. Twenty tests passed locally; TEST JS and the Russian MP3 format were verified over HTTPS. A real microphone was not used in this check.

## Reply rotation and photo questions

Published TEST commit `9a1ecd4` and verified both updated JS files over HTTPS. Recorded matching skips phrases already used within retained recent conversation history. Playback also checks other reply sources and component clips for repetition. Russian photo-choice questions try three relevant existing recordings in order. Local checks confirmed three distinct responses followed by no repeated response, two/three-clip assembly, follow-up and 21 voice/smalltalk tests. Physical microphone and broader free-form dialogue were not verified. The 1,540 imported scenario recordings still await transcript review.
