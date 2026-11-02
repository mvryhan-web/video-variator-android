# Ponytail: one-task, one-branch pilot only

**Official upstream only:** https://github.com/DietrichGebert/ponytail @ pinned immutable commit `09c434ab73ca43761c5d8b0c5d341926c2fba710`. The file `.agents/skills/ponytail/SKILL.md` is the upstream `skills/ponytail/SKILL.md` **byte-for-byte**, blob SHA `d64edd32265ba21cbf5270158f04e97d96925f27`, MIT license. No remote auto-installer, npm package, plugin lifecycle hooks, telemetry, credential access, user-global settings or access to production.

**Agent environment:** A/B/C/D are separate ChatGPT/GitHub-connected cloud chats, not local terminals. They do read `AGENTS.md`, project plans, claims and Issues, but there is **no verified automatic skill discovery or CLI loader in their chats**. Google Jules runs as a Google-hosted GitHub Issue bot; its support for `.agents/skills` is not verified. Accordingly the plain skill exists only on this **unmerged pilot branch** and is NOT declared active for A–D or Jules. Do not edit root `AGENTS.md` to force global activation. A supported future CLI host can explicitly load the pilot skill; not this coordinator by implication.

## Exactly one pilot task
**Task:** implement a pure standalone *DEV PR readiness predicate* (NO GitHub writes and NO merge), selecting a reviewed PR only if it targets `deepsyq-platform`, remains OPEN/non-DRAFT, has an unchanged expected HEAD SHA, at least one all-success exact-head check, nonempty changed paths all owned/allowlisted, and an explicit security peer PASS when required. No production/main, no billing, no new dependencies.

- `pilot/before.mjs`: deliberately explicit baseline implementation of the SAME required behavior.
- `pilot/after.mjs`: small implementation using Ponytail's reuse/minimal-diff approach.
- `pilot/predicate.test.mjs`: SAME test cases against both variants, including strict SHA-type and other negative/security cases; tests may not be weakened to improve code size.
- This is an **isolated code-size/requirements pilot**, not a controlled proof of LLM token savings (we cannot run independent model sessions in this connector chat). `PILOT_RESULTS.md` must give test counts, files/LOC, any skipped requirement and whether it is safe to expand. The helper is not imported into site or production code.

**Safety gate:** Ponytail's literal skill says *never cut validation, loss-prevention, security, accessibility, or requested requirements*. Our owner 25 rules and full BASE55 always override stylistic minimalism. Source code remains unused until actual focused tests pass. PR stays DRAFT unless the exact-head native workflow is green, both variants satisfy the same requirements, the coordinator reviews the change and reports an honest evaluation.
