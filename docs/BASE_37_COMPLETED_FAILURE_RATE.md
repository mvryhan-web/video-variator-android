# BASE #37 — business failure rate among completed AI generation jobs

Original BASE §37 requires an accurate failure rate. The existing owner-only Business route exposes `failureRate = failed / all saved, non-deleted generation jobs`. This includes queued, processing and finalizing jobs in the denominator, so during provider congestion it makes failure risk appear to drop even when no finished job succeeded.

A separately named `completedFailureRate` now uses only terminal `ready + failed` jobs as denominator, with `completedJobs` supplied for sample size. If **none** has finished, `completedFailureRate` is **null / unavailable**, rather than a misleading 0%. These are snapshot statuses, not historical provider SLA cohorts. The original `failureRate` field stays unchanged for backwards compatibility, and owner UI clearly labels the new rate and sample size.

No changes to job processing, retry/settlement, storage, pricing, provider fallback, Stripe, wallet/credit grants, authenticated route boundaries, schema, Home or production. Pure Node tests cover pending dilution, empty/terminal cohorts and invalid counters. This does **not** make original BASE #37 complete: paid conversion, gross margin, provider invoice-backed actual cost, revenue/user and churn require independent verified evidence.
