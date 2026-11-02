# Block 3 — Inspiration / Create Yours — completion checklist

Branch: `deepsyq-platform`

This file tracks only canonical Roadmap **Block 3**. It does not expand or implement Blocks 1, 2, 4, 5, 6 or 7.

| Requirement | Status | Evidence |
|---|---|---|
| Original Deepsyq Inspiration experience | DONE | Dedicated responsive `inspiration.html/css/js`; no Lumina assets/copy/branding are used. |
| Homepage AI Apps preview + Explore | DONE | Featured AI Apps are data-driven from active template records. |
| Homepage Inspiration preview + Explore | DONE | Featured inspiration records render only when published, with live category shortcuts into filtered Inspiration views. |
| Homepage AI Agent examples | INTEGRATION READY / BLOCK 2 GATE | Block 3 can publish/link Agent examples only when both the explicit flag and a safe same-origin real Agent path are configured; handoff is stored in `deepsyq_agent_inspiration_start`. |
| All / Images / Videos | DONE | Full gallery media-type tabs. |
| Category filters | DONE | Data-driven public categories. |
| Aspect-ratio support/filter | DONE | 1:1, 16:9, 9:16, 2:3, 3:2, 4:3, 3:4 validated; public ratio filter is data-driven. |
| Search | DONE | Server-side bounded search across title/category/description/prompt. |
| Scalable gallery loading | DONE | Public API uses bounded page size/offset and the UI appends additional cards with Load more rather than fetching an unbounded gallery. |
| Image/video previews | DONE | Responsive image/video cards; video uses controls/poster when supplied. |
| Prompt/template metadata | DONE | Prompt, category, ratio and model metadata shown. |
| Create yours | DONE | Opens real Studio with prompt/settings prepared; never auto-generates. |
| Use this prompt | DONE | Opens real Studio with prompt only; never auto-generates. |
| Clone and Try | DONE | Opens real Studio with prompt/settings/default model when actually available. |
| Replace source assets | DONE | Inspiration assets are not copied; Studio asks user to add/select their own references. |
| Data-driven admin | DONE | Owner create/update, active/featured/order, media metadata, rights metadata; audit log. |
| Rights safety | DONE | Public items require owned/licensed basis plus recorded rights evidence note. |
| No fake integrations | DONE | Agent-target examples require both an explicit enable flag and a configured safe same-origin Agent path. With either missing, API returns no Agent examples. |
| Production rollout flag | DONE | `AI_INSPIRATION_ENABLED=false` by default in production. |
| Publish readiness | DONE | Owner readiness shows publishable/image/video/featured counts, ratios/categories, rights blockers and Agent dependency. |
| Real launch content | OWNER CONTENT GATE | No examples are invented. Owner must add actual owned/licensed images/videos and rights evidence. |

## Completion state

**Block 3 code is complete.** It is intentionally not marked public-launch complete until real approved inspiration content exists.

To publish later:
1. add real owned/licensed inspiration items in Owner AI Control;
2. include a rights evidence note for every active item;
3. verify preview URLs/posters;
4. enable `AI_INSPIRATION_ENABLED=true` only after those assets are approved;
5. keep `AI_INSPIRATION_AGENT_TARGETS_ENABLED=false` and `AI_INSPIRATION_AGENT_PATH` blank until Block 2 Agent has a real route that consumes the documented handoff.


## Owner publish readiness

Owner AI Control now reports Block 3-specific readiness without turning anything on automatically. The content gate requires at least one approved image, one approved video and one featured Studio example; every active item must have recorded rights evidence. Agent examples remain informationally gated until Block 2 provides a real destination.

## 2026-10-15 — Homepage/gallery polish, original media retained

- Existing approved images, videos, titles, source links, prompts, Studio handoff, rights checks, tools, AI Apps and future Agent integration remain intact; the current Inspiration preview appears above, not instead of, the existing studio cards.
- Real approved featured video records are emphasized with muted/looped, viewport-limited previews (disabled for reduced motion and data saver). No example is fabricated, copied, uploaded, or automatically published.
- Public Inspiration lists only actual available categories as shortcut chips. The same existing filters/actions and original media cards remain; video cards receive more room and keep playback controls.
- Regression checks added for non-destructive layout and real media. Browser CI is required before declaring visual changes verified. Public activation still needs actual owned/licensed media, evidence, owner approval and separate launch checks.

## 2026-10-15 — Real approved homepage video hero (feature-branch only)

- Added an optional **homepage hero video** which is filled exclusively from the existing first owner-approved, Studio-targeted, featured Video Inspiration API record. The existing Canvas, tool links, sidebar, original owner gallery media and all Studio buttons are preserved.
- The hero never appears for photo-only/empty data or when Inspiration is disabled or its API fails. It is a real media `<video>` linked to the original Inspiration card, not a still image disguised by a fake play icon.
- Shares the existing viewport-limited muted playback observer and pauses when the tab hides; `prefers-reduced-motion` and data saver suppress ambient autoplay. All other videos are unchanged.
- Browser tests added for owner-approved video hero and image-only fallback. No third-party image/video imported, no asset records created, no provider charges or public enablement. Verify on latest-head CI before marking tested.
