# Video Uniquifier Android

Video Uniquifier creates privacy-first variations of the user's own videos. Video processing runs locally on the device through FFmpeg WebAssembly inside the Android app / PWA; raw source videos are not uploaded for account or billing operations.

## Current Android build

- Android 8+ (minSdk 26), target Android 16 / API 36
- US English source UI with automatic device-language localization
- 9:16 and 16:9 output
- Basic: Gentle, 720p, up to 5 variations
- Pro: Gentle + Balance, 1080p, up to 10 variations
- Business: all modes, 4K, up to 15 variations
- On-device saving to Gallery / Movies / VideoUniquifier
- Google Play update support plus remote HTTPS PWA updates when production URLs are configured

## Production configuration still required

Google/Apple sign-in, Stripe billing, remote UI updates, and stable native updates require the production HTTPS deployment, OAuth credentials, Stripe price IDs/webhook, and a permanent Android release signing key. These values are supplied through environment variables / GitHub repository secrets rather than hard-coded into the app.
