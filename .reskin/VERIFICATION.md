# Reskin verification — PASS

Generated: 2026-10-21T18:00:33.802Z

- Project: **probiuna-site**
- URL: http://127.0.0.1:4317/
- Original skeleton: `orbital` (spatial)
- New skeleton: `sidebar-workspace` (shell)
- Accent: #0b8175 -> #c74fb2 (95.66 ΔE; min 30)
- Source contract: intact (`02b10a4dccd3`)

| Route | Result | DOM similarity | Landmark similarity | Axe serious | Screenshot |
|---|---|---:|---:|---:|---|
| `/` | PASS | 0.329 | 0.6 | 0 | [desktop](current/home-desktop.png) |

## Blocking issues

- None.

## Warnings

- attributes: "name=bookmark" count increased 8 -> 12
- attributes: "name=layers" count increased 4 -> 8
- attributes: added "name=compass"
- attributes: added "name=fingerprint"

## Thresholds

- DOM fingerprint similarity <= 0.5
- Landmark sequence similarity <= 0.68
- CSS class overlap <= 0.1
- Accent distance >= 30 ΔE
- Contrast failures <= 0
- Axe serious/critical <= 0

All content is compared as a multiset of visible words plus rendered attribute values. Reordering is allowed, rewriting/removing/adding visible copy is not. Dynamic numeric values are reported as warnings, never silently accepted.
