# Video Variator Android

Android wrapper for Video Variator. The app processes the user's own videos locally on the device through FFmpeg WebAssembly loaded inside the app WebView.

## Build

GitHub Actions builds a debug APK automatically on pushes to `main`.

## Privacy

Selected videos are processed locally by the app. The processing engine is loaded from a CDN when needed, but the selected video itself is not uploaded by the app.
