## OWNER D34 — Cloudflare for all future agents (updated 2026-11-10)

**Verified connection exists; do not request or regenerate an existing token merely because its raw value is invisible.** GitHub Actions stores `CLOUDFLARE_API_TOKEN` as a secret and `CLOUDFLARE_ACCOUNT_ID` as a secret/variable for the `deepsyq` Cloudflare Pages project. The GitHub connector can read the workflow *references* but cannot retrieve the secret itself. Workflow jobs may use it via the GitHub runner with `env:`, never writing the value to source, logs, issues, artifacts, prompts, or chat.

**For any new P/Admin/Antigravity agent:** open `AGENTS.md` first, then this runbook. Existing read-only test `.github/workflows/owner-cloudflare-worker-permissions-audit.yml` now supports `workflow_dispatch`. An authorized repository collaborator can run it from **GitHub → Actions → Owner Cloudflare existing Worker permissions audit (read-only) → Run workflow → deepsyq-platform**. It checks the available token(s) without revealing them. Actions access is governed by GitHub permissions; do not grant unrestricted access to third parties merely to share a token.

Example for existing authorized workflows (names only, no values):
```yaml
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID || vars.CLOUDFLARE_ACCOUNT_ID }}
```

**Latest observed checks (2026-11-10):** Pages project GET: 200; token verification: 200; Workers list: 200; managed Worker content: 404 (script not found at the queried name on that account); Worker settings: 200; zone lookup `deepsyq.app`: 200; Workers Routes list: 403. Read these as *API scope / resource / script-name findings*, not evidence that the existing secret is absent. Even with a successful Pages API call, **a surgical production release remains blocked until original Worker/Functions, bindings, assets and exact change scope are provably preserved**. No static-only Pages deployment to MAIN. An alternate routed Worker is not authorized when Routes access is 403.

