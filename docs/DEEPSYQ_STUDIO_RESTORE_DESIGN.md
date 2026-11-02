# Studio restoration — 23 October 2026

Owner priority: locate the exact earlier Image/Video/Audio version; if unavailable, use the three supplied Lumina pages. The historical version was found at commit `22859216555d962239c2f17c56da6795e335293b` (20 October, 16:13 UTC), explicitly restoring centered creation title and bottom composer.

## Implementation

Restore the original Studio-only presentation, while retaining current generation/privacy code and popover fixes. `studio-classic-theme.css` is the byte-exact `deepsyq-global-theme.css` from that commit (SHA-256 `b29e8cccd0c8a799bf928642558f1082f5272e5a30dd654cee6f8025d5a26ee8`). It loads only on `generate-studio.html`. The original `generate-studio.css` and `studio-quickstart.css` still match that historical commit. Remove the later approved-page artwork overlay from this page only. Home, other pages, models, capabilities, provider calls and stored data are untouched.

## Reference inspection

Live desktop Image, Video and Audio pages were opened and their screenshots inspected on 23 October:
- https://ai.byteplus.com/lumina/en/model/image?mode=image
- https://ai.byteplus.com/lumina/en/model/video?mode=video
- https://ai.byteplus.com/lumina/en/model/audio?mode=audio

Observed common structure: sidebar, top-right exploration/history controls, open empty work area, central creation headline and bottom composer with prompt, type/model/settings and generation action. Image and Video offer a material-reference tile; Audio offers voice synthesis controls. Lumina currently uses a black background and cyan primary action. This change restores the historical Deepsyq version as requested first; it is not a claim of a pixel-identical Lumina clone or equivalent provider capabilities. Brand, supported models, accurate pricing, consent and unavailable-generation state remain Deepsyq's.

## Verification

Historical CSS hash and unchanged Studio baseline styles verified locally. Existing quick-creation browser suite checks centered heading and bottom composer for three modes at desktop/mobile sizes, real model/settings controls and History. Acceptance now also requires no empty-state photos or background-image URL. Local browser download was unavailable (truncated upstream archive); use exact-head native CI plus live post-deploy browser review. No paid provider or Stripe requests.
