# Product Watcher B5-03 — source topics for owner review

**Stage:** draft PR #50 only. Watcher disabled by default; no production migration, worker, paid AI or external alerts authorized.

The source allowlist now covers **seven** pinned official HTTPS pages: BytePlus ModelArk product updates; Google Gemini API changelog, pricing and rate limits; and OpenAI API changelog, pricing and rate limits. The original three changelog keys are preserved, so existing baselines remain intact. Each page is checked no more often than every six hours when the private worker is explicitly enabled. These public vendor pages may differ from account-specific pricing, negotiated tiers and quota dashboards. Bounded SHA-256 hashes of **all** matching keyword contexts (not merely the first 24) are collected for five review topics: **models, deprecations, pricing, limits, API**. When the page hash changes, the Watcher compares the prior and current topic hashes and stores **only category hints plus a comparison-available flag** with the owner-only proposal. No copied page text, provider secrets, model claims or prices are stored.

Interpretation rules:
- `topicsCompared=false`: historical baseline has no topic digests; no category conclusion is possible.
- `topicsCompared=true, possibleTopics=[]`: page changed but no monitored keyword context difference detected. This is NOT proof that no model/API/pricing change occurred.
- Non-empty `possibleTopics`: a keyword neighborhood may have changed; open the pinned official source link and check the vendor's original release/pricing documentation. These are **heuristic, unverified hints** and can include false positives/negatives.
- Every proposal always returns `verifiedFact:false`, `applied:false`; admin review never changes models, prices, credentials or routing. No automatic credits or generation requests.

Migration `server/migrations/20261015-product-watcher.sql` is still additive, repeatable and **not auto-applied**; two new columns on source rows and two on proposal rows have safe defaults for older snapshots. Local unit tests and isolated PostgreSQL CI validate the SQL and owner-facing API. Live semantic provider/model/pricing verification and notification delivery remain pending release gates. **B5-03 must stay PARTIAL**.

## JS-rendered vendor sources (fail-closed)

An official HTML response can contain navigation and a JavaScript-only placeholder but no actual release notes. When the document visibly requires JavaScript to render its content, the read-only fetch returns `SOURCE_RENDER_REQUIRED`, saves a safe error status, preserves any previous successful hash and does **not** create a fake changed-page proposal. The owner must review a verifiable vendor source or approve a future dedicated read-only feed adapter. No browser automation, bypass, paid provider call, or silent substitution of unapproved sources is introduced. BytePlus's currently linked ModelArk updates page has shown this limitation in a public page inspection; actual availability in the runtime still requires staged testing.

## B5-03 official pricing and rate-limit source coverage — 2026-10-16

- Newly pinned official references: [Google API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Google API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing) and [OpenAI API rate limits](https://developers.openai.com/api/docs/guides/rate-limits). These document links were checked for provenance; **no worker HTTP integration, exact price extraction or account-specific limit verification has been performed**.
- The same strict host/path allowlist, no redirects, 9-second per-source timeout, 1 MiB download cap, 6-hour durable interval, pause lock and error-only diagnostics apply. No arbitrary URL input or new credential access was introduced.
- First checks for new source keys create separate baselines without generating proposals. Differences only add an owner-review signal; **never** automatically update prices, models, cost calculations, provider routing, quotas or payments.
- Long pages now hash all keyword neighborhoods through a streaming SHA-256 digest with the same 1 MiB input cap, avoiding missed hints when announcements are beyond the old 24-match cutoff. A new digest algorithm may produce a one-time review hint for an unchanged *old* source whose previous checksum came from the 24-match implementation **if the page checksum subsequently changes**; same-page hashes do not create proposals.
- Keep B5-03 **PARTIAL / NOT DEPLOYED** until official-page runtime fetches, JS-rendering behavior, actual factual comparison and owner review have been verified in staging. Unit/isolated DB CI outcomes must be recorded separately.

## B5-03 content-only documentation fingerprints — 2026-10-16

- HTML fingerprints now use `<main>` or `<article>` content only and exclude inner navigation, headers, forms, sidebars and footers. The original HTML markup, script/style and document chrome are not kept in the database. Plain-text documents retain normal bounded text normalization.
- An HTML response with only global navigation or no readable article/main content now fails closed with `SOURCE_MAIN_CONTENT_MISSING` or `SOURCE_NOT_READABLE`; an existing successful content hash is preserved, and no speculative provider update is issued. BytePlus's explicit JavaScript-required shell still returns `SOURCE_RENDER_REQUIRED`.
- This improves signal quality but does **not** prove that vendor pages expose valid structured facts. On the first subsequent successful fetch, existing three-source *older* whole-page hashes may produce **one review-only migration noise proposal** because the fingerprint representation changed. Review and dismiss such entries; no automatic rate changes or alert-to-action routing is allowed.
- New synthetic tests cover vendor navigation churn, genuine content edits, missing-document failures and the existing isolated PostgreSQL baseline flow. Live worker requests, individual account plan quotas and exact unit-cost extraction remain unverified.
