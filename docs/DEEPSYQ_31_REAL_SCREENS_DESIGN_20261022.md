# Owner Home reference applied to real screens — 22 October 2026

Owner request: individual designs for all named screens, then implementation and publication. The previous standalone HTML prototype is superseded as implementation guidance because its forms and example data were invented.

Source DEV: de057636607705a920c626a01f703c1b080b9d00. New attachment `(9).png` was read from the actual user upload and SHA256 verified: be30d8ed55cd7b1c6c584cecfe13d3012f2d2150ae48546b8bd6b215db709388. This is the same canonical screenshot, not a new palette or Home redesign.

## Actual scope

There are 22 HTML documents, not 31 independent HTML documents. The QA manifest enumerates 31 actual addresses/views: those documents, three additional Studio modes/History, five existing Video Uniquifier views and a second local utility mode. It does not invent working Favorites, Challenges or Agent pages. Canvas, Assets, Inspiration and Agent teasers remain their current Home sections, with their existing status.

The Home reference is the visual authority. Its working carousel/media/order and blocks remain unchanged. A shared CSS extension only targets `body:not(.home-neon)` under the existing dark theme. Real route structure, buttons, forms, control eligibility and event handlers remain the source of truth. No JavaScript or HTML functional source is changed.

Treatments: Home-like navy surfaces, cyan/blue/violet borders and active navigation, rounded large existing panels and buttons, consistent input treatment. AI Apps, Everyday Tools, Avatar and Reminders existing heroes use previously approved local creative artwork as decoration. Idle Image/Video/Audio stages use owned illustrative backgrounds only while the empty panel is active; actual results and History keep their original media behavior. Studio existing canvas/composer/popovers, local file tool workspaces, legacy dashboard/history/profile/plans, admin sections and legal reading cards retain their actual content.

`tests/fixtures/owner-design-pages.json` is the exact 31-screen index. `tests/owner-all-pages-design.spec.mjs` checks real signed-out read-only preview routes at desktop/mobile in Chromium/WebKit and records a PNG of every screen. It prohibits backend writes and checks route availability, real view selection and horizontal overflow. No owner account data, paid generation or successful billing is fabricated.

## Verification and publication

Local source/navigation suite: 9/9 PASS. Browser download unavailable locally (downloaded archive truncated); browser acceptance runs in native GitHub Actions and must pass before DEV integration. Existing secondary-neon suite had a stale `#gallery` assertion for the intentionally removed standalone Inspiration page; it now asserts the owner-required Home redirect, real inline gallery and three filters. Browser runner uses Ubuntu 24.04 and the already proven official Ubuntu archive preference.

Publication target is the existing Render DEV service `deepsyq-visual-preview-20261016` (srv-db91k1vf3r2c73fpj350), not main/production or activation of paid generation. Exact CI, merge SHA, live deploy and final visual evidence will be recorded in Issue233. Pending remains pending until those checks complete. This work does not resolve existing account/privacy PR368, provider economics PR333 or commercial release gates.
