# Ponytail one-task pilot — results and rollout gate

Official pinned source: [DietrichGebert/ponytail @ 09c434ab73ca43761c5d8b0c5d341926c2fba710](https://github.com/DietrichGebert/ponytail/tree/09c434ab73ca43761c5d8b0c5d341926c2fba710), exactly one plaintext skill. No install of plugin, hooks, scripts or network-enabled agent extension.

**One isolated task:** DEV merge-readiness predicate, two implementations with the identical required safeguards and no application import. Comparing source lines is a useful **illustration** of minimalism; it does NOT demonstrate independent model reasoning or production token reduction.

**Baseline / Ponytail with skill:** `pilot/before.mjs` vs `pilot/after.mjs`. **Acceptance tests:** `node --test tools/ponytail/pilot/predicate.test.mjs` from the repo, plus `node --check` on both implementations.

**Required checks preserved in both:** only DEV; open/non-draft; exact head; at least one latest-head all-success test; allowlisted nonempty files; explicit D security PASS when necessary; no write/merge/production action. Both must pass all 15 test scenarios.

**Actual GitHub-native test evidence (2026-10-19):** [Ponytail pilot workflow #39222454901](https://github.com/mvryhan-web/video-variator-android/actions/runs/39222454901) COMPLETE SUCCESS at exact original feature head `81802d2b8304d96d1508524d0494838d1b52b596`; **15/15 scenarios PASS**, **0 fail**, both baseline and Ponytail variant exercised on every scenario (30 predicate assertions); syntax checks PASS. Companion [Product Watcher #39222454883](https://github.com/mvryhan-web/video-variator-android/actions/runs/39222454883) COMPLETE SUCCESS at same SHA. **Baseline 46 nonblank non-comment source lines**, Ponytail version **10** (78% less implementation lines for THIS isolated example). No known required behavior from this test matrix was lost. This is an illustrative, same-author implementation contrast, **not** a controlled independent agent/token benchmark. Potential omissions not in the task scope: PR author credentials, runtime side effects, live provider charging, conflicts with newly advancing DEV. This predicate deliberately does **not** authorize a merge.

**Potential rollout after pilot:** Only if no requirements were lost, choose a confirmed host that actually supports repo-local Agent Skills. Existing ChatGPT A/B/C/D and Google Jules have no proven auto-loading; do not globally activate based on this file alone.
