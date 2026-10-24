# BASE #18 — ambiguous approved model-rate selection

Original owner BASE TXT §18 demands the approved server-side price per provider/model/options, not a browser-calculated or silently guessed amount. The previously merged pricing engine in PR #83 remains intact.

**Identified issue:** `estimateGenerationPricing` gathered matching entries from `AI_MODEL_PRICING_JSON` and sorted by count of explicit matching selectors, choosing the first. Two different rows might both match the same generation (for example, `ratio=1:1` and `quality=1024`), have equal selector count and DIFFERENT AI-credit totals. Switching JSON row order then silently changes the price. It is unsafe to charge on that accidental ordering.

**Scoped fix:** after filtering to the same model ID + provider + kind and matching requested ratio/format/duration/input mode/quality, choose a quote only when a SINGLE rule has highest specificity. Two equally-specific rules fail closed with `null` (existing estimate/job endpoints return `AI_PRICING_NOT_APPROVED`, HTTP 503), requiring the owner to provide one explicit combined row. Unique most-specific rows, non-overlapping options and separate providers retain their old behavior. No implicit default prices, FX, marketer tariff, actual invoice or credits formula.

**Deployment:** all public AI/payment flags remain under existing owner gate; this does not call or change Stripe, provider router, database, wallet, Home, or production Render. The check is code-level, not a license to mark BASE #18 fully DONE without real cost verification.

Test cases cover row-order independence, a unique specific approved price overriding overlapping generic rates, disjoint matching and provider independence.
