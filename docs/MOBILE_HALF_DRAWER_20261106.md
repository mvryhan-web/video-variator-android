# Owner follow-up — half-screen drawer and bottom composer

Latest screenshot: mobile drawer must stop at half the screen, not ~82%. Keep every destination reachable with readable wrapped labels. Desktop sidebar is unchanged.
Attached owner note additionally requests the Studio composer at the bottom, with the center reserved for image/video/audio results, while Generate stays visible on entry. Uses viewport-height flex layout with a shrinkable stage; actual History remains scrollable. No reintroduced tabs, promo, search, voice or tariff changes.

Base: published TEST 5ecd7de6 (exact tree of verified Work version b9461deb), plus current DEV dfdec01f code-map documentation. Preserve both histories; no old Antigravity UI restored. Publish only existing isolated TEST.
