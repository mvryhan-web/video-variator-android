# Android mobile layout audit — 5 November 2026

Owner explicitly requested all mobile app screens be inspected for overlapping controls, consistent pinned navigation and readable spacing.

## Android delivery fact

`MainActivity` uses an Android WebView. It loads `BuildConfig.WEB_APP_URL`, with file assets only when no HTTPS URL is set. `app/build.gradle` defaults to the frozen production server; CI can override it with `VV_WEB_APP_URL`. Therefore deploying TEST does not establish that an already installed APK sees TEST. No installed package, device or emulator is available in this session. Native inset/keyboard behavior and the installed APK's compiled endpoint remain **ANDROID_NOT_VERIFIED**. Obtain the exact installed APK/build origin before claiming phone delivery. Do not change production to make the old APK appear updated.

## Additional findings and fixes

- AI Agents, Compare AI, My Creations, Design Gallery and JARVIX Studio lacked the shared navigation script. Added it without changing their functional code.
- Editorial comparison had no header; added a dedicated header. Gallery and JARVIX Studio get a separate navigation header so their content headings are preserved.
- JARVIX Studio exceeded 390 px viewport by 74 px. Flexible grid tracks, shrinking cards/input, fixed-layout wrapping specs table and wrapping status badges remove the overflow; verified 320 px iframe has zero horizontal body overflow after fix.
- Secondary section-navigation links now wrap on narrow screens, avoiding long clipped navigation strips on legal/support pages.

## Audit boundaries

Inspected the repository's HTML inventory (31 shipped HTML files, excluding temporary QA harness) and loaded public/static screens in 320/390 px browser frames. Android-only system bars, keyboard, native camera and real swipe gestures are not represented by this browser check. Owner/admin screens retain their own controls; Telegram mini-app remains separate. Virtual Pet returns Not found on isolated preview and is recorded as unavailable, not a working screen. Redirect aliases (AI Pricing, Mobile Utility without selected tool) were recorded as redirects. Studio legal consent was not accepted; no paid AI or Stripe calls were made.

Six focused mobile gesture/navigation tests pass. Broader pre-existing CI failures remain; continue as isolated TEST preview and draft PR #537, without merging failing checks or releasing APK/production.
