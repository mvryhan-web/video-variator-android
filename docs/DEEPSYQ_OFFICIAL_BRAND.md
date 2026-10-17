# Deepsyq official site + app logo (OWNER LOCK, 2026-10-16)

**Canonical decision:** the exact colorful abstract **petal/ribbon icon** on the LEFT of the owner's approved Deepsyq visual is the **sole official icon for both Deepsyq website and Deepsyq downloadable application**. The owner specifically approved the final **icon-only, transparent** PNG without the white wordmark on 2026-10-16. **Do not generate a new logo, redraw, re-color, replace with a whale, or distort/crop the emblem.** The brand text "Deepsyq" can be displayed next to the icon in UI as separately rendered text; it is not baked into an app icon.

## Exact immutable visual asset (verified by Agent 5)

- Master Library location: `/Deepsyq/Official Brand/DEEPSYQ_OFFICIAL_LOGO_SITE_AND_APP_TRANSPARENT_MASTER.png`
- Resolution: **1254 × 1254 px**, actual **RGBA transparency**, original approved file unmodified.
- SHA-256 (master bytes): **`c1d11ed2acdd509209557af6fc8224a3ef5c2325491be19cee0c6cf511dba710`**.
- Master source is exactly the user-approved image; no generative rework or color change.
- Website/app derivative: `/Deepsyq/Official Brand/DEEPSYQ_APP_AND_WEBSITE_ICON_1024_TRANSPARENT.png` (1024 × 1024, Lanczos resizing only).
- Opaque iOS/Android convenience file: `/Deepsyq/Official Brand/DEEPSYQ_IOS_ANDROID_APP_ICON_1024.png` (1024 × 1024, same logo over deep ink backdrop `#070d20` to satisfy platforms that forbid alpha in launcher icons).
- Full developer-ready package: `/Deepsyq/Official Brand/DEEPSYQ_OFFICIAL_LOGO_WEBSITE_APP_PACKAGE.zip` with 1024/512/256/192/180/128/64/48/32/16 transparent PNGs, dark opaque app exports, an Android adaptive foreground, favicon.ico, README and SHA256SUMS.
- Source Library scope is OWNER ASSET, not a publicly hosted HTTP URL; agents must materialize the exact file through Library tools or use user-supplied verified local byte copy. Never invent a public CDN URL.

**Authority:** owner explicitly selected this exact mark in the current conversation, after rejecting an unauthorized whale variant and re-uploading the correct petal symbol. This dated identity approval overrides prior generic/temporary icons. The old approved Home images still govern layout/hero and must not be redrawn.

## Known checked implementation gap

Current `deepsyq-platform` Home markup `app/src/main/assets/deepsyq.html` uses a text-only sidebar mark `d.` and a star `✦` in the top brand. Existing `app/src/main/assets/icon.svg` is a distinct old **Video Uniquifier** picture/play emblem; the existing `manifest.webmanifest` names that older app. Android `app/src/main/AndroidManifest.xml` still labels `Video Uniquifier` and uses the old `@mipmap/ic_launcher` images and `ic_vu_foreground.xml`. **Do not assume these legacy endpoints can be changed globally without protecting legacy users.** Test which entrypoint is actually the new Deepsyq PWA and which is old Video Uniquifier before updating common assets.

## Scope and ownership (two narrow, collision-safe implementation PRs)

**Agent A / Issue #72 / BASE #1, #3, #46 Home identity:**
- Claim bounded untouched brand markup area first; replace the temporary icon glyph with **the exact approved image asset** in sidebar and header. Keep existing `Deepsyq` text as real text with unchanged accessible names, preserve mobile/collapsed logo contrast, layout and fixed clickable hit area. Preserve approved 16:9 girl/carousel, original Home colors and all other functions.
- Verify rendered desktop/mobile screenshot and image byte hash; the unmodified master must remain traceable.
- Choose real site favicon/metadata only when no other agent owns that file; do not replace the old Video Uniquifier PWA icon by accident.

**Agent C / Issue #74 / BASE #30 mobile/PWA packaging:**
- After confirming A's asset path, integrate matching high-resolution icon into Android adaptive launcher foreground (safe margin) and browser/PWA/iOS install icons of **Deepsyq**. Test Android launcher icon/splash behavior on available emulator/build, and iPhone web install where available.
- Preserve working legacy Video Uniquifier install/manifest until owner approves main product name/icon cutover. Do not create duplicate auth/Stripe/backend or change old tool processing. If Deepsyq PWA and legacy PWA share a manifest, document a safe compatibility plan rather than silently breaking existing installed shortcuts.

**Agent 5 / coordinator:**
- Treat brand SHA and Library package as a source of truth and enforce it in review. Coordinate A/C file ownership, no parallel edits of `deepsyq.html`, launch manifest or launcher icons. Cross-check UI screenshots and app build icons; file in Library is **NOT** proof of deployment.
- Record assignment/progress in [Issue #115](https://github.com/mvryhan-web/video-variator-android/issues/115); no change to existing original BASE / Block 1–7 TXT requirements.

## Acceptance checklist

- [x] Owner approved icon-only glyph without white text.
- [x] Exact master PNG verified SHA + alpha + resolution.
- [x] Original master and size bundle durably uploaded to owner's ChatGPT Library.
- [ ] Official mark committed to a scoped GitHub code branch with matching SHA/provenance.
- [ ] Home/sidebar/header/favicon actually render this icon (desktop/mobile), reviewed against owner reference.
- [ ] Deepsyq installed Android launcher and Deepsyq PWA/iOS icon show this icon, verified by screenshots/builds.
- [ ] Production cutover approved, merged into `main` with legacy compatibility, deployed and visually verified.

**Statuses:** `BRAND MASTER APPROVED / SAVED`; `SITE/APP CODE INTEGRATION PENDING`; `MAIN/PRODUCTION NOT DEPLOYED`. A GitHub instruction, Library file, mockup or passing unit test is not a live site/icon.
