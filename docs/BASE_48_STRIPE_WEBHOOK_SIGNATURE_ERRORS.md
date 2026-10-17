# BASE 48 — Public Stripe webhook signature diagnostics must be redacted

The existing shared /api/webhooks/stripe handler historically returned the original Stripe SDK exception message to an unauthenticated HTTP caller when request signature verification failed. That message may contain attacker-supplied signing data or internal diagnostics; callers do not need it to know the signature was rejected.

The handler now preserves the existing signature verification, HTTP 400 and signed-event flow but responds with the same fixed string, "Invalid Stripe webhook signature", for every verification exception. Missing signing secret still responds 503. The body is not logged or exposed by this new branch.

A focused Node test executes the actual registration/callback (without starting a web server) with mocked Express and Stripe signing, to verify secret-bearing diagnostic errors produce only the fixed text; missing secret never verifies; valid events still acknowledge after dispatch. Existing billing/webhook regression runs alongside.

No changes to real Stripe keys, live account, legacy subscriptions, AI wallet, provider costs, database, Render deployment, original owner TXT, official logo, paid feature flags, or main. Overall BASE #48 stays PARTIAL until staging/backup/legacy/mobile/commercial release acceptance.