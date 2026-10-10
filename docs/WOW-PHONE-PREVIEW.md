# Owner phone acceptance build

The `wow-phone-preview` pull request enables `VV_BUNDLED_PREVIEW=true` only
in its Android CI build. Normal builds default to false. No main deployment,
public Release, Render service, database, provider setting or price is changed.

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
