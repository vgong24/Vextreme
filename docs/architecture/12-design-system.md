# Design system

This documents the token contract as it actually exists — not an aspiration,
not a rebrand. `data/status/open-discussions.json` od-005 tracks what's still
undecided (dark mode as a real feature, deduplicating the repeated dark-panel
block below); this file is the ground truth of what's already there, written
down so nobody has to reverse-engineer it from five separate files again.

`node lib/check-design-tokens.js` verifies every `var(--token)` reference in
the repo resolves against one of the two families below. It found zero
violations as of the session that wrote this document — see
`docs/architecture/11-debugging-practices.md` for the bug that motivated it.

---

## Two token families, not one

**1. The global light theme — `styles/design-system.css`**

The only file that declares a `:root` block meant to be shared. Nine tokens:

| Token | Value | Purpose |
|---|---|---|
| `--cream` | `#fafaf9` | Page/card background |
| `--stone` | `#1c1917` | Primary text |
| `--muted` | `#78716c` | Secondary text, meta lines |
| `--border` | `#e7e5e4` | Hairline borders |
| `--ember` | `#b45830` | Accent — links, active states, stat values |
| `--ember-bg` | `#fdf8f6` | Accent-tinted background (callouts, hovers) |
| `--serif` | `'Source Serif 4', Georgia, serif` | Headings on content pages |
| `--sans` | `'IBM Plex Sans', sans-serif` | Body text |
| `--mono` | `'IBM Plex Mono', monospace` | Code, stats, meta, badges |

Used by any file that `<link>`s `styles/design-system.css` — the God Script
content pages (via the loader chain) and `pages/ecosystem-hub.html`. Also
implicitly relied on by `styles/arc-nav.css`, `styles/site-nav.css`, and
`styles/squarespace-overrides.css`, none of which declare their own tokens —
they're loaded *by* `lib/vextreme.js` alongside `design-system.css`, never
standalone, so their `var(--x)` references resolve against this same set.

**2. The local dark theme — repeated inline, not shared**

Four generators define an identical `:root` block inline and never link
`design-system.css` at all: `lib/build-archives.js`, `lib/build-demo.js`,
`lib/build-specimens.js`, and `pages/specimen-architectural-wisdoms.html`
(which adds one extra token, `--blue`, for a secondary accent):

```css
:root {
  --bg:     #0e0e0e;
  --surface:#111111;
  --text:   #e8e8e4;
  --muted:  #6b6b6b;
  --ember:  #c8502a;
  --border: #2a2a2a;
  --mono:   'IBM Plex Mono', monospace;
  --sans:   'IBM Plex Sans', sans-serif;
}
```

`lib/build-index-page.js` defines a fifth local `:root` block — same shape,
light values instead of dark, and functionally a restatement of family 1's
tokens under different names (`--bg` ≈ `--cream`, `--text` ≈ `--stone`):

```css
:root {
  --bg:     #fafaf9;
  --text:   #1c1917;
  --muted:  #78716c;
  --border: #e7e5e4;
  --ember:  #b45830;
  --surface:#ffffff;
  --mono:   'IBM Plex Mono', monospace;
  --serif:  'Source Serif 4', Georgia, serif;
  --sans:   'IBM Plex Sans', sans-serif;
}
```

This is real, verified duplication — five files, four of them byte-identical
in their `:root` block — not a hypothetical. It's tracked as td-007, not
fixed here: consolidating it means changing five generators' output, which
deserves its own reviewed pass rather than riding along with a documentation
PR. See od-005 for the sequencing reasoning.

## The rule a file must satisfy

A `var(--x)` reference is valid if `--x` is either:

- declared in that file's own `:root` block, or
- declared in `styles/design-system.css`'s `:root` block, **and** the file
  actually `<link>`s that stylesheet (or is a `styles/*.css` companion file
  that's always loaded alongside it by its loader).

A fallback value — `var(--x, #hex)` — does **not** satisfy this rule on its
own. That's precisely the pattern that made half of Session 015's bug
invisible: the fallback rendered a plausible-looking color, masking that the
token itself didn't exist. `lib/check-design-tokens.js` treats a fallback the
same as no fallback: the token must actually resolve.

## Adding a token

- **To the global set** (`styles/design-system.css`): confirm it's meant to
  be shared across content pages before adding it — this file's `:root` is
  the widest-blast-radius single edit point for typography/color in the
  repo. Run `node lib/check-design-tokens.js` afterward; a removed or renamed
  token will surface every file that broke.
- **To a local dark-panel file**: prefer matching the existing four files'
  values exactly unless there's a specific reason not to — the duplication is
  tracked debt, not a template to diverge from further.

## What's deliberately not here yet

No dark-mode *toggle* exists — the "dark theme" above is a set of files
permanently rendered dark, not a switchable mode applied to the light theme.
Whether to build one, and whether to do it by finally consolidating family 2
into `design-system.css` as a real second theme, is od-005's open question,
not a decision made by writing this document.

<!-- [VXG RealForever] -->
