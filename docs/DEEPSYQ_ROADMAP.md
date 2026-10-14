# DEEPSYQ ROADMAP — approved next product phase

This file preserves the approved future product requirements so new agents do not lose them.

## Priority and scope rule

Deepsyq is the main product and main dashboard. Video Uniquifier remains an existing secondary tool inside the platform.

**Do not begin these blocks until the currently active TXT/specification work is completed and verified, unless the owner explicitly changes priority.**

Before implementing any block:
- read `AGENTS.md`;
- read `PROJECT_STATUS.md`;
- inspect the current code;
- reuse existing working systems;
- do not duplicate database/auth/Stripe/router/pages/components;
- if part of a block already exists, extend/refine it instead of rebuilding it.

The target product structure includes, as appropriate: Ask Deepsyq, Compare AI, Agent, Inspiration, Studio, My Workspace, AI Apps, Everyday Tools, Video Tools, Pricing, History/credits/account.

---

# BLOCK 1 — Multi-AI Compare + Smart Model Routing

## User experience

On the main AI screen, place **Smart** and **Compare AI** as clear adjacent modes.

- **Smart**: Deepsyq chooses the most suitable enabled model/provider for the task.
- **Compare AI**: one prompt is sent in parallel to multiple real enabled AI providers and results are shown separately.

Initial provider families to support through configuration, only when actually connected:
- OpenAI;
- Google Gemini;
- Anthropic Claude;
- Mistral AI;
- future provider slot hidden until connected.

Do not hard-code specific model versions into the UI or architecture.

## Compare behavior

- run 2–4 provider calls in parallel depending on plan/availability;
- stream or progressively show results where practical;
- partial provider failure must not destroy successful results;
- support timeout/fallback;
- allow Copy, Save, Continue with this answer;
- add **Combine into one best answer** to synthesize the strongest parts of successful responses;
- clearly identify which provider/model produced each result when appropriate.

## Smart routing

Never assume one provider is always best.

Route using configurable factors such as:
- task type/capability;
- measured historical quality by task category;
- reliability/error rate;
- latency;
- cost;
- context/window/tool requirements;
- plan restrictions.

Record enough telemetry to improve routing over time without exposing secrets.

## Billing

Track provider/model, tokens/usage, estimated/actual cost, credits consumed, status, duration and failure reason where available.

Trial $0.99 may receive a limited sample. No unlimited multi-provider usage unless economics are proven.

---

# BLOCK 2 — User Agent / “Do it for me”

Create a primary user-facing navigation item:

**Agent**

Main in-page message:

**Do it for me**

Concept:
“Tell Deepsyq what you want to achieve. Your AI Agent will plan the steps, choose the right AI models and tools, and prepare the result for you.”

## It must be an executor, not merely chat

Build/extend a shared **Agent Orchestrator** able to:
- understand a goal;
- make a multi-step plan;
- select appropriate AI providers/tools;
- execute steps asynchronously;
- track progress;
- retry/fallback safely;
- save outputs;
- prepare a final deliverable.

Example quick starts:
- Create an Etsy listing;
- Create a TikTok ad from product photos;
- Create a 30-second product promo;
- Create social-media content;
- Prepare an ad campaign.

For expensive workflows, show plan/cost estimate and request approval before high-cost steps.

Use existing auth, credits, provider router, jobs and Workspace. Do not build a second isolated agent stack.

Trial $0.99 gets limited agent usage. Track real costs.

---

# BLOCK 3 — Inspiration / Create Yours

Build a rich, original **Inspiration** experience using Deepsyq-owned or properly licensed examples.

Do not copy Lumina protected assets, copy, branding, or exact visual design.

## Homepage

Show preview sections with strong examples and an Explore/View More route:
- AI Agent examples;
- AI Apps;
- Inspiration — Images / Videos;
- relevant categories.

## Full Inspiration

Provide a scalable data-driven gallery with:
- All / Images / Videos and useful category filters;
- multiple aspect ratios such as 1:1, 16:9, 9:16 when supported;
- attractive image/video previews;
- prompt/template metadata;
- search/filter where useful.

Actions:
- **Create yours**
- **Use this prompt**
- **Clone and Try**

