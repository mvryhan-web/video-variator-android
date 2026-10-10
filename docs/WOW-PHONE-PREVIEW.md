# Owner phone acceptance build

The `wow-phone-preview` pull request enables `VV_BUNDLED_PREVIEW=true` only
in its Android branch/PR CI build. Normal builds default to false. No main deployment,
stable Release, Render service, database, provider setting or price is changed.

The preview keeps `com.videovariator.app` and the existing signing key.
The native WebView serves packaged static screens at the existing HTTPS origin;
`/api/` and `/vendor/` continue to the existing production server. Consequently
account login and usage remain real production operations, not fixture accounts.
The initial preview navigation unregisters old service workers and clears only
web caches; account localStorage and app data are preserved. Preview screens do
not install a service worker. A visible test-version label distinguishes the APK.

This first acceptance APK contains WOW and current main UI changes. It does not
contain the separate subscription-tool policy, whose backend is still a draft.
No source video is uploaded. Existing local FFmpeg encoding and Gallery export
are used. A new Android test checks actual packaged startup, the real read-only
config endpoint, WOW default-off, and one local WOW encode plus playable Gallery
save. This is emulator evidence, not physical-phone performance evidence.

Owner checks: start with a short owned video, one Gentle variation at 720p;
compare WOW off/on, listen for unchanged speech and check Preview, Gallery,
Download and Share. Then repeat Balanced/Dynamic and 1080p. Test 4K only after
smaller sizes succeed; record device, source duration/resolution, processing
time, visible errors and background/resume behavior. No speed target guaranteed.

An iPhone cannot install this APK. Safari/PWA phone acceptance needs a separately
approved HTTPS preview path; the production URL still serves the published code.

## WOW v2 owner-feedback revision

The initial v1 zoom of 1.2–2.5% was too subtle. V2 uses a 0–0.48-second
opening settle and up to five subsequent, non-overlapping zoom/pan accents.
Detected later shots receive a 0.38-second camera reveal; longer shots
receive pulses. This is reframing across an existing cut, not a crossfade
or a newly invented scene cut.
Motion measurements choose 8%, 11.5% or 15% pulse zoom; the opening is capped
at 16%, and total framing relative to the standard recipe stays within 1.22x.
Direction alternates; the existing recipe shift can reverse the pattern.
All accents use one perspective pass, no added frame cuts, speed changes,
flashes, new audio, aspect-ratio changes or extra encode pass. Pixel content
is reframed/resampled: this does not guarantee preserved detail or immunity
from duplicate recognition. There is no speech, semantic or beat recognition.
Only the first 12 seconds are analyzed and edited in this revision.
Uncertain analysis still skips, and render failures retain the original
recipe. UI reports the count of actual applied camera accents or the skip/
fallback reason. Main, Render, auth, billing and the separate tools policy
remain untouched. The original published test APK is v1 until a new tested
asset is explicitly published; old release assets must not be overwritten.

CI also runs on pushes to this isolated preview branch because the draft PR
can conflict with evolving main. Preview concurrency is isolated from main;
normal release publication remains guarded to main and stable signing.
