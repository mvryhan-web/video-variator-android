# Creator studio 5.3

The premium layout and CameraX teleprompter remain. Photo/video background removal and automatic captions are retired; their old web routes return HTTP 410.

## Avatar commentary beta

`avatar.html` checks `/api/avatar/access` against the authenticated server-side plan (active Basic, Pro, Business or administrator). No prices or credit consumption rules change. Original media never leaves the device. The server only authorizes access; local browser code is not DRM.

The user provides a portrait, video, narration text and consent. Uploaded voice recordings are used directly without cloning. Optional English female/male Kokoro voices run in a worker on local WASM; model assets download on explicit generation. The shared Transformers runtime and WASM versions must match. `postinstall` bundles Kokoro with the same-origin Transformers import. Model, runtime and phonemizer notices are linked from the editor.

Output is portrait MP4, 720x1280, 12 fps, at most 30 seconds and no longer than the source video or narration. Source audio is replaced. The lower portrait uses manually positioned audio-reactive mouth deformation, not realistic lip-sync. Text is displayed in approximate timed groups, not speech-aligned subtitles. There is no automatic translation. Input limits: video 100 MB, photo 10 MB / 40 megapixels, audio 20 MB, text 350 characters. Own audio is the fallback when local TTS exceeds phone memory.

## Saving

Android saves video to Movies/VideoUniquifier, images to Pictures/VideoUniquifier and audio to Music/VideoUniquifier with MediaStore. Share uses a FileProvider URI and the Android chooser. The main video engine retains its existing automatic-save adapter. Repeat downloads and history sharing use the actual Blob. Empty native video saves fail instead of reporting success.

Browsers send completed files to Downloads automatically; browser settings can block automatic/multiple downloads. Manual Download remains available, and unsupported desktop file sharing downloads a copy with an explanation. Old APKs lacking the generic file bridge show an update message instead of silently doing nothing. Browser UI updates alone cannot add native capabilities to an old APK.

## Verification and release

The browser suite tests local MP4 composition, actual WAV synthesis for both voices, automatic/manual downloads, sharing bridge byte transfers and existing video/trial/pricing flows across five browser configurations. Android instrumentation checks camera recording and MediaStore image bytes in an emulator. Physical phones are still required to assess performance and voice-model memory use.

APK package stays com.videovariator.app. Version 5.3.0 / code 8. Release workflow uses signing secrets when configured; otherwise its debug APK is not guaranteed to update an installation signed with a different key. Do not tell users to uninstall to work around signing without explaining loss of local data.
