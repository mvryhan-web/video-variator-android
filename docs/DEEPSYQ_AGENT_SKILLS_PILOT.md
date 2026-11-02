# Deepsyq — curated engineering skills pilot (owner request, 2026-10-17)

**Purpose:** make tested, reusable coding-review guidance discoverable by GitHub Copilot-compatible agents, without importing install scripts, creating duplicate workers or rewriting BASE tasks. This is a **non-BASE tooling pilot**; no new A/B/C/D claim or DONE state is implied.

## Sources and credit

- [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC) by Affaan Mustafa — [MIT license](https://github.com/affaan-m/ECC/blob/main/LICENSE). Selected workflow ideas: e2e-testing, browser-qa, security-review, tdd-workflow.
- [Agency Agents](https://github.com/msitarzewski/agency-agents) — [MIT license](https://github.com/msitarzewski/agency-agents/blob/main/LICENSE). Selected role ideas: Reality Checker and Frontend Developer.
- Text in this PR is a **Deepsyq-specific adaptation** with source attribution, not a bulk mirror, unreviewed hook collection or automatic installer.

## Installation scope and order

1. **Engineering verification:** `.github/skills/deepsyq-reality-checker/`, `deepsyq-e2e-testing/`, `deepsyq-browser-qa/` — prevent imaginary CI passes and catch mobile/real-video regressions.
2. **Safety:** `deepsyq-security-review/` — review purchased credits, auth, uploads and provider/Stripe gates.
3. **Quality:** `deepsyq-tdd-workflow/` — RED/GREEN reproducibility; no forced test retrigger.
4. **UX:** `deepsyq-frontend-review/` — preserve locked Home while improving actual navigation and accessibility.
5. **Later, only with proof of need and explicit scoped work:** architect, SEO researcher, AI-video-provider evaluator. Do not install entire ECC/Agency libraries at once.

## Discovery and how to verify

GitHub Copilot's documented project Agent Skills location is `.github/skills/<skill-name>/SKILL.md` with `name` and `description` YAML frontmatter. Copilot can load matching skills **when used by a supported Copilot client/agent**. The repository does **not** execute skills by itself. ChatGPT sessions and existing Deepsyq agents do not automatically adopt them, and this PR creates **no separate running agent**.

After review, verify in a supported Copilot environment that the six skill names are discoverable; run a harmless read-only prompt ("review the latest BASE #29 navigation test evidence using deepsyq-reality-checker"), then inspect whether the cited actual GitHub SHA/CI status matches reality. If Copilot is unavailable, discovery/activation stays **NOT VERIFIED**. No change in production is necessary to perform a read-only discovery check.

## Validation and guardrails

- Only Markdown guidance and YAML frontmatter. No hooks, binaries, `npm install`, `curl | sh`, permission escalation, keys or paid requests.
- Do not alter `main`, `deepsyq-platform`, `AGENTS.md`, base 55 checklist, claims, live config, routes, media, databases, CI workflows, Stripe or Render.
- Before merging this separate draft PR, coordinator #5 reviews cross-agent scope and ensures compatibility with `AGENTS.md` and canonical regulations. The user retains final approval for risky actions.
- Success here means **skill files ready for review**; success does not mean the skills have been invoked, agents created, CI passed or the BASE shipped.
