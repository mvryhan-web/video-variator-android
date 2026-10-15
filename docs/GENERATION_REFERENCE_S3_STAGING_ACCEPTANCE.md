# Deepsyq BASE Video — reference S3 staging acceptance (NOT deployed)

Status: **LOCAL + OFFICIAL UPSTREAM MINIO S3 VERIFIED IN CI / DEPLOYED S3 + MODELARK BLOCKED**.
Owner-approved layout, authentication, wallet, Stripe, current Render services and other roadmap blocks are out of scope.

## Verified in code and CI

- `server/generation-storage.js` implements signed private S3 PUT/GET/DELETE, owner-derived object keys, a separate double-flagged presigned GET for video references and 15–60s signing limits.
- `server/generation-reference-ledger.js` guards owner, readiness, TTL and cleanup in the existing PostgreSQL table; `server/generation-reference-inspector.js` rereads the actual media bytes and reruns FFprobe and Seedance checks.
- Existing focused run **38790331214** passed 50 unit + 9 isolated PostgreSQL/fake-S3 checks. No live storage or provider involved.
- New `tests/generation-reference-sigv4-http.mjs` uses an isolated HTTP server on 127.0.0.1, independently verifies SigV4 header/query authentication and confirms signed GET success, signature tampering / missing signature rejection, time expiry and failed GET after DELETE. GitHub Actions run **38792787579** passed **1/1**.
- **Official MinIO acceptance passed in CI**: workflow `deepsyq-reference-s3-protocol.yml`, run **38796164230** (`s3-real-source` and `s3-link-guards` both green). This builds pinned official MinIO from Go source on the isolated runner and verifies private signed MP4 PUT/GET, presigned GET, altered/missing/expired signature rejection, signed DELETE, denial after deletion, and disposable bucket removal. The official archived MinIO container was unavailable on Quay/Docker Hub in earlier attempts; **no unaudited mirror** was used. A specific cloud S3 vendor/region still requires separate staging acceptance.

## Required before any real provider fetch

1. **Owner-controlled staging only:** agree a dedicated disposable test bucket and endpoint, with no customer media, no permanent public ACL, no user-browser presigned links, no unrestricted CORS. Do not reuse production buckets or production credentials for fixtures.
2. **Verified network and TLS:** confirm the real S3 provider serves strict HTTPS with a valid certificate at an exact allowlisted DNS hostname reachable from the approved ModelArk region. Current code rejects IP literals, private suffixes, unapproved hosts, wildcards and non-default HTTPS ports; DNS approval does not itself prove public routability or protect against provider-side fetch abuse.
3. **Storage protocol acceptance:** verify actual signed PUT → authenticated GET, 30s presigned GET, negative signature/missing signature, expiry, and signed DELETE against a real S3 implementation. Verify denial after delete and no object leak. Preserve an audit of test timing, redacting bearer URLs and object names.
4. **Lifecycle acceptance:** after confirming a restorable PostgreSQL backup and owner approval, apply the existing checksummed migration through the established `migrate:ai` process (never auto-apply it from the reference worker). Confirm owner-only intake, per-user two-slot quota and worker cleanup with both intake OFF and generation OFF, including restart and S3 delete retry.
5. **ModelArk acceptance:** independently confirm that the provider starts fetching a short-lived presigned reference URL before expiry. A 30s URL may be too short for queued/asynchronous provider fetching; change lifetime only with a reviewed threat and retention model. No paid live tests until the owner approves real model costs, rights/privacy, media scanning, credit quote + wallet reservation, user consent and one controlled test spend.
6. **Rollback:** disable new intake, presigning and audio payload flags first; **leave cleanup active** until every staged object is removed. Confirm no outstanding claims or orphaned objects before stopping the worker.

## Never infer from local tests

Local and official source-built MinIO verification is **not** real deployed cloud-vendor S3 compatibility, public provider accessibility, malware or media-sanitization approval, privacy clearance, a functioning Render background worker, or successful Seedance 2.0 generation. The current `reference_video` helper is only an internal in-memory planning object, not wired to `generateBytePlus` or user-facing Studio routes. All relevant features remain OFF by default.

See `docs/GENERATION-STUDIO.md`, `docs/AI_PRODUCTION_ROLLOUT.md`, and `PROJECT_STATUS.md` for the existing deployment and owner approval gates.


## Official source-built MinIO evidence — 2026-10-15

The official MinIO Community Edition moved to source-only distribution (https://github.com/minio/minio). We added an independent `s3-real-source` job in `.github/workflows/deepsyq-reference-s3-protocol.yml` to compile official **pinned** upstream `RELEASE.2025-10-15T17-29-55Z` with Go 1.24.8, start MinIO on **127.0.0.1:9000** with disposable data and fixture credentials, then use `tests/generation-reference-minio-protocol.mjs` against the real S3 implementation. This replaces abandoned Quay/Docker Hub images; no unofficial third-party containers are used.

CI run **38795444234** proved: MinIO accepted the application's **S3 signed MP4 PUT, private authenticated GET, and 30-second presigned GET**; the MP4 bytes matched, and a tampered signature parameter was rejected. The job then failed at a test expectation because MinIO legitimately returns **HTTP 400** for a missing signature parameter rather than HTTP 403. Commit `1fe6734` corrected that assertion to accept either explicit denial. **Subsequent full upstream-MinIO run 38796164230 passed both jobs** (real MinIO 1/1 tests, local link security 1/1 tests; zero failures/skips). An earlier run 38794713859 failed with `411 MissingContentLength` because the test-only Node HTTP request did not supply Buffer length, whereas production `fetch` does; commit `e33e33a` set the actual content length and real MinIO accepted the resulting upload. The passing **38796164230** run executed the full real MinIO expiry, signed DELETE, GET-after-delete and bucket-teardown checks. A later optional redundant anonymous-GET experiment caused `ECONNRESET` (run 38797480195); it was removed in commit `3fd658e` while retaining required negative missing-signature checks. This flaky extra experiment is not a production feature. No production S3, public bucket, real customer MP4, live BytePlus or credits have been touched.

Next: retain the full green `s3-real-source` regression gate; verify the particular owner's future production S3 provider separately (MinIO passing would not prove all S3 vendors behave identically), and only then consider secure ModelArk fetch timings/consent/pricing. Keep all reference upload, video presigning and provider-paid activation flags OFF.
