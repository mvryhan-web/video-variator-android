# DEEPSYQ — OWNER-LOCKED EVERYDAY TOOLS VISUAL

**Owner decision:** 2026-11-02. **Scope:** ONLY the visual landing at `/free-tools.html` (Everyday Tools), not the Home page, pricing, production, or any processing backend.

## Approved visual and media identity

- Reference from the owner conversation: `09_Everyday_Tools (1)(2).png` — 1448 × 1086 RGBA, SHA-256 `cb58eb719a30ccac91aef24dda5cbf492b0b6a4bc120f6c5e5ece4a150dd6dc7` computed from the actual uploaded attachment. This screenshot is a **reference**, not a separate repository asset; do not pretend screenshot bytes match the repository's approved source PNG.
- Existing repository image: `app/src/main/assets/media/approved-design-20261023/09_Everyday_Tools.png`; **pinned Git blob SHA-1 `3e19328f1f3511441899577b878e0955620105f2`**. Do not regenerate, replace, rename or retouch this image without a new direct owner instruction.
- The existing website shows only the illustration on the **right side** of the banner. Native crop `[695,61,703,242]` from the original 1448 × 1086 screenshot; avoid enlarging the 703 px-wide crop past its native resolution. SVG viewBox uses aspect-ratio-preserving `meet` and a fully resolved image URL for reliable loading. The original image's limited source resolution cannot be turned into true high-resolution detail by CSS or interpolation.
- **Exact visible banner text:** `Everyday Tools` and `Less routine. More creating.` Remove the formerly displayed small explanatory paragraph `Simple, powerful tools to handle your everyday creative tasks. All in one place.` The owner did **not** authorize removing the colorful subtitle.
- Keep existing high-contrast colors, size, composition, rounded frame, nine image-backed tool cards, their real destinations, and bottom Video Uniquifier banner. Do not fade the hero illustration on mobile, distort its aspect ratio, or substitute a different AI-generated asset.

## Preservation / enforcement

1. Design changes, source photo changes, background replacements, new headings/microcopy, and alterations of the layout require **new explicit owner permission** (including for P, admin, Antigravity and Jules). Pure functional fixes elsewhere may proceed without redesigning this page.
2. `.github/CODEOWNERS` requests review from `@mvryhan-web` on locked paths.
3. `tests/owner-everyday-tools-art-lock.mjs` pins the image bytes, source crop/asset path, and approved visible copy. `tests/owner-everyday-tools-visual.spec.mjs` checks image loading/size, lack of distortion/fading on desktop and mobile, links and navigation. The existing no-spend GitHub Actions workflow runs the checks when relevant paths change.
4. CODEOWNERS by itself is **not a guaranteed block**: repository branch protections/rulesets must require code-owner approval and the relevant CI check before merging. An authorized owner update must explicitly amend this document, the tests, and the reference asset mapping together in a reviewed PR.
5. No changes to `main`, production, Stripe, billing, AI providers, database or paid calls as part of this visual restoration.

**Acceptance status:** require native PR checks plus owner visual acceptance; `MERGED_TO_DEV` is not `LIVE_VERIFIED`. A visually convincing page is not proof of a new high-resolution original image.
