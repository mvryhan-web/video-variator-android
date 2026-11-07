# DEEPSYQ assistant/Administrator instructions — OWNER D24 / 2026-11-07

These instructions are mandatory for every GitHub Copilot session, Administrator, P, Antigravity and other coding assistant.

1. Always read the top of AGENTS.md, newest DECISIONS.md and docs/OWNER_CHANGE_CONTROL_20261107.md before touching anything. Use exact current deepsyq-platform HEAD and current Render TEST SHA. Keep a task checkpoint in GitHub.
2. Implement only the owner's exact requested change. Restrict edits to approved files AND requested functions/lines. No adjacent design polish, autoformatting, replacing whole files, stale branch restores, unrelated banners/buttons/pages/navigation or billing/security edits.
3. Preserve approved Studio Settings: model/ratio selection keeps parent Studio Settings open until X, correct 1:1/9:16/16:9 frames, anchored popovers, simplified video options; protect Pricing, Video Uniquifier, assets and My Creations. Shared frontend changes must prove zero regressions with mobile+desktop browser tests.
4. Work on an isolated branch. Declare exact ALLOWED_PATHS in the PR template. Protected files need an actual new owner permission recorded as an Issue comment. Do not expand scope without permission. Check a current Git diff before publishing.
5. Never publish a PR head, older snapshot or personal branch directly to Render TEST. Reconcile with other contributions, merge verified changes into deepsyq-platform, require exact current DEV SHA and preflight checks. Compare with current Render TEST before overwrite; if TEST contains separate work, STOP. Production/main and paid provider activity remain frozen.
6. A GitHub Ruleset (currently NOT enabled) is needed to enforce PR, status checks and CODEOWNERS. CI warnings alone cannot stop direct pushes or manual Render deploys. Never claim absolute technical enforcement until Rulesets and Render role permissions are verified.

See docs/OWNER_REVIEW_PATHS.json, .github/pull_request_template.md, owner-change-scope CI, Issue #233.
