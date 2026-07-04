# Design system

This documents the token contract as it actually exists — not an aspiration,
not a rebrand. `data/status/open-discussions.json` od-005 tracks what's still
undecided (a real dark-mode *toggle*, applied to pages that are currently
light-only); this file is the ground truth of what's already there.

`node lib/check-design-tokens.js` verifies every `var(--token)` reference in
the repo resolves against one of the two families below. It found zero
violations as of the session that wrote this document — see
`docs/architecture/11-debugging-practices.md` for the bug that motivated it.

---

## Two token families, both declared in one file

**1. The global light theme — `:root` in `styles/design-system.css`**

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
content pages (via the loader chain), `pages/ecosystem-hub.html`, and the
dashboard pages below. Also implicitly relied on by `styles/arc-nav.css`,
`styles/site-nav.css`, and `styles/squarespace-overrides.css`, none of which
declare their own tokens — they're loaded *by* `lib/vextreme.js` alongside
`design-system.css`, never standalone, so their `var(--x)` references
resolve against this same set.

**2. The dashboard dark theme — `[data-theme="dashboard"]` in the same file**

| Token | Value | Purpose |
|---|---|---|
| `--bg` | `#0e0e0e` | Page background |
| `--surface` | `#111111` | Card/box background, one step lighter than `--bg` — a distinction the light theme's single `--cream` doesn't make |
| `--text` | `#e8e8e4` | Primary text |
| `--muted` | `#6b6b6b` | Secondary text |
| `--ember` | `#c8502a` | Accent — a different value from the light theme's `--ember`, tuned for a dark background |
| `--border` | `#2a2a2a` | Hairline borders |
| `--blue` | `#4a9eff` | Secondary accent, used only by `pages/specimen-architectural-wisdoms.html` |
| `--mono` / `--sans` | same as family 1 | Typefaces |

Used by `lib/build-archives.js`, `lib/build-demo.js`, `lib/build-specimens.js`
(and the specimen pages it generates), and `pages/specimen-architectural-wisdoms.html`
— each opts in with `<html data-theme="dashboard">` plus a `<link>` to
`design-system.css`, same as any light-theme page. Until Session 017 this was
four identical `:root` blocks copy-pasted inline, one per file, verified as
real duplication (not hypothetical) and tracked as td-007. Consolidating it
into this one shared declaration was verified lossless — before/after
Playwright screenshots of `pages/archives.html` and `pages/vextreme-demo.html`
rendered pixel-identical — and confirmed by `lib/check-design-tokens.js`
reporting zero violations both before and after. td-007 is closed.

**`lib/build-index-page.js` remains a smaller, separate case.** It defines
its own local `:root` with light values that are a renamed restatement of
family 1 (`--bg` ≈ `--cream`, `--text` ≈ `--stone`), not a copy of family 2.
Nothing else duplicates it, so it carries no drift risk the way the four
dark-panel files did — it's a minor consistency opportunity (migrate it to
link `design-system.css` directly and drop the renamed local copy), not
tracked debt.

## The rule a file must satisfy

A `var(--x)` reference is valid if `--x` is either:

- declared in that file's own local `:root` block (rare now — only
  `lib/build-index-page.js` still has one), or
- declared in `styles/design-system.css`'s `:root` **or**
  `[data-theme="dashboard"]` block, **and** the file actually `<link>`s that
  stylesheet (or is a `styles/*.css` companion file that's always loaded
  alongside it by its loader).

A fallback value — `var(--x, #hex)` — does **not** satisfy this rule on its
own. That's precisely the pattern that made half of Session 015's bug
invisible: the fallback rendered a plausible-looking color, masking that the
token itself didn't exist. `lib/check-design-tokens.js` treats a fallback the
same as no fallback: the token must actually resolve.

## Adding a token

- **To either shared family** (`styles/design-system.css`): confirm which
  family it belongs to — this file's `:root` and `[data-theme="dashboard"]`
  blocks are the widest-blast-radius single edit points for typography/color
  in the repo. Run `node lib/check-design-tokens.js` afterward; a removed or
  renamed token will surface every file that broke.
- **A new dashboard-family page**: link `design-system.css`, set
  `<html data-theme="dashboard">`, and use the family 2 tokens directly —
  don't define a new local `:root` copy. That's the exact pattern td-007
  existed to close.

## What's deliberately not here yet

No dark-mode *toggle* exists — `[data-theme="dashboard"]` opts a page in
permanently at build time, it isn't switched at runtime, and no light-themed
page can become dark on demand (or vice versa).

**Decided (Session 019, od-005 closed):** not building one now. No page has
a stated need for a runtime toggle — every current page's theme (content
pages light, dashboard/dev pages dark) is a reasonable fixed choice, and a
toggle adds real complexity (a persistence mechanism, a UI control, doubling
the visual states every page must be verified in) against a need that
hasn't been named. If a concrete need for one arises, building it is cheap:
switch the `data-theme` attribute at runtime and let the two token families
already declared in `styles/design-system.css` handle the rest — the
consolidation done in Session 018 is what makes that cheap later. This
document is the durable record of the decision; there is no corresponding
tech-debt or planned-enhancement entry, since "revisit if a need appears" is
not a queued task.

<!-- [VXG RealForever] -->
