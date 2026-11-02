# DEEPSYQ F8 — Living Companion / Magic Shield (owner UX decision 2026-11-02)

Read with original `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_8.txt` and latest `AGENTS.md` / `DECISIONS.md`.

**Product idea:** Luna (copper/cream dog), Mira (charcoal/cream cat), Nova (russet/cream fox) are a useful companion, not a constant animated advertisement. Their user-facing identity is determined by chosen pet and name.

**Visual status (2026-11-02):** The F8 builder now uses each primitive's own BMesh vertices, points orthographic cameras at the actual pet, and fails the asset build when transparent renders are empty or touch a frame edge. Blender 4.2 regenerated the three rigged GLBs, full-body transparent turnaround renders, and eight-frame `idle_breathe` / `walk_loop` sprite sequences. The isolated F8 page and existing companion widget play the verified sprite sequences; they do not yet load GLB animation directly in WebGL. The original owner-selected posters remain reference art, never masquerade as transparent sprites. Reduced motion and the user's Still setting stop animation. No Home layout, payment, voice, production or main-branch changes are part of this F8 patch.

## Scenario coverage — honest status
The policy module `virtual-pet-living.js` registers **all 16** scenarios S01–S16 and persists individual *user preferences*. A checked toggle **does not** authorize unsupported model/credit actions. Users can enable their preferences in advance, disable particular advice, disable all tips, choose Calm/Playful/Off and select dog/cat/fox. Additional 3 original abilities are shared with S04/S08/S10 rather than duplicating backend functionality.

| Code | Owner meaning | Actual current runtime |
| --- | --- | --- |
| S01 | Real purchased-credit quantity quote | **MOCK PREVIEW ONLY**, manual button, no live costs, no paid job |
| S02 | Confirmed existing job before repeat | **MOCK PREVIEW ONLY**, single fake queued job |
| S03 | Compatible alternate model & verified price | **GATED** |
| S04 | Shorts/Reels format 9:16 | **LOCAL DEMO**, a user-approved change; no rerun |
| S05 | Actual print resolution | **GATED** |
| S06 | Reference file missing | **GATED** |
| S07 | Model capability mismatch | **GATED** |
| S08 | Saved draft rescue | **LOCAL DEMO**, already-existing local storage |
| S09 | Deleting last private file | **GATED** |
| S10 | Owner-verified READY job | **MOCK PREVIEW ONLY**; real server ownership still needs adapter |
| S11 | Own History navigation | **GATED** |
| S12 | Truly available free tool | **GATED** |
| S13 | Vocal/instrumental mismatch | **GATED** |
| S14 | Verified background processing | **GATED** |
| S15 | User-defined purchased-credit limit | **GATED** |
| S16 | First-use onboarding without interruption | **GATED** |

**Availability contract:** `createController.offer` accepts only whitelisted ids and explicitly sourced, `verified:true` events. Real sources demand `ownerVerified:true` and per-scenario evidence; gated scenarios additionally require `capabilityVerified:true`. Fake demo events are **never auto-delivered**, only on human click in isolated F8 page. No standalone new wallet, ledger, job DB, voice model, provider dispatch or 3D loader is implemented. A browser flag is not an acceptable finance authorization. Server credit protection and purchased-only dispatch must work with pet Off as before. Empty/failed receipt must never claim READY.

## Helpful, not invasive
- One helpful bubble at a time; priority: purchased-credit risk, existing draft, real capability problem, optional tips.
- Optional automatic tips: max 3 per browser session and >=10 minute quiet window between; avoid duplicate event signatures and "do not show this type again" in the controller. Keep no prompt text or personal filenames in registry.
- Motion: once every 90s, a small 1.8s edge-local step, desktop >=769 CSS px only, when visible, no modal, typing, busy badge, or prefers-reduced-motion. User can set movement Gentle / Playful / Still, side Auto/Left/Right, and compact size. Auto side currently defaults to the safe right edge, not autonomous spatial collision detection; do not claim actual full-screen pathfinding.
- Face: current isolated widget uses the rendered sprite face; authentic GLB runtime playback and binding the remaining authored actions to real advice events are later F8 work.
- Voice: OFF, no microphone request, no speech synthesis, no external AI. A later Voice opt-in requires owner approval, cost/consent and access control under Block 6/7.
- Mobile (320/390px): no strolling. Reduced-motion: no animation. When changing quantities, prompt, model, price, ratio or credits, only an explicit user button may request an authenticated server refresh, not a pet-triggered paid job.
- All advice is optional; pet Off/Hide must not weaken existing actual security controls.

## Verification and release gates
`.github/workflows/f8-three-pets.yml` runs Node 22 syntax plus no-spend unit tests, including whitelisted S01–S16, forgery and ownership negatives, opt-out, priority, cooldown, demo-only gating and reduced-motion. Existing site-wide CI must still pass exact PR HEAD. No provider calls or Stripe. This is **not** full S01–S16 live integration or real 3D; no public deployment without owner sign-off and separate release gate. All generated file contracts in `pets.manifest.json` remain honest about missing GLB/rig/sprites.
