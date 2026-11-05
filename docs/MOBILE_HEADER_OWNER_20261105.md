# Owner mobile header — 2026-11-05

## Scope and acceptance

Owner supplied 11 phone screenshots and explicitly requested a shared mobile header on all pages, including previously locked Pricing/Tools/Video Uniquifier. This permission covers the header/navigation only: no artwork, plan copy, processing, billing or voice-model changes. Reference: Неоновый интерфейс Deepsyq с AI Canvas(3).png. Fixed two-row header: centered brand above, existing Jarvis orb at exact horizontal center below, language/promo left and pricing/login right. Carousel remains ordinary scrolling content. Drawer opens by menu or right swipe from the left edge, closes by menu/scrim/left swipe, and hides the header orb. Invitation moves to the sidebar bottom. Remove global header search, duplicate mobile Tools toolbar and the small Pricing/AI Credits/privacy links below the shared Image/Video/Audio composer. Remove accidental literal \n after main opening tag.

## Implementation

Shared independent module/CSS loaded from Home, secondary-page shell and Video Uniquifier adapter. Existing Home controls move with their event handlers on mobile and restore to their original slots on desktop; no duplicate assistant. Header is moved outside page-specific stacking contexts. Safe-area inset and 320px phones are handled. Existing preview/payment/consent disclosures stay truthful. Touch direction classifier ignores vertical scrolling, taps, long drags and non-edge opening gestures; physical Android swipe not yet verified.

## Verification

Local managed preview uses the actual isolated server and actual frontend in 390px/320px iframes, not generated screenshots. Ten loaded routes checked at 390px: Home, Image, Video, Audio, Tools, Canvas, AI Apps, Video Uniquifier, Pricing, Audio tools. Header top=0, orb center error=0, no body horizontal overflow. Home checked after scroll; all four languages checked at 390/320 with no button overlaps. Home drawer visually verified above content with orb visibility:hidden; button closes it. Six no-spend unit/navigation tests PASS; JS syntax and diff whitespace checks PASS. Screenshots inspected against owner mockup. Studio/Audio tools legal consent modal blocks full visual interaction in this cloud session; no terms accepted on owner's behalf.

Existing inherited checks are not weakened: pricing art-lock fails its pre-existing pricing.html hash; Jarvis core suite fails an inherited session-key assertion; guided-tour suite inherits missing-export failure. No protected art/lock baseline changed. These issues predate this header-only patch and forbid a green-all-CI/DEV-merge claim.

## Source and release

Source is actual TEST 1b0b826d9121ff2ac299e098a89c8739d089b1a8 (deploy dep-dbm7lsp5efls73co6k40), retaining concurrent SEO, voice and media exactly. Earlier separate voice branch cc03db9 was replaced on TEST by another deployment before this request; do not silently restore older whole-page sources. No production publication. Final deployment and live evidence to be recorded in PR checkpoint. Temporary local QA page and preview launcher are excluded from publication.
