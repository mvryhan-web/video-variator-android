# BASE #17: keep generation economics private from customers

Original owner TXT: `docs/DEEPSYQ_PLATFORM_SPEC.md` §17 Unit Economics. The specification explicitly requires server tracking of provider spend and markup, while the customer-facing frontend uses **AI credits only**.

## Existing system preserved

- Each generation record already stores estimated/actual provider costs and cost currency; owner-only `/api/studio/admin/jobs`, `/api/studio/admin/metrics` and business analytics continue to surface those details.
- The prepaid customer wallet still reserves and captures approved **AI credits**; no Stripe, wallet, pricing or provider API is modified here.
- `GET /api/studio/jobs` previously returned internal `estimatedCost`, `actualCost`, `costCurrency` to any authenticated user who could read their own History. This contradicted §17 and exposed margin-sensitive internal pricing.
- The customer History query and JSON serializer now omit those columns/fields. The single-job detail endpoint already omitted those economics and stays unchanged.
- Existing `provider` and `model` technical identifiers and History credits remain; this is **not** a promise of true provider operating cost or net profit, and no billing records are deleted.
- Real infrastructure cost accounting, verified provider invoices, customer payment net revenue, currency FX and gross margin remain **unverified**; do not invent customer prices or pretend to calculate margin from unrelated currencies.

The targeted test opens actual Express owner-authenticated customer History/detail endpoints, verifies credit-only customer JSON and no cost SQL columns, then proves the owner-only jobs endpoint retains costs. This is **code-level** acceptance, not a public-production paid-generation check. No `main` or Render deployment made.
