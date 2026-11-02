# BASE24/35/36 — current DEV Studio account boundary

Owner continued the previously announced Studio/History privacy stage after pricing-wallet PR366/367. Current baseline4b2ecb68c07ddde481dd45c0bfc2e59aa2a7858c; owner323 remains unchangedf837ced and conflicted, negative343 retained. This is a minimal security integration, not a replacement composer or permission to merge323.

## Implemented slice

- A Studio document is tied to its opening credential in memory only. On rotation/logout, capture listeners stop stale actions before dispatch; a periodic guard catches silent same-tab changes.
- Synchronous teardown hides/inerts the old document first, clears prompt/reference PNGs/History/results/wallet/consent/progress, closes dialogs, revokes object URLs and clears crop canvas/state. Local account-specific draft and unscoped job/handoff pointers are removed on observed account rotation.
- Old requests are aborted and request credentials remain bound to the original document. Response JSON/Blob reads recheck the session before returning. Local image preparation, FileReader, result conversion, crop and initial handoff continuations recheck before restoring state.
- Reload creates a clean account context rather than partially reinitializing the large composer. Same-account pagehide preserves tab draft storage; persisted pageshow reloads before allowing interaction. Genuine server jobs are not cancelled and no credits change.

## Validation and limits

Actual-source boundary and local async Node14/14 PASS. Dedicated native Chromium/WebKit cases derived from existing negative343 cover already-rendered History under storage/focus, attached PNG+prompt, logout, persisted-pageshow, real Back/refresh, stale Reuse and stale Delete dispatch. Fixtures are account-aware and initialize A once, so real reload cannot reset B to A. No original negative tests are deleted or weakened.

These are controlled fake tokens/endpoints, not real user login, a server cross-tenant database leak, paid generation or real Stripe. Full BASE24/35/36 are still PARTIAL. Native CI and mandatory independent peer review gate merge. Existing broad Studio regression must preserve working generation; no main/production/provider/SQL changes.

## Integration handoff

Acknowledged same-path overlap with323 and parked152 before changes in Issues233/323. Later323 reconciliation must preserve this account boundary and rerun negative343 plus these tests. Existing Home, six MP4s, providers, wallet ledger, auth and Stripe remain separate. Graphify safe server map is not a frontend graph; GRAPHIFY_UNAVAILABLE_IN_HOST.
