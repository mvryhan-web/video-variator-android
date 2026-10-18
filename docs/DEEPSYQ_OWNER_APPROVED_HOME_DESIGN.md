# Deepsyq — OWNER-APPROVED HOME DESIGN (LOCKED)

Approved by the owner on 2026-10-15. **No redesign without explicit owner permission.** This is the single source of truth for the website Home layout and color direction. Preserve existing content, providers, Studios, Video Uniquifier, billing and data.

## Exact canonical reference image

- **PNG filename:** `DEEPSYQ_OWNER_APPROVED_HOME_2026-10-15.png`
- **Persistent owner's file Library:** `/Deepsyq/Approved Design/DEEPSYQ_OWNER_APPROVED_HOME_2026-10-15.png`
- **Dimensions:** 1448 × 1086; **SHA-256** `7198fb20b8300e8f8d90c4788a0288570a49be569df23cb82f06da29e1b0db47`
- This is the colorful purple-blue mockup explicitly accepted immediately before this instruction. Earlier concept images are superseded. **This PNG is a design screenshot, not a ready-to-play video nor a production media file.** It is saved in the owner's Library; the repo document contains its name/hash, not its binary bytes.

## Mandatory desktop layout / visual identity

1. Original Deepsyq logo and dark cinematic purple/blue/magenta palette, premium rounded cards, vibrant imagery. Do not silently replace with green monochrome or another proposal.
2. Left sidebar, collapsible to icons. Home first; **Creation** section (Image, Video, Agent, Audio), grouped **Everyday Tools** (Tools, AI Apps, Canvas, Video Uniquifier), grouped Assets/Affiliate, bottom **Share with friends** (Discord, X/Twitter, Instagram), using only real social targets; do not invent official community accounts.
3. Separate top header: brand left; right Help, language selector, Promo Code, Invite Friend, Credits, Pricing, Login/account. Unimplemented referral/promo/credit issuing must visibly be preview-only, not pretend redemption or award credits.
4. Full-width **large featured girl/hero** at top, headline **Create beyond limits**, strong gradient primary CTA, responsive layout. Hero should autoplay **a real owner-approved, accessible video file** muted/looped/playsinline/visibility-guarded, when one exists. Without a verified video, display an honest static poster/fallback, never fake moving media, invented assets or fictional models.
5. Small vivid quick-access cards for Image, Video, Audio, AI Agent, AI Apps, Canvas, Tools.
6. **Canvas** has its own substantial **full-width block**, listing real included capabilities/entry points and reusing existing prompt Canvas, reference uploads, saved drafts and Studio handoff. The Canvas must not be only a tiny card.
7. **AI Agent** has its own spacious premium feature block below Canvas, inspiration-like, but unavailable Block 2 agent execution and integrations must be labelled coming soon.
8. **AI Apps** gets its own equally prominent block with real owner-approved API templates when available and an honest empty state otherwise, with a working Explore route.
9. **Inspiration** next: All / Image / Video selectors and approved-data-backed cinematic mosaic, large first tile and bottom montage, preserving previously existing owner media, rights checks, links, filters and all three Studio CTA actions. Desired subjects: red dress, original castle, expressive portrait, snow mountains, neon vehicle, astronaut, fantasy scenery; don't use fake sample assets or imply a still screenshot is a video.
10. Existing Studio cards, Everyday Tools, Video Uniquifier, user History/Assets, payment controls and Owner AI Control remain available. Feature flags and existing deployment guards still apply.

## Lock and delivery criteria

- Another agent must **not change** base palette, navigation order/sections, site layout, hero concept, major block placement, or exact approved visual direction without asking owner. Functional, accessibility, security and responsive fixes are allowed only when they preserve this design; document meaningful deviations.
- Mobile must be responsive and usable; fidelity means design intent and hierarchy, not forcing a 1448 px screenshot onto a phone.
- Do not auto-enable AI, production DB migrations, Stripe, credit giveaways, live paid providers or Render deployment without approval. Do not overstate availability or rights.
- Implement in existing `deepsyq-platform` / draft PR #42, not a new project. Validate with targeted browser tests. Status until accepted by owner, including screenshot comparison: **IMPLEMENTED / VISUAL ACCEPTANCE PENDING**.

## Hero Video Carousel 16:9 and Quick Create extension — owner approval, 2026-10-15

The owner explicitly requested this **within** the locked purple/blue Deepsyq visual direction, not as permission to redesign the brand, navigation, established sections or existing user content.

- Homepage hero is a **16:9 cinema-style carousel on desktop**, responsive to narrower screens. It has previous/next controls, accessible slide indicators, original public video titles/posters, and wraps from the last slide back to the first.
- Automatic video playback is muted, subject to browser policy and limited to visible videos. Playing to the end advances to the next real video; if there is only one video it loops. Reduced-motion and data-saver preferences disable ambient autoplay. Explicit user Play/Pause remains available. Pauses in background tabs.
- Data source is the **existing rights-filtered, featured Inspiration API**, not mock data or copied Lumina content. The carousel never invents examples for named models, launch announcements, Music Video Agent or AI Canvas. It hides if no real approved video is available, retaining the original colorful static gradient hero. The user-requested girl clip has **not** been generated or uploaded merely by adding this code.
- A ChatGPT-style **Quick Create prompt bar directly below the hero** supports editable ideas and Image / Video / Audio handoff into existing Studio, with real Studio review and separate explicit generation consent. Agent takes the user only to its clearly labelled coming-soon preview. No automatic API calls to paid providers or wallet changes.
- The full Canvas, AI Agent, AI Apps, Inspiration mosaic and original Studios/Tools/Assets remain below, separated with breathing room. The approved header/sidebar controls and old owner media are untouched.
- Status is **CODE PREPARED / CI AND REAL MEDIA GATED** until targeted browser verification and live owned/licensed video with reliable preview URLs exist; public activation needs independent approval.


