# Block 5 — Daily public asset reachability (code only)

**Original source:** `docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_5.txt`, "broken links" and "templates". This is a narrow improvement to the existing 06:00 content audit, NOT a new product/agent or replacement for the TXT.

## What it does

- With `PRODUCT_WATCHER_ENABLED=true`, `PRODUCT_WATCHER_CONTENT_TASKS_ENABLED=true`, and additional `PRODUCT_WATCHER_LINK_CHECKS_ENABLED=true`, the existing private Watcher 06:00 Europe/Paris content task may check a **bounded sample** of currently active approved template thumbnails and Inspiration preview/poster URLs.
- It sends at most 12 unauthenticated, no-redirect, short-timeout HTTP `HEAD` requests to eligible **same-origin public static assets** of the configured HTTPS `APP_URL`/`PRODUCT_WATCHER_BASE_URL`. Only absolute paths on that origin are eligible; untrusted absolute/protocol-relative URLs, signed URLs, `/api` and other private paths are not requested.
- HTTP 404/410 is recorded as a broken asset with **content record ID, field and status code**, not the URL. HTTP 2xx is available. 403/405/5xx/redirect/network failure is inconclusive, never called a confirmed broken link.
- Existing `vv_product_watcher_content_tasks` daily record gains an `assetReachability` subsection, without migration or new tables. Only counts and bounded IDs/status codes are stored. The 07:00 discovery task never repeats network probes.
- Explicitly labels untested areas: remote URLs, private/dynamic/signed media, full site crawling, video playback, licensed content, skills and real workflow execution.

## Guards / limitations

All Watcher flags remain **OFF by default**. A preview, synthetic unit test or code commit does not mean monitoring is running on Render. No user data, secrets, prompts, media response bodies, paid providers, credits, Stripe, model settings, workflow execution, content edits, DNS probes or general-purpose crawling are involved. A successful `HEAD` does not prove media playback, valid licensing or functioning end-to-end generation. Dynamic assets without a supported file extension are skipped.

Production activation requires approved backup/migration gates, private-worker deployment, owner authentication, network scope review and live staging validation. Avoid enabling publicly just for a green CI result.

**Status:** CODE VERIFIED in child PR #60, now merged into the Block 5 integration branch PR #50 (merge commit `6c78acc8`). GitHub Actions `38897047690` PASSED watcher unit/security and isolated PostgreSQL jobs. Not merged to `main`, not deployed and no live production URL availability checked. This addresses only a **subset** of the original Block 5 monitoring requirement. Next: real skills/workflow smoke monitoring behind separate owner-approved read-only policies, then staging delivery and owner-facing reports.
