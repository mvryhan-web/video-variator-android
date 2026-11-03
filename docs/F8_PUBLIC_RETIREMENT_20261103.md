# F8 companion archive — owner decision, 2026-11-03

**Decision:** Luna (dog), Mira (cat), and Nova (fox) are future development. Hide them entirely on the public DEEPSYQ production site. JARVIX remains the only AI assistant. Do not modify JARVIX, existing UI branding, pricing, or billing.

## Production behavior
- Remove the full `livingPetsSection` from Home without rolling back unrelated site updates.
- Do not load `virtual-pet.js` or `virtual-pet.css` on public Home, Video Uniquifier, Generation Studio, AI Agents, Compare AI, or My Creations pages.
- Return HTTP 404 for `/virtual-pet`, `/virtual-pet.html`, `/virtual-pet.js`, `/virtual-pet.css`, `/virtual-pet-*`, and `/virtual-pet/*` before the public static-file serving and SPA fallback.
- Do not create additional Render instances, volumes, databases, AI jobs, or wallets for F8. Pet animation/images should not be requested by public pages.
- Protect working Magic Shield, draft saving, JARVIX and credit-safety systems independently of F8.

## Future development / recovery
- Original `main` version is preserved in GitHub branch `archive-f8-pets-20261103`.
- Blender source `.blend`, rigged `.glb`, reference PNG, sprite assets, scripts, manifests, and specs remain in the GitHub repository, notably on `deepsyq-platform` under `app/src/main/assets/virtual-pet/`.
- Archival storage in the existing GitHub repo does not activate extra Render CPU charges. GitHub and Git LFS quotas are still applicable.
- Re-enabling pets needs a future explicit owner decision, browser performance measurements, and optional disabled-by-default UX.

## Release verification
1. Home does not contain a visible F8 pet selector or stage.
2. Public pages do not load F8 JS/CSS.
3. `/virtual-pet.html`, `/virtual-pet.js`, and `/virtual-pet/luna/glb/luna.glb` return 404 after deploy.
4. JARVIX, navigation, pricing, and unrelated features remain intact.
5. Confirm the exact production Render `main` SHA, and keep autoDeploy off.

**Scope note:** This retires production pets, NOT any unrelated user interface designs on the DEV site.