# Video Variator — Production Deployment Specification

This document defines production-only configuration. It must not change or embed production secrets into the current APK/PWA source bundle.

## 1. Production authentication (Google + Apple)

Production Google and Apple sign-in credentials must be configured only in the deployment environment / secret manager. Do not hard-code client IDs, private keys, client secrets, team IDs, key IDs, signing keys, or redirect secrets into the Android APK, PWA assets, Git repository, or client-side JavaScript.

### Google Sign-In
- Create/use a production Google OAuth / Google Identity Services Web Client.
- Authorized JavaScript origin must be the final HTTPS production origin.
- Authorized redirect/origin configuration must match the deployed production domain exactly.
- Set `GOOGLE_CLIENT_ID` only as a production environment variable.
- The server must verify Google ID tokens and their audience/issuer before creating an application session.

### Sign in with Apple
- Create/use a production Apple Services ID for the web application.
- Configure the production HTTPS return/redirect URL in Apple Developer.
- Set `APPLE_CLIENT_ID` and `APPLE_REDIRECT_URI` only in the production environment.
- Any Apple private signing key, Team ID, Key ID, and generated client secret must remain server-side in the production secret manager.
- The server must verify Apple ID tokens and their audience/issuer before creating an application session.

### Requirement
Production OAuth credentials are a deployment task only. They are intentionally not activated or embedded in the current application version until the production HTTPS domain and production identity-provider configuration are ready.

## 2. Stripe plans and credit model

Keep the existing subscription prices:
- Basic — $9/month — 750 credits
- Pro — $24/month — 2,250 credits
- Business — $99/month — 15,000 credits

Credit accounting:
- 1 second of generated video = 1 credit.
- Base cost = total source duration in seconds.
- Final job cost = base cost × number of selected variations (1–5).
- Example: a 30-second source with 4 variants costs 120 credits.
- Monthly paid-plan usage resets only after a verified Stripe subscription-cycle payment/webhook.
- Credit enforcement must be server-authoritative for signed-in paid users.

First purchase:
- Support an optional first-subscription Stripe coupon via `STRIPE_FIRST_SUBSCRIPTION_COUPON_ID`.
- Display the configured intro-offer text before checkout.

Cancellation:
- Profile & Settings must expose both Stripe Billing Portal access and a direct “cancel at period end” action.
- Cancellation must not immediately destroy paid access; access continues until the paid period ends unless Stripe reports otherwise.

## 3. Plan entitlements

### Basic
- 750 credits
- Gentle mode only
- 720p output
- 9:16 and 16:9

### Pro
- 2,250 credits
- Gentle + Balance modes
- 1080p output
- 9:16 and 16:9

### Business
- 15,000 credits
- Gentle + Balance + Dynamic modes
- 4K output
- 9:16 and 16:9

Free trial:
- Dashboard starts at `0 / 2` free source videos used.
- Trial is counted by source videos, not seconds.
- Trial access uses Gentle mode and 720p.

## 4. Processing and saving UX

- Do not show a folder-selection control for output saving.
- Android output files save automatically to the application’s configured Downloads/VideoVariator location.
- Browser/PWA output downloads are initiated automatically when processing completes, subject to browser download-permission behavior.
- The user-facing hero phrase is exactly: `Уникализирай своё старое видео`.
- Do not expose internal micro-editing, pitch, audio variation, FFmpeg settings, or other implementation details in the normal UI.

## 5. HTTPS and privacy

Production must use HTTPS only.
- Redirect HTTP to HTTPS in production.
- Enable HSTS after the final HTTPS domain is verified.
- Use a restrictive Content Security Policy compatible with required Google/Apple/FFmpeg resources.
- Restrict CORS to the production origin; do not use wildcard CORS in production.
- Use secure server-side session verification and short, revocable application sessions where practical.
- Never store Stripe card details. Stripe Checkout/Portal handles payment data.
- Raw source/output videos are intended to be processed locally and must not be uploaded for authentication, billing, or analytics.
- Store only required account, subscription, usage, reliability, and history metadata.
- Production database access must use TLS and least-privilege credentials.
- Secrets must live in the hosting platform secret manager / environment configuration, never in source control.

## 6. Dashboard, analytics, errors, and FAQ

Dashboard must show:
- current plan
- trial usage or remaining paid credits
- outputs created
- subscription status
- processing estimate before launch

Analytics must show at minimum:
- credits used
- outputs created
- processed seconds
- processing attempts
- successes
- errors
- success rate

Error handling must:
- show a clear user-visible error state
- record non-sensitive reliability metrics
- avoid exposing secret values, access tokens, internal stack traces, or payment credentials to the user
- avoid charging/consuming credits for a job that did not successfully complete

FAQ must clearly explain:
- 1 second = 1 credit
- variant multiplier (1–5)
- plan-specific modes
- plan-specific resolution
- 9:16 and 16:9 support
- free trial behavior
- cancellation
- privacy/local processing
- first-purchase discount terms
- what happens when credits are exhausted

## 7. Mobile and browser compatibility

Maintain responsive mobile-first behavior for Android, iOS browsers/PWA, tablets, and desktop browsers.

Automated browser CI should cover:
- Chromium
- Firefox
- WebKit
- a mobile Chromium viewport/profile

Because media codecs/WebAssembly limits differ by OS/browser/device, production QA must include representative physical-device tests before launch.

## 8. Update strategy

### PWA/web application
- Service worker uses a network-first/update-aware strategy.
- New web UI/code can update automatically on next launch/reload once deployed to the production HTTPS origin.

### Android installed application
Two update layers are required:
1. Web/content layer: when the Android shell is pointed at the production HTTPS app, compatible web-content changes appear without reinstalling the APK.
2. Native layer: native Android changes require an Android package update. Use Google Play In-App Updates for Play-distributed builds.

Android does not allow an ordinary sideloaded APK to silently install arbitrary replacement APKs without user/system authorization. For sideload distribution, the app may detect a newer signed APK and prompt the user, but installation requires Android confirmation.

All Android updates must use the same application ID and the same production signing key. Never ship production updates with changing debug signing keys.

## 9. Release gate

Before production launch verify:
- production HTTPS domain live
- PostgreSQL/TLS configured
- production Google OAuth configured
- production Apple Sign in configured
- Stripe live Products/Prices mapped to Basic/Pro/Business environment variables
- Stripe webhook signature secret configured
- first-purchase coupon configured if offered
- production Android signing key configured in CI secret storage
- browser CI passing
- Android build passing
- physical mobile smoke tests completed
- privacy policy, refund terms, subscription terms, and support contact published
