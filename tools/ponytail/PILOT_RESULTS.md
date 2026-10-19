# Ponytail one-task pilot — results and rollout gate

Official pinned source: [DietrichGebert/ponytail @ 09c434ab73ca43761c5d8b0c5d341926c2fba710](https://github.com/DietrichGebert/ponytail/tree/09c434ab73ca43761c5d8b0c5d341926c2fba710), exactly one plaintext skill. No install of plugin, hooks, scripts or network-enabled agent extension.

**One isolated task:** DEV merge-readiness predicate, two implementations with the identical required safeguards and no application import. Comparing source lines is a useful **illustration** of minimalism; it does NOT demonstrate independent model reasoning or production token reduction.

**Baseline / Ponytail with skill:** `pilot/before.mjs` vs `pilot/after.mjs`. **Acceptance tests:** `node --test tools/ponytail/pilot/predicate.test.mjs` from the repo, plus `node --check` on both implementations.

**Required checks preserved in both:** only DEV; open/non-draft; exact head; at least one latest-head all-success test; allowlisted nonempty files; explicit D security PASS when necessary; no write/merge/production action. Both must pass all 15 test scenarios.

**Actual test evidence:** PENDING GitHub Actions exact-head result; do not call READY_TO_MERGE/claim saved tokens before it appears. If green, record 15/15 outcomes, measured nonblank lines and source SHA; check manually for requirements not represented (e.g. PR author credentials, hidden provider payment side effects, conflicts with freshly advanced DEV). This predicate deliberately does **not** authorize a merge.

**Potential rollout after pilot:** Only if no requirements were lost, choose a confirmed host that actually supports repo-local Agent Skills. Existing ChatGPT A/B/C/D and Google Jules have no proven auto-loading; do not globally activate based on this file alone.
