# DEEPSYQ change request — exact scope and no-regression acceptance

Describe only the owner's actual task; do not add design polish or unrelated edits. New PRs without the fully completed hidden scope declaration fail the owner-change-scope gate.

<!-- OWNER_SCOPE_BEGIN
OWNER_REQUEST: TODO quote exact owner task and cite the owner Issue comment
BASE_DEV_SHA: TODO exact 40-character latest deepsyq-platform SHA after reconciliation
ALLOWED_PATHS:
- path/to/one/exact-allowed-file
PRESERVE: TODO name specific approved adjacent UI/logic that must remain unchanged
TESTS: TODO desktop/mobile and component-specific tests, no paid calls
OWNER_APPROVAL: TODO precise owner approval https://github.com/mvryhan-web/video-variator-android/issues/233#issuecomment-123456789 for protected files; otherwise NONE
OWNER_SCOPE_END -->

## Scope justification
Why are these exact files/functions necessary? Show a short before/after diff. No whole-file restoration, unapproved reformatting, or editing different features.

## Verified unchanged contracts
Describe which existing workflows stay unchanged, particularly Studio Settings (#560–#562), model/ratio choices, responsive layouts, JARVIX, Pricing and Video Uniquifier design locks, navigation, account data/privacy and billing gates.

## Evidence
- [ ] Exact owner task/checkpoint and latest DEV SHA recorded.
- [ ] PR changes only declared paths and functions.
- [ ] Existing accepted commits and concurrent DEV work retained.
- [ ] Protected UI owner approval comment is linked, if applicable.
- [ ] Scoped CI and relevant desktop/mobile user journeys pass.
- [ ] No real paid AI provider/Stripe/migration or production deployment.

## Release plan (NOT automatic)
**Never deploy this unmerged PR branch.** First merge this exact reviewed change into latest DEV, compare actual running TEST SHA against merged DEV, run the read-only exact-SHA deploy preflight, then publish the **current DEV** to isolated TEST. Verify Render LIVE SHA and actual mobile/desktop behavior. Production remains frozen.

If any required step is not complete, report the exact blocker; do not call it DONE.
