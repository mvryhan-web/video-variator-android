# Remaining mobile screens — 5 November 2026

Owner request: inspect every remaining page/state; do not repeat completed page audits. Acceptance: readable existing visual style, no control overlap or horizontal body overflow at 320/390 px, usable overlays and short-height dialogs. Preserve approved artwork, prices, functionality and production freeze.

## Inventory and coverage

There are 31 shipped top-level HTML documents in `app/src/main/assets` (temporary `mobile-shell-qa.html` excluded). Query parameters and internal views add screens without creating additional HTML documents. The preceding audit is recorded in ANDROID_MOBILE_AUDIT_20261105.md; completed primary pages were not re-audited here.

This continuation checks remaining states:

| Screen | Result |
| --- | --- |
| Free Tools photo/video/audio/clips/motion/prompter query modes | Loaded at 320 px, no horizontal body overflow; photo form visually inspected |
| Studio saved-results view | Loads history state; consent/account restrictions preserved |
| Video tool history and FAQ | Loaded at 320 px without horizontal body overflow |
| Video tool analytics, tool plans, profile/settings | Waited for actual active view, visually inspected at 320/390 px; existing artwork preserved |
| Audio TTS and STT routes | Loaded at 320 px without horizontal body overflow; no recording, generation or provider calls |
| Invite and promo dialogs | Visible dialog rectangles fit within 320 px; no submissions |
| Account sign-in dialog | Found real overlap: fixed header z=500 and preview notice z=90 covered modal z=80. Raised mobile account/onboarding modal to z=800. Visually verified title and Close appear above header. At viewport height 480 px, dialog spans y=24..456 and scrolls internally; Close click succeeds |
| Owner Admin and Product Watcher | Public restricted states visually inspected; section links now wrap instead of being clipped in horizontal strip. Authenticated/private data states not available and not simulated |
| Voice microphone preview | Existing controls visually inspected at 320/390 px; no microphone permission requested |
| Telegram mini-app | Existing visual composition inspected at 320/390 px; Telegram launch/processing unavailable in browser, no consent accepted |
| Virtual Pet | Already documented unavailable in isolated TEST (404); not enabled or presented as a working screen |

## Scope of changes

- `deepsyq-mobile-shell.css`: account/onboarding overlay stacking only.
- `approved-page-design.css`: mobile section-navigation wrapping only for Owner Admin and Product Watcher; no protected Pricing/Video Uniquifier selectors changed.
- This audit record.

Six focused mobile/navigation tests and diff whitespace validation pass. Browser frames verify mobile web layout, not an installed APK. Android package endpoint, native keyboard/system insets and physical device acceptance remain unverified as previously documented. No production deployment, auth changes, paid generation or financial operations.
