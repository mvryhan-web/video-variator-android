## Owner clarification and authorized preview publication — 2026-10-18

Owner confirms all seven NEW supplied MP4s are Google Flow outputs and authorizes publication. Close-up woman remains first in the exact six-video carousel. The butterfly-image request is cancelled: the separate card uses a real frame from the supplied red-gown film, which remains V02 outside the main carousel. This owner attestation does not remove restrictions on older HeyGen Free outputs below. Reuse existing isolated Render preview srv-db91k1vf3r2c73fpj350; production DB/catalog unchanged. Preview read-only Inspiration response now uses the approved bundled manifest; paid generation, auth and billing remain disabled. Previous pending approvals below are historical, superseded only for the seven supplied Flow files.

### Native technical verification (latest)

Code SHA `48e89d19869457616a75c0deee87f856b4eafb40`, [CI39150923561](https://github.com/mvryhan-web/video-variator-android/actions/runs/39150923561): completed SUCCESS, 5 Node tests PASS + real full-film sequential playback and wrap in all four browser profiles. Chromium desktop/mobile and WebKit desktop passed first attempt; mobile WebKit passed retry, so Playwright reports **3 passed / 1 flaky**. First mobile run stalled on underwater→motorcycle; exact HTTP200 media transferred, underlying pause/end cause NOT established or fixed. This is not physical iPhone testing or a production-ready claim. Original seek-accelerated run39150606999 FAILED, retained for audit; it was replaced with natural playback of complete films and screenshot AFTER assertions, without modifying the player. Existing Inspiration unit regression also 7/7 PASS. No real catalog publish/deploy happened. Rights, owner release permission and exact V01 butterfly-image remain pending.

## Owner MP4 delivery — 2026-10-18 (latest; separate from earlier HeyGen renders)

Seven NEW owner-uploaded MP4s are now staged under `app/src/main/assets/media/home/owner-20261018/`. The following is not a license attestation for the older HeyGen Free outputs documented below. Do not substitute those older outputs.

| Main carousel order | Clip | State |
| --- | --- | --- |
| 1 | Close-up woman | Technical files checked; not live |
| 2 | Futuristic portal | Technical files checked; not live |
| 3 | Underwater woman | Technical files checked; not live |
| 4 | Neon motorcycle | Technical files checked; not live |
| 5 | Whale among the clouds | Technical files checked; not live |
| 6 | Golden forest | Technical files checked; not live |

Red gown is a separate V02; it has `featured:false` and must NEVER enter the main carousel. The exact separately approved butterfly-woman V01 image is still unresolved and has not been replaced with guessed artwork.

All seven are true supplied 1920×1080 H.264/yuv420p 24fps movies, about 8s. Audio removed by remux only (`-c:v copy -an -movflags +faststart`); elementary video hashes before/after match. Entire video streams successfully decode. Originals unchanged in owner's attachments. Clean JPEG posters are actual first frames. `owner-20261018/manifest.json` records source/output SHA256, duration, original filename and exact order. Records remain inactive, with empty rights notes, pending actual commercial-rights attestation and specific production approval. Artistic acceptance already given; no new artistic approval requested.

`node scripts/publish-owner-home-media.mjs` prints an OFFLINE plan, with zero network or mutation. The explicit `--apply` path uses ONLY the existing authenticated Inspiration admin GET/POST/PATCH API, never direct SQL, a second store/auth, a provider API, billing or automatic deployment. It requires separately confirmed rights + publication approval, an owner Google session and a rights note in environment. It preflights all deployed MP4 hashes and poster content types before its first write, upserts by existing slug (rejects duplicate slugs), removes old featured video flags (including purple lake) without deleting records or changing featured images, and verifies the exact final public feed order. No apply was executed.

Tests: `node --test tests/owner-home-media-unit.mjs` (5 cases: actual decode/hashes/stream format, existing schema, correct ordering/V02/lake/image preservation, missing approval/no-write, absent media/no-write, mocked idempotent existing API publish). Real-media browser spec `tests/owner-home-media.spec.mjs` checks real time progression, native ended transitions through all six and wrap, muted inline autoplay, arrows, 390px bounds, no API writes. No fake video playback methods or synthesized ended events. Local browser installation blocked: downloaded ZIP is truncated; actual browser results must come from GitHub workflow `owner-home-media.yml`, not claimed from unit checks.

## Earlier reference-kit and provider notes (historical, retained)

# Deepsyq 13 owner-original cinematic scene references

These files are the actual extracted still references from the existing `DEEPSYQ_HOME_13_EXACT_SCENE_REFERENCES.zip` archive, JPEG-encoded for repository browsing, and the separately prepared CLEAN V01 first frame from `DEEPSYQ_FIRST_6_IMAGE_TO_VIDEO_PRODUCTION_KIT.zip`.

**This is not 13 videos.** None of the referenced source images has been turned into independently animated MP4. Most reference crops contain screenshot-embedded text or a play circle and must never be used as published fake video thumbnails. The clean V01 is a lower-resolution original likeness reference, not a licensed finished film.

The mapping and individual animation concepts are in `scene-manifest.json`. Final acceptance: owner-original subject/fidelity, rights/license, genuine moving independent subject/environment, 16:9 H.264 yuv420p MP4 with validated audio/mute/loop, clean poster and 1448px/390px visual check. No paid provider generation or production deployment has been performed.

Owner locks: Agent A controls Home design/rights, Agent B technical Video/media preparation, Agent #5 reviews DEV integration. Existing homepage `home-experience.js` must keep true disabled fallback until source MP4 exist.


## V01/V02 internal-generation state — no commercial publishing rights

- V01: HeyGen `heygen-video-1` video ID `9bb52df1963741749e2417cb82859502`; provider reported **COMPLETED**, 8 seconds, 1344×768 (7:4); pending qualitative playback/media QA and source rights. **Not in GitHub as MP4, not deployed and not a licensed commercial homepage film.**
- V02: generated clean 16:9 red-dress reference at `app/src/main/assets/media/home/v02-clean-internal-review.jpg`, preserving the established general composition but newly AI-produced, so **not identical to source screenshot**; HeyGen video ID `c4d1bc52a3164bbd952c41684dfa82f7` submitted for 8 seconds; provider processing last known state.
- **Important legal hold:** The connected HeyGen workspace is on the **Free plan**. Current [HeyGen Terms, section 4](https://www.heygen.com/terms) license Free outputs **only for personal, non-commercial and internal evaluation**, and prohibit use with a revenue-generating product. Consequently, neither V01 nor V02 may be pushed to commercial Deepsyq site, advertised as live, distributed as playable public media, or used as a public CDN URL without separately confirmed commercial rights. Never remove HeyGen watermarks by cropping.
- Preserve existing 13-scene numbering and no-video fallback. Get owner/rights license proof or generate new commercial-licensed original movies on an authorized provider; then stage genuine H.264 MP4 plus posters and have coordinator #5 approve/perform DEV deployment.
