# Reskin inventory — probiuna-site

Generated: 2026-10-21T17:08:46.683Z

## Project

| Field | Value |
|---|---|
| Root | `E:/workspace/chuangye/ROBIN/707/website` |
| Vue | ^3.5.4 |
| Package manager | npm |
| Nuxt | no |
| CSS frameworks | none detected |
| Files scanned | 18 (8 SFCs) |

## Original skeleton

- Archetype: **orbital** (spatial)
- Traits: topbar, cards, hero, grid, modal, sticky, orbital, ticker
- Max template depth: 10
- Top-level tags: a, div, dialog, dialog, div, svg, a, div, dialog, dialog, div, svg, a, div, dialog, dialog, div, svg, a, div, dialog, dialog, div, svg

The replacement skeleton must not be `orbital` and must not be in the same family (`spatial`).

## Routes

- `/`

## Palette (most used first)

`#0b8175` (8) · `#18231f` (8) · `#dcebe3` (8) · `#dfc884` (8) · `#e4edf5` (8) · `#ffffff` (8) · `#07665d` (4) · `#17233b` (4) · `#1b2921` (4) · `#40534a` (4)

## Content lock

- Static visible text tokens: **496**
- Binding expressions: **336**
- Event handlers: **164**
- Contract hash: `90062af3a8813457ea8c2c785ea530f4e214f6ea112c352c241808e71740b5d8`

Everything in `.reskin/content-contract.json` is immutable: visible copy, placeholders, labels, routes, link targets, asset sources, bindings, handlers, API endpoints and i18n values. A reskin may move these tokens to new markup but may not rewrite, remove or hide them.

## Next

```bash
node scripts/choose-style.mjs --project "E:/workspace/chuangye/ROBIN/707/website" --out .reskin
node scripts/verify.mjs baseline --project "E:/workspace/chuangye/ROBIN/707/website" --out .reskin
```

Then rewrite the UI and run `verify.mjs check`.
