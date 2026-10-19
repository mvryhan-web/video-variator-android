# Deepsyq — Graphify + Ponytail: agent operating guide (2026-10-19)

## SHARED SAFE GRAPHIFY CODE MAP — use before code/history reads

- **Read:** `docs/DEEPSYQ_CODE_MAP.md` (topic and file→symbol/line pointers); `docs/DEEPSYQ_CODE_MAP.json` (allowlisted Graphify AST nodes/relations). On a new task read only the relevant entries, not the whole archive. Both files appear **only after** their first successful publishing workflow on `deepsyq-platform`.
- **Freshness:** `source_sha` must correspond to the indexed source. When current code has changed since SHA, inspect only affected files/diff, or regenerate with the pinned CI. Missing/stale map → narrow search; never fabricate coverage.
- **Generation:** `.github/workflows/graphify-offline-pilot.yml` indexes only `server/` safely with the pinned offline `--code-only` Graphify CLI, tests exclusion of a synthetic secret, then writes *only the allowlisted symbol and relation index*. Raw graph is removed after CI and never published. On DEV pushes, the CI bot attempts to commit the sanitised index back to DEV. If GitHub branch protection blocks this, CHECKPOINT must report that rather than claim publication.
- **Every host:** A/B/C/D/#5 and Jules can use a normal GitHub file reader for this map even if the host cannot launch Graphify CLI or auto-load a skill. Ponytail remains the minimum complete tested diff, not permission to omit requirements. Scope of index is server only until separately tested expansion.


Only these two original tools are approved. This on-demand guide supplements, never supersedes, AGENTS.md, 25 owner rules, BASE 55 or protected Home design.

## Pinned originals already merged to deepsyq-platform

- Graphify: https://github.com/Graphify-Labs/graphify/tree/86c57be8204673c2a1b9849a3292a7dd3ab373d8 ; project skill .agents/skills/graphify/SKILL.md, denylist .graphifyignore, CI tools/graphify/, PR #290 merged as ee680e1e10f0274751631fba9ab3fc5d6bcaf471.
- Ponytail: https://github.com/DietrichGebert/ponytail/tree/09c434ab73ca43761c5d8b0c5d341926c2fba710 ; original byte-for-byte skill .agents/skills/ponytail/SKILL.md, one-task test tools/ponytail/, PR #291 merged as 82aafde066c922b946f1ab3afa0db80ae1278690.
- No tool updates to main or production. No additional tools, executables, auto-hooks or paid AI.

## Minimal workflow: A, B, C, D, coordinator #5 and Jules

1. Resume role from last CHECKPOINT/HANDOFF; inspect claims, current PR and Git SHA. Read only changes after recorded SHA, exact BASE/Block and affected code, not the full archive.
2. If actually running on a compatible local CLI host with an existing verified up-to-date graph, query Graphify for the relevant symbol, trace only small result and verify path/line in the CURRENT Git SHA. No cached graph may override source.
3. In ChatGPT cloud connector chats A/B/C/D/#5 or Google Jules, project-local Graphify CLI and automatic skills-loader support are NOT established. Use narrow GitHub source search/compare instead; record GRAPHIFY_UNAVAILABLE_IN_HOST rather than pretending to run it or stopping work.
4. For every code task, apply Ponytail's smallest-COMPLETE-change principle, either by loading the official skill on compatible hosts or by following AGENTS.md directly. Reuse existing code before adding new code; retain ALL owner requirements, validations, financial safeguards, privacy, error handling, tests, accessibility and exact owner design. The first 15-case pilot missed SHA type validation; the corrected 16-case suite caught and fixed it.
5. Run only no-charge tests and exact-head checks, preserve existing PRs/claims, checkpoint what is proven and blocked. Coordinator #5 merges DEV after review; only agent D deploys production with owner permission.

## What was actually tested, and limitations

- Official Graphify pinned code ran in ephemeral GitHub Actions workflow https://github.com/mvryhan-web/video-variator-android/actions/runs/39222616257 ; scanned 97 server code files in --code-only mode; produced 673 nodes / 1,584 edges.
- Real query for submitPurchasedProviderRequest located generation-purchased-provider-boundary.js L13 and generation-studio.js L24/L275, without rereading full repository. Follow-on wallet/billing correctness still requires real source tests and D review.
- The .graphifyignore prevents indexing .env, keys, passwords, customer/user files, backups/dumps, logs and uploaded media. A synthetic secret file was excluded; graph scanner saw no forbidden paths/marker; generated graph was deleted and not uploaded. Do not use Graphify Cloud, semantic document/media LLM passes, paid APIs, live DB or unknown hooks.
- Graphify was only installed ephemerally in GitHub CI. There is no persisted shared graph or agent CLI service yet; the repository commits supply source instructions and a repeatable test, not automatic execution in A/B/C/D or Jules.
- Ponytail baseline 46 nonblank code lines vs corrected 10 for one isolated pure predicate; native 16/16 scenarios passed in both versions. This does not measure actual ChatGPT/Jules token cost or validate every production requirement.

## Role-specific scope (no transfers)

- A: Image/Canvas/Home; do not sacrifice cross-account draft privacy or original video/design.
- B: Video/provider/jobs/Audio; retain purchased-only consent, one-shot credits, retries and S3 checks.
- C: Tools/AI Apps/Inspiration; retain mobile accessibility, user isolation, rights-cleared content.
- D: credits/Stripe/DB/release; the graph is navigation help, not proof of money correctness.
- Coordinator #5: coordinate via short graph clues and GitHub SHA/diff; no full archive rereads or unsafe merges.
- Jules 1/2/3: refer to instructions when their Google task reads repo rules; do NOT spawn duplicate Jules jobs or claim a confirmed plugin install in Google cloud. Existing Issues #288/#289/#278 are unchanged.
