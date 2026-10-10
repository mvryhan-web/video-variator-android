# WOW Montage — stage 2 UI preparation

The optional control is now placed directly below the existing mode selector on
the development branch. It is unchecked and disabled in Gentle, Balance and
Dynamic, with a visible `In development` status and an explanation that processing
continues as before. The control does not import the contract or pass any new
option to the engine. This is not a working montage renderer.

English is the default; the new explanation also uses the existing French,
Russian and Ukrainian locale selection. Styling is confined to the new control,
supports narrow screens and existing light/dark theme variables, and includes an
accessible switch name and associated status/help. No persisted enabled state is
introduced. Existing plan-based mode permissions are unchanged.

Changed files relative to stage 1:

- `app/src/main/assets/index.html`: control beside the mode selector and scoped CSS link.
- `app/src/main/assets/wow-montage.css`: only the new option's styling.
- `app/src/main/assets/app-v4.js`: only new translation strings; processing logic unchanged.
- `tests/wow-montage-ui.spec.mjs`: modes/default-off/reload, locales/themes/narrow
  layouts and unchanged processing call options; runs in all five browser profiles.
- `.github/workflows/web-ci.yml`: execute stage 1 regression/native media tests in CI.
- `docs/WOW-MONTAGE-STAGE-2.md`: preparation and validation notes.

The engine's byte hash and exact command baselines stay frozen. Auth, Stripe,
pricing, Android sources/package ID, other tools, the landing content and styling
of other sections remain unchanged. There is no analyzer, effect selection,
render integration or paid API. There is no production merge, deployment or release.

Validation commands:

```sh
node --check app/src/main/assets/app-v4.js
node --test tests/wow-montage-stage1-unit.mjs tests/wow-montage-legacy-media.mjs
npx playwright test tests/wow-montage-ui.spec.mjs
```

Browser execution uses the existing GitHub CI because local browser binaries are
not installed. The draft PR is for testing/review only; APK publication is gated
to main in the existing workflow and Render also follows main, with previews off.

Next stage requires explicit continuation: implement local analysis, conservative
visual effect selection and the real renderer, then enable the control only after
the necessary media/device tests. Deployment still requires owner permission.
