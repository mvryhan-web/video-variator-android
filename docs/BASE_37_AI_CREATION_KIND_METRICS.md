# BASE §37 — Recorded AI generation mix, not overall tool popularity

Original owner BASE §37 requires business analytics. Existing PR #64 conversion, first-generation and cost metrics are preserved. The owner-only Business API now counts durable non-deleted generation jobs by `kind` (image/video/music/voice), including ready/failed, with a deterministic top kind by count then kind. The owner dashboard shows one additional aggregate card. This change does NOT claim “most used tool” across Deepsyq because old Video Uniquifier and free Tools have no comparable usage tracking: `unverifiedMetrics.mostUsedTool` stays null.

No user identifiers, payment IDs, prompts or media in the aggregate; no new data collection, Stripe, provider requests, customer frontend or owner-locked Home edits. Real margin, invoices, FX, churn and trial-to-paid remain unverified. Staging/live activation is separate.
