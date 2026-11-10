# My Creations — original owner-approved showcase assets

The live `my-creations-gallery.js` checks this directory for the original full-resolution WebP files before falling back to existing sample pictures. The fallback is intentional and will be replaced automatically after the following eight files are committed to this directory:

| Filename | Card | Media semantics |
|---|---|---|
| `crystal-bloom.webp` | Crystal Bloom | image |
| `eclipse-portal.webp` | Eclipse Portal | image |
| `velvet-rain.webp` | Velvet Rain | image |
| `bioluminescent-tide.webp` | Bioluminescent Tide | image |
| `skyward-citadel.webp` | Skyward Citadel | image |
| `porcelain-grace.webp` | Porcelain Grace | image |
| `neon-rider.webp` | Neon Rider | video cover art, not a playable video |
| `sculpted-sound.webp` | Sculpted Sound | audio cover art, not an audio file |

The source images were generated for the Owner's November 10, 2026 reference. They are available in the current conversation as `my_creations_gallery_assets.zip` (2.4MB). This document is not the image archive and no deployment is implied by it.

To complete the image replacement: import the exact eight files from the verified archive into this existing asset directory, retain filenames, confirm HTTP 200 and image content types on `https://deepsyq.app/media/my-creations/showcase/`, and check the live gallery on desktop and mobile.

**Privacy:** the showcase is not any user's private work. Actual user creations remain scoped through existing `/api/studio/workspace/cards` and should not be copied into this public directory.

**Release scope:** only this media directory and the existing My Creations page are authorized for this task. Preserve all Pages Worker/Functions and existing API routes, Stripe, Neon and other pages.
