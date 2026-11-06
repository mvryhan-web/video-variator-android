# Owner acceptance — Studio, header and JARVIX

## Request / acceptance
1. Image, Video, Audio: no Create/My results tabs (History stays in sidebar); compact initial mobile creator with Generate visible without scrolling. Model, settings and type panels share the site's midnight/cyan/violet palette. Preserve real settings, validation, consent and generated results.
2. Only Take a Tour starts the guide. Orb activation uses a short existing listening clip, then microphone; repeat activation never starts a presentation. Avoid redundant speech-recognition starts and error restart loops; Android's system microphone sounds cannot be suppressed by page code.
3. Tour shows the real sidebar before navigating; includes Video Uniquifier, then Pricing and each real plan, returns Home. Pause/Continue and Stop are the only visible transport controls and live near the header on mobile. Plan narration reads actual DOM plan name/price/features through the existing owner voice service; unavailable service must pause visibly, never silently skip or invent voice.
4. Remove preview banner, Promo from header; put Invite in sidebar footer, Tour near menu on desktop, neon Pricing button consistent with Pricing navigation. Do not change Pricing artwork, amounts, credits, packages or legal/financial gating.
5. Verify TEST SHA and real desktop/mobile behavior; no production/APK claims.

Implementation notes: all participating routes import one canonical unversioned core module, avoiding duplicate state caused by ?v=5/6/7 imports. Voice bridge retains an exact allowlist and adds the two verified custom TEST domains. Fresh visit stays idle; explicit listening survives navigation Home. Errors stop recognition retries, startup is deduplicated. A dismiss-without-accepting control allows inspecting settings; submitting the creator still opens consent and is blocked until accepted. No consent flag is set by tests or tour.

Live findings: detailed tariff narration exceeded the laptop voice timeout; shortened to current plan name/price and two visible limits, retaining proposed/unavailable status. Short bridge synthesis returned a real 48 kHz PCM WAV and the revised live tour advanced Trial→Basic→Pro. A later-loaded inner-page shell rule overrode desktop sticky positioning; increased header selector specificity without altering Pricing content/art.
