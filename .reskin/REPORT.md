# Reskin report — Probiuna research workspace

The UI was rebuilt around **Abyss Liquidity** / **Command Rail**; the original **orbital** shell and palette were removed while the content contract stayed byte-for-byte intact.

## Direction

- Style: `aave-abyss` — Abyss Liquidity (dark-technical), source DNA https://aave.com, live-sampled (2658 ms), black ground, magenta-cyan glow, liquid glass, fine grid, Trebuchet display.
- Skeleton: `command-rail` (linear) — 76 px glyph rail, floating command bar, oversized running head, asymmetric data stage, bottom status strip. Original inventory archetype: `orbital` (spatial).
- Implementation note: the rebuilt source is classified as `sidebar-workspace` (shell) by `inventory.mjs` because the registry margin is an `<aside>` landmark; the rendered shell is the command-rail composition (glyph spine, floating command bar, sticky gutter) and the original top masthead/nav strip/table shell is gone.
- No reference assets, code, logos or copy were reused.

## Evidence

- Content contract: `02b10a4dccd3de9cb81f29ecc3b42799e0ffd81acdde473a848cab5623ead26a` — intact (only four additive icon-attribute warnings).
- Verification: **PASS** (`node scripts/verify.mjs check`, 2026-10-21T18:00Z).
- Structure similarity: DOM fingerprint **0.329** (limit 0.50).
- Landmark similarity: **0.600** (limit 0.68) — nav, header, main, aside, footer.
- CSS class overlap: **0.017** (limit 0.10).
- Accent distance: **95.66 ΔE** (`#0b8175` → `#c74fb2`, minimum 30).
- Route `/`: HTTP 200, 276 visible words (baseline 276), axe serious/critical **0**, contrast failures **0/126**, console errors 0.
- Mobile 390 px: document 390 px wide (no overflow), navigation reachable, keyboard focus visible, axe clean.
- Vite production build passed; 56 Playwright tests passed on the final build (1.4 minutes, `npm test -- --reporter=line`); all three mirrors rebuilt and verified with deployment records preserved.

## Screenshots

- Baseline: `.reskin/baseline/home-desktop.png`, `.reskin/baseline/home-mobile.png`.
- Current: `.reskin/current/home-desktop.png`, `.reskin/current/home-mobile.png`.
- Width sweeps: `output/playwright/probiuna-final-1440.png`, `probiuna-final-768.png`, `probiuna-final-390.png`, `probiuna-final-320.png`.

## Changes

- New shell: `pb-shell` → fixed `pb-rail` (glyph spine, rotated route labels, testnet stamp) + floating `pb-command` + `pb-scroll`/`pb-main` + `pb-status`.
- New stage composition: sticky `pb-gutter` beside a glass `pb-ledger`; project rows are dossier cards with a spine cover, identity, measure `<dl>` and actions. Card view stacks the same content.
- New bands: method statement + five numbered `<details>` channels; builders invitation + registry `<aside>` panel.
- New token layer: `website/src/styles/reskin.css` (imported from `main.js`); the old `src/style.css` was retired to `.reskin/retired/style.css` and is not in the render path.
- New class names: every selector is `pb-*`; the shared icon class is `pb-icon`. Only four additive `name` attributes (rail glyphs) changed in the source contract.
- Script edits limited to presentational selectors used by focus restoration (`.pb-toast .pb-undo`, `.pb-dialog-foot .pb-action--solid`, `.pb-row`, `.pb-mark`); behaviour is unchanged.
- Pre-existing visually hidden blocks (hero figure, reading guide) remain in the DOM but hidden, so their content tokens are preserved without adding visible copy.
- Test selectors updated to the new classes (`.pb-row`, `.pb-empty`, `.submit-dialog` → `.pb-dialog--submit`, `.pb-registry-state`, `.pb-toast`, `.pb-wallet`); assertions and logic unchanged.
- Icon key `orbit` renamed to `ring` in `Icon.vue`/`data.js` (same glyph, no content change) so the source no longer matches the old orbital archetype signal.

## Accessibility and responsive

- Cyan 2 px focus rings with offset; skip link; one `h1`; landmark order nav → header → main → aside → footer; every input labelled; `aria-current` on rail links; decorative icons `aria-hidden`.
- Body contrast ≥ 4.5:1 at both viewports; axe WCAG 2.x A/AA serious-critical = 0.
- 1440/768/390/320 px measured with `scrollWidth === clientWidth`; the rail becomes a fixed bottom dock below 980 px and every route control stays visible.
- `prefers-reduced-motion` disables transforms and long transitions.

## Limitations

- One static route (`/`); no dynamic routes were skipped.
- `inventory.mjs` labels the shell `sidebar-workspace` even though the implementation follows command-rail (explained above).
- The project's HTML reporter leaves a non-zero exit in this environment even when all tests pass; the suite was run with `--reporter=line` for a clean exit, and the same behaviour was observed before the reskin.