The action must lead into the real Studio/Agent workflow with prompt/settings prefilled. Users can replace source assets with their own.

Do not show fake integrations or examples implying a workflow works when it does not.

---

# BLOCK 4 — Studio + My Workspace

Keep these as two related but distinct concepts.

## Studio

Studio is the creation environment and library.

Core entry points:
- Create New Project;
- Recent Projects;
- Templates;
- Agent Skills;
- Image;
- Video;
- Tools;
- search/categories/filters.

Support relevant aspect ratios where the underlying model actually supports them.

Template categories may include:
- Product Ad;
- UGC Ad;
- Fashion;
- Beauty;
- Food;
- Jewelry;
- Automotive;
- Explainer;
- Social Media;
- Cinematic;
- Music Video.

Template card:
- Preview;
- Use this template.

Using a template must create/clone a user-owned project in My Workspace. Never edit the master template.

## Agent Skills

Initial workflows:
- Create Product Ad;
- Create UGC Video;
- Create Etsy Listing;
- Create TikTok Ad;
- Turn Image into Video;
- Create Social Campaign;
- Create Explainer Video.

Actions:
- Preview;
- Use skill -> open Agent with the task prefilled.

## My Workspace

Personal project area with:
- Recent Projects;
- Drafts;
- Completed;
- Favorites;
- dates/status;
- preview;
- Rename;
- Duplicate;
- Archive;
- Delete with confirmation;
- Open/Continue.

Connect Workspace cleanly with Agent, Inspiration, AI Apps, Tools and History.

Reuse existing auth and database.

---

# BLOCK 5 — Internal Product Watcher Agent

Create a separate owner/admin-only server-side background agent named **Product Watcher**.

This is not the same process or permission set as the user-facing Agent.

## Purpose

Product Watcher continuously/scheduledly helps keep Deepsyq current and healthy even when the owner’s computer is off.

It should monitor, where technically available:
- official provider/model announcements;
- model releases/deprecations;
- API pricing/limits;
- provider availability;
- production uptime/errors;
- job failures;
- Stripe/billing errors;
- broken links/workflows;
- template/skill health;
- AI usage and cost anomalies;
- product opportunities/recommendations.

Prefer official provider sources for factual provider/model/pricing changes. Mark unverified information as unverified.

## Admin UI

Owner-only Product Watcher page:
- ON/OFF;
- Pause/Resume;
- Run check now;
- Running/Paused/Error;
- Last check;
- Next check;
- recommendations;
- pending approvals;
- applied safe changes;
- alerts;
- history;
- costs.

## Change safety

Safe reversible metadata/content updates may be eligible for automation when explicitly allowed and fully audited.

Require owner approval for meaningful changes such as:
- adding/enabling a new provider/model;
- routing strategy changes;
- new workflows;
- major UI/product changes;
- pricing changes.

Never autonomously perform critical changes to Stripe, secrets, authentication, production database, domains, user data, or destructive production code.

Use active -> disabled -> archived rather than destructive deletion where appropriate.

## Required schedule — Europe/Paris

Schedule must be configurable and resilient to service restart.

- every 15 minutes: critical production health;
- every hour: provider errors, usage and cost checks;
- every 6 hours: official provider news/model/pricing changes;
- daily 06:00: content/template checks;
- daily 07:00: product discovery/recommendations;
- daily 08:00: **Deepsyq Daily Brief** with New / Changed / Problems / Costs / Recommendations / Pending approvals;
- Monday 09:00: **Weekly Product Audit** with High / Medium / Low priorities.

Use appropriate Render cron/background-worker infrastructure. Do not claim scheduling is active until the external service is actually deployed and tested.

Use persistent job/state storage so restarts do not silently lose work.

---

# BLOCK 6 — Deepsyq Voice Agent

Create one shared **Deepsyq Voice Agent** as a voice interface over the whole platform, not a separate AI product.

Final assistant name can be chosen later. Do not use JARVIS as the commercial product name and do not imitate a specific actor’s voice.

## Voice personality

Original Deepsyq voice:
- intelligent;
- calm;
- confident;
- premium;
- friendly;
- natural;
- optional light international/British character;
- not a clone of a real person.

