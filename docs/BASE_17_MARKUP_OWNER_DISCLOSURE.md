# BASE §17: markup control is not a live credit-price calculator

Original owner §17 requires internal provider costs, markup policy and trustworthy gross margin. The existing owner-only model editor already stores `markupBps` and `internalCostMicros`, but the customer quote remains **explicitly** from `AI_MODEL_PRICING_JSON` in `estimateGenerationPricing`. No automatic owner markup→customer credit conversion exists or is authorized without agreed revenue per AI credit, real provider billing currency and verified infrastructure/Stripe costs.

**Gap resolved by this narrow change:** Owner Admin always displays a clear warning beside each model that these two fields are **reference-only** and do not affect billed credit prices. Save feedback repeats this statement. No model control schema, money conversion, price, wallet transaction, provider call or authentication behavior changes. This is truthful financial safety disclosure, not falsely claiming §17's markup pricing and gross margin are complete.

A Chromium/mobile-WebKit browser fixture uses an authenticated owner session and a mocked model-control PATCH to verify the disclosure persists after saving, the exact markup value is still saved, and no credit quote/generation/Stripe request occurs. This is synthetic acceptance only; do not activate public payments or publish tariffs from this warning.
