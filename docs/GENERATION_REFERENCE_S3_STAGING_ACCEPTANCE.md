# Deepsyq BASE Video — reference S3 staging acceptance (NOT deployed)

Status: **LOCAL SIGV4 HTTP VERIFIED / REAL S3 + MODELARK BLOCKED**.
Owner-approved layout, authentication, wallet, Stripe, current Render services and other roadmap blocks are out of scope.

## Verified in code and CI

- `server/generation-storage.js` implements signed private S3 PUT/GET/DELETE, owner-derived object keys, a separate double-flagged presigned GET for video references and 15–60s signing limits.
- `server/generation-reference-ledger.js` guards owner, readiness, TTL and cleanup in the existing PostgreSQL table; `server/generation-reference-inspector.js` rereads the actual media bytes and reruns FFprobe and Seedance checks.
- Existing focused run **38790331214** passed 50 unit + 9 isolated PostgreSQL/fake-S3 checks. No live storage or provider involved.
- New `tests/generation-reference-sigv4-http.mjs` uses an isolated HTTP server on 127.0.0.1, independently verifies SigV4 header/query authentication and confirms signed GET success, signature tampering / missing signature rejection, time expiry and failed GET after DELETE. GitHub Actions run **38792787579** passed **1/1**.
- An additional **optional** `tests/generation-reference-minio-protocol.mjs` exists but **has not passed** against a real S3 implementation. The official archived MinIO container refused unauthenticated pulls on Quay (run 38791985947) and Docker Hub (run 38792200637). Do not replace official images with unverified mirrors or count this unrun test as passed. A compatible vendor-approved S3 test service/image is required.

## Required before any real provider fetch

1. **Owner-controlled staging only:** agree a dedicated disposable test bucket and endpoint, with no customer media, no permanent public ACL, no user-browser presigned links, no unrestricted CORS. Do not reuse production buckets or production credentials for fixtures.
2. **Verified network and TLS:** confirm the real S3 provider serves strict HTTPS with a valid certificate at an exact allowlisted DNS hostname reachable from the approved ModelArk region. Current code rejects IP literals, private suffixes, unapproved hosts, wildcards and non-default HTTPS ports; DNS approval does not itself prove public routability or protect against provider-side fetch abuse.
3. **Storage protocol acceptance:** verify actual signed PUT → authenticated GET, 30s presigned GET, negative signature/missing signature, expiry, and signed DELETE against a real S3 implementation. Verify denial after delete and no object leak. Preserve an audit of test timing, redacting bearer URLs and object names.
4. **Lifecycle acceptance:** after confirming a restorable PostgreSQL backup and owner approval, apply the existing checksummed migration through the established `migrate:ai` process (never auto-apply it from the reference worker). Confirm owner-only intake, per-user two-slot quota and worker cleanup with both intake OFF and generation OFF, including restart and S3 delete retry.
5. **ModelArk acceptance:** independently confirm that the provider starts fetching a short-lived presigned reference URL before expiry. A 30s URL may be too short for queued/asynchronous provider fetching; change lifetime only with a reviewed threat and retention model. No paid live tests until the owner approves real model costs, rights/privacy, media scanning, credit quote + wallet reservation, user consent and one controlled test spend.
6. **Rollback:** disable new intake, presigning and audio payload flags first; **leave cleanup active** until every staged object is removed. Confirm no outstanding claims or orphaned objects before stopping the worker.

## Never infer from local tests

Local SigV4 verification is **not** real AWS S3/MinIO compatibility, public provider accessibility, malware or media-sanitization approval, privacy clearance, a functioning Render background worker, or successful Seedance 2.0 generation. The current `reference_video` helper is only an internal in-memory planning object, not wired to `generateBytePlus` or user-facing Studio routes. All relevant features remain OFF by default.

See `docs/GENERATION-STUDIO.md`, `docs/AI_PRODUCTION_ROLLOUT.md`, and `PROJECT_STATUS.md` for the existing deployment and owner approval gates.