Proof of on-demand zone/route probe: [GitHub Actions 42789870823](https://github.com/mvryhan-web/video-variator-android/actions/runs/42789870823). Earlier Worker audit: [GitHub Actions 42582178313](https://github.com/mvryhan-web/video-variator-android/actions/runs/42582178313). Check fresh results before each deployment.

---

## OWNER D29 — TWO PERMANENT LINKS — 2026-11-09

- **Canonical TEST**: `https://test.deepsyq.pages.dev`, alias of Pages project `deepsyq` preview branch `test`, upload via `--project-name=deepsyq --branch=test`, then verify stable alias. All executors including Antigravity use ONLY this same owner-facing test endpoint.
- **Canonical MAIN**: `https://deepsyq.app` (production branch `deepsyq-platform`). `https://deepsyq.pages.dev` also points to PRODUCTION, never treat it as TEST.
- Do not share immutable `https://<hash>.deepsyq.pages.dev` as current TEST; they may remain technically accessible even while the branch alias updates.
- After the owner explicitly approves one exact TEST revision, publish only it to MAIN without seeking redundant confirmation, but preserve the currently deployed Pages Worker (`uses_functions:true`), API and bindings and have rollback verified. Raw static-only upload to MAIN is forbidden. Existing Worker read 403 is a release blocker until resolved. Keep `BLOCKED_MAIN` honest.
- Github instructions do not automatically delete old URLs, enforce token access, change Cloudflare project settings, or migrate legacy PR preview workflows. Verify actual stable TEST publication before reporting it as LIVE.

**Verified Cloudflare API 2026-11-09 11:07 UTC (read-only):** `2fa7fbd4.deepsyq.pages.dev` is the CURRENT production deployment: `environment=production`, `branch=deepsyq-platform`, `trigger=ad_hoc`, `commit_dirty=true`, `uses_functions=true`, deployment commit metadata `3a45020a7f150d2dbce72b00b20f0de2743511fd` (not present as a retrievable GitHub repository commit). **This is NOT Antigravity TEST.** The inspection did not identify the human publisher. No exact `https://test.deepsyq.pages.dev` branch alias was found among the last 80 deployments; do NOT tell the owner that stable TEST is live until it has been deployed with the COMPLETE original Worker/Functions and verified. Audit: https://github.com/mvryhan-web/video-variator-android/actions/runs/42606643537 .

---

# DEEPSYQ — Cloudflare access runbook for every connected ChatGPT conversation

Verified 2026-11-09 via GitHub Actions [run 42582178313](https://github.com/mvryhan-web/video-variator-android/actions/runs/42582178313), [PR #648](https://github.com/mvryhan-web/video-variator-android/pull/648). No secrets or Worker source have been disclosed.

## Where the existing access lives

- Repository: `mvryhan-web/video-variator-android`, branch `deepsyq-platform`.
- Cloudflare project: `deepsyq`, production `https://deepsyq.app`, project production branch `deepsyq-platform`. **`https://deepsyq.pages.dev` is also production**, not isolated TEST.
- **Active GitHub Actions secret `CLOUDFLARE_API_TOKEN`**; account ID held under `CLOUDFLARE_ACCOUNT_ID` as a secret or variable. Only reference names in code or docs, never contents.
- Existing GitHub Actions can publish isolated Preview using this secret (proof: [successful run #42507607216](https://github.com/mvryhan-web/video-variator-android/actions/runs/42507607216)); this avoids asking the owner for the token again.
- A direct Cloudflare app is not connected to ChatGPT in this conversation. GitHub Actions is the **indirect** already-working Pages route. A GitHub-connected chat can access this runbook but cannot see the underlying secret's value.
- No credentials were configured under these five alternative **tested names**: `CLOUDFLARE_WORKERS_API_TOKEN`, `CLOUDFLARE_WORKER_API_TOKEN`, `CF_API_TOKEN`, `CF_WORKERS_API_TOKEN`, `CLOUDFLARE_DEPLOY_TOKEN`. This is not a full list of any other secrets that may exist under unknown names.

## Verified effective permission (same current GitHub Actions secret)

| Read-only Cloudflare operation | HTTP | Finding |
| --- | --- | --- |
| GET /user/tokens/verify | 200 | Token **active** |
| GET /accounts/{id}/pages/projects/deepsyq | 200 | Pages project accessible |
| GET /accounts/{id}/workers/scripts | 200 | Workers list endpoint accessible |
| GET /accounts/{id}/workers/scripts/{production_script}/content/v2 | **403** | No access to specified resource |
| GET /accounts/{id}/workers/scripts/{production_script} | **403** | Same error |
| GET /accounts/{id}/workers/scripts/{production_script}/settings | **403** | Same error |

The Pages API identified `pages-worker--23533382-production` at time of verification. **Look up the script name again every time**. A Cloudflare dashboard permission may have been added to a different token, account role, or resource; the 403 does not prove the permission was never added. It may also reflect restrictions on Pages-managed Workers. The official [Cloudflare Get Worker Script Content API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/content/methods/get/) lists `Workers Scripts Read`, `Workers Content Read-Only`, and related roles.

## Critical safety rule for MAIN

The existing production Pages deployment has a server Worker: deployment field `uses_functions:true`. The isolated experiment [run #42578097169](https://github.com/mvryhan-web/video-variator-android/actions/runs/42578097169) reused all 1,549 other production file hashes and removed only two Video Uniquifier shortcuts from `/jarvix-composer-design.js`, but the new Preview became `uses_functions:false` and would break backend functions if released. Do **not** promote a manifest-only preview or blindly use `wrangler pages deploy app/src/main/assets` to MAIN; production has unrelated changes in Studio, Pricing and JARVIX. Original live Worker and bindings must be preserved.

Preview must use `https://<deployment-hash>.deepsyq.pages.dev`, non-production branch. Earlier UI-only chat fix [PR #644](https://github.com/mvryhan-web/video-variator-android/pull/644) passed 10 desktop/mobile page checks in TEST, not a backend safety acceptance. Standalone Video Uniquifier is NOT to be deleted. Do not confuse a Preview with a MAIN deployment.

## Next access recovery steps (do not replace tokens without checking)

1. Inspect **the specific token represented by the GitHub Actions secret `CLOUDFLARE_API_TOKEN`**, not merely the owner's Cloudflare login permissions; verify Account / Worker resource scope and `Workers Scripts Read` or current `Workers Content Read-Only`. Owner may already have enabled it elsewhere.
2. If a different existing token has appropriate scope, an authorized repository administrator can select it or update the **GitHub Actions secret inside GitHub Settings** without copying the value into chat. ChatGPT's GitHub connector cannot read or overwrite Actions secrets itself.
3. If the production Pages-managed Worker cannot be read even with correct scope, use the exact original private `_worker.js` / Pages Functions release bundle in the administrator's local build workspace, subject to source and binding verification. Never invent a replacement Worker.
4. Re-run `.github/workflows/owner-cloudflare-worker-permissions-audit.yml` from PR #648; require **200 for actual script content**, not merely token verification or Workers list.
5. Stage a **backend-preserving** Preview with the original Worker, identical existing assets except the requested chat JS, same bindings and API endpoints. Verify `uses_functions:true`, production baseline ID unchanged, 10 desktop/mobile screens, and tested rollback before any MAIN release.
6. Re-check current DEV and live deployment before acting; another administrator may have published a newer version.

## For future DEEPSYQ chats

Read `AGENTS.md`, `DECISIONS.md`, `docs/OWNER_CHANGE_CONTROL_20261107.md`, and **this runbook**. Use GitHub Actions credentials by *name*, not by sharing their values. Always distinguish **Pages Read/Write** from **Worker Script Content Read**, and TEST from MAIN. This verification is dated, so check fresh statuses before claiming anything is published or a permission works. Document proof in [Issue #233](https://github.com/mvryhan-web/video-variator-android/issues/233).

**Publication rule:** This runbook becomes the default cross-chat source only after its documentation change has been merged into `deepsyq-platform`; PR-only content is not automatically visible in the branch read by other sessions. Check its current GitHub location before relying on it.
