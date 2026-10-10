# Account access for the eight existing tool cards

Separate from WOW Montage. Built on main 6bb0764b, including its Telegram integration. No Render services/databases, Stripe prices, checkout routes, OAuth credentials, package ID or video/FFmpeg processing algorithms changed.

## Policy

- Permanently free without account or quota requests: one-photo compression, video-to-audio extraction, camera teleprompter.
- Basic $9: batch photo compression and video compression, plus all permanent free tools.
- Pro $24 / Business $99: all eight tool cards, including short clips, photo motion and both text/audio conversions. Business retains its existing 15,000-credit video allowance. No unimplemented batch video feature is promised.
- Lifetime and confirmed server-admin entitlements inherit all tools. Existing cloud voice enablement, consent and conservative per-user/shared daily quotas remain in force; this does not enable a provider or promise unlimited cloud speech.
- Five successful subscription-tool tasks total per account, shared between tools, not five subscriptions or five uses per tool. One multi-photo batch counts once. Errors/cancellation without completion release the reservation. Partial successful batches count once unless canceled. Explicit downloads/shares/previews do not consume uses.
- Existing 100-source-video trial and monthly video credits are separate and unchanged.

## Persistence and concurrency

`tools_trial_used` is an additive column on existing vv_users. `vv_tool_runs` is a task/reservation ledger in that same database. User-row transactions serialize reserves/completions, count pending trial reservations, prevent more than five concurrent claims, and make retried UUID requests/completion idempotent. Users can only finish their own grants. Reservations expire after six hours or explicit cancel. Database transactions do not remain open during local processing.

The API receives tool IDs, UUIDs and completion/cancel outcomes. It never receives source photos/video/audio or transcription text. Runtime gates run before FFmpeg, model download or canvas processing. Paid tool access requires online account validation; the three permanent free tools do not. Expired sessions receive a sign-in link returning to their selected tool. Completed results remain downloadable if a subsequent attempt is locked.

A failed completion acknowledgement is queued locally and retried idempotently on a later tool visit; a failed initial reservation is queued for cancellation. Page exit attempts to cancel unfinished reservations. A hard-killed browser/offline exit may hold a reservation until reconnection or expiry. Files stay available locally when quota acknowledgement fails.

These are account entitlements and normal-client gates, not DRM: an open-source client doing local processing cannot cryptographically prove processing completion or stop a modified/offline copy from running the open-source algorithms. Server quotas and cloud voice limits remain authoritative.

## UI

The tool hub is titled Tools, with three free tool labels, Basic/Pro labels and an account banner: Included in your subscription / remaining trial tasks. Eight existing cards are retained; single and batch photos share one card. Audio pages and plan cards describe entitlements and cloud limits. Prices and existing credit allocations are unchanged. PWA cache version is advanced for the new access assets; release cache coordination with the separate WOW branch is still required before production.

## Validation / release

Policy tests cover tiers and trial counts. An isolated ephemeral PostgreSQL service in GitHub Actions verifies real migrations, simultaneous reservations, idempotency, cancellations/expiry, owner checks, HTTP responses and persisted quotas across clients. It is test infrastructure only, not another production database. Browser fixtures explicitly grant entitlement for existing local media engine tests; upload assertions now distinguish small access metadata from prohibited media uploads. Dedicated browser tests cover free single-image use, five shared trials and sixth-task lock, failure/cancel release, included tiers, mobile geometry and sign-in return.

No production rollout or public APK release is authorized here. Both draft branches require final CI review and owner production approval. Physical device acceptance remains required for WOW.
