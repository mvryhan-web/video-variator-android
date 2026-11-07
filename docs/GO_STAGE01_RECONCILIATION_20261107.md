# GO Stage 01 — reconcile morning TEST ancestry without losing approved work

Owner's 2026-11-07 GO (Issue #566) authorizes *surgical* correction, not mass reset. Previous LIVE TEST 4de99be9fa74999ece8284804e6f06c7b3697feb (unmerged PR #559) contains 14 paths, four commits ahead of approved Studio source 8c5f527ebf6e572d30cd8983d5a9adc234fd7b6d. DEV before this operation was 540244bdb45fa95ee57fc91ec79d1ad1cc0651bc and includes D25 governance and **scoped voice dictation improvement PR #565** (unit snapshot checks 7/7).

## Preservation decision
- **Retained in current DEV:** every previously accepted Studio Settings improvement from #560/#561/#562; all earlier site artwork and behavior; #565 microphone draft fix from PR #559.
- **Do not carry indiscriminately from #559:** its removal of Studio creation-type picker; UI microcopy and hidden AI credits; language relocation to sidebar; changes to shared buttons and mobile shell with unverified overlap; duplicate overlay controls or altered send button appearance; dynamically generated substitute orb.
- **Still to integrate in staged review:** center-aligned new orb from exact owner artwork; approved mobile/desktop header and sidebar; other demonstrably owner-requested JARVIX enhancements. These follow-up changes must be rebased onto this reconciled baseline and tested separately.
- **DO NOT DEPLOY NOW:** The running TEST currently includes an orb/header variation that is not yet faithfully implemented in reconciled DEV; publishing this baseline alone would visually regress the current TEST. First complete stages 02–09 and verify approved visual parity.

## Git ancestry reconciliation
This checkpoint commit deliberately lists both parents: first the current accepted DEV, second the actual LIVE TEST commit. **Its tree equals the accepted DEV tree plus this audit document**, not a file-level wholesale revert and not a re-publication of #559. Both sets of historical commits remain reachable; only explicit reviewed hunks can enter the product tree. This allows a future safe TEST preflight to verify that the running TEST ancestor has been reconciled while retaining approved source. No data deletion, no TEST or production release in this step.

Status: stage 01 **IN PROGRESS**, PR #565 preservation done; UI reconciliation must be verified before stage 01 is called complete. Issue #566.
