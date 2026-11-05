# Owner header and Take a Tour — 6 November 2026

## Request and acceptance

Latest owner instruction supersedes earlier Invite Friend/language controls. Use two compact buttons, All tools and Take a Tour, in the neon header. Preserve centered cyan/violet JARVIX orb, Pricing and login/account. Use the same orb on desktop. Header and desktop sidebar must not cross-fade with page content. Tour visits Image, Video, Audio, AI Apps, Canvas and Tools; supports Pause, Continue, Stop; returns Home and suggests creation.

## Implementation

- Reuses existing mobile shell and original controls. Removes header language select (and its label), referral and promo control; no new account/auth backend.
- Account caption uses existing `vv_token` UI state; server authentication/authorization is unchanged.
- Critical shell CSS and small module load from document head with render blocking; initialization is bounded to 750 ms. Cross-document View Transitions give header, sidebar, orb and mobile menu separate non-fading named snapshots. Old/unsupported browsers retain standard navigation; this is visual continuity, not persistent SPA DOM. No wholesale page-script re-execution/router rewrite.
- Existing owner male voice clips are used in all four languages. No newly generated voice, provider calls or altered audio effects. Intro uses catalogue greeting 01, not a newly recorded verbatim script. Per-section clips are paired with real page navigation and highlighted controls.
- Tour plan is an internal allowlisted eight-step sequence; session data cannot supply arbitrary destinations/audio URLs. Pause persists playback position, completion cannot advance while paused, Stop clears state/audio/spotlights; media blocking pauses with Continue rather than silently skipping.
- Studio tour is read-only: creator form is inert; no consent is accepted/stored. Stopping the tour restores the normal legal prompt before using Studio. Normal non-tour entry retains existing consent behavior.
- Existing missing export of `resumeJarvisRecognition` broke the old guide/core module graph. Exported the existing recognition pause/resume functions; no brain/voice provider replacement.

## Evidence before publication

- Full real browser tour traversed to Home 8/8 then removed audio/controls; observed actual MP3 playback, Image 2/8, Audio 4/8, Canvas 6/8 and ending Home.
- Real Pause returned audio.paused=true; Continue resumed progression; Stop removed audio and toolbar.
- Desktop Home → Pricing reports active cross-document transition, header `ds-header`, sidebar `ds-sidebar`; mobile 320/390 screenshot inspected, no horizontal body overflow.
- Focused tests cover four-language clip file existence, requested route order/return Home, pause completion race, Stop, account caption, gestures and navigation. Native installed APK and older browser transition behavior remain unverified.

Only isolated Render TEST is authorized. Production remains frozen. Draft PR #537 carries these changes; broader inherited CI blockers are not waived.
