# Deepsyq global SEO and AI-search: mandatory release checklist

Owner instruction 2026-10-16. Track outstanding work in Issue #156. This file is a requirement, NOT evidence that SEO is implemented.

All agents working on public pages or release readiness must review each point before calling a tool or public website finished:

- [ ] Each actual public AI tool has its own indexable canonical page, distinct URL, title, description, H1, useful visible content and internal links.
- [ ] Appropriate valid Schema.org JSON-LD and no fabricated reviews or capabilities.
- [ ] Search-visible HTML (SSR/prerender if needed), with tested crawler access.
- [ ] Public sitemap.xml and robots.txt, correct canonical/noindex rules and exclusion of private data.
- [ ] Verified mobile performance, responsive media and accessibility.
- [ ] Google/Bing indexing diagnostics and appropriate AI-search crawler access; do not promise top-5 or AI recommendations.
- [ ] Honest factual Deepsyq versus DeepSeek comparisons where useful: never impersonate or mislead visitors.
- [ ] Measure organic entry, registration, paid conversion, retention and profit after AI generation costs.
- [ ] CI regression checks for titles, canonicals, schema, sitemap and robots.

Before coding, verify existing implementation, original BASE/Blocks requirements, assigned owner and active PR. Do not duplicate work or modify owner-locked Home. Record incomplete checks, owner, evidence and next step in Issue #156 and PROJECT_STATUS.md. A new public feature cannot be marked launch-ready with unresolved relevant SEO checks. Distinguish planned, code verified, deployed, live verified and indexed. Notify the owner of blockers before launch even if they forget to ask. This is a cross-cutting requirement, not an eighth system or an Etsy-only strategy.