## OWNER-APPROVED AMENDMENT — 2026-10-16: ORIGINAL GIRL FIRST, VISIBLE CAROUSEL + MINIATURES

**Explicit owner decision dated 2026-10-16.** This is a specific, newer amendment to the earlier Home lock, not permission to replace the design, fabricate clips or recreate the frontend from scratch. When its explicit points conflict with older text above, **this amendment wins**; the original reference images and historic rules remain available unaltered.

1. **FIRST / HERO:** Keep the **originally approved girl** as the dominant large visual at the top of Home, with the same girl, appearance, face, hair, colors, original cinematic dark purple/blue/magenta brand, headline and CTA. The main desktop hero is **16:9**; adapt responsively without sacrificing the key face/heading composition. Do **not** substitute another generated woman, new generic stock hero or different mockup.
2. **THEN / MINIATURES:** Under/near the original Hero Girl, show the **smaller original scene thumbnails** from the owner's later 13-scene reference package. The 13-scene scope is **one main girl + twelve separate scene identities**; do not collapse or invent new scenes. The later 1536×1024 screenshot informs these thumbnail compositions; it does not silently supersede the original girl's identity, site-wide branding, sidebar or features.
3. **CAROUSEL MUST STAY VISIBLE / OPEN:** Show the carousel/gallery area as an immediately visible, usable part of the Home even when no real approved MP4 is loaded. The old `home-experience.js` behavior that hides `#homeHeroCarousel` entirely with no playable featured video is **no longer acceptable for the approved visual experience**. Keep genuine video playback only for real authorized videos; when unavailable, show an honestly labelled original, rights-cleared **static poster/gallery preview** or clear non-deceptive unavailable state **inside the same visible carousel area**, never imply a still is a generated movie. Do not fake thumbnails from unlicensed material or bake screenshot Play/UI overlays into fake footage.
4. **NAVIGATION & MOTION:** Carousel next/previous controls are visible and work with real available slide data, wrap last→first and first→last; show an accessible selected thumbnail/indicator and support click/tap/keyboard. If only one approved slide is available, visibly disable unnecessary navigation rather than creating dead buttons. A real video should autoplay **muted, playsinline, only when visible**, advance at end and respect reduced-motion/data-saver preference; its audio must require a deliberate user action. Static fallback must not display a nonworking Play control.
5. **PAGE BELOW:** Keep a prominent **Quick Create** bar by/below the hero + thumbnails, then retain the approved substantive **Canvas, AI Agent, AI Apps, Inspiration** blocks as working or clearly gated sections, followed by existing tools, History and pricing. Do not remove them to imitate the alternate screenshot's above-the-fold crop. Keep the approved navigation and responsive layout.
6. **ASSETS / RELEASE:** Reuse the existing Home, Inspiration, Studio, provider and auth components; no duplicate carousel, database/router or new service architecture. Use only original owner-approved/rights-cleared image references/posters and genuinely generated approved video assets. **13 photorealistic scene videos are still NOT generated.** Generating them through paid AI requires separate cost/rights approval, and no public production flag or `main` merge follows from this design amendment.
7. **ACCEPTANCE:** Agent A must provide a desktop and mobile screenshot/screen-recording of the *actual preview* beside the accepted reference, plus verified carousel arrows/slide selection, fallback visibility with zero live MP4s and real muted video behavior when licensed files exist. This is **OWNER VISUAL DIRECTION APPROVED / IMPLEMENTATION AND BROWSER VISUAL ACCEPTANCE PENDING**, not a claim that visuals/video are already deployed.

**Cross-reference:** `docs/DEEPSYQ_HOME_13_VIDEO_MASTER_SHOTLIST.md` (scene-by-scene motion, separate source pixels), `docs/DEEPSYQ_BASE_55_COORDINATION.md` (#3/#46), and Agent 5 Issue #72. No change to original BASE or Blocks 1–7 TXT source requirements.

## OWNER AMENDMENT — 2026-10-18: DELETE THE LARGE HERO HEADLINE

The owner explicitly ordered **removal** of the large visible `Create beyond limits` wording from Home, superseding earlier references to retaining that headline. Do **not** replace it with another large headline. This is not a redesign: retain the original girl/face placement, desktop 16:9 visible carousel, 12 additional scene identities, cinematic colors, sidebar, site-wide typography, lower blocks, paragraph and CTA buttons. A screen-reader-only generic page heading may remain for document structure, but must not take visible space or include the deleted slogan. Update source and browser assertions together. Preview/owner visual acceptance and commercial media rights remain independently gated; do not infer production deployment.

### OWNER CLARIFICATION — 2026-10-18: SIX IN FEATURED CAROUSEL, THIRTEEN TOTAL

The owner specified **only six real featured videos in the principal Home hero carousel**, while the broader Home/Inspiration scene concept retains **all thirteen distinct scene identities (V01–V13)**. The first six correspond to the first six shot list entries; the remaining seven must NOT be erased from approved media records, archive, Inspiration or later page placements, merely excluded from the hero's six-slot autoplay rotation. The existing featured data endpoint can still return thirteen records, but the visible rotating carousel may display at most six. No static screenshots are videos; all rights, real motion, owner asset approval, 1448/390 visual checks and production gates remain unchanged.
