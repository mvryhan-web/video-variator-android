# DEEPSYQ — Traffic safeguards (owner instruction 2026-11-03)

Scope: three owner-selected tasks (#2 concurrent Home video loading; #3 cache static public media; #5 monitor bandwidth spikes). All applied first to `deepsyq-platform` and an isolated, payment-disabled test preview. Never deploy to `main`/production without separate owner approval.

## Verified baseline
On 2026-11-02 (Europe/Paris midnight to midnight), Render displayed approximately 38.14 GB outgoing on production service `srv-dalqnkoae00c73caj8vg` and 3.84 GB on isolated preview service `srv-db91k1vf3r2c73fpj350`. Main site had 36 deploy records and the preview 8. Traffic is not identical to deploy artefact size; causal breakdown by asset is not available without request-level transfer accounting. Production AutoDeploy currently off. Do not assert any specific bytes saved without later measurement.

## Home media contract
- The original six owner clips, their posters, names, order, paths, complete EOF and original quality are preserved.
- The center hero film is fetched/played only when visible/explicitly started. Neighboring films keep the exact approved poster; they carry no MP4 `src` and cannot autoplay.
- Below the hero, three spotlight cards retain their posters, links and approved original MP4 files. They start without `src` and no `autoplay`; IntersectionObserver activates at most one visible spotlight film at a time, and pauses the hero during its playback. Data-saver/reduced-motion hides automatic spotlight playback. No artificial images or new provider calls.
- Avoid downloading videos when the Home carousel is offscreen or when a different spotlight has priority. No backend cost, model or payment policy changes.

## Cache rules for isolated test preview
- Same-origin, existing `media/` public JPG/PNG/WebP/AVIF/SVG/MP4/WebM/audio: `Cache-Control: public,max-age=3600,must-revalidate`. Express maintains HTTP Range 206, required for video seeking.
- Same-origin static `.css/.js/.mjs`: `no-cache`, to revalidate ETag and receive HTTP 304 when unchanged.
- HTML, API, JSON, auth/financial information, errors and other content: remain `no-store`. Preserve `X-Robots-Tag: noindex` and `nosniff`.
- Do not change production caching/ServiceWorker without a separate regression review.

## Monitoring / alerts
Monitor **both** Render service bandwidth metrics independently using the connected Render account. If any service exceeds **500 MB over the previous 60 minutes** or **2 GB in the trailing 24 hours**, raise a user-facing alert containing timestamp (Europe/Paris), service, measured amount, exact threshold and links to the corresponding Render Dashboard. Do not deploy, suspend, modify billing, delete media or change service settings automatically. Watchers are advisory and do not guarantee charges will stop. Inspect trends after next isolated preview deploy; compare hour-on-hour bandwidth to the 2026-11-02 baseline.

## Publication guard
No new paid resources, live external providers, financial API changes, mass browser tests against production, auto-deploy reactivation or new deployments of production. Preserve historical files. Confirm scoped tests and live isolated preview HTTP before reporting completion.
