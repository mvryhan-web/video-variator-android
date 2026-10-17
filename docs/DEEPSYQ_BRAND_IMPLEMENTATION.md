# Deepsyq official logo installation (owner authorized, 2026-10-16)

Exact original transparent 1254x1254 RGBA master, SHA256 `c1d11ed2acdd509209557af6fc8224a3ef5c2325491be19cee0c6cf511dba710`, lives in `app/src/main/assets/deepsyq-logo.png`. No regeneration, cropping, color change or wordmark in image.

The website Home brand/header uses the exact original, plus favicon and iOS shortcut icon. Dedicated `deepsyq.webmanifest` provides a separate PWA install identity, leaving the Video Uniquifier `manifest.webmanifest` and legacy `index.html` intact. Android adaptive launcher uses the approved mark with centered OS safe zone; Android app label/package, auth, billing and video processing stay unchanged.

Checks: `node --test tests/deepsyq-brand-identity.spec.mjs`; Android resource build and desktop/mobile visual screenshots still required. No production/main deploy here. `DEEPSYQ_HOME_ENABLED` decides whether the public root serves Deepsyq. Continue with base 55 coordinator and QA as approved; do not replace the established girl/hero/carousel.
