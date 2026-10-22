# Wireframe commitment — Probiuna research workspace

Selected by the reskin selector: **Abyss Liquidity** (dark-technical) + **Command Rail** (linear).
Original inventory archetype: `orbital` (spatial). The new shell must not reuse it.

## Shell

- `pb-shell`: page frame with a fixed 76 px glyph **rail** (`nav`), a floating **command bar** (`header`), a full-bleed `main`, and a bottom **status strip** (`footer`).
- The rail is a spine, not a labelled sidebar: four glyph links with rotated micro-labels (the existing route labels and counters) and a vertical testnet stamp.
- The command bar is detached from the top edge (sticky, 18 px offset, glass surface) and carries the wordmark, the search field, the network disclosure and the wallet control.
- Landmarks: `nav` → `header` → `main` → `aside` (registry margin) → `footer`.

## Route `/` composition

1. **Running head** — oversized `h1`, eyebrow, description, two actions, footnote, and an instrument strip for NETWORK / REGISTRY ENTRIES / registry details. Not a two-column hero card.
2. **Data stage** — asymmetric grid with a narrow sticky gutter (DISCOVERY INDEX, count heading, sample disclosure, result note, storage notice) and a wide glass ledger (sort + layout, signal filters, active filters, project cards, empty state).
3. **Method band** — oversized statement on the left; five numbered `<details>` channels on the right, with the weight spectrum and download action above them.
4. **Builders band** — invitation copy on the left; the registry panel sits in an `<aside>` glass block on the right.
5. **Status strip** — footer brand, disclosure, X and domain links, back-to-top.
6. Dialogs (dossier, submission) and the toast are restyled as glass sheets with the same fields, bindings and handlers.

The pre-existing visually hidden hero figure and reading guide stay in the DOM, hidden, so their content tokens survive unchanged.

## Tokens and CSS

- New stylesheet `src/styles/reskin.css`; `src/style.css` is removed from the render path (file kept on disk).
- Token prefix `--pb-*`; class prefix `pb-`. No original class name is reused.
- Palette: void `#000000`, deep `#05070b`, glass `#0d141d`, ink `#f2f7fd`, muted `#9fb1c4`, magenta accent `#c74fb2`, accent ink `#120510`, safe accent `#f3b4e8`, cyan `#5fe4ee`, success `#5ce1a0`, warning `#f2c94c`, danger `#ff8f8f`.
- Type: Trebuchet MS display, Segoe UI body, Cascadia Mono metadata. Radii 10/16/26 px, 1 px hairline borders, liquid-glass gradients, fine grid texture, 240 ms motion with a reduced-motion guard.

## Responsive

- ≤ 900 px: the rail becomes a fixed bottom dock (icons + 9 px labels), the command bar wraps (wordmark, then search, then network + wallet), the stage, method and builders bands become single-column.
- ≤ 620 px: ledger cards stack cover/identity/blurb/measures/actions; the command bar keeps every control visible; no horizontal scrolling at 390 px.
