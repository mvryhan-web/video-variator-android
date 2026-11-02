# F8 · Luna / Mira / Nova · production asset handoff (2 Nov 2026)

Original authoritative requirements: [DEEPSYQ_BLOCK_8.txt](DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_8.txt) sections D0–D9, P0–P7. Owner changes from 2026-11-02: THREE characters now requested. Existing F8 Block 8 first release originally DOG+CAT only; FOX is explicit later addition.

## Status as of this PR
- 3 owner-selected **original full-resolution PNG posters** exist **in the ChatGPT-delivered ZIP**, not automatically in GitHub. Do **not** claim GitHub stores originals until the files are actually uploaded and hashes verified.
- ZIP name: `DEEPSYQ_F8_Luna_Mira_Nova_concept_sources.zip` (see [Antigravity handoff issue #495](https://github.com/mvryhan-web/video-variator-android/issues/495)). Individual posters each 1086×1448, RGB, with composite navy background and DEEPSYQ lettering. They are **not** alpha sprites.
- Repo `app/src/main/assets/virtual-pet/pets.manifest.json` intentionally records `repoPath:null`, `uploadedToGithub:false`, `production.status:NOT_CREATED` and null GLB/sprites/rig references. Any frontend must fall back to the verified existing inline 2D SVG until real files land. Do not show 404/empty WebGL frame.
- No paid AI, new DB, new payment/credit system, automatic background launch or production Home modifications.

## Owner-approved 3 identities and distinctive palettes
- DOG Luna: **copper/apricot #D89150 + cream #F6E8CE**, friendly little corgi, honey eyes #8B5737, ears upright, short compact paws, mint accessory. Original F8 D1 has exact geometry and soft PBR guidance.
- CAT Mira: **charcoal #28394E** (Nov 2 override of old lavender D2 body), cream #F1ECE6, mint eyes #66C4AD, independent flexible feline spine and long tail. Not the same silhouette as dog. Original F8 D2 anatomy persists.
- FOX Nova: **russet #EA853A + cream #FFF4DF**, pointy ears, long bushy tail, narrow foxy muzzle; mint jewelry #4ADDB7. This is a new owner extension requiring 3D designer measurements and approval, not invented as approved original spec.

## Definition of real files required by Antigravity before production
For EACH of 3 pets, deliver:
1. High-res source PNG with cryptographic hash matching manifest; user must supply approved ZIP to actual Antigravity workspace.
2. Original 2+ concept art variants (dog/cat per D9), agreed master character sheet with front/3/4/side/back and close face on light/dark, annotated scale and colors.
3. Blender `.blend` source with mesh+armature+materials/textures + four paws correctly weighted; inspect animation states and no model borrow/copyright.
4. Exported **skinned `.glb`** with real node/bone hierarchy and named clips; verify real glTF contents, not a text stub.
5. Transparent PNG/WebP sprite frame sequences, atlas WebP/PNG and atlas JSON frames with frame bounds/durations; alpha channel proven at 80px and 160px; reduced-motion fallback frame.
6. Palette/version/license/provenance/texture descriptors, metadata JSON with **actual file paths and sha256**, action names and durations, desktop/mobile sizing.
7. Deterministic no-spend acceptance tests, visual screenshots + desktop 132–168 CSS px, tablet 96–128, mobile 56–80, keyboard, reduced-motion, hidden tab, 200% zoom. No overlay on Generate, paid checkout or text field. Test 5 base Magic Nose scenarios against synthetic owned jobs and mock quotes only.

Typical real-asset path `app/src/main/assets/virtual-pet/{luna,mira,nova}/` with `source/`, `glb/`, `textures/`, `sprites/`, `atlas/`, `renders/`. Git cannot track empty folders; directories appear when a real file exists. Never put placeholder files with extensions .blend/.glb/.png and claim real output. Any absent asset must remain `null` in the manifest.

## Release restrictions
Only isolated `virtual-pet.html` for review, no public Home or production. Owner must approve character art, animation quality and visible placement, then separately authorize any deploy; P0–P7 must pass actual file checks. This document is a delivery contract, not evidence of real 3D readiness. No fake 'DONE'.

Antigravity task: [#495](https://github.com/mvryhan-web/video-variator-android/issues/495).