Architecture must allow future voice choices without rewrites.

## First-time introduction

Do not unexpectedly autoplay speech on page load.

Show a clear onboarding such as:
- Meet your Deepsyq Assistant;
- Start voice introduction.

After user action, provide a short introduction explaining that the assistant can answer, use tools, create projects and perform agent tasks.

Offer:
- Ask me something;
- Try a quick task;
- Help me organize my device;
- Not now.

## Realtime conversation

Where the selected provider supports it:
- streaming audio;
- low-latency replies;
- interruption/barge-in;
- stop speaking when interrupted;
- conversation context;
- Voice <-> Text switching;
- transcript;
- Mute / Stop / End conversation.

Use the same Agent Orchestrator/tool layer:

Voice input -> realtime voice/model layer -> Agent Orchestrator -> allowed tool/API -> result -> voice response.

Do not fake tool execution.

## Voice access to Deepsyq

Examples:
- current information queries;
- Smart/Compare AI;
- “Combine the best answers”;
- open/continue Workspace project;
- create project;
- start Agent Skill;
- create TikTok/product ad;
- create Etsy listing;
- image/video tasks;
- permitted Everyday/Video tools.

Destructive/external/financial/account-changing actions require confirmation.

## Device Cleanup / Storage Assistant skill

This is a skill of the same Voice Agent, not a separate seventh product.

Offer, after appropriate onboarding:
“Would you like me to check for duplicate photos/videos or unusually large files taking up space?”

Important:
- a website must never claim unrestricted access to a phone/computer;
- browser access is limited to files/folders the user explicitly selects through supported browser APIs;
- native Android/iOS/desktop uses official OS permission systems only;
- spoken “yes” does not replace an OS/browser permission dialog.

With permission, detect where technically possible:
- exact duplicate photos/videos;
- visually very similar media;
- large files/videos;
- old downloads;
- screenshots;
- blurry photos;
- repeated media;
- temporary/export files only when legitimately accessible.

Show scan results and estimated recoverable storage.

Never delete automatically.

Before deletion:
- show files/results;
- allow review/selection;
- prefer Trash/Recently Deleted when supported;
- require explicit final confirmation;
- estimate files and storage to be removed.

## First-win and monetization

Let a new/trial user experience a small useful amount of voice before upgrade:
- introduction;
- several voice exchanges;
- a small device scan where supported;
- a few AI/tool requests.

Track:
- realtime audio input/output;
- model usage;
- tool calls;
- Multi-AI calls;
- agent tasks;
- session duration;
- per-user allowance;
- monthly limits;
- idle timeout;
- real cost.

Trial $0.99 may include a limited Voice allowance. Do not advertise unlimited voice unless economics support it.

## Owner mode + Product Watcher

Keep Product Watcher technically separate with its own permissions, but allow the owner to talk to it through the Deepsyq Voice Agent in protected owner/admin mode.

Examples:
- “Read my Daily Brief.”
- “What changed overnight?”
- “What problems did you find?”
- “How much did AI APIs cost yesterday?”
- “What requires my approval?”

Voice Agent is only an authorized interface; it does not receive unrestricted root permissions.

Important changes still follow Product Watcher approval rules.

## Privacy

- always show when microphone is active;
- no hidden recording;
- no hidden file access;
- minimize raw-audio retention;
- clearly show when a scan/tool/external action is happening;
- follow platform permissions on web, Android and iOS.

## Future-compatible architecture

Prepare, without forcing immediate implementation:
- wake word;
- hands-free mode;
- proactive notifications;
- connected email/calendar/apps;
- desktop actions;
- car/wearable/smart-glasses integrations;
- future physical-device/robotics integrations.

---

# Shared acceptance principles for blocks 1–6

For every block:
- use real APIs only when actually connected;
- never fake success;
- support partial failure and recovery;
- keep secrets server-side;
- preserve existing production functionality;
- track provider usage/costs for paid AI;
- test desktop/mobile where relevant;
- update `PROJECT_STATUS.md` after implementation;
- do not mark DONE until verified;
- do not create duplicate systems when an existing system can be extended.

