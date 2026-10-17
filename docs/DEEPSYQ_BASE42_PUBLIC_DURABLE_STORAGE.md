# BASE #42 — BytePlus public video durable storage guard (Agent B)

Scope: original 55-point BASE §42; Issue #73, branch `base42-byteplus-durable-public-gate-20261016`. BytePlus's output URL is temporary and no user's paid public video should depend on it.

## Implemented safe preparation

- The existing BytePlus poller downloads actual bytes and Studio's finish() can persist bytes into private S3-compatible storage before signaling ready. No alternative router, wallet, provider account or database schema is introduced.
- In public-generation mode (`AI_PUBLIC_GENERATION_ENABLED=true`), a BytePlus **video** model is no longer marked enabled unless the existing `objectStorageConfig(env).configured` is true. The same effectiveCatalog drives quote and generation eligibility, so both fail before task insertion, wallet reservation or provider dispatch when private storage is absent.
- This gate does not touch existing Google Video, BytePlus Image or a legacy owner-only pilot. It does NOT turn an otherwise disabled provider/model on.
- A configured environment only checks HTTPS endpoint/bucket/region/key structure; it does not verify actual S3 reachability, permissions, upload/read/delete, backup/restore, provider commercial eligibility or credit pricing. All remain hard owner-approved live gates.
- Existing #175 provider task handle retention and #184 S3 SHA256 output verification are separate pending PRs, not part of this work. CI is required before merging.

## Acceptance test

Three no-paid unit/HTTP scenarios: missing/incomplete S3 settings fail closed, syntactically configured storage keeps the existing model eligible, and an owner estimate in public mode returns `MODEL_NOT_ENABLED` before any mocked database/provider call. Dedicated Node workflow. No production flags, real credentials, paid requests, Stripe, database migrations, Home or media uploads altered.

**Status: prepared code only — NOT provider-live, bucket-verified, merged, deployed, or whole BASE #42 DONE.**
