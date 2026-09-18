# Creator studio (5.2)

Existing video variation processing and billing stay in their original modules. `studio.css` supplies the new dashboard, pricing and tools presentation.

## Local AI previews

`ai-worker.js` loads the standalone Transformers.js browser bundle from the same origin. The browser downloads public MODNet / Whisper tiny model weights from Hugging Face only after a user starts an operation. Source photos, audio and video are never posted to an inference service. No API key or paid inference account is required. Model downloads may exceed 100 MB; speed and available memory vary by device.

- Portrait cutout: people only, up to 20 MB input and 1600 px output; transparent PNG.
- Captions: first 60 seconds of a file up to 50 MB; editable SRT and a caption preview. Captions are not burned into the original video.
- Video background: experimental first 3 seconds, 5 fps, at most 480 px, up to 30 MB input. Solid-color replacement and original audio when present. This is a preview, not a full-length video editor.

Inference stays in a disposable worker. Cancel terminates inference/FFmpeg. No model is downloaded just by opening the tools screen. Licenses and limitations are linked from the page.

## Camera teleprompter

Android uses CameraX Preview + VideoCapture/Recorder in `TeleprompterActivity`. A ScrollView/TextView overlays the live preview. Scrolling starts on the recording Start event and stops when recording stops. Prompt text is not encoded into the video. Videos are stored through MediaStore (Movies/VideoUniquifier on Android 10+) and can be shared through the Android share sheet. Camera and microphone access require explicit system permission. If microphone permission is denied, the native screen clearly indicates that recording has no audio. Leaving the screen stops recording.

Web/PWA uses getUserMedia + MediaRecorder after an explicit Open camera action. Start begins recording and scrolling together. The camera stops when the page becomes hidden. MP4 is preferred where supported; otherwise WebM is used. Browser recordings are kept in memory until downloaded/shared; capture stops at approximately 150 MB. The overlay is preview-only. Permissions-Policy grants camera/microphone access to this origin only.

An older Android build needs an app update for the new native camera bridge and SRT saving. The package remains com.videovariator.app. Existing release-signing secrets are used if configured; debug builds cannot guarantee an in-place update over an app signed with a different key.

## Verification

The browser suite covers mobile layout, existing engine/trial/prices, real local compression/audio extraction, actual model inference (PNG, speech captions, background MP4), download output and camera recording using Chromium's virtual camera. Android instrumentation uses an emulator camera and checks simultaneous prompt scrolling, Gallery output and decodable saved video. These automated devices do not replace physical iPhone/Android testing for camera quality, microphone behavior or performance.
