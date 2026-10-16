# Agent A — BASE #3 Home Gallery: Implementation & Acceptance Boundary (2026-10-16)

**Authority:** Original immutable `docs/DEEPSYQ_PLATFORM_SPEC.md` requirement #3, owner-approved locked 1448×1086 Home reference and **newer owner amendment** at `docs/DEEPSYQ_OWNER_APPROVED_HOME_DESIGN.md`. BASE #46 homepage conversion is related but **not claimed by this PR**. Issue #72 coordinates Agent A.

## What this scoped PR changes

- Keeps the existing 16:9 `#homeHeroCarousel` region present **from initial HTML** and after zero usable rights-cleared video items.
- When the entire real featured video set fails to load, keeps the gallery visible, clears inaccessible sources and misleading links, and shows a clear **static preview / not playable** status.
- Hides disabled Prev/Next/Play/Sound controls rather than pretending a still or nonexistent MP4 is a video. Approved CTA links, Quick Create, Canvas, Agent, AI Apps, Inspiration and legacy tools stay untouched.
- Existing authenticated/right-filtered Inspiration feed remains the **only source** for actual playable videos. Real valid video slides retain cyclic navigation, muted autoplay gated on visibility/reduced motion/data saver, manual sound and one-video disabled arrows.
- Adds Chromium/WebKit desktop/mobile checks for empty feed and exhausted errors; snapshots at 1448px/390px for **actual current implementation**, not a claim of visual acceptance.

## Exact visual sources and what has NOT been achieved

| Source | Status and restriction |
| --- | --- |
| Owner-approved complete Home PNG `/Deepsyq/Approved Design/DEEPSYQ_OWNER_APPROVED_HOME_2026-10-15.png` | Original 1448×1086, SHA-256 `7198fb20b8300e8f8d90c4788a0288570a49be569df23cb82f06da29e1b0db47`. Preserves original Hero Girl, dark purple-blue brand and feature-block composition. **Reference screenshot, not publishable video.** |
| Later `DEEPSYQ_HOME_13_EXACT_SCENE_REFERENCES.zip` | Original second screenshot 1536×1024, SHA-256 `8a52e1713f06fa2f89f30cf1926fedc222ef6deb9756e3d4812a9919648800b5`. **One approved Hero Girl + 12 distinct miniatures** including both separate architectural houses. Still images/crops are reference assets, NOT MP4s. |
| Genuine original girl still | Original owner screenshot includes a 640×360 clean same-person cropped visual identified in `docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md`. This is a **low-resolution photographic reference**, not a committed or licensed published poster. Do not silently put screenshot UI overlays into the Hero video or substitute another face. |
| Full video carousel / 12 scene tiles | No verified owned and playable V01–V13 MP4/poster set. No paid Runway call authorized. **Do not generate, charge, enable auto-playable fake media or invent thumbnails.** |

## Actual acceptance gates still pending (do not mark DONE / LIVE)

1. Attach source-original, owner-authorized clean Hero Girl static poster at a verified safe public asset URL; verify fidelity against the original 1448 screenshot. This PR preserves the truthful original color-gradient when that asset is absent.
2. Obtain truly rights-cleared V01 master MP4 (H.264/yuv420p, 16:9) and poster; verify browser can decode and play genuine bytes, not a mocked `HTMLMediaElement`. Obtain the remaining 12 *separately identifiable* source assets/tiles only with owner approval and content rights.
3. Compare real desktop and 390/320 mobile Playwright screenshots with both approved reference images. Present measured placement and missing elements, especially the original girl, 12 tile images and premium mosaic. No representation that current HTML is pixel-perfect.
4. Verify real media autoplay muted only when visible, pause background/reduced motion/data-saver, manual unmute, keyboard and touch carousel controls, no dead controls in empty state, no paid generation POST without confirmation.
5. Keep actual agent C's #30 mobile navigation claim and agents B/D provider/credits/Stripe/release gates separate. No `main` merge or Render production deploy until the owner accepts the full Home and BASE #54 readiness gates.

**Scope status:** Owner visual direction APPROVED / empty-video behavior CODE PREPARED / **exact girl and scene media, full visual acceptance and production pending**. Archive real browser screenshots from the scoped GitHub Actions artifact if/when CI passes.
