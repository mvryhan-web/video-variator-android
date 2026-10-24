# BASE35/36 — pricing wallet privacy delivery / 22 October 2026

Owner requests sustained work toward the functioning AI platform. Canonical 55 requirements, rules and prior agent claims stay intact. This scoped release supports BASE35/36 and pricing43; it does not complete commercial launch.

## Roadmap and acceptance

1. Protect accounts before payments: clear rendered wallet totals/activity and welcome status on rotation/logout, hide/pagehide, focus/storage checks; abort in-flight private requests; reject late responses using token and epoch. Implemented, 20 Node tests PASS.
2. Protect payment handoff: reject stale-account Checkout navigation; suppress duplicate submit; reuse request ID after uncertain reply and same-account lifecycle suspension. No server/Stripe settings changed. Implemented, covered by the same source-executing tests.
3. Verify real browser DOM: Chromium and WebKit mocked endpoint cases cover rendered switch, logout, delayed response and pagehide/persisted-pageshow. CI required; simulated page transition events do not prove real BFCache caching.
4. Independently review: mandatory B↔D-style review identified and resolved three defects. Independent scoped PASS on source SHA256 9fe786738eab59f04438de7ffcefbee7e34834c161f542cea266ed00d690d926, Node tests20/20. No real Stripe/provider call or real authentication implied.
5. Publish scoped change to DEV only after required focused checks. Verify the preview still displays public plans and no private balance for anonymous visitors. Record final PR/SHA/CI/deploy evidence in Issue233.

## Reproduction and boundaries

Before fix, the exact current source rendered Available111 under tokenB when a delayed tokenA balance arrived. Targeted Node test failed (0/1); patched20/20 pass. Tests execute actual page source with controlled DOM/fetch, not a replacement implementation. Storage-denied token reads fail closed; private fetches use no-store and AbortController. Request IDs are not persisted or shared across accounts.

No changes to approved Home, six films, Studio, account backend, wallet ledger, provider router, Stripe credentials/catalog, paid calls, production/main or SQL. Existing owner PR323, red343, C350/C352 and financial333 remain separate, unmerged by this task. ai-pricing.js is not modified by those PRs as inspected. GRAPHIFY_UNAVAILABLE_IN_HOST; safe server map read, frontend outside map coverage.

## Remaining platform gates

- BASE24/35/36: owner323 must fix Studio/History/session leaks and pass independent browser/security acceptance. This pricing fix is not that missing fix.
- BASE13–18/33: owner-approved packs, signed Stripe settlement/refunds/disputes, actual provider/storage costs and >=2x net margin. Draft sample packs are not active offers.
- BASE4–12/40–42: authorized provider account/capabilities, private durable storage and worker recovery verified without spend.
- BASE1/2/48/50 then25/26/31/51/54: controlled release, paid end-to-end and owned download/relogin. Production requires separate release gate; no blanket activation.

Do not mark full BASE35/36 DONE from scoped tests or DEV publication. Next safe continuation: re-evaluate corrected323 SHA and current claims; otherwise new independent security defect in existing lane with a new scoped claim.
