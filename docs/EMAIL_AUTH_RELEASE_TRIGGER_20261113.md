# DEEPSYQ — Email account storage release (2026-11-13)

Owner authorization: connect persistent Email/password account storage to the production DEEPSYQ site.
Google OAuth, its original login handler, Google sign-in button, and all other public frontend assets MUST remain unchanged.

Verified preflight: GitHub Actions 43478474780 passed against Cloudflare baseline deployment 47b9d222-5243-4a67-8c6d-b0b3b5eb20dc. Four Python scope tests and four Node authentication tests passed. 2803 static assets preserved.

Release guard: deploy only the approved Email route additions inside the existing Cloudflare Worker, using the already-configured production DATABASE_URL secret. If live database schema or credentials are unavailable, roll back and report the blocker. No new plaintext secrets.


Retry 2: sanitized backend diagnostic, unchanged Google code. Previous release rolled back verified baseline 47b9d222-5243-4a67-8c6d-b0b3b5eb20dc because Email account database was not ready. Release must fail-closed and automatically restore baseline again if so.


Retry 3: fix Neon SQL HTTP endpoint to regional API host (the serverless driver default). One more guarded production release; Google route byte-identical, all non-Email resources preserved, automatic rollback enabled if account readiness fails.
