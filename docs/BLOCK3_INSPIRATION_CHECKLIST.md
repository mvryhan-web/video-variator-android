# Block 3 — Inspiration / Create Yours — completion checklist

Branch: `deepsyq-platform`

This file tracks only canonical Roadmap **Block 3**. It does not expand or implement Blocks 1, 2, 4, 5, 6 or 7.

| Requirement | Status | Evidence |
|---|---|---|
| Original Deepsyq Inspiration experience | DONE | Dedicated responsive `inspiration.html/css/js`; no Lumina assets/copy/branding are used. |
| Homepage AI Apps preview + Explore | DONE | Featured AI Apps are data-driven from active template records. |
| Homepage Inspiration preview + Explore | DONE | Featured inspiration records render only when published. |
| Homepage AI Agent examples | DEPENDENCY-GATED | Data/API path exists but stays hidden until Block 2 provides a real Agent destination. |
| All / Images / Videos | DONE | Full gallery media-type tabs. |
| Category filters | DONE | Data-driven public categories. |
| Aspect-ratio support/filter | DONE | 1:1, 16:9, 9:16, 2:3, 3:2, 4:3, 3:4 validated; public ratio filter is data-driven. |
| Search | DONE | Server-side bounded search across title/category/description/prompt. |
| Image/video previews | DONE | Responsive image/video cards; video uses controls/poster when supplied. |
| Prompt/template metadata | DONE | Prompt, category, ratio and model metadata shown. |
| Create yours | DONE | Opens real Studio with prompt/settings prepared; never auto-generates. |
| Use this prompt | DONE | Opens real Studio with prompt only; never auto-generates. |
| Clone and Try | DONE | Opens real Studio with prompt/settings/default model when actually available. |
| Replace source assets | DONE | Inspiration assets are not copied; Studio asks user to add/select their own references. |
| Data-driven admin | DONE | Owner create/update, active/featured/order, media metadata, rights metadata; audit log. |
| Rights safety | DONE | Public items require owned/licensed basis plus recorded rights evidence note. |
| No fake integrations | DONE | Agent-target examples are not publicly actionable until a real Agent exists. |
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
5. keep `AI_INSPIRATION_AGENT_TARGETS_ENABLED=false` until Block 2 Agent has a real action destination.


## Owner publish readiness

Owner AI Control now reports Block 3-specific readiness without turning anything on automatically. The content gate requires at least one approved image, one approved video and one featured Studio example; every active item must have recorded rights evidence. Agent examples remain informationally gated until Block 2 provides a real destination.
