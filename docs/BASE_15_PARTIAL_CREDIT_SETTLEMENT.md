# BASE #15 — trusted partial generation credit settlement

Original source: `docs/DEEPSYQ_PLATFORM_SPEC.md` §15, credit reservation. Extend the **existing** PostgreSQL-backed AI wallet, NOT a parallel wallet, billing route or new migration.

The existing server already reserves approved AI credits before dispatch; unknown provider status stays held; confirmed terminal failure releases the reservation; successful finalized output captures credits idempotently. Previously, success could only capture **all** reserved credits.

Optional trusted server-only `GenerationWallet.settle({userId, jobId, outcome:'success', actualCredits})` now supports a **positive integer actual charge up to the existing reservation**. It atomically captures that amount, returns the unused reserved portion and applies any returned portion to outstanding payment debt FIRST. It reuses the same wallet row lock, reservation status and durable `captured` ledger entry: no additional schema or charge surface. For exact-value retries, the captured ledger's `available_delta - debt_delta` proves the historical returned surplus; an attempted retry with a conflicting amount is rejected. Concurrent identical calls do not double-charge or double-return. `actualCredits` is rejected on failure/unknown and never accepted from the HTTP client. An omitted value preserves previous full-reserve capture behavior.

**Not enabled automatically:** existing Studio success path still invokes `settle` without `actualCredits`, because real provider billing units/currency → correct final customer credit price have NOT been proven. Computing this from unverified provider cost or a browser payload would risk undercharging or overcharging. Do not enable any partial amount until a trusted provider consumption/approved pricing adapter exists.

Test proof: isolated PostgreSQL fixture on localhost only, exercises legacy full capture, concurrent partial capture/replay mismatch, invalid costs, terminal failure and Stripe-refund debt ordering; no live provider, Stripe or production DB accessed.

Actual credits/costs/margin and live rollout remain blocked on owner-approved rates, verified provider invoices, restore rehearsal and consent. Do not mark full BASE #15 live/DONE.
