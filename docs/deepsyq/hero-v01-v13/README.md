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
