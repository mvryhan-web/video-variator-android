# Product Watcher B5-03 — source topics for owner review

**Stage:** draft PR #50 only. Watcher disabled by default; no production migration, worker, paid AI or external alerts authorized.

The existing three allowlisted HTTPS source checks already detect a changed normalized page every six hours. This refinement adds bounded SHA-256 hashes of relevant keyword contexts for five review topics: **models, deprecations, pricing, limits, API**. When the page hash changes, the Watcher compares the prior and current topic hashes and stores **only category hints plus a comparison-available flag** with the owner-only proposal. No copied page text, provider secrets, model claims or prices are stored.

Interpretation rules:
- `topicsCompared=false`: historical baseline has no topic digests; no category conclusion is possible.
- `topicsCompared=true, possibleTopics=[]`: page changed but no monitored keyword context difference detected. This is NOT proof that no model/API/pricing change occurred.
- Non-empty `possibleTopics`: a keyword neighborhood may have changed; open the pinned official source link and check the vendor's original release/pricing documentation. These are **heuristic, unverified hints** and can include false positives/negatives.
- Every proposal always returns `verifiedFact:false`, `applied:false`; admin review never changes models, prices, credentials or routing. No automatic credits or generation requests.

Migration `server/migrations/20261015-product-watcher.sql` is still additive, repeatable and **not auto-applied**; two new columns on source rows and two on proposal rows have safe defaults for older snapshots. Local unit tests and isolated PostgreSQL CI validate the SQL and owner-facing API. Live semantic provider/model/pricing verification and notification delivery remain pending release gates. **B5-03 must stay PARTIAL**.

## JS-rendered vendor sources (fail-closed)

An official HTML response can contain navigation and a JavaScript-only placeholder but no actual release notes. When the document visibly requires JavaScript to render its content, the read-only fetch returns `SOURCE_RENDER_REQUIRED`, saves a safe error status, preserves any previous successful hash and does **not** create a fake changed-page proposal. The owner must review a verifiable vendor source or approve a future dedicated read-only feed adapter. No browser automation, bypass, paid provider call, or silent substitution of unapproved sources is introduced. BytePlus's currently linked ModelArk updates page has shown this limitation in a public page inspection; actual availability in the runtime still requires staged testing.
