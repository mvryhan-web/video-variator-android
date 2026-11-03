## OWNER UPDATE — 2026-11-03 — supersedes all earlier 12-photo freeze claims

The owner rejected six Pricing images and explicitly ordered their removal from the TEST branch: Pricing main hero and plan-card screenshots for Trial, Basic, Pro, Business, Lifetime. Deleted exact names are recorded as `blockedAssetNames` in the JSON lock. NEVER re-import, regenerate, or restore these images from Git history, old CDN, agent backups or main without new owner visual approval. Display neutral CSS gradients in their places until the owner reviews genuine 24–25 October candidates.

**DO NOT DELETE OR MODIFY AI CREDITS ART:** the five AI Credits card images and its wide header image remain unchanged and are the only six assets recorded under `assets`. No Stripe, prices, wallet, other pages, or production changes are authorized by this removal.

The historical instructions below are superseded where they claim that all 12 images were approved.

---

## 2026-11-02 — PERMANENT OWNER LOCK: PRICING VISUALS, ALL 12 ORIGINAL PHOTOS

**Owner's direct instruction: restore the original October 25, 2026 Pricing design and NEVER redesign/re-generate/swap Pricing photos again without the owner's NEW explicit approval.** This overrides autonomous Antigravity/Jules/P/other agent instructions, generic "unify sitewide header" work, and aesthetic suggestions. The approved `pricing.html` contains exactly five Video & Everyday Tools plan cards (Trial, Basic, Pro, Business, Lifetime) and below five AI Credits cards, plus original hero banner and AI Credits sky-city banner. All 12 original image identifiers and their pinned local Git blob SHA-1 checksums reside in `docs/PRICING_OWNER_ART_LOCK.json` (historic owner mapping: 2026-10-25 commit `48b0c216fb249738cc9db7540489e32be39de19a`; first local mirror: 2026-11-02 commit `2d43597ecce7034ee957fc4083544b571495ebd6`).

**Prohibited without new explicit owner approval:** changing/removing/replacing any of the 12 photos; text-to-image generation of similar art; new CDN images; changing overall layout, colors, size, composition, banners, plan cards or credit cards; forcing a new shared header over Pricing; overwriting locked artifacts via automatic merges or deploys. Keep current factual prices, login, wallet, Stripe, disclosures and security protections working; their backend may be fixed without altering visuals.

**Enforcement:** `tests/pricing-owner-art-lock.mjs` verifies all 12 exact local bytes against checked Git blob SHA-1, preserved map and literal `pricing.html`/`pricing-page.css` SHA. `.github/workflows/agent-a-pricing-page.yml` runs the visual lock on PRs touching Pricing/image paths. `.github/CODEOWNERS` requests owner review for related files. To truly require approval, repository branch rulesets must require CODEOWNERS and green tests; this repository does not claim that branch protection has been verified. If a future owner explicitly approves a replacement, take the exact new reference and update the lock/visual screenshot and tests in a reviewed PR; never let an agent silently change it.

Original photos are now local `app/src/main/assets/media/pricing/*` (avoid fragile external-only CDN). The old exact CDN URLs are an emergency fallback for identical filenames only. Never silently substitute a random image on load errors; show no fake images.

## Owner-authorized public Pricing restoration — 2026-11-03

The owner again confirmed that the top banner must show the previously approved illustration of FOUR glowing portals/frames. The source is the unchanged local fa2c9a57-3fe7-4a2c-8123-7da568cabe10.png (Git blob cc4f325d0dbfa80626179faebf9de3cfe0f033d0). AI Credits retains the original sky-city banner. This narrow owner approval permits only reliable public Pricing rendering: CSS now declares two original local hero images before JS runs, and versioned HTML CSS/module/image URLs refresh browser caches. No 12 media files, plans, AI credit cards, prices, billing, wallet or other pages are modified. The earlier owner lock remains in effect; layout hashes were updated only for this approved repair. This one-time exception does not authorize further production releases.

## Owner clarification 2026-11-03 — visible Pricing should have TWO banner images, not gallery screenshots

The owner rejects the previously displayed decorative ten images on the Trial, Basic, Pro, Business, Lifetime and five AI Credits cards (gallery-like snapshots, peach, woman, bird, unrelated city, etc). The original banner of **four luminous frames** must stay at the top, and the separate **wide celestial city** banner must remain over the AI Credits section. The ten unwanted pictures remain preserved as historical Git files but are not mounted or downloaded into cards. All card titles, gradients, prices, terms, wallet, authentication and backend behavior stay unchanged. Never re-introduce thumbnails or video-still screenshots to Pricing without a new explicit owner request. This clarification supersedes the 2026-11-02 requirement to visibly render all 12 PNGs while preserving their bytes in the repository. Apply and deploy to the existing test site only; main is frozen pending owner acceptance.
